// 리팩토링된 아키텍처를 사용하는 Cloudflare Worker
import { DependencyContainer } from "../src/shared/utils/dependency-container.js";

export default {
  async fetch(request, env, ctx) {
    // 의존성 컨테이너 초기화
    const container = DependencyContainer.createForCloudflareWorkers(env, ctx);
    const linkManagementService = container.resolve("linkManagementService");

    const url = new URL(request.url);
    const path = url.pathname;

    // CORS 헤더
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // API 라우팅
      if (path.startsWith("/api/")) {
        return await handleApiRequest(
          request,
          linkManagementService,
          corsHeaders
        );
      }

      // 웹 인터페이스
      if (path === "/" || path === "/index.html") {
        return new Response(getWebPage(), {
          headers: { "Content-Type": "text/html", ...corsHeaders },
        });
      }

      return new Response("Not Found", { status: 404, headers: corsHeaders });
    } catch (error) {
      console.error("요청 처리 중 오류:", error);
      return new Response(
        JSON.stringify({
          success: false,
          error: "서버 내부 오류가 발생했습니다.",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }
  },
};

/**
 * API 요청 처리
 */
async function handleApiRequest(request, linkManagementService, corsHeaders) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // 링크 추가
  if (path === "/api/links" && method === "POST") {
    const { url: linkUrl, tags } = await request.json();

    if (!linkUrl) {
      return new Response(
        JSON.stringify({ success: false, error: "URL이 필요합니다." }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const result = await linkManagementService.addLink(linkUrl, tags || []);

    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  // 링크 목록 조회
  if (path === "/api/links" && method === "GET") {
    const result = await linkManagementService.getLinks();

    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  // 모든 링크 처리
  if (path === "/api/process" && method === "POST") {
    const result = await linkManagementService.processAllLinks();

    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  // 통계 조회
  if (path === "/api/statistics" && method === "GET") {
    const result = await linkManagementService.getStatistics();

    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  // 링크 삭제
  if (path.startsWith("/api/links/") && method === "DELETE") {
    const linkId = path.split("/").pop();
    const result = await linkManagementService.deleteLink(linkId);

    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 404,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  // 링크 재처리
  if (
    path.startsWith("/api/links/") &&
    path.endsWith("/reprocess") &&
    method === "POST"
  ) {
    const linkId = path.split("/")[3];
    const result = await linkManagementService.reprocessLink(linkId);

    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  // 태그 추가
  if (
    path.startsWith("/api/links/") &&
    path.endsWith("/tags") &&
    method === "POST"
  ) {
    const linkId = path.split("/")[3];
    const { tags } = await request.json();

    const result = await linkManagementService.addTagsToLink(
      linkId,
      tags || []
    );

    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  return new Response("API 엔드포인트를 찾을 수 없습니다.", {
    status: 404,
    headers: corsHeaders,
  });
}

/**
 * 웹 인터페이스 HTML 생성
 */
function getWebPage() {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>LinkDump Bot - 도메인 중심 아키텍처</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        
        .header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
            font-weight: 700;
        }
        
        .header p {
            opacity: 0.9;
            font-size: 1.1em;
        }
        
        .content {
            padding: 30px;
        }
        
        .form-group {
            margin-bottom: 25px;
        }
        
        label {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
            color: #333;
        }
        
        input[type="url"], input[type="text"] {
            width: 100%;
            padding: 15px;
            border: 2px solid #e1e5e9;
            border-radius: 10px;
            font-size: 16px;
            transition: border-color 0.3s ease;
        }
        
        input[type="url"]:focus, input[type="text"]:focus {
            outline: none;
            border-color: #667eea;
        }
        
        .button-group {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-top: 30px;
        }
        
        button {
            padding: 15px 25px;
            border: none;
            border-radius: 10px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .btn-primary {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        
        .btn-secondary {
            background: #f8f9fa;
            color: #495057;
            border: 2px solid #e9ecef;
        }
        
        .btn-info {
            background: #17a2b8;
            color: white;
        }
        
        button:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        }
        
        .status {
            margin-top: 20px;
            padding: 15px;
            border-radius: 10px;
            font-weight: 500;
        }
        
        .status.success {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        
        .status.error {
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
        
        .status.info {
            background: #d1ecf1;
            color: #0c5460;
            border: 1px solid #bee5eb;
        }
        
        .architecture-info {
            background: #f8f9fa;
            border-radius: 10px;
            padding: 20px;
            margin-top: 30px;
        }
        
        .architecture-info h3 {
            color: #495057;
            margin-bottom: 15px;
        }
        
        .architecture-info ul {
            list-style: none;
            padding-left: 0;
        }
        
        .architecture-info li {
            padding: 5px 0;
            color: #6c757d;
        }
        
        .architecture-info li:before {
            content: "✓ ";
            color: #28a745;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔗 LinkDump Bot</h1>
            <p>도메인 중심 아키텍처로 구축된 링크 관리 시스템</p>
        </div>
        
        <div class="content">
            <form id="linkForm">
                <div class="form-group">
                    <label for="url">링크 URL</label>
                    <input type="url" id="url" name="url" placeholder="https://example.com" required>
                </div>
                
                <div class="form-group">
                    <label for="tags">태그 (쉼표로 구분)</label>
                    <input type="text" id="tags" name="tags" placeholder="개발, 뉴스, 기술">
                </div>
                
                <div class="button-group">
                    <button type="submit" class="btn-primary">링크 추가</button>
                    <button type="button" onclick="processLinks()" class="btn-secondary">모든 링크 처리</button>
                    <button type="button" onclick="showStatistics()" class="btn-info">통계 보기</button>
                </div>
            </form>
            
            <div id="status"></div>
            
            <div class="architecture-info">
                <h3>🏗️ 도메인 중심 아키텍처 특징</h3>
                <ul>
                    <li>도메인 로직이 인프라스트럭처에 의존하지 않음</li>
                    <li>의존성 역전 원칙을 통한 유연한 구조</li>
                    <li>도메인 엔티티와 서비스의 명확한 분리</li>
                    <li>애플리케이션 서비스를 통한 유스케이스 관리</li>
                    <li>인프라스트럭처 구현체의 쉬운 교체</li>
                </ul>
            </div>
        </div>
    </div>

    <script>
        document.getElementById('linkForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const url = document.getElementById('url').value;
            const tagsInput = document.getElementById('tags').value;
            const tags = tagsInput ? tagsInput.split(',').map(tag => tag.trim()) : [];
            
            showStatus('링크를 추가하는 중...', 'info');
            
            try {
                const response = await fetch('/api/links', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ url, tags }),
                });
                
                const result = await response.json();
                
                if (result.success) {
                    showStatus(result.message, 'success');
                    document.getElementById('linkForm').reset();
                } else {
                    showStatus('오류: ' + result.error, 'error');
                }
            } catch (error) {
                showStatus('네트워크 오류: ' + error.message, 'error');
            }
        });
        
        async function processLinks() {
            showStatus('모든 링크를 처리하는 중...', 'info');
            
            try {
                const response = await fetch('/api/process', {
                    method: 'POST',
                });
                
                const result = await response.json();
                
                if (result.success) {
                    showStatus(\`처리 완료: \${result.successful}개 성공, \${result.failed}개 실패\`, 'success');
                } else {
                    showStatus('오류: ' + result.error, 'error');
                }
            } catch (error) {
                showStatus('네트워크 오류: ' + error.message, 'error');
            }
        }
        
        async function showStatistics() {
            showStatus('통계를 조회하는 중...', 'info');
            
            try {
                const response = await fetch('/api/statistics');
                const result = await response.json();
                
                if (result.success) {
                    const stats = result.statistics;
                    const message = \`총 \${stats.total}개 링크 | 대기: \${stats.pending} | 완료: \${stats.completed} | 실패: \${stats.failed}\`;
                    showStatus(message, 'success');
                } else {
                    showStatus('오류: ' + result.error, 'error');
                }
            } catch (error) {
                showStatus('네트워크 오류: ' + error.message, 'error');
            }
        }
        
        function showStatus(message, type) {
            const statusDiv = document.getElementById('status');
            statusDiv.textContent = message;
            statusDiv.className = \`status \${type}\`;
        }
    </script>
</body>
</html>`;
}
