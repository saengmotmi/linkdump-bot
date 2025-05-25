import { injectable, inject } from "tsyringe";
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
@injectable()
export class WorkersAIClient implements AIClient {
  private ai: any; // Cloudflare AI binding
  private defaultModel: string;

  constructor(
    @inject("AI_BINDING") aiBinding: any,
    defaultModel: string = "@cf/meta/llama-3.2-1b-instruct"
  ) {
    this.ai = aiBinding;
    this.defaultModel = defaultModel;
  }

  /**
   * 텍스트 생성
   */
  async generateText(prompt: string, options: AIOptions = {}): Promise<string> {
    const {
      maxTokens = 150,
      temperature = 0.7,
      model = this.defaultModel,
    } = options;

    try {
      const response = await this.ai.run(model, {
        messages: [{ role: "user", content: prompt }],
        max_tokens: maxTokens,
        temperature,
      });

      return this._parseResponse(response);
    } catch (error: any) {
      throw new Error(`Workers AI 생성 실패: ${error.message}`);
    }
  }

  /**
   * 채팅 완성
   */
  async chatCompletion(
    messages: WorkersAIMessage[],
    options: AIOptions = {}
  ): Promise<string> {
    const {
      maxTokens = 150,
      temperature = 0.7,
      model = this.defaultModel,
    } = options;

    try {
      const response = await this.ai.run(model, {
        messages,
        max_tokens: maxTokens,
        temperature,
      });

      return this._parseResponse(response);
    } catch (error: any) {
      throw new Error(`Workers AI 채팅 완성 실패: ${error.message}`);
    }
  }

  /**
   * 응답 파싱
   */
  private _parseResponse(response: WorkersAIResponse): string {
    if (!response) {
      throw new Error("Workers AI에서 빈 응답을 받았습니다");
    }

    return (
      response.response || response.result || "AI 요약을 생성할 수 없습니다."
    );
  }
}
