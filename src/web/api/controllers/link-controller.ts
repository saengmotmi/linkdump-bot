import { injectable } from "tsyringe";
import { LinkManagementService } from "../../../link-management/application/link-management-service.js";

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

      const result = await this.linkManagementService.addLink(url, tags || []);

      return new Response(JSON.stringify(result), {
        status: result.success ? 200 : 400,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return new Response(
        JSON.stringify({ success: false, error: errorMessage }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  /**
   * 모든 링크 처리 API
   */
  async processLinks(): Promise<Response> {
    try {
      const result = await this.linkManagementService.processAllLinks();

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return new Response(
        JSON.stringify({ success: false, error: errorMessage }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  /**
   * 링크 목록 조회 API
   */
  async getLinks(): Promise<Response> {
    try {
      const result = await this.linkManagementService.getLinks();

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return new Response(
        JSON.stringify({ success: false, error: errorMessage }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }
}
