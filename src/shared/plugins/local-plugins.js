/**
 * 로컬 개발 환경용 플러그인들
 */

/**
 * 로컬 플러그인들을 컨테이너 빌더에 등록
 */
export function registerLocalPlugins(builder) {
  // 파일 스토리지 플러그인
  builder.withStoragePlugin("file", (config) => {
    return import(
      "../../link-management/infrastructure/storage/file-storage.js"
    ).then(({ FileStorage }) => new FileStorage(config.dataPath || "./data"));
  });

  // OpenAI 클라이언트 플러그인
  builder.withAIClientPlugin("openai", (config) => {
    if (!config.openaiApiKey) {
      throw new Error("로컬 환경에서는 OPENAI_API_KEY가 필요합니다.");
    }
    return import(
      "../../link-management/infrastructure/ai-provider/openai-client.js"
    ).then(({ OpenAIClient }) => new OpenAIClient(config.openaiApiKey));
  });

  // OpenAI 요약기 플러그인
  builder.withAISummarizerPlugin("openai", (aiClient, config) => {
    return import(
      "../../link-management/infrastructure/ai-summarizer/openai-summarizer.js"
    ).then(({ OpenAISummarizer }) => new OpenAISummarizer(aiClient));
  });

  // 로컬 백그라운드 태스크 러너 플러그인
  builder.withBackgroundTaskRunnerPlugin("local", (runtime, config) => {
    return import(
      "../../link-management/infrastructure/background-task/local-background-runner.js"
    ).then(({ LocalBackgroundRunner }) => new LocalBackgroundRunner());
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
      return new WebContentScraper(config.scraper || {});
    });
  });

  return builder;
}

/**
 * 로컬 개발 환경용 컨테이너 생성
 */
export async function createLocalContainer(config = {}) {
  const { DependencyContainer } = await import(
    "../utils/dependency-container.js"
  );

  const localConfig = {
    // 기본 설정
    storageType: "file",
    aiProvider: "openai",
    taskRunnerType: "local",
    notifierType: "discord",
    scraperType: "web",

    // 로컬 특화 설정
    dataPath: config.dataPath || "./data",
    openaiApiKey: config.openaiApiKey,
    discordWebhooks: config.discordWebhooks || [],
    scraper: config.scraper || {},

    // 사용자 제공 설정으로 오버라이드
    ...config,
  };

  const builder = DependencyContainer.createBuilder().withConfig(localConfig);

  registerLocalPlugins(builder);

  return builder.registerCoreServices().build();
}
