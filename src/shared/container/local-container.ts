import "reflect-metadata";
import { container } from "tsyringe";
import type { Config } from "../interfaces/index.js";
import { TOKENS } from "../interfaces/index.js";
import { setupContainer, type ServiceConfig } from "./service-registry.js";

/**
 * 로컬 개발 환경 서비스 설정 정의
 */
function createLocalServiceConfig(
  configOverrides: Partial<Config> = {}
): ServiceConfig[] {
  return [
    // 설정 객체 - 환경별 설정값만 포함
    {
      token: TOKENS.Config,
      factory: () => ({
        dataPath: "./data",
        webhookUrls: process.env.DISCORD_WEBHOOKS
          ? JSON.parse(process.env.DISCORD_WEBHOOKS)
          : [],
        ...configOverrides,
      }),
    },
    {
      token: TOKENS.Storage,
      import: "../../link-management/infrastructure/storage/file-storage.js",
      class: "FileStorage",
      factory: (deps: any) => {
        const config = deps.resolve(TOKENS.Config);
        return new deps.FileStorage(config.dataPath || "./data");
      },
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
      factory: (deps: any) => {
        // 로컬 환경에서는 mock AI binding 사용
        const mockAI = {
          run: async (model: string, options: any) => {
            return { response: "Mock AI response for local development" };
          },
        };
        return new deps.WorkersAIClient(mockAI);
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
        return new deps.DiscordNotifier(config.webhookUrls || []);
      },
    },
    {
      token: TOKENS.BackgroundTaskRunner,
      import:
        "../../link-management/infrastructure/background-task/local-background-runner.js",
      class: "LocalBackgroundRunner",
      factory: (deps: any) => new deps.LocalBackgroundRunner(),
    },
  ];
}

/**
 * 로컬 개발 환경용 컨테이너 설정
 */
export async function setupLocalContainer(
  configOverrides: Partial<Config> = {}
) {
  // 서비스 설정 생성 (설정 객체 포함)
  const serviceConfig = createLocalServiceConfig(configOverrides);

  // 공통 컨테이너 설정 로직 사용
  await setupContainer(serviceConfig);

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
