/**
 * Cloudflare Workers 환경용 플러그인들
 */

/**
 * Cloudflare 플러그인들을 컨테이너 빌더에 등록
 */
export function registerCloudflarePlugins(builder) {
  // R2 스토리지 플러그인
  builder.withStoragePlugin("r2", (config) => {
    return import(
      "../../link-management/infrastructure/storage/r2-storage.js"
    ).then(({ R2Storage }) => new R2Storage(config.r2Bucket));
  });

  // 파일 스토리지 플러그인 (로컬 개발용)
  builder.withStoragePlugin("file", (config) => {
    return import(
      "../../link-management/infrastructure/storage/file-storage.js"
    ).then(({ FileStorage }) => new FileStorage(config.dataPath || "./data"));
  });

  // Workers AI 클라이언트 플러그인
  builder.withAIClientPlugin("workers-ai", (config) => {
    return import(
      "../../link-management/infrastructure/ai-provider/workers-ai-client.js"
    ).then(({ WorkersAIClient }) => new WorkersAIClient(config.workersAI));
  });

  // OpenAI 클라이언트 플러그인
  builder.withAIClientPlugin("openai", (config) => {
    return import(
      "../../link-management/infrastructure/ai-provider/openai-client.js"
    ).then(({ OpenAIClient }) => new OpenAIClient(config.openaiApiKey));
  });

  // Workers AI 요약기 플러그인
  builder.withAISummarizerPlugin("workers-ai", (aiClient, config) => {
    return import(
      "../../link-management/infrastructure/ai-summarizer/workers-ai-summarizer.js"
    ).then(({ WorkersAISummarizer }) => new WorkersAISummarizer(aiClient));
  });

  // OpenAI 요약기 플러그인
  builder.withAISummarizerPlugin("openai", (aiClient, config) => {
    return import(
      "../../link-management/infrastructure/ai-summarizer/openai-summarizer.js"
    ).then(({ OpenAISummarizer }) => new OpenAISummarizer(aiClient));
  });

  // Workers 런타임 플러그인
  builder.withRuntimePlugin("workers", (config) => {
    return import(
      "../../link-management/infrastructure/runtime/workers-runtime.js"
    ).then(({ WorkersRuntime }) => new WorkersRuntime(config.env, config.ctx));
  });

  // Workers 백그라운드 태스크 러너 플러그인
  builder.withBackgroundTaskRunnerPlugin("workers", (runtime, config) => {
    return import(
      "../../link-management/infrastructure/background-task/workers-background-runner.js"
    ).then(
      ({ WorkersBackgroundRunner }) => new WorkersBackgroundRunner(runtime)
    );
  });

  // Discord 알림기 플러그인
  builder.withNotifierPlugin("discord", (config) => {
    return import(
      "../../link-management/infrastructure/notification/discord-notifier.js"
    ).then(({ DiscordNotifier }) => {
      const webhooks = config.discordWebhooks || [];
      return new DiscordNotifier(webhooks);
    });
  });

  // 웹 콘텐츠 스크래퍼 플러그인
  builder.withContentScraperPlugin("web", (config) => {
    return import(
      "../../link-management/infrastructure/content-scraper/web-scraper.js"
    ).then(({ WebContentScraper }) => {
      return new WebContentScraper({
        timeout: config.scraperTimeout || 10000,
        userAgent: config.scraperUserAgent || "LinkDump-Bot/1.0",
      });
    });
  });

  return builder;
}

/**
 * Cloudflare Workers 환경용 컨테이너 생성
 */
export async function createCloudflareContainer(env, ctx) {
  const { DependencyContainer } = await import(
    "../utils/dependency-container.js"
  );

  const config = {
    // 환경 변수에서 설정 추출
    storageType: env.STORAGE_TYPE || "r2",
    aiProvider: env.AI_PROVIDER || "workers-ai",
    runtimeType: "workers",
    taskRunnerType: "workers",
    notifierType: "discord",
    scraperType: "web",

    // Cloudflare 특화 설정
    r2Bucket: env.LINKDUMP_STORAGE,
    workersAI: env.AI,
    openaiApiKey: env.OPENAI_API_KEY,
    env,
    ctx,

    // 기타 설정
    discordWebhooks: env.DISCORD_WEBHOOKS
      ? JSON.parse(env.DISCORD_WEBHOOKS)
      : [],
    scraperTimeout: parseInt(env.SCRAPER_TIMEOUT) || 10000,
    scraperUserAgent: env.SCRAPER_USER_AGENT || "LinkDump-Bot/1.0",
  };

  const builder = DependencyContainer.createBuilder().withConfig(config);

  registerCloudflarePlugins(builder);

  return builder.registerCoreServices().build();
}
