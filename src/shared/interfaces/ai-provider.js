/**
 * AI 제공자 인터페이스 - 다양한 AI 서비스를 지원
 */
export class AIProviderInterface {
  /**
   * 텍스트 생성/완성
   * @param {string} prompt - 입력 프롬프트
   * @param {Object} options - 생성 옵션
   * @param {number} options.maxTokens - 최대 토큰 수
   * @param {number} options.temperature - 창의성 수준 (0-1)
   * @param {string} options.model - 사용할 모델 (선택사항)
   * @returns {Promise<string>} 생성된 텍스트
   */
  async generateText(prompt, options = {}) {
    throw new Error("generateText method must be implemented");
  }

  /**
   * 채팅 완성
   * @param {Array} messages - 메시지 배열 [{role: 'user'|'assistant', content: string}]
   * @param {Object} options - 생성 옵션
   * @returns {Promise<string>} 생성된 응답
   */
  async chatCompletion(messages, options = {}) {
    throw new Error("chatCompletion method must be implemented");
  }

  /**
   * 사용 가능한 모델 목록
   * @returns {Promise<string[]>} 모델 이름 배열
   */
  async getAvailableModels() {
    throw new Error("getAvailableModels method must be implemented");
  }

  /**
   * 제공자 정보
   * @returns {Object} 제공자 메타데이터
   */
  getProviderInfo() {
    throw new Error("getProviderInfo method must be implemented");
  }
}
