/**
 * 커스텀 플러그인 예시
 * 새로운 구현체를 추가하는 방법을 보여줍니다.
 */

/**
 * 예시: Claude AI 플러그인 추가
 */
export function registerClaudePlugin(builder) {
  // Claude AI 클라이언트 플러그인
  builder.withAIClientPlugin("claude", (config) => {
    // 동적 import로 필요할 때만 로드
    return import(
      "../../link-management/infrastructure/ai-provider/claude-client.js"
    ).then(({ ClaudeClient }) => new ClaudeClient(config.claudeApiKey));
  });

  // Claude AI 요약기 플러그인
  builder.withAISummarizerPlugin("claude", (aiClient, config) => {
    return import(
      "../../link-management/infrastructure/ai-summarizer/claude-summarizer.js"
    ).then(({ ClaudeSummarizer }) => new ClaudeSummarizer(aiClient));
  });

  return builder;
}

/**
 * 예시: Redis 스토리지 플러그인 추가
 */
export function registerRedisPlugin(builder) {
  builder.withStoragePlugin("redis", (config) => {
    return import(
      "../../link-management/infrastructure/storage/redis-storage.js"
    ).then(({ RedisStorage }) => new RedisStorage(config.redisUrl));
  });

  return builder;
}

/**
 * 예시: Slack 알림 플러그인 추가
 */
export function registerSlackPlugin(builder) {
  builder.withNotifierPlugin("slack", (config) => {
    return import(
      "../../link-management/infrastructure/notification/slack-notifier.js"
    ).then(({ SlackNotifier }) => new SlackNotifier(config.slackWebhook));
  });

  return builder;
}

/**
 * 예시: 멀티 채널 알림 플러그인 추가
 */
export function registerMultiChannelNotifierPlugin(builder) {
  builder.withNotifierPlugin("multi", (config) => {
    return import(
      "../../link-management/infrastructure/notification/multi-channel-notifier.js"
    ).then(({ MultiChannelNotifier }) => {
      const notifiers = [];

      // Discord 알림기 추가
      if (config.discordWebhooks?.length > 0) {
        notifiers.push(
          import(
            "../../link-management/infrastructure/notification/discord-notifier.js"
          ).then(
            ({ DiscordNotifier }) => new DiscordNotifier(config.discordWebhooks)
          )
        );
      }

      // Slack 알림기 추가
      if (config.slackWebhook) {
        notifiers.push(
          import(
            "../../link-management/infrastructure/notification/slack-notifier.js"
          ).then(({ SlackNotifier }) => new SlackNotifier(config.slackWebhook))
        );
      }

      return Promise.all(notifiers).then(
        (resolvedNotifiers) => new MultiChannelNotifier(resolvedNotifiers)
      );
    });
  });

  return builder;
}

/**
 * 예시: 커스텀 환경용 컨테이너 생성
 */
export async function createCustomContainer(config = {}) {
  const { DependencyContainer } = await import(
    "../utils/dependency-container.js"
  );

  const customConfig = {
    // 커스텀 설정
    storageType: config.storageType || "redis",
    aiProvider: config.aiProvider || "claude",
    notifierType: config.notifierType || "multi",

    // 각 플러그인별 설정
    redisUrl: config.redisUrl,
    claudeApiKey: config.claudeApiKey,
    discordWebhooks: config.discordWebhooks || [],
    slackWebhook: config.slackWebhook,

    ...config,
  };

  const builder = DependencyContainer.createBuilder().withConfig(customConfig);

  // 커스텀 플러그인들 등록
  registerClaudePlugin(builder);
  registerRedisPlugin(builder);
  registerSlackPlugin(builder);
  registerMultiChannelNotifierPlugin(builder);

  return builder.registerCoreServices().build();
}

/**
 * 사용법 예시:
 *
 * // 1. 기본 플러그인 사용
 * import { createCloudflareContainer } from './cloudflare-plugins.js';
 * const container = await createCloudflareContainer(env, ctx);
 *
 * // 2. 커스텀 플러그인 추가
 * import { DependencyContainer } from '../utils/dependency-container.js';
 * import { registerCloudflarePlugins } from './cloudflare-plugins.js';
 * import { registerClaudePlugin } from './example-custom-plugins.js';
 *
 * const builder = DependencyContainer.createBuilder()
 *   .withConfig({ aiProvider: 'claude', claudeApiKey: 'sk-...' });
 *
 * registerCloudflarePlugins(builder);
 * registerClaudePlugin(builder);
 *
 * const container = builder.registerCoreServices().build();
 *
 * // 3. 완전히 새로운 환경
 * const customContainer = await createCustomContainer({
 *   storageType: 'redis',
 *   aiProvider: 'claude',
 *   notifierType: 'multi',
 *   redisUrl: 'redis://localhost:6379',
 *   claudeApiKey: 'sk-...',
 *   discordWebhooks: ['https://...'],
 *   slackWebhook: 'https://...'
 * });
 */
