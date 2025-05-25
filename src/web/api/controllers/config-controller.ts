import { injectable, container } from "tsyringe";
import {
  TOKENS,
  type Config,
  type CloudflareEnv,
} from "../../../shared/interfaces/index.js";

/**
 * 설정 관련 API 컨트롤러
 */
@injectable()
export class ConfigController {
  /**
   * 설정 조회 API - 실제 컨테이너 설정을 동적으로 조회
   */
  async getConfig(env: CloudflareEnv): Promise<Response> {
    try {
      // 실제 컨테이너에서 설정 조회
      const config = container.resolve<Config>(TOKENS.Config);

      // 등록된 서비스들의 실제 구현체 확인
      const aiClient = container.resolve(TOKENS.AIClient);
      const storage = container.resolve(TOKENS.Storage);
      const notifier = container.resolve(TOKENS.Notifier);
      const backgroundTaskRunner = container.resolve(
        TOKENS.BackgroundTaskRunner
      );

      const responseConfig = {
        hasWebhooks: !!(config.webhookUrls && config.webhookUrls.length > 0),
        architecture: "TSyringe-based Dependency Injection",
        environment: env.CF_PAGES ? "Cloudflare Pages" : "Cloudflare Workers",
        services: {
          ai: (aiClient as { constructor: { name: string } }).constructor.name,
          storage: (storage as { constructor: { name: string } }).constructor
            .name,
          notifications: (notifier as { constructor: { name: string } })
            .constructor.name,
          backgroundTasks: (
            backgroundTaskRunner as { constructor: { name: string } }
          ).constructor.name,
        },
      };

      return new Response(
        JSON.stringify({ success: true, config: responseConfig }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return new Response(
        JSON.stringify({ success: false, error: errorMessage }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }
}
