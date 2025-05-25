import "reflect-metadata";
import { container } from "tsyringe";
import type { Config } from "../interfaces/index.js";
import { TOKENS } from "../interfaces/index.js";
import { setupContainer, type ServiceConfig } from "./service-registry.js";

/**
 * Cloudflare Workers 서비스 설정 정의
 */
function createCloudflareServiceConfig(env: any, ctx?: any): ServiceConfig[] {
  return [
    // 설정 객체 - 환경별 설정값만 포함
    {
      token: TOKENS.Config,
      factory: () => ({
        webhookUrls: env.DISCORD_WEBHOOKS
          ? env.DISCORD_WEBHOOKS.split(",")
          : [],
        env,
        ctx,
      }),
    },
    {
      token: TOKENS.Storage,
      import: "../../link-management/infrastructure/storage/r2-storage.js",
      class: "R2Storage",
      factory: (deps: any) => new deps.R2Storage(env.LINKDUMP_R2_STORAGE),
    },
    {
      token: TOKENS.LinkRepository,
      import: "../../link-management/infrastructure/storage-link-repository.js",
      class: "StorageLinkRepository",
      factory: (deps: any) =>
        new deps.StorageLinkRepository(deps.resolve(TOKENS.Storage)),
    },
    {
      token: TOKENS.AIClient,
      import:
        "../../link-management/infrastructure/ai-provider/workers-ai-client.js",
      class: "WorkersAIClient",
      factory: (deps: any) => new deps.WorkersAIClient(env.WORKERS_AI_MODEL),
    },
    {
      token: TOKENS.AISummarizer,
      import:
        "../../link-management/infrastructure/ai-summarizer/workers-ai-summarizer.js",
      class: "WorkersAISummarizer",
      factory: (deps: any) =>
        new deps.WorkersAISummarizer(deps.resolve(TOKENS.AIClient)),
    },
    {
      token: TOKENS.ContentScraper,
      import:
        "../../link-management/infrastructure/content-scraper/web-scraper.js",
      class: "WebContentScraper",
      factory: (deps: any) => new deps.WebContentScraper(),
    },
    {
      token: TOKENS.Notifier,
      import:
        "../../link-management/infrastructure/notification/discord-notifier.js",
      class: "DiscordNotifier",
      factory: (deps: any) => {
        const config = deps.resolve(TOKENS.Config);
        return new deps.DiscordNotifier(config.webhookUrls || []);
      },
    },
    {
      token: TOKENS.BackgroundTaskRunner,
      import:
        "../../link-management/infrastructure/background-task/workers-background-runner.js",
      class: "WorkersBackgroundRunner",
      factory: (deps: any) => new deps.WorkersBackgroundRunner({ env, ctx }),
    },
  ];
}

/**
 * Cloudflare Workers 환경 컨테이너 설정
 */
export async function setupCloudflareContainer(env: any, ctx?: any) {
  // 서비스 설정 생성 (설정 객체 포함)
  const serviceConfig = createCloudflareServiceConfig(env, ctx);

  // 공통 컨테이너 설정 로직 사용
  await setupContainer(serviceConfig);

  return container;
}

/**
 * Cloudflare Workers 환경에서 컨테이너 생성
 */
export async function createCloudflareContainer(env: any, ctx?: any) {
  // 새로운 자식 컨테이너 생성 (격리를 위해)
  const childContainer = container.createChildContainer();

  // 설정 적용
  await setupCloudflareContainer(env, ctx);

  return childContainer;
}
