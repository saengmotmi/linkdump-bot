import { StorageLinkRepository } from "../../link-management/infrastructure/storage-link-repository.js";
import { LinkManagementService } from "../../link-management/application/link-management-service.js";

// Storage 구현체들
import { R2Storage } from "../../link-management/infrastructure/storage/r2-storage.js";
import { FileStorage } from "../../link-management/infrastructure/storage/file-storage.js";

// AI Provider 구현체들
import { OpenAIClient } from "../../link-management/infrastructure/ai-provider/openai-client.js";
import { WorkersAIClient } from "../../link-management/infrastructure/ai-provider/workers-ai-client.js";

// Runtime 구현체들
import { WorkersRuntime } from "../../link-management/infrastructure/runtime/workers-runtime.js";

// 기능별 구현체들
import { WebContentScraper } from "../../link-management/infrastructure/content-scraper/web-scraper.js";
import { OpenAISummarizer } from "../../link-management/infrastructure/ai-summarizer/openai-summarizer.js";
import { WorkersAISummarizer } from "../../link-management/infrastructure/ai-summarizer/workers-ai-summarizer.js";
import { DiscordNotifier } from "../../link-management/infrastructure/notification/discord-notifier.js";
import { WorkersBackgroundRunner } from "../../link-management/infrastructure/background-task/workers-background-runner.js";
import { LocalBackgroundRunner } from "../../link-management/infrastructure/background-task/local-background-runner.js";

/**
 * 플러그인 기반 의존성 컨테이너
 * 새로운 구현체를 플러그인으로 외부에서 주입할 수 있습니다.
 */
export class DependencyContainer {
  constructor() {
    this.services = new Map();
    this.singletons = new Map();
    this.plugins = new Map();
  }

  /**
   * 서비스 등록
   */
  register(name, factory, options = {}) {
    this.services.set(name, {
      factory,
      singleton: options.singleton || false,
    });
  }

  /**
   * 플러그인 등록
   * @param {string} type - 플러그인 타입 (storage, aiClient, aiSummarizer 등)
   * @param {string} name - 플러그인 이름 (r2, openai, workers-ai 등)
   * @param {Function} factory - 플러그인 팩토리 함수
   */
  registerPlugin(type, name, factory) {
    if (!this.plugins.has(type)) {
      this.plugins.set(type, new Map());
    }
    this.plugins.get(type).set(name, factory);
  }

  /**
   * 플러그인 해결
   * @param {string} type - 플러그인 타입
   * @param {string} name - 플러그인 이름
   * @param {...any} args - 플러그인 팩토리에 전달할 인수들
   */
  resolvePlugin(type, name, ...args) {
    const typePlugins = this.plugins.get(type);
    if (!typePlugins) {
      throw new Error(`플러그인 타입을 찾을 수 없습니다: ${type}`);
    }

    const plugin = typePlugins.get(name);
    if (!plugin) {
      const availablePlugins = Array.from(typePlugins.keys()).join(", ");
      throw new Error(
        `플러그인을 찾을 수 없습니다: ${type}.${name}. 사용 가능한 플러그인: ${availablePlugins}`
      );
    }

    return plugin(...args);
  }

  /**
   * 서비스 해결
   */
  resolve(name) {
    const service = this.services.get(name);
    if (!service) {
      throw new Error(`서비스를 찾을 수 없습니다: ${name}`);
    }

    if (service.singleton) {
      if (!this.singletons.has(name)) {
        this.singletons.set(name, service.factory(this));
      }
      return this.singletons.get(name);
    }

    return service.factory(this);
  }

