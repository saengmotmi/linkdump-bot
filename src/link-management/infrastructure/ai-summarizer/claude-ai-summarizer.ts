import type {
  AISummarizer,
  AIClient,
} from "../../../shared/interfaces/index.js";

/**
 * Claude AI 기반 요약 구현체
 * 고품질 한국어 요약을 생성합니다.
 */
export class ClaudeAISummarizer implements AISummarizer {
  private claudeAIClient: AIClient;

  constructor(claudeAIClient: AIClient) {
    this.claudeAIClient = claudeAIClient;
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
      const summary = await this.claudeAIClient.generateText(prompt, {
        maxTokens: 300,
        temperature: 0.3, // 더 일관된 결과를 위해 낮은 temperature
      });

      return this.cleanupSummary(summary);
    } catch (error: any) {
      console.warn("Claude AI 요약 실패:", error);
      return this.generateFallbackSummary(title, description);
    }
  }

  /**
   * 요약 프롬프트 생성 - Claude에 최적화된 프롬프트
   */
  private buildPrompt(
    url: string,
    title?: string,
    description?: string
  ): string {
    return `다음 웹페이지의 내용을 분석하여 한국어로 간결하고 유용한 요약을 작성해주세요.

웹페이지 정보:
- URL: ${url}
- 제목: ${title || "제목 없음"}
- 설명: ${description || "설명 없음"}

요약 작성 가이드라인:
1. 2-3문장으로 핵심 내용을 요약
2. 독자가 왜 이 링크를 클릭해야 하는지 명확히 설명
3. 전문적이고 자연스러운 한국어 사용
4. 불필요한 수식어나 과장 표현 지양

요약:`;
  }

  /**
   * 요약 결과 정리
   */
  private cleanupSummary(summary: string): string {
    return summary
      .trim()
      .replace(/^요약:\s*/i, "") // "요약:" 접두사 제거
      .replace(/\n+/g, " ") // 줄바꿈을 공백으로 변경
      .replace(/\s+/g, " ") // 연속된 공백을 하나로 통합
      .substring(0, 400); // 최대 400자로 제한
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
      return `${title}에 대한 내용입니다.`.substring(0, 100);
    }
    if (description) {
      return description.substring(0, 200);
    }
    return "링크 내용을 확인해보세요.";
  }
}
