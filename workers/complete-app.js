// 완전 통합 Cloudflare Worker: 웹페이지 + API + 링크 처리
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // CORS 헤더
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // OPTIONS 요청 처리
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: corsHeaders,
      });
    }

    // API 경로 처리
    if (url.pathname === '/api/add-link' && request.method === 'POST') {
      return handleAddLink(request, env, ctx, corsHeaders);
    }

    // 수동 처리 트리거 API
    if (url.pathname === '/api/process-links' && request.method === 'POST') {
      return handleProcessLinks(request, env, ctx, corsHeaders);
    }

    // 웹페이지 제공 (GET 요청)
    if (request.method === 'GET') {
      return new Response(getWebPage(url), {
        headers: {
          'Content-Type': 'text/html;charset=UTF-8',
          ...corsHeaders,
        },
      });
    }

    return new Response('Not Found', { status: 404 });
  },
};

// 링크 추가 API 핸들러
async function handleAddLink(request, env, ctx, corsHeaders) {
  try {
    const { url, tags = [] } = await request.json();

    if (!url) {
      return new Response(JSON.stringify({ error: 'URL is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // R2에서 현재 링크 데이터 가져오기
    const object = await env.LINKDUMP_STORAGE.get('links.json');
    let linksData = { links: [] };

    if (object) {
      const content = await object.text();
      linksData = JSON.parse(content);
    }

    // 중복 체크
    const exists = linksData.links.some(link => link.url === url);
    if (exists) {
      return new Response(JSON.stringify({ error: 'Link already exists' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 새 링크 추가
    const newLink = {
      id: Date.now().toString(),
      url: url,
      tags: tags,
      addedAt: new Date().toISOString(),
      processed: false
    };

    linksData.links.push(newLink);

    // R2에 업데이트된 데이터 저장
    await env.LINKDUMP_STORAGE.put('links.json', JSON.stringify(linksData, null, 2), {
      metadata: {
        lastModified: new Date().toISOString(),
        addedBy: 'web-interface'
      }
    });

    // 백그라운드에서 링크 처리 시작 (즉시 반환하고 백그라운드에서 실행)
    ctx.waitUntil(processNewLinksBackground(env, newLink));

    return new Response(JSON.stringify({
      success: true,
      message: 'Link added successfully',
      link: newLink
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error adding link:', error);
    return new Response(JSON.stringify({
      error: 'Failed to add link',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// 수동 링크 처리 API
async function handleProcessLinks(request, env, ctx, corsHeaders) {
  try {
    const result = await processAllUnprocessedLinks(env);
    
    return new Response(JSON.stringify({
      success: true,
      message: \`Processed \${result.processedCount} links\`,
      details: result
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Error processing links:', error);
    return new Response(JSON.stringify({
      error: 'Failed to process links',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// 백그라운드 링크 처리 (단일 링크)
async function processNewLinksBackground(env, newLink) {
  try {
    console.log(\`Background processing: \${newLink.url}\`);
    
    // OG 태그 스크래핑
    const ogData = await scrapeOGTags(newLink.url);
    if (!ogData) {
      console.error(\`Failed to scrape OG tags for: \${newLink.url}\`);
      return;
    }
    
    // AI 요약 생성
    const summary = await generateSummary(env, ogData, newLink.url);
    
    // R2에서 현재 데이터 가져오기
    const object = await env.LINKDUMP_STORAGE.get('links.json');
    if (!object) return;
    
    const linksData = JSON.parse(await object.text());
    
    // 해당 링크 업데이트
    const linkIndex = linksData.links.findIndex(link => link.id === newLink.id);
    if (linkIndex !== -1) {
      linksData.links[linkIndex].ogData = ogData;
      linksData.links[linkIndex].summary = summary;
      linksData.links[linkIndex].processed = true;
      linksData.links[linkIndex].processedAt = new Date().toISOString();
      
      // R2에 업데이트된 데이터 저장
      await env.LINKDUMP_STORAGE.put('links.json', JSON.stringify(linksData, null, 2));
      
      // Discord로 전송
      await sendToDiscord(env, linksData.links[linkIndex]);
    }
    
  } catch (error) {
    console.error('Background processing error:', error);
  }
}

// 모든 미처리 링크 처리
async function processAllUnprocessedLinks(env) {
  const object = await env.LINKDUMP_STORAGE.get('links.json');
  if (!object) return { processedCount: 0 };
  
  const linksData = JSON.parse(await object.text());
  const unprocessedLinks = linksData.links.filter(link => !link.processed);
  
  let processedCount = 0;
  
  for (const link of unprocessedLinks) {
    try {
      console.log(\`Processing: \${link.url}\`);
      
      const ogData = await scrapeOGTags(link.url);
      if (!ogData) continue;
      
      const summary = await generateSummary(env, ogData, link.url);
      
      link.ogData = ogData;
      link.summary = summary;
      link.processed = true;
      link.processedAt = new Date().toISOString();
      
      await sendToDiscord(env, link);
      processedCount++;
      
      // 요청 제한 방지
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(\`Failed to process \${link.url}:\`, error);
    }
  }
  
  // 업데이트된 데이터 저장
  await env.LINKDUMP_STORAGE.put('links.json', JSON.stringify(linksData, null, 2));
  
  return { processedCount, totalLinks: linksData.links.length };
}

// OG 태그 스크래핑
async function scrapeOGTags(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) return null;
    
    const html = await response.text();
    
    // 간단한 정규식으로 OG 태그 추출
    const getMetaContent = (property) => {
      const regex = new RegExp(\`<meta[^>]*property=["']\${property}["'][^>]*content=["']([^"']*)\`, 'i');
      const match = html.match(regex);
      return match ? match[1] : '';
    };
    
    const getMetaName = (name) => {
      const regex = new RegExp(\`<meta[^>]*name=["']\${name}["'][^>]*content=["']([^"']*)\`, 'i');
      const match = html.match(regex);
      return match ? match[1] : '';
    };
    
    const getTitleContent = () => {
      const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
      return match ? match[1] : '';
    };
    
    return {
      title: getMetaContent('og:title') || getTitleContent() || '',
      description: getMetaContent('og:description') || getMetaName('description') || '',
      image: getMetaContent('og:image') || '',
      site_name: getMetaContent('og:site_name') || ''
    };
    
  } catch (error) {
    console.error(\`Failed to scrape \${url}:\`, error);
    return null;
  }
}

// AI 요약 생성
async function generateSummary(env, ogData, url) {
  try {
    const prompt = \`다음 웹페이지 정보를 바탕으로 "왜 이 링크를 클릭해야 하는지"에 대한 매력적인 3줄 요약을 한국어로 작성해주세요:

제목: \${ogData.title}
설명: \${ogData.description}
사이트: \${ogData.site_name}
URL: \${url}

요약은 클릭 동기를 부여하는 방향으로 작성해주세요.\`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 200,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      throw new Error(\`Anthropic API error: \${response.status}\`);
    }

    const result = await response.json();
    return result.content[0].text.trim();
    
  } catch (error) {
    console.error('Failed to generate summary:', error);
    return \`\${ogData.title}\\n\${ogData.description}\`;
  }
}

// Discord 전송
async function sendToDiscord(env, linkData) {
  if (!env.DISCORD_WEBHOOKS) return;
  
  const webhooks = env.DISCORD_WEBHOOKS.split(',').map(w => w.trim());
  
  const embed = {
    title: linkData.ogData.title || 'New Link',
    description: linkData.summary,
    url: linkData.url,
    color: 0x0099ff,
    timestamp: new Date().toISOString()
  };

  if (linkData.ogData.image) {
    embed.thumbnail = { url: linkData.ogData.image };
  }

  for (const webhook of webhooks) {
    try {
      await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ embeds: [embed] })
      });
      console.log(\`Sent to Discord: \${linkData.url}\`);
    } catch (error) {
      console.error('Failed to send to Discord:', error);
    }
  }
}

// 웹페이지 HTML 생성
function getWebPage(url) {
  const workerUrl = url.origin;
  
  return \`<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>링크 추가 - LinkDump Bot</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, sans-serif; 
            max-width: 600px; 
            margin: 50px auto; 
            padding: 20px;
            line-height: 1.6;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }
        .container { 
            background: white; 
            padding: 40px; 
            border-radius: 16px; 
            box-shadow: 0 8px 32px rgba(0,0,0,0.1);
            backdrop-filter: blur(10px);
        }
        input, textarea, button { 
            width: 100%; 
            padding: 16px; 
            margin: 12px 0; 
            border: 2px solid #e1e5e9; 
            border-radius: 12px; 
            font-size: 16px;
            box-sizing: border-box;
            transition: all 0.3s ease;
        }
        input:focus, textarea:focus {
            border-color: #667eea;
            outline: none;
            box-shadow: 0 0 0 3px rgba(102,126,234,0.1);
            transform: translateY(-2px);
        }
        button { 
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white; 
            border: none; 
            cursor: pointer; 
            font-weight: bold;
            transition: all 0.3s ease;
        }
        button:hover { 
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(102,126,234,0.3);
        }
        button:disabled { 
            background: #6c757d; 
            cursor: not-allowed; 
            transform: none;
            box-shadow: none;
        }
        .success { 
            color: #28a745; 
            font-weight: bold; 
            margin-top: 15px;
            padding: 16px;
            background: linear-gradient(135deg, #d4edda, #c3e6cb);
            border-radius: 12px;
            border: none;
            animation: slideIn 0.5s ease;
        }
        .error { 
            color: #dc3545; 
            font-weight: bold; 
            margin-top: 15px;
            padding: 16px;
            background: linear-gradient(135deg, #f8d7da, #f5c6cb);
            border-radius: 12px;
            border: none;
            animation: slideIn 0.5s ease;
        }
        h1 { 
            color: #333; 
            text-align: center; 
            margin-bottom: 30px;
            font-size: 3em;
            background: linear-gradient(135deg, #667eea, #764ba2);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        .info { 
            background: linear-gradient(135deg, #e3f2fd, #bbdefb); 
            padding: 20px; 
            border-radius: 12px; 
            margin-bottom: 30px;
            font-size: 14px;
            border: none;
        }
        .bookmarklet {
            background: linear-gradient(135deg, #fff3cd, #ffeaa7);
            padding: 20px;
            border-radius: 12px;
            margin-top: 30px;
            border: none;
        }
        .bookmarklet a {
            background: linear-gradient(135deg, #ffc107, #f39c12);
            color: #212529;
            padding: 12px 20px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: bold;
            display: inline-block;
            margin-top: 10px;
            transition: all 0.3s ease;
        }
        .bookmarklet a:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 15px rgba(243,156,18,0.3);
        }
        .loading {
            display: none;
            color: #667eea;
            font-weight: bold;
            text-align: center;
            padding: 15px;
        }
        .spinner {
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 3px solid #f3f3f3;
            border-top: 3px solid #667eea;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-right: 10px;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        @keyframes slideIn {
            from { opacity: 0; transform: translateY(-20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .process-btn {
            background: linear-gradient(135deg, #28a745, #20c997);
            margin-top: 10px;
            font-size: 14px;
            padding: 12px;
        }
        .process-btn:hover {
            box-shadow: 0 4px 15px rgba(40,167,69,0.3);
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 LinkDump Bot</h1>
        
        <div class="info">
            ⚡ 링크를 추가하면 즉시 R2에 저장되고, 백그라운드에서 AI 요약을 생성해 Discord로 전송합니다!
        </div>

        <form id="linkForm">
            <input type="url" id="url" placeholder="https://example.com" required>
            <input type="text" id="tags" placeholder="태그들 (선택사항, 쉼표로 구분)">
            <button type="submit" id="submitBtn">⚡ 즉시 추가</button>
            <button type="button" id="processBtn" class="process-btn">🔄 미처리 링크 수동 처리</button>
        </form>

        <div class="loading" id="loading">
            <span class="spinner"></span><span id="loadingText">처리 중...</span>
        </div>
        <div id="message"></div>

        <div class="bookmarklet">
            <strong>📱 북마클릿 (모바일에서 편리하게):</strong><br>
            아래 링크를 북마크에 추가하면 어떤 페이지에서든 바로 링크를 추가할 수 있습니다.<br>
            <a href="javascript:(function(){var url=window.location.href;var title=document.title;window.open('\${workerUrl}?url='+encodeURIComponent(url)+'&title='+encodeURIComponent(title),'_blank','width=500,height=400');})();">
                📲 링크덤프 추가
            </a>
        </div>
    </div>

    <script>
        // URL 파라미터에서 자동 입력
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('url')) {
            document.getElementById('url').value = urlParams.get('url');
        }

        // 링크 추가 폼
        document.getElementById('linkForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await handleFormSubmit('/api/add-link', '링크 저장');
        });

        // 수동 처리 버튼
        document.getElementById('processBtn').addEventListener('click', async () => {
            await handleFormSubmit('/api/process-links', '링크 처리', true);
        });

        async function handleFormSubmit(endpoint, action, isManualProcess = false) {
            const url = document.getElementById('url').value;
            const tags = document.getElementById('tags').value;
            const messageDiv = document.getElementById('message');
            const loadingDiv = document.getElementById('loading');
            const loadingText = document.getElementById('loadingText');
            const submitBtn = document.getElementById('submitBtn');
            const processBtn = document.getElementById('processBtn');
            
            // UI 상태 변경
            submitBtn.disabled = true;
            processBtn.disabled = true;
            loadingDiv.style.display = 'block';
            loadingText.textContent = \`\${action} 중...\`;
            messageDiv.innerHTML = '';
            
            try {
                const body = isManualProcess ? {} : { 
                    url, 
                    tags: tags ? tags.split(',').map(t => t.trim()) : [] 
                };

                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(body),
                });
                
                const result = await response.json();
                
                if (response.ok) {
                    if (isManualProcess) {
                        messageDiv.innerHTML = \`<div class="success">✅ \${result.message}</div>\`;
                    } else {
                        messageDiv.innerHTML = '<div class="success">✅ 링크가 저장되었습니다! 백그라운드에서 AI 처리 중...</div>';
                        document.getElementById('linkForm').reset();
                    }
                } else {
                    messageDiv.innerHTML = \`<div class="error">❌ \${result.error || '오류가 발생했습니다'}</div>\`;
                }
            } catch (error) {
                messageDiv.innerHTML = \`<div class="error">❌ 네트워크 오류: \${error.message}</div>\`;
            } finally {
                // UI 상태 복원
                submitBtn.disabled = false;
                processBtn.disabled = false;
                loadingDiv.style.display = 'none';
            }
        }
    </script>
</body>
</html>\`;
}