import { injectable, container } from "tsyringe";
import { TOKENS } from "../../../shared/interfaces/index.js";
import type { ContentScraper } from "../../../shared/interfaces/index.js";
import {
  ApiErrorHandler,
  ValidationError,
} from "../middleware/error-handler.js";

/**
 * 링크 미리보기 API 컨트롤러
 */
@injectable()
export class PreviewController {
  constructor(
    private contentScraper: ContentScraper = container.resolve<ContentScraper>(
      TOKENS.ContentScraper
    )
  ) {}

  /**
   * 링크 미리보기 생성 API
   */
  async getPreview(request: Request): Promise<Response> {
    const result = await ApiErrorHandler.wrapAsync(async () => {
      let targetUrl: string;

      // POST 요청의 경우 JSON body에서 URL 추출
      if (request.method === "POST") {
        const body = (await request.json()) as { url?: string };
        targetUrl = body.url || "";
      } else {
        // GET 요청의 경우 쿼리 파라미터에서 URL 추출 (하위 호환성)
        const url = new URL(request.url);
        targetUrl = url.searchParams.get("url") || "";
      }

      if (!targetUrl) {
        throw new ValidationError("URL parameter is required");
      }

      const preview = await this.contentScraper.scrape(targetUrl);

      return new Response(JSON.stringify({ success: true, preview }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }, "PreviewController.getPreview");

    return result as Response;
  }
}
