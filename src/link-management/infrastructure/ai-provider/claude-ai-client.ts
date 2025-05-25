import Anthropic from "@anthropic-ai/sdk";
import type { AIClient, AIOptions } from "../../../shared/interfaces/index.js";

/**
 * Claude AI 클라이언트
 * Anthropic의 공식 SDK를 사용하여 고품질 텍스트를 생성합니다.
 */
export class ClaudeAIClient implements AIClient {
  private anthropic: Anthropic;
  private defaultModel: string;

  constructor(
    apiKey: string,
    defaultModel: string = "claude-3-haiku-20240307"
  ) {
    this.anthropic = new Anthropic({
      apiKey: apiKey,
    });
    this.defaultModel = defaultModel;
  }

  /**
   * Claude API를 사용하여 텍스트를 생성합니다.
   */
  async generateText(prompt: string, options: AIOptions = {}): Promise<string> {
    try {
      const response = await this.anthropic.messages.create({
        model: options.model || this.defaultModel,
        max_tokens: options.maxTokens || 1000,
        temperature: options.temperature || 0.7,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      return this.parseResponse(response);
    } catch (error) {
      console.error("Claude AI 텍스트 생성 실패:", error);
      throw new Error(
        `Claude AI 텍스트 생성에 실패했습니다: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Claude API 응답을 파싱합니다.
   */
  private parseResponse(response: Anthropic.Messages.Message): string {
    if (response.content && response.content.length > 0) {
      const textContent = response.content.find(
        (c): c is Anthropic.TextBlock => c.type === "text"
      );
      if (textContent) {
        return textContent.text.trim();
      }
    }

    throw new Error("Claude API 응답에서 텍스트를 찾을 수 없습니다.");
  }
}
