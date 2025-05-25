import { container } from "tsyringe";
import { LinkController } from "./controllers/link-controller.js";
import { ConfigController } from "./controllers/config-controller.js";
import { PreviewController } from "./controllers/preview-controller.js";
import { TOKENS, type CloudflareEnv } from "../../shared/interfaces/index.js";
import { ApiErrorHandler, NotFoundError } from "./middleware/error-handler.js";

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

    // OPTIONS 요청 처리 (CORS preflight)
    if (method === "OPTIONS") {
      return ApiErrorHandler.addCorsHeaders(
        new Response(null, { status: 200 })
      );
    }

    // 라우팅 및 에러 처리
    const result = await ApiErrorHandler.wrapAsync(async () => {
      return await this.routeRequest(pathname, method, request, env);
    }, `${method} ${pathname}`);

    // 결과가 Response인 경우 (에러 처리된 경우)
    if (result instanceof Response) {
      return ApiErrorHandler.addCorsHeaders(result);
    }

    // 정상 응답에 CORS 헤더 추가
    return ApiErrorHandler.addCorsHeaders(result as Response);
  }

  /**
   * 요청을 적절한 컨트롤러로 라우팅합니다.
   */
  private async routeRequest(
    pathname: string,
    method: string,
    request: Request,
    env: CloudflareEnv
  ): Promise<Response> {
    // 라우팅 테이블
    const routes = [
      {
        path: "/api/add-link",
        method: "POST",
        handler: () => this.linkController.addLink(request),
      },
      {
        path: "/api/process-links",
        method: "POST",
        handler: () => this.linkController.processLinks(),
      },
      {
        path: "/api/links",
        method: "GET",
        handler: () => this.linkController.getLinks(),
      },
      {
        path: "/api/config",
        method: "GET",
        handler: () => this.configController.getConfig(env),
      },
      {
        path: "/api/preview",
        method: "POST",
        handler: () => this.previewController.getPreview(request),
      },
    ];

    // 매칭되는 라우트 찾기
    const route = routes.find(
      (r) => r.path === pathname && r.method === method
    );

    if (!route) {
      throw new NotFoundError(`Endpoint ${method} ${pathname} not found`);
    }

    return await route.handler();
  }
}
