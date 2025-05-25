import "reflect-metadata";
import { container } from "tsyringe";
import type {
  Storage,
  AIClient,
  AISummarizer,
  ContentScraper,
  Notifier,
  BackgroundTaskRunner,
} from "../interfaces/index.js";
import { TOKENS } from "../interfaces/index.js";

/**
 * Cloudflare Workers 환경 컨테이너 설정
 */
export async function setupCloudflareContainer(env: any, ctx?: any) {
  // 스토리지 등록
  if (env.R2_BUCKET) {
    // R2 스토리지 사용
    const { R2Storage } = await import(
      "../../link-management/infrastructure/storage/r2-storage.js"
    );
    container.registerInstance("R2_BUCKET", env.R2_BUCKET);
    container.register<Storage>(TOKENS.Storage, { useClass: R2Storage });
  } else {
    // 파일 스토리지 폴백
    const { FileStorage } = await import(
      "../../link-management/infrastructure/storage/file-storage.js"
    );
    container.register<Storage>(TOKENS.Storage, { useClass: FileStorage });
  }

  // AI 클라이언트 등록
  if (env.CLOUDFLARE_ACCOUNT_ID && env.CLOUDFLARE_API_TOKEN) {
    // Workers AI 사용
    const { WorkersAIClient } = await import(
      "../../link-management/infrastructure/ai-provider/workers-ai-client.js"
    );
    container.registerInstance(
      "CLOUDFLARE_ACCOUNT_ID",
      env.CLOUDFLARE_ACCOUNT_ID
    );
    container.registerInstance(
      "CLOUDFLARE_API_TOKEN",
      env.CLOUDFLARE_API_TOKEN
    );
    container.register<AIClient>(TOKENS.AIClient, {
      useClass: WorkersAIClient,
    });
  } else if (env.OPENAI_API_KEY) {
    // OpenAI 사용
    const { OpenAIClient } = await import(
      "../../link-management/infrastructure/ai-provider/openai-client.js"
    );
    container.registerInstance("OPENAI_API_KEY", env.OPENAI_API_KEY);
    container.register<AIClient>(TOKENS.AIClient, { useClass: OpenAIClient });
  }

  // AI 요약기 등록
  if (env.CLOUDFLARE_ACCOUNT_ID && env.CLOUDFLARE_API_TOKEN) {
    // Workers AI 요약기 사용
    const { WorkersAISummarizer } = await import(
      "../../link-management/infrastructure/ai-summarizer/workers-ai-summarizer.js"
    );
    container.register<AISummarizer>(TOKENS.AISummarizer, {
      useClass: WorkersAISummarizer,
    });
  } else if (env.OPENAI_API_KEY) {
    // OpenAI 요약기 사용
    const { OpenAISummarizer } = await import(
      "../../link-management/infrastructure/ai-summarizer/openai-summarizer.js"
    );
    container.register<AISummarizer>(TOKENS.AISummarizer, {
      useClass: OpenAISummarizer,
    });
  }

  // 콘텐츠 스크래퍼 등록
  const { WebContentScraper } = await import(
    "../../link-management/infrastructure/content-scraper/web-scraper.js"
  );
  container.register<ContentScraper>(TOKENS.ContentScraper, {
    useClass: WebContentScraper,
  });

  // 알림기 등록
  const { DiscordNotifier } = await import(
    "../../link-management/infrastructure/notification/discord-notifier.js"
  );
  const webhooks = env.DISCORD_WEBHOOKS ? env.DISCORD_WEBHOOKS.split(",") : [];
  container.registerInstance("DISCORD_WEBHOOKS", webhooks);
  container.register<Notifier>(TOKENS.Notifier, { useClass: DiscordNotifier });

  // 백그라운드 태스크 러너 등록
  const { WorkersBackgroundRunner } = await import(
    "../../link-management/infrastructure/background-task/workers-background-runner.js"
  );
  container.registerInstance("WORKERS_RUNTIME", { env, ctx });
  container.register<BackgroundTaskRunner>(TOKENS.BackgroundTaskRunner, {
    useClass: WorkersBackgroundRunner,
  });

  // 런타임 등록
  const { WorkersRuntime } = await import(
    "../../link-management/infrastructure/runtime/workers-runtime.js"
  );
  container.registerInstance(TOKENS.Runtime, new WorkersRuntime(env, ctx));

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
 * Cloudflare Workers 환경에서 컨테이너 생성
 */
export async function createCloudflareContainer(env: any, ctx?: any) {
  // 새로운 자식 컨테이너 생성 (격리를 위해)
  const childContainer = container.createChildContainer();

  // 설정 적용
  await setupCloudflareContainer(env, ctx);

  return childContainer;
}
