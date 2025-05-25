/**
 * OpenAI API 클라이언트
 */
export class OpenAIClient {
  constructor(apiKey, defaultModel = "gpt-3.5-turbo") {
    this.apiKey = apiKey;
    this.defaultModel = defaultModel;
    this.baseUrl = "https://api.openai.com/v1";
  }

  /**
   * 텍스트 생성
   */
  async generateText(prompt, options = {}) {
    const messages = [{ role: "user", content: prompt }];
    return await this.chatCompletion(messages, options);
  }

  /**
   * 채팅 완성
   */
  async chatCompletion(messages, options = {}) {
    const {
      maxTokens = 150,
      temperature = 0.7,
      model = this.defaultModel,
    } = options;

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: maxTokens,
          temperature,
        }),
      });

      if (!response.ok) {
        throw new Error(
          `OpenAI API 오류: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      return (
        data.choices[0]?.message?.content || "AI 요약을 생성할 수 없습니다."
      );
    } catch (error) {
      throw new Error(`OpenAI 생성 실패: ${error.message}`);
    }
  }
}
