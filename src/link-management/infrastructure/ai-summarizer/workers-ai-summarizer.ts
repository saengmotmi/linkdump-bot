import type {
  AISummarizer,
  AIClient,
} from "../../../shared/interfaces/index.js";
import { TOKENS } from "../../../shared/interfaces/index.js";

/**
 * Cloudflare Workers AI 기반 요약 구현체
 */
export class WorkersAISummarizer implements AISummarizer {
  private workersAIClient: AIClient;

  constructor(workersAIClient: AIClient) {
    this.workersAIClient = workersAIClient;
  }

  /**
   * 콘텐츠 요약 생성
   */
  async summarize(content: {
    url: string;
    title?: string;
    description?: string;
  }): Promise<string> {
    const { url, title, description } = content;
    const prompt = this.buildPrompt(url, title, description);

    try {
      const summary = await this.workersAIClient.generateText(prompt, {
        maxTokens: 150,
      });

      return this.cleanupSummary(summary);
    } catch (error: any) {
      console.warn("Workers AI 요약 실패:", error);
      return this.generateFallbackSummary(title, description);
    }
  }

  /**
   * AI를 사용하여 의미있는 타이틀 생성
   */
  async generateTitle(contentData: {
    url: string;
    title?: string;
    description?: string;
    content?: string;
  }): Promise<string> {
    const { url, title, description, content } = contentData;

    // 이미 좋은 타이틀이 있으면 그대로 사용
    if (
      title &&
      title.trim() &&
      title.length > 10 &&
      !title.includes("No Title")
    ) {
      return title.trim();
    }

    const prompt = this.buildTitlePrompt(url, title, description, content);

    try {
      const generatedTitle = await this.workersAIClient.generateText(prompt, {
        maxTokens: 50,
        temperature: 0.7,
      });

      const cleanTitle = this.cleanupTitle(generatedTitle);

      // AI 생성 타이틀이 너무 짧거나 의미없으면 폴백 사용
      if (cleanTitle.length < 5) {
        return this.generateFallbackTitle(url, title, description);
      }

      return cleanTitle;
    } catch (error: any) {
      console.warn("AI 타이틀 생성 실패:", error);
      return this.generateFallbackTitle(url, title, description);
    }
  }

  /**
   * 요약 프롬프트 생성
   */
  private buildPrompt(
    url: string,
    title?: string,
    description?: string
  ): string {
    return `다음 웹페이지를 한국어로 간단히 요약해주세요:

URL: ${url}
제목: ${title || "N/A"}
설명: ${description || "N/A"}

2-3문장으로 핵심 내용을 요약해주세요:`;
  }

  /**
   * 타이틀 생성 프롬프트 생성
   */
  private buildTitlePrompt(
    url: string,
    title?: string,
    description?: string,
    content?: string
  ): string {
    return `다음 웹페이지의 내용을 바탕으로 한국어로 간결하고 의미있는 제목을 생성해주세요:

URL: ${url}
기존 제목: ${title || "없음"}
설명: ${description || "없음"}
${content ? `내용 일부: ${content.substring(0, 200)}...` : ""}

요구사항:
- 10-50자 이내
- 한국어로 작성
- 내용의 핵심을 담은 제목
- 클릭하고 싶게 만드는 제목

제목:`;
  }

  /**
   * 요약 결과 정리
   */
  private cleanupSummary(summary: string): string {
    return summary.trim().replace(/\n+/g, " ").substring(0, 300);
  }

  /**
   * 타이틀 결과 정리
   */
  private cleanupTitle(title: string): string {
    return title
      .trim()
      .replace(/^제목:\s*/i, "")
      .replace(/^타이틀:\s*/i, "")
      .replace(/["']/g, "")
      .replace(/\n+/g, " ")
      .substring(0, 100);
  }

  /**
   * 폴백 요약 생성
   */
  private generateFallbackSummary(
    title?: string,
    description?: string
  ): string {
    if (title && description) {
      return `${title}: ${description}`.substring(0, 200);
    }
    if (title) {
      return title.substring(0, 100);
    }
    if (description) {
      return description.substring(0, 200);
    }
    return "AI 요약을 생성할 수 없습니다.";
  }

  /**
   * 폴백 타이틀 생성
   */
  private generateFallbackTitle(
    url: string,
    title?: string,
    description?: string
  ): string {
    if (title && title.trim()) {
      return title.trim();
    }

    // URL에서 도메인명 추출
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;

      // X(트위터) 특별 처리
      if (hostname.includes("x.com") || hostname.includes("twitter.com")) {
        return "트윗";
      }

      // GitHub 특별 처리
      if (hostname.includes("github.com")) {
        const pathParts = urlObj.pathname.split("/").filter(Boolean);
        if (pathParts.length >= 2) {
          return `${pathParts[0]}/${pathParts[1]} - GitHub`;
        }
      }

      // 일반적인 도메인명 사용
      return hostname.replace("www.", "");
    } catch {
      return "링크";
    }
  }
}
