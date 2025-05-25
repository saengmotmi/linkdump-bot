import "reflect-metadata";
import { container } from "tsyringe";
import type { AISummarizer, Storage } from "../interfaces/index.js";
import { TOKENS } from "../interfaces/index.js";

/**
 * Cloudflare Workers 환경 컨테이너 설정
 */
export async function setupCloudflareContainer(env: any, ctx?: any) {
  // R2 스토리지 등록 (우선순위)
  container.register(TOKENS.Storage, {
    useFactory: async () => {
      const { R2Storage } = await import(
        "../../link-management/infrastructure/storage/r2-storage.js"
      );
      return new R2Storage(env.BUCKET);
    },
  });

  // 파일 스토리지 등록 (폴백)
  container.register("FileStorage", {
    useFactory: async () => {
      const { FileStorage } = await import(
        "../../link-management/infrastructure/storage/file-storage.js"
      );
      return new FileStorage("./data");
    },
  });

  // Workers AI 클라이언트 등록 (우선순위)
  container.register(TOKENS.AIClient, {
    useFactory: async () => {
      const { WorkersAIClient } = await import(
        "../../link-management/infrastructure/ai-provider/workers-ai-client.js"
      );
      return new WorkersAIClient(env.AI);
    },
  });

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
      return new DiscordNotifier(env.DISCORD_WEBHOOKS?.split(",") || []);
    },
  });

  // Workers 백그라운드 러너 등록
  container.register(TOKENS.BackgroundTaskRunner, {
    useFactory: async () => {
      const { WorkersBackgroundRunner } = await import(
        "../../link-management/infrastructure/background-task/workers-background-runner.js"
      );
      return new WorkersBackgroundRunner({ env, ctx });
    },
  });

  // Workers 런타임 등록
  container.register(TOKENS.Runtime, {
    useFactory: async () => {
      const { WorkersRuntime } = await import(
        "../../link-management/infrastructure/runtime/workers-runtime.js"
      );
      return new WorkersRuntime(env, ctx);
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
 * Cloudflare Workers 환경에서 컨테이너 생성
 */
export async function createCloudflareContainer(env: any, ctx?: any) {
  // 새로운 자식 컨테이너 생성 (격리를 위해)
  const childContainer = container.createChildContainer();

  // 설정 적용
  await setupCloudflareContainer(env, ctx);

  return childContainer;
}
