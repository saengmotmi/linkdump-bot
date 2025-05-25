/**
 * 🏭 Cloudflare Workers 환경 의존성 주입 컨테이너
 *
 * ⭐ 핵심 파일! workers/app.ts에서 호출되어 전체 앱의 서비스들을 설정합니다.
 *
 * 실행 흐름:
 * workers/app.ts → createCloudflareContainer() → 모든 서비스 설정 완료
 *
 * 프로덕션 환경(Cloudflare Workers)에서 사용되는 서비스들을 설정합니다:
 * - R2 Storage (클라우드 스토리지)
 * - Workers AI (AI 서비스)
 * - Discord Notifier (웹훅 알림)
 * - Background Task Runner (백그라운드 작업)
 * - API Controllers (웹 API 컨트롤러)
 *
 * 사용처: workers/app.ts에서 import하여 사용
 */

import "reflect-metadata";
import { container } from "tsyringe";
import type { Config, CloudflareEnv } from "../../shared/interfaces/index.js";
import { TOKENS } from "../../shared/interfaces/index.js";
import {
  setupContainer,
  type ServiceConfig,
  type ServiceDependencies,
} from "../../shared/container/service-registry.js";

/**
 * Cloudflare Workers 서비스 설정 정의
 */
function createCloudflareServiceConfig(
  env: CloudflareEnv,
  ctx?: ExecutionContext
): ServiceConfig[] {
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
      importFn: () => import("../infrastructure/storage/r2-storage.js"),
      class: "R2Storage",
      factory: (deps: ServiceDependencies) => {
        return new deps.R2Storage(env.LINKDUMP_STORAGE);
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
        return new deps.WorkersAIClient(env.AI);
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
      token: TOKENS.TaskQueue,
      importFn: () => import("../../shared/queue/memory-task-queue.js"),
      class: "MemoryTaskQueue",
      factory: (deps: ServiceDependencies) => {
        return new deps.MemoryTaskQueue();
      },
    },
    {
      token: TOKENS.QueueProcessor,
      importFn: () =>
        import("../../shared/queue/sequential-queue-processor.js"),
      class: "SequentialQueueProcessor",
      factory: (deps: ServiceDependencies) => {
        const taskQueue = deps.resolve(TOKENS.TaskQueue);
        return new deps.SequentialQueueProcessor(taskQueue);
      },
    },
    {
      token: TOKENS.BackgroundTaskRunner,
      importFn: () =>
        import(
          "../infrastructure/background-task/workers-background-runner.js"
        ),
      class: "WorkersBackgroundRunner",
      factory: (deps: ServiceDependencies) => {
        const taskQueue = deps.resolve(TOKENS.TaskQueue);
        const queueProcessor = deps.resolve(TOKENS.QueueProcessor);
        return new deps.WorkersBackgroundRunner(
          { env, ctx },
          taskQueue,
          queueProcessor
        );
      },
    },
    // Application Services
    {
      token: TOKENS.LinkManagementService,
      importFn: () => import("../application/link-management-service.js"),
      class: "LinkManagementService",
      factory: (deps: ServiceDependencies) => {
        const linkRepository = deps.resolve(TOKENS.LinkRepository);
        const aiSummarizer = deps.resolve(TOKENS.AISummarizer);
        const contentScraper = deps.resolve(TOKENS.ContentScraper);
        const notifier = deps.resolve(TOKENS.Notifier);
        const backgroundTaskRunner = deps.resolve(TOKENS.BackgroundTaskRunner);
        return new deps.LinkManagementService(
          linkRepository,
          aiSummarizer,
          contentScraper,
          notifier,
          backgroundTaskRunner
        );
      },
    },
    // API Controllers
    {
      token: TOKENS.LinkController,
      importFn: () => import("../../web/api/controllers/link-controller.js"),
      class: "LinkController",
      factory: (deps: ServiceDependencies) => {
        const linkManagementService = deps.resolve(
          TOKENS.LinkManagementService
        );
        return new deps.LinkController(linkManagementService);
      },
    },
    {
      token: TOKENS.ConfigController,
      importFn: () => import("../../web/api/controllers/config-controller.js"),
      class: "ConfigController",
      factory: (deps: ServiceDependencies) => {
        return new deps.ConfigController();
      },
    },
    {
      token: TOKENS.PreviewController,
      importFn: () => import("../../web/api/controllers/preview-controller.js"),
      class: "PreviewController",
      factory: (deps: ServiceDependencies) => {
        return new deps.PreviewController();
      },
    },
    {
      token: TOKENS.ApiRouter,
      importFn: () => import("../../web/api/api-router.js"),
      class: "ApiRouter",
      factory: (deps: ServiceDependencies) => {
        return new deps.ApiRouter();
      },
    },
  ];
}

/**
 * Cloudflare Workers 환경 컨테이너 설정
 */
export async function setupCloudflareContainer(
  env: CloudflareEnv,
  ctx?: ExecutionContext
) {
  // 서비스 설정 생성 (설정 객체 포함)
  const serviceConfig = createCloudflareServiceConfig(env, ctx);

  // 공통 컨테이너 설정 로직 사용
  await setupContainer(serviceConfig);

  return container;
}

/**
 * Cloudflare Workers 환경에서 컨테이너 생성
 */
export async function createCloudflareContainer(
  env: CloudflareEnv,
  ctx?: ExecutionContext
) {
  // 새로운 자식 컨테이너 생성 (격리를 위해)
  const childContainer = container.createChildContainer();

  // 설정 적용
  await setupCloudflareContainer(env, ctx);

  return childContainer;
}
