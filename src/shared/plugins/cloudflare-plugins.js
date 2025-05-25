/**
 * Cloudflare Workers 환경용 플러그인들
 * 동적 import를 사용하여 필요한 구현체만 로드합니다.
 */

/**
 * R2 스토리지 플러그인 등록
 */
export function registerR2StoragePlugin(builder) {
  builder.withStoragePlugin("r2", async (config) => {
    const { R2Storage } = await import(
      "../../link-management/infrastructure/storage/r2-storage.js"
    );
    return new R2Storage(config.env?.LINKDUMP_STORAGE || config.bucket);
  });
}

/**
 * 파일 스토리지 플러그인 등록
 */
export function registerFileStoragePlugin(builder) {
  builder.withStoragePlugin("file", async (config) => {
    const { FileStorage } = await import(
      "../../link-management/infrastructure/storage/file-storage.js"
    );
    return new FileStorage(config.dataPath || "./data");
  });
}

/**
 * Workers AI 클라이언트 플러그인 등록
 */
export function registerWorkersAIClientPlugin(builder) {
  builder.withAIClientPlugin("workers-ai", async (config) => {
    const { WorkersAIClient } = await import(
      "../../link-management/infrastructure/ai-provider/workers-ai-client.js"
    );
    return new WorkersAIClient(config.env?.AI || config.aiBinding);
  });
}

/**
 * OpenAI 클라이언트 플러그인 등록
 */
export function registerOpenAIClientPlugin(builder) {
  builder.withAIClientPlugin("openai", async (config) => {
    const { OpenAIClient } = await import(
      "../../link-management/infrastructure/ai-provider/openai-client.js"
    );
    return new OpenAIClient(config.env?.OPENAI_API_KEY || config.openaiApiKey);
  });
}

/**
 * Workers AI 요약기 플러그인 등록
 */
export function registerWorkersAISummarizerPlugin(builder) {
  builder.withAISummarizerPlugin("workers-ai", async (aiClient, config) => {
    const { WorkersAISummarizer } = await import(
      "../../link-management/infrastructure/ai-summarizer/workers-ai-summarizer.js"
    );
    return new WorkersAISummarizer(aiClient);
  });
}

/**
 * OpenAI 요약기 플러그인 등록
 */
export function registerOpenAISummarizerPlugin(builder) {
  builder.withAISummarizerPlugin("openai", async (aiClient, config) => {
    const { OpenAISummarizer } = await import(
      "../../link-management/infrastructure/ai-summarizer/openai-summarizer.js"
    );
    return new OpenAISummarizer(aiClient);
  });
}

/**
 * Workers 런타임 플러그인 등록
 */
export function registerWorkersRuntimePlugin(builder) {
  builder.withRuntimePlugin("workers", async (config) => {
    const { WorkersRuntime } = await import(
      "../../link-management/infrastructure/runtime/workers-runtime.js"
    );
    return new WorkersRuntime(config.env, config.ctx);
  });
}

/**
 * 웹 콘텐츠 스크래퍼 플러그인 등록
 */
export function registerWebContentScraperPlugin(builder) {
  builder.withContentScraperPlugin("web", async (config) => {
    const { WebContentScraper } = await import(
      "../../link-management/infrastructure/content-scraper/web-scraper.js"
    );
    return new WebContentScraper({
      timeout: parseInt(config.env?.SCRAPER_TIMEOUT) || 10000,
      userAgent: config.env?.SCRAPER_USER_AGENT || "LinkDump-Bot/1.0",
    });
  });
}

/**
 * Discord 알림기 플러그인 등록
 */
export function registerDiscordNotifierPlugin(builder) {
  builder.withNotifierPlugin("discord", async (config) => {
    const { DiscordNotifier } = await import(
      "../../link-management/infrastructure/notification/discord-notifier.js"
    );
    const webhooks = config.env?.DISCORD_WEBHOOKS
      ? JSON.parse(config.env.DISCORD_WEBHOOKS)
      : config.discordWebhooks || [];
    return new DiscordNotifier(webhooks);
  });
}

/**
 * Workers 백그라운드 러너 플러그인 등록
 */
export function registerWorkersBackgroundRunnerPlugin(builder) {
  builder.withBackgroundTaskRunnerPlugin("workers", async (config) => {
    const { WorkersBackgroundRunner } = await import(
      "../../link-management/infrastructure/background-task/workers-background-runner.js"
    );
    const runtime =
      config.runtime || (await builder.container.resolve("runtime"));
    return new WorkersBackgroundRunner(runtime);
  });
}

/**
 * 모든 Cloudflare 플러그인들을 등록합니다.
 */
export function registerCloudflarePlugins(builder) {
  // 스토리지 플러그인들
  registerR2StoragePlugin(builder);
  registerFileStoragePlugin(builder);

  // AI 클라이언트 플러그인들
  registerWorkersAIClientPlugin(builder);
  registerOpenAIClientPlugin(builder);

  // AI 요약기 플러그인들
  registerWorkersAISummarizerPlugin(builder);
  registerOpenAISummarizerPlugin(builder);

  // 런타임 플러그인
  registerWorkersRuntimePlugin(builder);

  // 기능별 플러그인들
  registerWebContentScraperPlugin(builder);
  registerDiscordNotifierPlugin(builder);
  registerWorkersBackgroundRunnerPlugin(builder);
}

/**
 * Cloudflare Workers 환경용 컨테이너를 생성합니다.
 */
export async function createCloudflareContainer(env, ctx) {
  const { DependencyContainer } = await import(
    "../utils/dependency-container.js"
  );

  const builder = DependencyContainer.createBuilder().withConfig({
    env,
    ctx,
    storageProvider: env.STORAGE_TYPE || "r2",
    aiProvider: env.AI_PROVIDER || "workers-ai",
    runtimeProvider: "workers",
    contentScraperProvider: "web",
    notifierProvider: "discord",
    backgroundTaskRunnerProvider: "workers",
  });

  registerCloudflarePlugins(builder);

  return builder.registerCoreServices().build();
}
