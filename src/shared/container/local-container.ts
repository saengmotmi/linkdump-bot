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
  const { FileStorage } = await import(
    "../../link-management/infrastructure/storage/file-storage.js"
  );
  container.registerInstance(
    TOKENS.Storage,
    new FileStorage(localConfig.dataPath!)
  );

  // AI 클라이언트 등록
  const { OpenAIClient } = await import(
    "../../link-management/infrastructure/ai-provider/openai-client.js"
  );
  container.registerInstance(
    TOKENS.AIClient,
    new OpenAIClient(localConfig.openaiApiKey!)
  );

  // AI 요약기 등록
  const { OpenAISummarizer } = await import(
    "../../link-management/infrastructure/ai-summarizer/openai-summarizer.js"
  );
  const aiClient = container.resolve<AIClient>(TOKENS.AIClient);
  container.registerInstance(
    TOKENS.AISummarizer,
    new OpenAISummarizer(aiClient)
  );

  // 런타임 등록 (로컬에서는 기본 런타임 사용)
  container.registerInstance(TOKENS.Runtime, {
    getCorsHeaders: () => ({
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    }),
  });

  // 콘텐츠 스크래퍼 등록
  const { WebContentScraper } = await import(
    "../../link-management/infrastructure/content-scraper/web-scraper.js"
  );
  container.registerInstance(TOKENS.ContentScraper, new WebContentScraper());

  // 알림기 등록
  const { DiscordNotifier } = await import(
    "../../link-management/infrastructure/notification/discord-notifier.js"
  );
  container.registerInstance(
    TOKENS.Notifier,
    new DiscordNotifier(localConfig.discordWebhooks!)
  );

  // 백그라운드 태스크 러너 등록
  const { LocalBackgroundRunner } = await import(
    "../../link-management/infrastructure/background-task/local-background-runner.js"
  );
  container.registerInstance(
    TOKENS.BackgroundTaskRunner,
    new LocalBackgroundRunner()
  );

  // 링크 저장소 등록
  const { StorageLinkRepository } = await import(
    "../../link-management/infrastructure/storage-link-repository.js"
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
