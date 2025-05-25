import { injectable } from "tsyringe";
import { LinkManagementService } from "../../../link-management/application/link-management-service.js";
import {
  ApiErrorHandler,
  ValidationError,
} from "../middleware/error-handler.js";

/**
 * 링크 관련 API 컨트롤러
 */
@injectable()
export class LinkController {
  constructor(private linkManagementService: LinkManagementService) {}

  /**
   * 링크 추가 API
   */
  async addLink(request: Request): Promise<Response> {
    const result = await ApiErrorHandler.wrapAsync(async () => {
      const { url, tags } = (await request.json()) as {
        url: string;
        tags?: string[];
      };

      if (!url) {
        throw new ValidationError("URL is required");
      }

      const serviceResult = await this.linkManagementService.addLink(
        url,
        tags || []
      );

      return new Response(JSON.stringify(serviceResult), {
        status: serviceResult.success ? 200 : 400,
        headers: { "Content-Type": "application/json" },
      });
    }, "LinkController.addLink");

    return result as Response;
  }

  /**
   * 모든 링크 처리 API
   */
  async processLinks(): Promise<Response> {
    const result = await ApiErrorHandler.wrapAsync(async () => {
      const serviceResult = await this.linkManagementService.processAllLinks();

      return new Response(JSON.stringify(serviceResult), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }, "LinkController.processLinks");

    return result as Response;
  }

  /**
   * 링크 목록 조회 API
   */
  async getLinks(): Promise<Response> {
    const result = await ApiErrorHandler.wrapAsync(async () => {
      const serviceResult = await this.linkManagementService.getLinks();

      return new Response(JSON.stringify(serviceResult), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }, "LinkController.getLinks");

    return result as Response;
  }
}
