import { injectable } from "tsyringe";

interface WorkersEnv {
  [key: string]: any;
}

interface WorkersContext {
  waitUntil(promise: Promise<any>): void;
}

/**
 * Cloudflare Workers 런타임
 */
@injectable()
export class WorkersRuntime {
  constructor(private env: WorkersEnv, private ctx: WorkersContext) {}

  /**
   * 백그라운드 태스크 스케줄링
   */
  async scheduleBackgroundTask(task: () => Promise<void>): Promise<void> {
    // Cloudflare Workers의 waitUntil을 사용
    this.ctx.waitUntil(task());
  }

  /**
   * 환경 변수 조회
   */
  getEnvironmentVariable(key: string): any {
    return this.env[key];
  }

  /**
   * 로깅
   */
  log(
    level: string,
    message: string,
    metadata: Record<string, any> = {}
  ): void {
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
  getCorsHeaders(): Record<string, string> {
    return {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };
  }
}
