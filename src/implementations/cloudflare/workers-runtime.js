import { RuntimeInterface } from "../../interfaces/runtime.js";

/**
 * Cloudflare Workers 런타임 구현체
 */
export class WorkersRuntime extends RuntimeInterface {
  constructor(env, ctx) {
    super();
    this.env = env;
    this.ctx = ctx;
  }

  async handleRequest(request, context) {
    // 기본 CORS 헤더
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    // OPTIONS 요청 처리
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 200,
        headers: corsHeaders,
      });
    }

    return { corsHeaders };
  }

  async scheduleBackgroundTask(task, options = {}) {
    // Cloudflare Workers의 waitUntil을 사용
    this.ctx.waitUntil(task());
  }

  getEnvironmentVariable(key) {
    return this.env[key];
  }

  log(level, message, metadata = {}) {
    const timestamp = new Date().toISOString();
    const logData = {
      timestamp,
      level,
      message,
      ...metadata,
    };

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

  getRuntimeInfo() {
    return {
      name: "Cloudflare Workers",
      type: "edge-runtime",
      features: [
        "http-requests",
        "background-tasks",
        "kv-storage",
        "r2-storage",
        "workers-ai",
      ],
      limitations: {
        cpuTime: "50ms (free), 30s (paid)",
        memory: "128MB",
        requestSize: "100MB",
      },
    };
  }
}
