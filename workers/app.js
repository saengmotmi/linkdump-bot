// 리팩토링된 아키텍처를 사용하는 Cloudflare Worker
import { createCloudflareContainer } from "../src/shared/plugins/cloudflare-plugins.js";

export default {
  async fetch(request, env, ctx) {
    try {
      // 플러그인 기반 DependencyContainer 생성
      const container = await createCloudflareContainer(env, ctx);

      // 런타임 서비스로 기본 요청 처리
      const runtime = await container.resolve("runtime");
      const { corsHeaders } = await runtime.handleRequest(request, {});

      if (request.method === "OPTIONS") {
        return new Response(null, {
          status: 200,
          headers: corsHeaders,
        });
      }

      const url = new URL(request.url);

      // API 라우팅
      if (url.pathname === "/api/add-link" && request.method === "POST") {
        return await handleAddLink(request, container, corsHeaders);
      }

      if (url.pathname === "/api/process-links" && request.method === "POST") {
        return await handleProcessLinks(container, corsHeaders);
      }

      if (url.pathname === "/api/config" && request.method === "GET") {
        return await handleGetConfig(container, corsHeaders);
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

      return new Response("Not Found", { status: 404, headers: corsHeaders });
    } catch (error) {
      console.error("Request handling failed:", error);

      return new Response(
        JSON.stringify({
          error: "Internal server error",
          details: error.message,
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }
  },
};

// 링크 추가 핸들러
async function handleAddLink(request, container, corsHeaders) {
  try {
    const { url, tags = [] } = await request.json();

    const linkService = await container.resolve("linkManagementService");
    const runtime = await container.resolve("runtime");

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
    const runtime = await container.resolve("runtime");
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
async function handleProcessLinks(container, corsHeaders) {
  try {
    const linkService = await container.resolve("linkManagementService");
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
async function handleGetConfig(container, corsHeaders) {
  try {
    const aiClient = await container.resolve("aiClient");
    const runtime = await container.resolve("runtime");

    const config = {
      ai: aiClient.getProviderInfo
        ? aiClient.getProviderInfo()
        : { provider: "unknown" },
      runtime: runtime.getRuntimeInfo(),
      availableModels: aiClient.getAvailableModels
        ? await aiClient.getAvailableModels()
        : [],
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

// 웹페이지 HTML
function getWebPage(url) {
  const workerUrl = url.origin;

  return `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>링크 추가 - LinkDump Bot (Plugin-based)</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, sans-serif; 
            max-width: 600px; 
            margin: 50px auto; 
            padding: 20px;
            line-height: 1.6;
            background: #f5f5f5;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 { 
            color: #333; 
            text-align: center;
            margin-bottom: 30px;
        }
        .form-group {
            margin-bottom: 20px;
        }
        label {
            display: block;
            margin-bottom: 5px;
            font-weight: 600;
            color: #555;
        }
        input[type="url"], input[type="text"] {
            width: 100%;
            padding: 12px;
            border: 2px solid #ddd;
            border-radius: 6px;
            font-size: 16px;
            transition: border-color 0.3s;
        }
        input[type="url"]:focus, input[type="text"]:focus {
            outline: none;
            border-color: #007bff;
        }
        button {
            background: #007bff;
            color: white;
            padding: 12px 24px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 16px;
            width: 100%;
            transition: background-color 0.3s;
        }
        button:hover {
            background: #0056b3;
        }
        button:disabled {
            background: #ccc;
            cursor: not-allowed;
        }
        .result {
            margin-top: 20px;
            padding: 15px;
            border-radius: 6px;
            display: none;
        }
        .success {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        .error {
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
        .actions {
            margin-top: 30px;
            text-align: center;
        }
        .actions button {
            width: auto;
            margin: 0 10px;
        }
        .badge {
            display: inline-block;
            background: #007bff;
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            margin-top: 10px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔗 LinkDump Bot</h1>
        <p style="text-align: center; color: #666; margin-bottom: 30px;">
            <span class="badge">Plugin-based Architecture</span>
        </p>
        
        <form id="linkForm">
            <div class="form-group">
                <label for="url">URL:</label>
                <input type="url" id="url" name="url" required 
                       placeholder="https://example.com/article">
            </div>
            
            <div class="form-group">
                <label for="tags">태그 (쉼표로 구분):</label>
                <input type="text" id="tags" name="tags" 
                       placeholder="javascript, tutorial, react">
            </div>
            
            <button type="submit" id="submitBtn">링크 추가</button>
        </form>
        
        <div id="result" class="result"></div>
        
        <div class="actions">
            <button onclick="processLinks()">미처리 링크 처리</button>
            <button onclick="showConfig()">설정 보기</button>
        </div>
    </div>

    <script>
        document.getElementById('linkForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const submitBtn = document.getElementById('submitBtn');
            const result = document.getElementById('result');
            const url = document.getElementById('url').value;
            const tags = document.getElementById('tags').value
                .split(',')
                .map(tag => tag.trim())
                .filter(tag => tag);
            
            submitBtn.disabled = true;
            submitBtn.textContent = '처리 중...';
            result.style.display = 'none';
            
            try {
                const response = await fetch('${workerUrl}/api/add-link', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ url, tags })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    result.className = 'result success';
                    result.innerHTML = \`
                        <strong>✅ 성공!</strong><br>
                        링크가 추가되었습니다: \${data.link.url}<br>
                        ID: \${data.link.id}
                    \`;
                    document.getElementById('linkForm').reset();
                } else {
                    throw new Error(data.error || '알 수 없는 오류');
                }
            } catch (error) {
                result.className = 'result error';
                result.innerHTML = \`<strong>❌ 오류:</strong> \${error.message}\`;
            }
            
            result.style.display = 'block';
            submitBtn.disabled = false;
            submitBtn.textContent = '링크 추가';
        });
        
        async function processLinks() {
            const result = document.getElementById('result');
            
            try {
                const response = await fetch('${workerUrl}/api/process-links', {
                    method: 'POST'
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    result.className = 'result success';
                    result.innerHTML = \`
                        <strong>✅ 처리 완료!</strong><br>
                        \${data.message}
                    \`;
                } else {
                    throw new Error(data.error || '처리 실패');
                }
            } catch (error) {
                result.className = 'result error';
                result.innerHTML = \`<strong>❌ 오류:</strong> \${error.message}\`;
            }
            
            result.style.display = 'block';
        }
        
        async function showConfig() {
            const result = document.getElementById('result');
            
            try {
                const response = await fetch('${workerUrl}/api/config');
                const config = await response.json();
                
                if (response.ok) {
                    result.className = 'result success';
                    result.innerHTML = \`
                        <strong>⚙️ 현재 설정:</strong><br>
                        <pre style="margin-top: 10px; font-size: 12px;">\${JSON.stringify(config, null, 2)}</pre>
                    \`;
                } else {
                    throw new Error(config.error || '설정 조회 실패');
                }
            } catch (error) {
                result.className = 'result error';
                result.innerHTML = \`<strong>❌ 오류:</strong> \${error.message}\`;
            }
            
            result.style.display = 'block';
        }
    </script>
</body>
</html>`;
}
