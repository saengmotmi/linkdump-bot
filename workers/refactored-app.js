// 리팩토링된 아키텍처를 사용하는 Cloudflare Worker
import { LinkService } from "../src/services/link-service.js";
import { ProviderFactory } from "../src/factories/provider-factory.js";

export default {
  async fetch(request, env, ctx) {
    // 의존성 주입을 통한 제공자 생성
    const config = ProviderFactory.createCloudflareConfig(env, ctx);
    const { storage, aiProvider, runtime } =
      ProviderFactory.createProviders(config);

    // 링크 서비스 초기화
    const linkService = new LinkService(storage, aiProvider, runtime);

    const url = new URL(request.url);

    // 기본 요청 처리
    const { corsHeaders } = await runtime.handleRequest(request, {});
    if (request.method === "OPTIONS") {
      return corsHeaders;
    }

    try {
      // API 라우팅
      if (url.pathname === "/api/add-link" && request.method === "POST") {
        return await handleAddLink(request, linkService, runtime, corsHeaders);
      }

      if (url.pathname === "/api/process-links" && request.method === "POST") {
        return await handleProcessLinks(linkService, corsHeaders);
      }

      if (url.pathname === "/api/config" && request.method === "GET") {
        return await handleGetConfig(aiProvider, storage, runtime, corsHeaders);
      }

      // 웹페이지 제공
      if (request.method === "GET") {
        return new Response(getWebPage(url), {
          headers: {
            "Content-Type": "text/html;charset=UTF-8",
            ...corsHeaders,
          },
        });
      }

      return new Response("Not Found", { status: 404 });
    } catch (error) {
      runtime.log("error", "Request handling failed", {
        path: url.pathname,
        method: request.method,
        error: error.message,
      });

      return new Response(
        JSON.stringify({
          error: "Internal server error",
          details: error.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  },
};

// 링크 추가 핸들러
async function handleAddLink(request, linkService, runtime, corsHeaders) {
  try {
    const { url, tags = [] } = await request.json();

    // 링크 추가
    const newLink = await linkService.addLink(url, tags);

    // 백그라운드에서 링크 처리
    runtime.scheduleBackgroundTask(async () => {
      try {
        const processedLink = await linkService.processLink(newLink);
        await linkService.sendToDiscord(processedLink);
      } catch (error) {
        runtime.log("error", "Background processing failed", {
          linkId: newLink.id,
          error: error.message,
        });
      }
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Link added successfully",
        link: newLink,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    runtime.log("error", "Add link failed", { error: error.message });

    return new Response(
      JSON.stringify({
        error: "Failed to add link",
        details: error.message,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
}

// 링크 처리 핸들러
async function handleProcessLinks(linkService, corsHeaders) {
  try {
    const result = await linkService.processAllUnprocessedLinks();

    // 처리된 링크들을 Discord로 전송
    for (const link of result.links) {
      try {
        await linkService.sendToDiscord(link);
      } catch (error) {
        // Discord 전송 실패는 전체 처리를 중단하지 않음
        console.error("Discord send failed:", error);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${result.processedCount} links`,
        details: result,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Failed to process links",
        details: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
}

// 설정 정보 조회 핸들러
async function handleGetConfig(aiProvider, storage, runtime, corsHeaders) {
  try {
    const config = {
      ai: aiProvider.getProviderInfo(),
      runtime: runtime.getRuntimeInfo(),
      availableModels: await aiProvider.getAvailableModels(),
    };

    return new Response(JSON.stringify(config, null, 2), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Failed to get config",
        details: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
}

// 웹페이지 HTML (기존과 동일)
function getWebPage(url) {
  const workerUrl = url.origin;

  return `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>링크 추가 - LinkDump Bot (Refactored)</title>
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
            font-size: 2.5em;
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
        .config-btn {
            background: linear-gradient(135deg, #17a2b8, #138496);
            margin-top: 10px;
            font-size: 14px;
            padding: 12px;
        }
        .config-btn:hover {
            box-shadow: 0 4px 15px rgba(23,162,184,0.3);
        }
        @keyframes slideIn {
            from { opacity: 0; transform: translateY(-20px); }
            to { opacity: 1; transform: translateY(0); }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔗 LinkDump Bot</h1>
        <div class="info">
            <strong>🎉 리팩토링 완료!</strong><br>
            이제 다양한 AI 제공자와 스토리지를 쉽게 교체할 수 있습니다.<br>
            현재 설정을 확인하려면 아래 버튼을 클릭하세요.
        </div>
        
        <form id="linkForm">
            <input type="url" id="urlInput" placeholder="링크 URL을 입력하세요" required>
            <textarea id="tagsInput" placeholder="태그 (쉼표로 구분, 선택사항)" rows="2"></textarea>
            <button type="submit" id="submitBtn">링크 추가</button>
            <button type="button" id="processBtn" class="config-btn">미처리 링크 처리</button>
            <button type="button" id="configBtn" class="config-btn">현재 설정 확인</button>
        </form>
        
        <div id="result"></div>
    </div>

    <script>
        const form = document.getElementById('linkForm');
        const urlInput = document.getElementById('urlInput');
        const tagsInput = document.getElementById('tagsInput');
        const submitBtn = document.getElementById('submitBtn');
        const processBtn = document.getElementById('processBtn');
        const configBtn = document.getElementById('configBtn');
        const result = document.getElementById('result');

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const url = urlInput.value.trim();
            const tagsText = tagsInput.value.trim();
            const tags = tagsText ? tagsText.split(',').map(t => t.trim()) : [];
            
            if (!url) return;
            
            submitBtn.disabled = true;
            submitBtn.textContent = '추가 중...';
            result.innerHTML = '';
            
            try {
                const response = await fetch('${workerUrl}/api/add-link', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url, tags })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    result.innerHTML = '<div class="success">✅ ' + data.message + '</div>';
                    urlInput.value = '';
                    tagsInput.value = '';
                } else {
                    result.innerHTML = '<div class="error">❌ ' + data.error + '</div>';
                }
            } catch (error) {
                result.innerHTML = '<div class="error">❌ 네트워크 오류: ' + error.message + '</div>';
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = '링크 추가';
            }
        });

        processBtn.addEventListener('click', async () => {
            processBtn.disabled = true;
            processBtn.textContent = '처리 중...';
            result.innerHTML = '';
            
            try {
                const response = await fetch('${workerUrl}/api/process-links', {
                    method: 'POST'
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    result.innerHTML = '<div class="success">✅ ' + data.message + '</div>';
                } else {
                    result.innerHTML = '<div class="error">❌ ' + data.error + '</div>';
                }
            } catch (error) {
                result.innerHTML = '<div class="error">❌ 네트워크 오류: ' + error.message + '</div>';
            } finally {
                processBtn.disabled = false;
                processBtn.textContent = '미처리 링크 처리';
            }
        });

        configBtn.addEventListener('click', async () => {
            configBtn.disabled = true;
            configBtn.textContent = '조회 중...';
            result.innerHTML = '';
            
            try {
                const response = await fetch('${workerUrl}/api/config');
                const data = await response.json();
                
                if (response.ok) {
                    result.innerHTML = '<div class="success"><pre>' + JSON.stringify(data, null, 2) + '</pre></div>';
                } else {
                    result.innerHTML = '<div class="error">❌ ' + data.error + '</div>';
                }
            } catch (error) {
                result.innerHTML = '<div class="error">❌ 네트워크 오류: ' + error.message + '</div>';
            } finally {
                configBtn.disabled = false;
                configBtn.textContent = '현재 설정 확인';
            }
        });
    </script>
</body>
</html>`;
}
