import { container } from "tsyringe";
import { LinkController } from "./controllers/link-controller.js";
import { ConfigController } from "./controllers/config-controller.js";
import { PreviewController } from "./controllers/preview-controller.js";
import { TOKENS, type CloudflareEnv } from "../../shared/interfaces/index.js";

/**
 * API 라우터
 * HTTP 요청을 적절한 컨트롤러로 라우팅합니다.
 */
export class ApiRouter {
  private linkController: LinkController;
  private configController: ConfigController;
  private previewController: PreviewController;

  constructor() {
    this.linkController = container.resolve(TOKENS.LinkController);
    this.configController = container.resolve(TOKENS.ConfigController);
    this.previewController = container.resolve(TOKENS.PreviewController);
  }

  /**
   * API 요청을 처리합니다.
   */
  async handleRequest(request: Request, env: CloudflareEnv): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method;
    const pathname = url.pathname;

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

    let response: Response;

    try {
      // 라우팅
      if (pathname === "/api/add-link" && method === "POST") {
        response = await this.linkController.addLink(request);
      } else if (pathname === "/api/process-links" && method === "POST") {
        response = await this.linkController.processLinks();
      } else if (pathname === "/api/links" && method === "GET") {
        response = await this.linkController.getLinks();
      } else if (pathname === "/api/config" && method === "GET") {
        response = await this.configController.getConfig(env);
      } else if (pathname === "/api/preview" && method === "POST") {
        response = await this.previewController.getPreview(request);
      } else {
        response = new Response(
          JSON.stringify({ success: false, error: "Not Found" }),
          {
            status: 404,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // CORS 헤더 추가
      Object.entries(corsHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
      });

      return response;
    } catch (error) {
      console.error("API Router error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      const errorResponse = new Response(
        JSON.stringify({
          success: false,
          error: "Internal Server Error",
          details: errorMessage,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );

      // CORS 헤더 추가
      Object.entries(corsHeaders).forEach(([key, value]) => {
        errorResponse.headers.set(key, value);
      });

      return errorResponse;
    }
  }
}
