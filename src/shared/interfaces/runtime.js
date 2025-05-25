/**
 * 런타임 인터페이스 - 다양한 실행 환경을 지원
 */
export class RuntimeInterface {
  /**
   * HTTP 요청 처리
   * @param {Request} request - HTTP 요청 객체
   * @param {Object} context - 실행 컨텍스트
   * @returns {Promise<Response>} HTTP 응답
   */
  async handleRequest(request, context) {
    throw new Error("handleRequest method must be implemented");
  }

  /**
   * 백그라운드 작업 스케줄링
   * @param {Function} task - 실행할 작업
   * @param {Object} options - 스케줄링 옵션
   * @returns {Promise<void>}
   */
  async scheduleBackgroundTask(task, options = {}) {
    throw new Error("scheduleBackgroundTask method must be implemented");
  }

  /**
   * 환경 변수 조회
   * @param {string} key - 환경 변수 키
   * @returns {string|undefined} 환경 변수 값
   */
  getEnvironmentVariable(key) {
    throw new Error("getEnvironmentVariable method must be implemented");
  }

  /**
   * 로깅
   * @param {string} level - 로그 레벨 (info, warn, error)
   * @param {string} message - 로그 메시지
   * @param {Object} metadata - 추가 메타데이터
   */
  log(level, message, metadata = {}) {
    throw new Error("log method must be implemented");
  }

  /**
   * 런타임 정보
   * @returns {Object} 런타임 메타데이터
   */
  getRuntimeInfo() {
    throw new Error("getRuntimeInfo method must be implemented");
  }
}
