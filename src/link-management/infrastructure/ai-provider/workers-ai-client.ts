import type { AIClient, AIOptions } from "../../../shared/interfaces/index.js";

interface WorkersAIMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface WorkersAIResponse {
  response?: string;
  result?: string;
}

/**
 * Cloudflare Workers AI 클라이언트
 */
export class WorkersAIClient implements AIClient {
  private ai: Ai; // Cloudflare AI binding
  private defaultModel: "@cf/meta/llama-2-7b-chat-int8";

  constructor(
    aiBinding: Ai,
    defaultModel: "@cf/meta/llama-2-7b-chat-int8" = "@cf/meta/llama-2-7b-chat-int8"
  ) {
    this.ai = aiBinding;
    this.defaultModel = defaultModel;
  }

  /**
   * AI 모델을 사용하여 텍스트를 생성합니다.
   */
  async generateText(prompt: string, options: AIOptions = {}): Promise<string> {
    try {
      const response = await this.ai.run(this.defaultModel, {
        prompt,
        max_tokens: options.maxTokens || 512,
        temperature: options.temperature || 0.7,
      });

      return this.parseResponse(response);
    } catch (error) {
      console.error("AI 텍스트 생성 실패:", error);
      throw new Error("AI 텍스트 생성에 실패했습니다.");
    }
  }

  /**
   * AI 응답을 파싱합니다.
   */
  private parseResponse(response: AiTextGenerationOutput): string {
    if (typeof response === "string") {
      return response;
    }

    if (response && typeof response === "object" && "response" in response) {
      return (
        (response as WorkersAIResponse).response ||
        "AI 응답을 생성할 수 없습니다."
      );
    }

    return String(response) || "AI 응답을 생성할 수 없습니다.";
  }
}
