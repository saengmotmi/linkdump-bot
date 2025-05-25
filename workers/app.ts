import "reflect-metadata";
import { container } from "tsyringe";
import { createCloudflareContainer } from "../src/shared/container/cloudflare-container.js";
import { LinkManagementService } from "../src/link-management/application/link-management-service.js";
import { TOKENS, type Config } from "../src/shared/interfaces/index.js";

export default {
  async fetch(request: Request, env: any, ctx: any): Promise<Response> {
    try {
      // TSyringe 컨테이너 설정
      await createCloudflareContainer(env, ctx);

      // 서비스 해결
      const linkManagementService = container.resolve(LinkManagementService);

      const url = new URL(request.url);
      const method = request.method;

      // CORS 헤더 설정
      const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      };

      // OPTIONS 요청 처리
      if (method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
      }

      // API 라우팅
      if (url.pathname.startsWith("/api/")) {
        let response: Response;

        if (url.pathname === "/api/add-link" && method === "POST") {
          response = await handleAddLink(request, linkManagementService);
        } else if (url.pathname === "/api/process-links" && method === "POST") {
          response = await handleProcessLinks(linkManagementService);
        } else if (url.pathname === "/api/config" && method === "GET") {
          response = await handleGetConfig(env);
        } else if (url.pathname === "/api/links" && method === "GET") {
          response = await handleGetLinks(linkManagementService);
        } else {
          response = new Response("Not Found", { status: 404 });
        }

        // CORS 헤더 추가
        Object.entries(corsHeaders).forEach(([key, value]) => {
          response.headers.set(key, value);
        });

        return response;
      }

      // 웹 페이지 서빙
      if (method === "GET") {
        return getWebPage();
      }

      return new Response("Method Not Allowed", { status: 405 });
    } catch (error: any) {
      console.error("Worker error:", error);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Internal Server Error",
          details: error.message,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  },
};

/**
 * 링크 추가 핸들러
 */
async function handleAddLink(
  request: Request,
  linkManagementService: LinkManagementService
): Promise<Response> {
  try {
    const { url, tags } = (await request.json()) as {
      url: string;
      tags?: string[];
    };

    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: "URL is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const result = await linkManagementService.addLink(url, tags || []);

    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 400,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

/**
 * 모든 링크 처리 핸들러
 */
async function handleProcessLinks(
  linkManagementService: LinkManagementService
): Promise<Response> {
  try {
    const result = await linkManagementService.processAllLinks();

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

/**
 * 링크 목록 조회 핸들러
 */
async function handleGetLinks(
  linkManagementService: LinkManagementService
): Promise<Response> {
  try {
    const result = await linkManagementService.getLinks();

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

/**
 * 설정 조회 핸들러 - 실제 컨테이너 설정을 동적으로 조회
 */
async function handleGetConfig(env: any): Promise<Response> {
  try {
    // 실제 컨테이너에서 설정 조회
    const config = container.resolve<Config>(TOKENS.Config);

    // 등록된 서비스들의 실제 구현체 확인
    const aiClient = container.resolve(TOKENS.AIClient);
    const storage = container.resolve(TOKENS.Storage);
    const notifier = container.resolve(TOKENS.Notifier);
    const backgroundTaskRunner = container.resolve(TOKENS.BackgroundTaskRunner);

    const responseConfig = {
      hasWebhooks: !!(config.webhookUrls && config.webhookUrls.length > 0),
      architecture: "TSyringe-based Dependency Injection",
      environment: env.CF_PAGES ? "Cloudflare Pages" : "Cloudflare Workers",
      services: {
        ai: (aiClient as any).constructor.name,
        storage: (storage as any).constructor.name,
        notifications: (notifier as any).constructor.name,
        backgroundTasks: (backgroundTaskRunner as any).constructor.name,
      },
    };

    return new Response(
      JSON.stringify({ success: true, config: responseConfig }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

/**
 * 웹 페이지 생성
 */
function getWebPage(): Response {
  const html = `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>LinkDump Bot - TSyringe Edition</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .container {
            background: white;
            border-radius: 20px;
            padding: 40px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            max-width: 600px;
            width: 100%;
            text-align: center;
        }
        .badge {
            display: inline-block;
            background: linear-gradient(45deg, #ff6b6b, #ee5a24);
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            margin-bottom: 20px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        h1 {
            color: #2c3e50;
            margin-bottom: 10px;
            font-size: 2.5em;
            font-weight: 700;
        }
        .subtitle {
            color: #7f8c8d;
            margin-bottom: 30px;
            font-size: 1.1em;
        }
        .features {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin: 30px 0;
        }
        .feature {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 12px;
            border-left: 4px solid #3498db;
        }
        .feature h3 {
            color: #2c3e50;
            margin-bottom: 8px;
            font-size: 1.1em;
        }
        .feature p {
            color: #7f8c8d;
            font-size: 0.9em;
            line-height: 1.5;
        }
        .api-section {
            margin-top: 40px;
            padding-top: 30px;
            border-top: 2px solid #ecf0f1;
        }
        .api-title {
            color: #2c3e50;
            margin-bottom: 20px;
            font-size: 1.3em;
        }
        .endpoints {
            display: grid;
            gap: 10px;
            text-align: left;
        }
        .endpoint {
            background: #2c3e50;
            color: white;
            padding: 12px 16px;
            border-radius: 8px;
            font-family: 'Monaco', 'Menlo', monospace;
            font-size: 0.9em;
        }
        .method {
            color: #e74c3c;
            font-weight: bold;
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #ecf0f1;
            color: #95a5a6;
            font-size: 0.9em;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="badge">TSyringe-Powered</div>
        <h1>🔗 LinkDump Bot</h1>
        <p class="subtitle">Professional Dependency Injection with TypeScript</p>
        
        <div class="features">
            <div class="feature">
                <h3>🎯 Type Safety</h3>
                <p>Complete TypeScript interfaces with compile-time type checking</p>
            </div>
            <div class="feature">
                <h3>🔧 TSyringe DI</h3>
                <p>Industry-standard dependency injection with decorators</p>
            </div>
            <div class="feature">
                <h3>⚡ Dynamic Imports</h3>
                <p>Optimized bundle size with lazy loading</p>
            </div>
            <div class="feature">
                <h3>🏗️ Clean Architecture</h3>
                <p>Domain-driven design with clear separation of concerns</p>
            </div>
        </div>

        <div class="api-section">
            <h2 class="api-title">🚀 API Endpoints</h2>
            <div class="endpoints">
                <div class="endpoint"><span class="method">POST</span> /api/add-link</div>
                <div class="endpoint"><span class="method">GET</span> /api/links</div>
                <div class="endpoint"><span class="method">POST</span> /api/process-links</div>
                <div class="endpoint"><span class="method">GET</span> /api/config</div>
            </div>
        </div>

        <div class="footer">
            <p>Powered by TSyringe • Cloudflare Workers • TypeScript</p>
        </div>
    </div>
</body>
</html>`;

  return new Response(html, {
    headers: { "Content-Type": "text/html" },
  });
}