  /**
   * Cloudflare Workers 환경용 컨테이너 설정
   */
  static createForCloudflareWorkers(env, ctx) {
    const container = new DependencyContainer();

    // 스토리지 구현체
    container.register(
      "storage",
      () => {
        const storageType = env.STORAGE_TYPE || "r2";

        switch (storageType) {
          case "r2":
            return new R2Storage(env.LINKDUMP_STORAGE);
          case "file":
            return new FileStorage("./data");
          default:
            throw new Error(`지원하지 않는 스토리지 타입: ${storageType}`);
        }
      },
      { singleton: true }
    );

    // AI 클라이언트 구현체
    container.register(
      "aiClient",
      () => {
        const aiType = env.AI_PROVIDER || "workers-ai";

        switch (aiType) {
          case "workers-ai":
            return new WorkersAIClient(env.AI);
          case "openai":
            return new OpenAIClient(env.OPENAI_API_KEY);
          default:
            throw new Error(`지원하지 않는 AI 제공자: ${aiType}`);
        }
      },
      { singleton: true }
    );

    // 런타임 구현체
    container.register(
      "runtime",
      () => {
        return new WorkersRuntime(env, ctx);
      },
      { singleton: true }
    );

    // 링크 저장소
    container.register(
      "linkRepository",
      (container) => {
        const storage = container.resolve("storage");
        return new StorageLinkRepository(storage);
      },
      { singleton: true }
    );

    // 콘텐츠 스크래퍼
    container.register("contentScraper", () => {
      return new WebContentScraper({
        timeout: parseInt(env.SCRAPER_TIMEOUT) || 10000,
        userAgent: env.SCRAPER_USER_AGENT || "LinkDump-Bot/1.0",
      });
    });

    // AI 요약기
    container.register("aiSummarizer", (container) => {
      const aiClient = container.resolve("aiClient");
      const aiType = env.AI_PROVIDER || "workers-ai";

      switch (aiType) {
        case "workers-ai":
          return new WorkersAISummarizer(aiClient);
        case "openai":
          return new OpenAISummarizer(aiClient);
        default:
          throw new Error(`지원하지 않는 AI 제공자: ${aiType}`);
      }
    });

    // Discord 알림기
    container.register("discordNotifier", () => {
      const webhooks = env.DISCORD_WEBHOOKS
        ? JSON.parse(env.DISCORD_WEBHOOKS)
        : [];

      return new DiscordNotifier(webhooks);
    });

    // 백그라운드 태스크 러너
    container.register("backgroundTaskRunner", (container) => {
      const runtime = container.resolve("runtime");
      return new WorkersBackgroundRunner(runtime);
    });

    // 메인 애플리케이션 서비스
    container.register(
      "linkManagementService",
      (container) => {
        return new LinkManagementService(
          container.resolve("linkRepository"),
          container.resolve("contentScraper"),
          container.resolve("aiSummarizer"),
          container.resolve("discordNotifier"),
          container.resolve("backgroundTaskRunner")
        );
      },
      { singleton: true }
    );

    return container;
  }

  /**
   * 로컬 개발 환경용 컨테이너 설정
   */
  static createForLocal(config = {}) {
    const container = new DependencyContainer();

    // 로컬 스토리지
    container.register(
      "storage",
      () => {
        return new FileStorage(config.dataPath || "./data");
      },
      { singleton: true }
    );

    // 로컬 AI 클라이언트 (OpenAI 사용)
    container.register(
      "aiClient",
      () => {
        if (!config.openaiApiKey) {
          throw new Error("로컬 환경에서는 OPENAI_API_KEY가 필요합니다.");
        }
        return new OpenAIClient(config.openaiApiKey);
      },
      { singleton: true }
    );

    // 링크 저장소
    container.register(
      "linkRepository",
      (container) => {
        const storage = container.resolve("storage");
        return new StorageLinkRepository(storage);
      },
      { singleton: true }
    );

    // 콘텐츠 스크래퍼
    container.register("contentScraper", () => {
      return new WebContentScraper(config.scraper || {});
    });

    // AI 요약기
    container.register("aiSummarizer", (container) => {
      const aiClient = container.resolve("aiClient");
      return new OpenAISummarizer(aiClient);
    });

    // Discord 알림기
    container.register("discordNotifier", () => {
      return new DiscordNotifier(config.discordWebhooks || []);
    });

    // 백그라운드 태스크 러너
    container.register("backgroundTaskRunner", () => {
      return new LocalBackgroundRunner();
    });

    // 메인 애플리케이션 서비스
    container.register(
      "linkManagementService",
      (container) => {
        return new LinkManagementService(
          container.resolve("linkRepository"),
          container.resolve("contentScraper"),
          container.resolve("aiSummarizer"),
          container.resolve("discordNotifier"),
          container.resolve("backgroundTaskRunner")
        );
      },
      { singleton: true }
    );

    return container;
  }
}

/**
 * DependencyContainer 빌더
 * 플러그인을 등록하고 환경별 설정을 구성합니다.
 */
