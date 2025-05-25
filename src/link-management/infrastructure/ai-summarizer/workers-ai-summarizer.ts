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
   * 요약 결과 정리
   */
  private cleanupSummary(summary: string): string {
    return summary.trim().replace(/\n+/g, " ").substring(0, 300);
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
}
