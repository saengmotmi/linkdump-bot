/**
 * 로컬 개발 환경용 플러그인들
 * 동적 import를 사용하여 필요한 구현체만 로드합니다.
 */

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
 * OpenAI 클라이언트 플러그인 등록
 */
export function registerOpenAIClientPlugin(builder) {
  builder.withAIClientPlugin("openai", async (config) => {
    const { OpenAIClient } = await import(
      "../../link-management/infrastructure/ai-provider/openai-client.js"
    );
    if (!config.openaiApiKey) {
      throw new Error("로컬 환경에서는 OPENAI_API_KEY가 필요합니다.");
    }
    return new OpenAIClient(config.openaiApiKey);
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
 * 웹 콘텐츠 스크래퍼 플러그인 등록
 */
export function registerWebContentScraperPlugin(builder) {
  builder.withContentScraperPlugin("web", async (config) => {
    const { WebContentScraper } = await import(
      "../../link-management/infrastructure/content-scraper/web-scraper.js"
    );
    return new WebContentScraper(config.scraper || {});
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
    return new DiscordNotifier(config.discordWebhooks || []);
  });
}

/**
 * 로컬 백그라운드 러너 플러그인 등록
 */
export function registerLocalBackgroundRunnerPlugin(builder) {
  builder.withBackgroundTaskRunnerPlugin("local", async (config) => {
    const { LocalBackgroundRunner } = await import(
      "../../link-management/infrastructure/background-task/local-background-runner.js"
    );
    return new LocalBackgroundRunner();
  });
}

/**
 * 모든 로컬 플러그인들을 등록합니다.
 */
export function registerLocalPlugins(builder) {
  // 스토리지 플러그인
  registerFileStoragePlugin(builder);

  // AI 클라이언트 플러그인
  registerOpenAIClientPlugin(builder);

  // AI 요약기 플러그인
  registerOpenAISummarizerPlugin(builder);

  // 기능별 플러그인들
  registerWebContentScraperPlugin(builder);
  registerDiscordNotifierPlugin(builder);
  registerLocalBackgroundRunnerPlugin(builder);
}

/**
 * 로컬 개발 환경용 컨테이너를 생성합니다.
 */
export async function createLocalContainer(config = {}) {
  const { DependencyContainer } = await import(
    "../utils/dependency-container.js"
  );

  const builder = DependencyContainer.createBuilder().withConfig({
    ...config,
    storageProvider: "file",
    aiProvider: "openai",
    contentScraperProvider: "web",
    notifierProvider: "discord",
    backgroundTaskRunnerProvider: "local",
  });

  registerLocalPlugins(builder);

  return builder.registerCoreServices().build();
}
