/**
 * 🛠️ 로컬 개발 환경 의존성 주입 컨테이너
 *
 * 로컬 개발 환경에서 사용되는 서비스들을 설정합니다:
 * - File Storage (로컬 파일 시스템)
 * - Mock AI Client (더미 AI 서비스)
 * - Console Logger (콘솔 로깅)
 * - Local Background Runner (로컬 백그라운드 작업)
 *
 * 사용처: 로컬 개발 시 테스트 코드에서 사용
 */

import "reflect-metadata";
import { container } from "tsyringe";
import type { Config } from "../../shared/interfaces/index.js";
import { TOKENS } from "../../shared/interfaces/index.js";
import {
  setupContainer,
  type ServiceConfig,
  type ServiceDependencies,
} from "../../shared/container/service-registry.js";

/**
 * 로컬 개발 환경 서비스 설정 정의
 */
function createLocalServiceConfig(
  configOverrides: Partial<Config> = {}
): ServiceConfig[] {
  return [
    // 설정 객체
    {
      token: TOKENS.Config,
      factory: () => ({
        webhookUrls: [],
        ...configOverrides,
      }),
    },
    {
      token: TOKENS.Storage,
      importFn: () => import("../infrastructure/storage/file-storage.js"),
      class: "FileStorage",
      factory: (deps: ServiceDependencies) => {
        return new deps.FileStorage("./data");
      },
    },
    {
      token: TOKENS.LinkRepository,
      importFn: () => import("../infrastructure/storage-link-repository.js"),
      class: "StorageLinkRepository",
      factory: (deps: ServiceDependencies) => {
        return new deps.StorageLinkRepository(deps.resolve(TOKENS.Storage));
      },
    },
    {
      token: TOKENS.AIClient,
      importFn: () =>
        import("../infrastructure/ai-provider/workers-ai-client.js"),
      class: "WorkersAIClient",
      factory: (deps: ServiceDependencies) => {
        // 로컬 환경에서는 더미 AI 클라이언트 사용
        return new deps.WorkersAIClient(null);
      },
    },
    {
      token: TOKENS.AISummarizer,
      importFn: () =>
        import("../infrastructure/ai-summarizer/workers-ai-summarizer.js"),
      class: "WorkersAISummarizer",
      factory: (deps: ServiceDependencies) => {
        return new deps.WorkersAISummarizer(deps.resolve(TOKENS.AIClient));
      },
    },
    {
      token: TOKENS.ContentScraper,
      importFn: () =>
        import("../infrastructure/content-scraper/web-scraper.js"),
      class: "WebContentScraper",
      factory: (deps: ServiceDependencies) => {
        return new deps.WebContentScraper();
      },
    },
    {
      token: TOKENS.Notifier,
      importFn: () =>
        import("../infrastructure/notification/discord-notifier.js"),
      class: "DiscordNotifier",
      factory: (deps: ServiceDependencies) => {
        const config = deps.resolve<Config>(TOKENS.Config);
        return new deps.DiscordNotifier(config.webhookUrls || []);
      },
    },
    {
      token: TOKENS.BackgroundTaskRunner,
      importFn: () =>
        import("../infrastructure/background-task/local-background-runner.js"),
      class: "LocalBackgroundRunner",
      factory: (deps: ServiceDependencies) => {
        return new deps.LocalBackgroundRunner();
      },
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