export class DependencyContainerBuilder {
  constructor() {
    this.container = new DependencyContainer();
    this.config = {};
  }

  /**
   * 설정 추가
   */
  withConfig(config) {
    this.config = { ...this.config, ...config };
    return this;
  }

  /**
   * 스토리지 플러그인 등록
   */
  withStoragePlugin(name, factory) {
    this.container.registerPlugin("storage", name, factory);
    return this;
  }

  /**
   * AI 클라이언트 플러그인 등록
   */
  withAIClientPlugin(name, factory) {
    this.container.registerPlugin("aiClient", name, factory);
    return this;
  }

  /**
   * AI 요약기 플러그인 등록
   */
  withAISummarizerPlugin(name, factory) {
    this.container.registerPlugin("aiSummarizer", name, factory);
    return this;
  }

  /**
   * 런타임 플러그인 등록
   */
  withRuntimePlugin(name, factory) {
    this.container.registerPlugin("runtime", name, factory);
    return this;
  }

  /**
   * 백그라운드 태스크 러너 플러그인 등록
   */
  withBackgroundTaskRunnerPlugin(name, factory) {
    this.container.registerPlugin("backgroundTaskRunner", name, factory);
    return this;
  }

  /**
   * 알림기 플러그인 등록
   */
  withNotifierPlugin(name, factory) {
    this.container.registerPlugin("notifier", name, factory);
    return this;
  }

  /**
   * 콘텐츠 스크래퍼 플러그인 등록
   */
  withContentScraperPlugin(name, factory) {
    this.container.registerPlugin("contentScraper", name, factory);
    return this;
  }

  /**
   * 핵심 서비스들 등록
   */
  registerCoreServices() {
    const { config, container } = this;

    // 스토리지 서비스
    container.register(
      "storage",
      () => {
        const storageType = config.storageType || "file";
        return container.resolvePlugin("storage", storageType, config);
      },
      { singleton: true }
    );

    // AI 클라이언트 서비스
    container.register(
      "aiClient",
      () => {
        const aiProvider = config.aiProvider || "openai";
        return container.resolvePlugin("aiClient", aiProvider, config);
      },
      { singleton: true }
    );

    // 런타임 서비스
    container.register(
      "runtime",
      () => {
        const runtimeType = config.runtimeType || "workers";
        return container.resolvePlugin("runtime", runtimeType, config);
      },
      { singleton: true }
    );

    // 링크 저장소 (도메인 서비스)
    container.register(
      "linkRepository",
      (container) => {
        // 동적 import를 통해 필요할 때만 로드
        return import(
          "../../link-management/infrastructure/storage-link-repository.js"
        ).then(({ StorageLinkRepository }) => {
          const storage = container.resolve("storage");
          return new StorageLinkRepository(storage);
        });
      },
      { singleton: true }
    );

    // 콘텐츠 스크래퍼
    container.register("contentScraper", () => {
      const scraperType = config.scraperType || "web";
      return container.resolvePlugin("contentScraper", scraperType, config);
    });

    // AI 요약기
    container.register("aiSummarizer", (container) => {
      const aiProvider = config.aiProvider || "openai";
      const aiClient = container.resolve("aiClient");
      return container.resolvePlugin(
        "aiSummarizer",
        aiProvider,
        aiClient,
        config
      );
    });

    // 알림기
    container.register("notifier", () => {
      const notifierType = config.notifierType || "discord";
      return container.resolvePlugin("notifier", notifierType, config);
    });

    // 백그라운드 태스크 러너
    container.register("backgroundTaskRunner", (container) => {
      const taskRunnerType = config.taskRunnerType || "workers";
      const runtime = container.resolve("runtime");
      return container.resolvePlugin(
        "backgroundTaskRunner",
        taskRunnerType,
        runtime,
        config
      );
    });

    // 메인 애플리케이션 서비스
    container.register(
      "linkManagementService",
      async (container) => {
        const { LinkManagementService } = await import(
          "../../link-management/application/link-management-service.js"
        );

        return new LinkManagementService(
          await container.resolve("linkRepository"),
          container.resolve("contentScraper"),
          container.resolve("aiSummarizer"),
          container.resolve("notifier"),
          container.resolve("backgroundTaskRunner")
        );
      },
      { singleton: true }
    );

    return this;
  }

  /**
   * 컨테이너 빌드
   */
  build() {
    return this.container;
  }
}
