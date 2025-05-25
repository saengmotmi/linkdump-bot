import "reflect-metadata";
import { container } from "tsyringe";
import {
  Storage,
  AIClient,
  AISummarizer,
  ContentScraper,
  Notifier,
  BackgroundTaskRunner,
  Runtime,
  LinkRepository,
  Config,
  TOKENS,
} from "../interfaces/index.js";

/**
 * Cloudflare Workers 환경용 컨테이너 설정
 */
export async function setupCloudflareContainer(env: any, ctx?: any) {
  const config: Config = {
    env,
    ctx,
    aiProvider: env.AI_PROVIDER || "workers-ai",
    storageProvider: env.STORAGE_TYPE || "r2",
    openaiApiKey: env.OPENAI_API_KEY,
    discordWebhooks: env.DISCORD_WEBHOOKS
      ? JSON.parse(env.DISCORD_WEBHOOKS)
      : [],
  };

  // 설정 등록
  container.registerInstance(TOKENS.Config, config);

  // 스토리지 등록
  if (config.storageProvider === "r2") {
    const { R2Storage } = await import(
      "../../link-management/infrastructure/storage/r2-storage.js"
    );
    container.register<Storage>(TOKENS.Storage, {
      useFactory: () => new R2Storage(env.BUCKET),
    });
  } else {
    const { FileStorage } = await import(
      "../../link-management/infrastructure/storage/file-storage.js"
    );
    container.register<Storage>(TOKENS.Storage, {
      useFactory: () => new FileStorage(config.dataPath || "./data"),
    });
  }

  // AI 클라이언트 등록
  if (config.aiProvider === "workers-ai") {
    const { WorkersAIClient } = await import(
      "../../link-management/infrastructure/ai-provider/workers-ai-client.js"
    );
    container.register<AIClient>(TOKENS.AIClient, {
      useFactory: () => new WorkersAIClient(env.AI),
    });
  } else if (config.aiProvider === "openai") {
    const { OpenAIClient } = await import(
      "../../link-management/infrastructure/ai-provider/openai-client.js"
    );
    container.register<AIClient>(TOKENS.AIClient, {
      useFactory: () => new OpenAIClient(config.openaiApiKey!),
    });
  }

  // AI 요약기 등록
  if (config.aiProvider === "workers-ai") {
    const { WorkersAISummarizer } = await import(
      "../../link-management/infrastructure/ai-summarizer/workers-ai-summarizer.js"
    );
    container.register<AISummarizer>(TOKENS.AISummarizer, {
      useFactory: (c) => {
        const aiClient = c.resolve<AIClient>(TOKENS.AIClient);
        return new WorkersAISummarizer(aiClient);
      },
    });
  } else {
    const { OpenAISummarizer } = await import(
      "../../link-management/infrastructure/ai-summarizer/openai-summarizer.js"
    );
    container.register<AISummarizer>(TOKENS.AISummarizer, {
      useFactory: (c) => {
        const aiClient = c.resolve<AIClient>(TOKENS.AIClient);
        return new OpenAISummarizer(aiClient);
      },
    });
  }

  // 콘텐츠 스크래퍼 등록
  const { WebContentScraper } = await import(
    "../../link-management/infrastructure/content-scraper/web-scraper.js"
  );
  container.register<ContentScraper>(TOKENS.ContentScraper, {
    useFactory: () => new WebContentScraper(),
  });

  // 알림기 등록
  const { DiscordNotifier } = await import(
    "../../link-management/infrastructure/notification/discord-notifier.js"
  );
  container.register<Notifier>(TOKENS.Notifier, {
    useFactory: () => new DiscordNotifier(config.discordWebhooks!),
  });

  // 백그라운드 태스크 러너 등록
  const { WorkersBackgroundRunner } = await import(
    "../../link-management/infrastructure/background-task/workers-background-runner.js"
  );
  container.register<BackgroundTaskRunner>(TOKENS.BackgroundTaskRunner, {
    useFactory: () => new WorkersBackgroundRunner(ctx),
  });

  // 런타임 등록
  const { WorkersRuntime } = await import(
    "../../link-management/infrastructure/runtime/workers-runtime.js"
  );
  container.register<Runtime>(TOKENS.Runtime, {
    useFactory: () => new WorkersRuntime(),
  });

  // 링크 저장소 등록
  const { StorageLinkRepository } = await import(
    "../../link-management/infrastructure/storage-link-repository.js"
  );
  container.register<LinkRepository>(TOKENS.LinkRepository, {
    useFactory: (c) => {
      const storage = c.resolve<Storage>(TOKENS.Storage);
      return new StorageLinkRepository(storage);
    },
  });

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
