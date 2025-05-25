import "reflect-metadata";
import { container } from "tsyringe";
import type { Config, Storage } from "../interfaces/index.js";
import { TOKENS } from "../interfaces/index.js";

/**
 * 로컬 개발 환경용 컨테이너 설정
 */
export async function setupLocalContainer(config: Partial<Config> = {}) {
  const localConfig: Config = {
    aiProvider: "openai",
    storageProvider: "file",
    dataPath: "./data",
    openaiApiKey: process.env.OPENAI_API_KEY,
    discordWebhooks: process.env.DISCORD_WEBHOOKS
      ? JSON.parse(process.env.DISCORD_WEBHOOKS)
      : [],
    ...config,
  };

  // 설정 등록
  container.registerInstance(TOKENS.Config, localConfig);

  // 스토리지 등록
  container.register(TOKENS.Storage, {
    useFactory: async () => {
      const { FileStorage } = await import(
        "../../link-management/infrastructure/storage/file-storage.js"
      );
      return new FileStorage("./data");
    },
  });

  // AI 클라이언트 등록
  container.register(TOKENS.AIClient, {
    useFactory: async () => {
      const { OpenAIClient } = await import(
        "../../link-management/infrastructure/ai-provider/openai-client.js"
      );
      return new OpenAIClient(localConfig.openaiApiKey!);
    },
  });

  // AI 요약기 등록
  container.register(TOKENS.AISummarizer, {
    useFactory: async () => {
      const { OpenAISummarizer } = await import(
        "../../link-management/infrastructure/ai-summarizer/openai-summarizer.js"
      );
      return container.resolve(OpenAISummarizer);
    },
  });

  // 런타임 등록 (로컬에서는 기본 런타임 사용)
  container.registerInstance(TOKENS.Runtime, {
    getCorsHeaders: () => ({
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    }),
  });

  // 콘텐츠 스크래퍼 등록
  container.register(TOKENS.ContentScraper, {
    useFactory: async () => {
      const { WebContentScraper } = await import(
        "../../link-management/infrastructure/content-scraper/web-scraper.js"
      );
      return new WebContentScraper();
    },
  });

  // 알림기 등록
  container.register(TOKENS.Notifier, {
    useFactory: async () => {
      const { DiscordNotifier } = await import(
        "../../link-management/infrastructure/notification/discord-notifier.js"
      );
      return new DiscordNotifier(localConfig.discordWebhooks || []);
    },
  });

  // 백그라운드 태스크 러너 등록
  container.register(TOKENS.BackgroundTaskRunner, {
    useFactory: async () => {
      const { LocalBackgroundRunner } = await import(
        "../../link-management/infrastructure/background-task/local-background-runner.js"
      );
      return new LocalBackgroundRunner();
    },
  });

  // 링크 저장소 등록
  const { StorageLinkRepository } = await import(
    "../../link-management/infrastructure/storage-link-repository"
  );
  const storage = container.resolve<Storage>(TOKENS.Storage);
  container.registerInstance(
    TOKENS.LinkRepository,
    new StorageLinkRepository(storage)
  );

  return container;
}

/**
 * 로컬 환경에서 컨테이너 생성
 */
export async function createLocalContainer(config: Partial<Config> = {}) {
  // 새로운 자식 컨테이너 생성 (격리를 위해)
  const childContainer = container.createChildContainer();

  // 설정 적용
  await setupLocalContainer(config);

  return childContainer;
}
