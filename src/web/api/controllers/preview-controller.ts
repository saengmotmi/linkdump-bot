import { injectable, container } from "tsyringe";
import { TOKENS } from "../../../shared/interfaces/index.js";

/**
 * 미리보기 관련 API 컨트롤러
 */
@injectable()
export class PreviewController {
  /**
   * 링크 미리보기 API
   */
  async getPreview(request: Request): Promise<Response> {
    try {
      const { url } = (await request.json()) as { url: string };

      if (!url) {
        return new Response(
          JSON.stringify({ success: false, error: "URL is required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // 컨테이너에서 서비스들 가져오기
      const contentScraper = container.resolve(TOKENS.ContentScraper) as any;
      const aiSummarizer = container.resolve(TOKENS.AISummarizer) as any;

      // 콘텐츠 스크래핑
      const scrapedData = await contentScraper.scrape(url);

      // AI 타이틀 생성 (가능한 경우)
      let title = scrapedData.title || "";
      if (
        "generateTitle" in aiSummarizer &&
        typeof aiSummarizer.generateTitle === "function"
      ) {
        try {
          title = await aiSummarizer.generateTitle({
            url,
            title: scrapedData.title,
            description: scrapedData.description,
            content: scrapedData.content,
          });
        } catch (error) {
          console.warn("AI 타이틀 생성 실패:", error);
          // 폴백 타이틀 생성
          if (!title) {
            try {
              const urlObj = new URL(url);
              const hostname = urlObj.hostname;
              if (
                hostname.includes("x.com") ||
                hostname.includes("twitter.com")
              ) {
                title = "트윗";
              } else {
                title = hostname.replace("www.", "");
              }
            } catch {
              title = "링크";
            }
          }
        }
      }

      // AI 요약 생성
      let summary = "";
      try {
        summary = await aiSummarizer.summarize({
          url,
          title: scrapedData.title,
          description: scrapedData.description,
        });
      } catch (error) {
        console.warn("AI 요약 생성 실패:", error);
        summary = scrapedData.description || "요약을 생성할 수 없습니다.";
      }

      return new Response(
        JSON.stringify({
          success: true,
          preview: {
            url,
            title,
            description: scrapedData.description || "",
            summary,
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
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
