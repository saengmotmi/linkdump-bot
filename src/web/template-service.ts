/**
 * 웹 템플릿 서비스
 * HTML 템플릿을 관리하고 제공합니다.
 */
export class TemplateService {
  private static cachedTemplate: string | null = null;

  /**
   * 인덱스 페이지 HTML 반환
   */
  static async getIndexPage(): Promise<string> {
    if (this.cachedTemplate) {
      return this.cachedTemplate;
    }

    try {
      // Dynamic import로 템플릿 로드
      const templateModule = await import("./templates/index.html.js");
      this.cachedTemplate = templateModule.indexTemplate;
      return this.cachedTemplate;
    } catch (error) {
      console.warn("템플릿 로드 실패, fallback 사용:", error);
      // Dynamic import 실패 시 fallback 템플릿 사용
      try {
        const fallbackModule = await import("./templates/fallback.html.js");
        this.cachedTemplate = fallbackModule.fallbackTemplate;
        return this.cachedTemplate;
      } catch (fallbackError) {
        console.error("Fallback 템플릿 로드도 실패:", fallbackError);
        // 최후의 수단으로 간단한 HTML 반환
        this.cachedTemplate = `<!DOCTYPE html><html><head><title>LinkDump Bot</title></head><body><h1>Service Unavailable</h1></body></html>`;
        return this.cachedTemplate;
      }
    }
  }

  /**
   * 웹 페이지 Response 생성
   */
  static async createWebPageResponse(): Promise<Response> {
    const html = await this.getIndexPage();
    return new Response(html, {
      headers: { "Content-Type": "text/html" },
    });
  }
}
