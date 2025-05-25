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
import type {
  Config,
  CloudflareEnv,
  Storage,
  AIClient,
  AISummarizer,
  ContentScraper,
  Notifier,
  TaskQueue,
  QueueProcessor,
  BackgroundTaskRunner,
} from "../../shared/interfaces/index.js";
import { TOKENS } from "../../shared/interfaces/index.js";
import {
  setupContainer,
  safeResolve,
  type ServiceConfig,
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
      importFn: async () => ({
        webhookUrls: env.DISCORD_WEBHOOKS
          ? env.DISCORD_WEBHOOKS.split(",")
          : [],
        env,
        ctx,
      }),
    },
    {
      token: TOKENS.Storage,
      importFn: async () => {
        const { R2Storage } = await import(
          "../infrastructure/storage/r2-storage.js"
        );
        return new R2Storage(env.LINKDUMP_STORAGE as any);
      },
    },
    {
      token: TOKENS.LinkRepository,
      importFn: async () => {
        const { StorageLinkRepository } = await import(
          "../infrastructure/storage-link-repository.js"
        );
        const storage = safeResolve<Storage>(TOKENS.Storage);
        return new StorageLinkRepository(storage);
      },
    },
    {
      token: TOKENS.AIClient,
      importFn: async () => {
        // Claude API 키가 있으면 Claude 사용, 없으면 Workers AI 사용
        if (env.CLAUDE_API_KEY) {
          const { ClaudeAIClient } = await import(
            "../infrastructure/ai-provider/claude-ai-client.js"
          );
          return new ClaudeAIClient(env.CLAUDE_API_KEY);
        } else {
          const { WorkersAIClient } = await import(
            "../infrastructure/ai-provider/workers-ai-client.js"
          );
          return new WorkersAIClient(env.WORKERS_AI);
        }
      },
    },
    {
      token: TOKENS.AISummarizer,
      importFn: async () => {
        // Claude API 키가 있으면 Claude 요약기 사용, 없으면 Workers AI 요약기 사용
        if (env.CLAUDE_API_KEY) {
          const { ClaudeAISummarizer } = await import(
            "../infrastructure/ai-summarizer/claude-ai-summarizer.js"
          );
          const aiClient = safeResolve<AIClient>(TOKENS.AIClient);
          return new ClaudeAISummarizer(aiClient);
        } else {
          const { WorkersAISummarizer } = await import(
            "../infrastructure/ai-summarizer/workers-ai-summarizer.js"
          );
          const aiClient = safeResolve<AIClient>(TOKENS.AIClient);
          return new WorkersAISummarizer(aiClient);
        }
      },
    },
    {
      token: TOKENS.ContentScraper,
      importFn: async () => {
        const { WebContentScraper } = await import(
          "../infrastructure/content-scraper/web-scraper.js"
        );
        return new WebContentScraper();
      },
    },
    {
      token: TOKENS.Notifier,
      importFn: async () => {
        const { DiscordNotifier } = await import(
          "../infrastructure/notification/discord-notifier.js"
        );
        const config = safeResolve<Config>(TOKENS.Config);
        return new DiscordNotifier(config.webhookUrls || []);
      },
    },
    {
      token: TOKENS.TaskQueue,
      importFn: async () => {
        const { MemoryTaskQueue } = await import(
          "../../shared/queue/memory-task-queue.js"
        );
        return new MemoryTaskQueue();
      },
    },
    {
      token: TOKENS.QueueProcessor,
      importFn: async () => {
        const { SequentialQueueProcessor } = await import(
          "../../shared/queue/sequential-queue-processor.js"
        );
        const taskQueue = safeResolve<TaskQueue>(TOKENS.TaskQueue);
        return new SequentialQueueProcessor(taskQueue);
      },
    },
    {
      token: TOKENS.BackgroundTaskRunner,
      importFn: async () => {
        const { WorkersBackgroundRunner } = await import(
          "../infrastructure/background-task/workers-background-runner.js"
        );
        const taskQueue = safeResolve<TaskQueue>(TOKENS.TaskQueue);
        const queueProcessor = safeResolve<QueueProcessor>(
          TOKENS.QueueProcessor
        );
        return new WorkersBackgroundRunner(
          { env, ctx: ctx as any },
          taskQueue,
          queueProcessor
        );
      },
    },
    // Application Services
    {
      token: TOKENS.LinkManagementService,
      importFn: async () => {
        const { LinkManagementService } = await import(
          "../application/link-management-service.js"
        );
        const linkRepository = safeResolve<any>(TOKENS.LinkRepository);
        const aiSummarizer = safeResolve<AISummarizer>(TOKENS.AISummarizer);
        const contentScraper = safeResolve<ContentScraper>(
          TOKENS.ContentScraper
        );
        const notifier = safeResolve<Notifier>(TOKENS.Notifier);
        const backgroundTaskRunner = safeResolve<BackgroundTaskRunner>(
          TOKENS.BackgroundTaskRunner
        );
        return new LinkManagementService(
          linkRepository,
          contentScraper,
          aiSummarizer,
          notifier,
          backgroundTaskRunner
        );
      },
    },
    // API Controllers
    {
      token: TOKENS.LinkController,
      importFn: async () => {
        const { LinkController } = await import(
          "../../web/api/controllers/link-controller.js"
        );
        const linkManagementService = safeResolve<any>(
          TOKENS.LinkManagementService
        );
        return new LinkController(linkManagementService);
      },
    },
    {
      token: TOKENS.ConfigController,
      importFn: async () => {
        const { ConfigController } = await import(
          "../../web/api/controllers/config-controller.js"
        );
        return new ConfigController();
      },
    },
    {
      token: TOKENS.PreviewController,
      importFn: async () => {
        const { PreviewController } = await import(
          "../../web/api/controllers/preview-controller.js"
        );
        return new PreviewController();
      },
    },
    {
      token: TOKENS.ApiRouter,
      importFn: async () => {
        const { ApiRouter } = await import("../../web/api/api-router.js");
        return new ApiRouter();
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
