import "reflect-metadata";
import { container } from "tsyringe";
import type { Config } from "../interfaces/index.js";
import { TOKENS } from "../interfaces/index.js";
import { setupContainer, type ServiceConfig } from "./service-registry.js";

/**
 * Cloudflare Workers 서비스 설정 정의
 */
function createCloudflareServiceConfig(config: Config): ServiceConfig[] {
  return [
    {
      token: TOKENS.R2Bucket,
      factory: (deps: any) => deps.env.LINKDUMP_STORAGE,
    },
    {
      token: TOKENS.Storage,
      import: "../../link-management/infrastructure/storage/r2-storage.js",
      class: "R2Storage",
      factory: (deps: any) => deps.container.resolve(deps.R2Storage),
    },
    {
      token: TOKENS.LinkRepository,
      import: "../../link-management/infrastructure/storage-link-repository.js",
      class: "StorageLinkRepository",
      factory: (deps: any) =>
        new deps.StorageLinkRepository(deps.resolve(TOKENS.Storage)),
    },
    {
      token: TOKENS.FileStorage,
      import: "../../link-management/infrastructure/storage/file-storage.js",
      class: "FileStorage",
      factory: (deps: any) => new deps.FileStorage("./data"),
    },
    {
      token: TOKENS.AIClient,
      import:
        "../../link-management/infrastructure/ai-provider/workers-ai-client.js",
      class: "WorkersAIClient",
      factory: (deps: any) => {
        const config = deps.resolve(TOKENS.Config);
        return new deps.WorkersAIClient(config.env.AI);
      },
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
        return new deps.DiscordNotifier(config.discordWebhooks || []);
      },
    },
    {
      token: TOKENS.BackgroundTaskRunner,
      import:
        "../../link-management/infrastructure/background-task/workers-background-runner.js",
      class: "WorkersBackgroundRunner",
      factory: (deps: any) => {
        const config = deps.resolve(TOKENS.Config);
        return new deps.WorkersBackgroundRunner({
          env: config.env,
          ctx: config.ctx,
        });
      },
    },
    {
      token: TOKENS.Runtime,
      import: "../../link-management/infrastructure/runtime/workers-runtime.js",
      class: "WorkersRuntime",
      factory: (deps: any) => {
        const config = deps.resolve(TOKENS.Config);
        return new deps.WorkersRuntime(config.env, config.ctx);
      },
    },
    // 조건부 등록 - OpenAI 요약기
    ...(config.openaiApiKey
      ? [
          {
            token: TOKENS.OpenAISummarizer,
            import:
              "../../link-management/infrastructure/ai-summarizer/openai-summarizer.js",
            class: "OpenAISummarizer",
            factory: async (deps: any) => {
              const config = deps.resolve(TOKENS.Config);
              const { OpenAIClient } = await import(
                "../../link-management/infrastructure/ai-provider/openai-client.js"
              );
              const openaiClient = new OpenAIClient(config.openaiApiKey!);
              return new deps.OpenAISummarizer(openaiClient);
            },
          },
        ]
      : []),
  ];
}

/**
 * Cloudflare Workers 환경 컨테이너 설정
 */
export async function setupCloudflareContainer(env: any, ctx?: any) {
  // 설정 객체 생성 및 등록
  const config: Config = {
    aiProvider: "workers-ai",
    storageProvider: "r2",
    openaiApiKey: env.OPENAI_API_KEY,
    discordWebhooks: env.DISCORD_WEBHOOKS
      ? env.DISCORD_WEBHOOKS.split(",")
      : [],
    env,
    ctx,
  };
  container.registerInstance(TOKENS.Config, config);

  // 서비스 설정 생성
  const serviceConfig = createCloudflareServiceConfig(config);

  // 공통 컨테이너 설정 로직 사용
  await setupContainer(serviceConfig, { env, ctx });

  return container;
}

/**
 * Cloudflare Workers 환경에서 컨테이너 생성
 */
export async function createCloudflareContainer(env: any, ctx?: any) {
  await setupCloudflareContainer(env, ctx);
  return container;
}
