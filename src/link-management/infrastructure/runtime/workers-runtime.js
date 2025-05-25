/**
 * Cloudflare Workers 런타임
 */
export class WorkersRuntime {
  constructor(env, ctx) {
    this.env = env;
    this.ctx = ctx;
  }

  /**
   * 백그라운드 태스크 스케줄링
   */
  async scheduleBackgroundTask(task) {
    // Cloudflare Workers의 waitUntil을 사용
    this.ctx.waitUntil(task());
  }

  /**
   * 환경 변수 조회
   */
  getEnvironmentVariable(key) {
    return this.env[key];
  }

  /**
   * 로깅
   */
  log(level, message, metadata = {}) {
    const timestamp = new Date().toISOString();

    switch (level) {
      case "error":
        console.error(`[${timestamp}] ERROR:`, message, metadata);
        break;
      case "warn":
        console.warn(`[${timestamp}] WARN:`, message, metadata);
        break;
      default:
        console.log(`[${timestamp}] INFO:`, message, metadata);
    }
  }

  /**
   * CORS 헤더 생성
   */
  getCorsHeaders() {
    return {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };
  }
}
