/**
 * OpenAI 기반 AI 요약 구현체
 */
export class OpenAISummarizer {
  constructor(openaiClient) {
    this.openaiClient = openaiClient;
  }

  /**
   * 콘텐츠 요약 생성
   */
  async summarize({ url, title, description }) {
    const prompt = this.buildPrompt(url, title, description);

    try {
      const summary = await this.openaiClient.generateText(prompt, {
        maxTokens: 150,
        temperature: 0.7,
      });

      return this.cleanupSummary(summary);
    } catch (error) {
      console.warn("OpenAI 요약 실패:", error);
      return this.generateFallbackSummary(title, description);
    }
  }

  /**
   * 요약 프롬프트 생성
   */
  buildPrompt(url, title, description) {
    return `다음 웹페이지를 한국어로 간단히 요약해주세요:

URL: ${url}
제목: ${title || "N/A"}
설명: ${description || "N/A"}

요구사항:
- 2-3문장으로 핵심 내용 요약
- 한국어로 작성
- 객관적이고 정확한 정보 전달

요약:`;
  }

  /**
   * 요약 결과 정리
   */
  cleanupSummary(summary) {
    return summary
      .trim()
      .replace(/^요약:\s*/i, "")
      .replace(/\n+/g, " ")
      .substring(0, 300);
  }

  /**
   * 폴백 요약 생성
   */
  generateFallbackSummary(title, description) {
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
