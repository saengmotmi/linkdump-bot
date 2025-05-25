/**
 * 플러그인 기반 의존성 컨테이너
 * 모든 구현체를 플러그인으로 외부에서 주입받습니다.
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
  async resolvePlugin(type, name, ...args) {
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

    // 플러그인이 Promise를 반환할 수 있으므로 await 처리
    return await plugin(...args);
  }

  /**
   * 서비스 해결
   */
  async resolve(name) {
    const service = this.services.get(name);
    if (!service) {
      throw new Error(`서비스를 찾을 수 없습니다: ${name}`);
    }

    if (service.singleton) {
      if (!this.singletons.has(name)) {
        this.singletons.set(name, await service.factory(this));
      }
      return this.singletons.get(name);
    }

    return await service.factory(this);
  }

  /**
   * 빌더 패턴으로 컨테이너 생성
   */
  static createBuilder() {
    return new DependencyContainerBuilder();
  }
}

/**
 * 의존성 컨테이너 빌더
 * 플러그인 등록과 핵심 서비스 설정을 위한 빌더 패턴
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
   * 핵심 서비스들을 등록합니다.
   * 플러그인들이 등록된 후에 호출되어야 합니다.
   */
  registerCoreServices() {
    // 스토리지 서비스
    this.container.register(
      "storage",
      async (container) => {
        const storageType = this.config.storageProvider || "file";
        return await container.resolvePlugin(
          "storage",
          storageType,
          this.config
        );
      },
      { singleton: true }
    );

    // AI 클라이언트 서비스
    this.container.register(
      "aiClient",
      async (container) => {
        const aiType = this.config.aiProvider || "openai";
        return await container.resolvePlugin("aiClient", aiType, this.config);
      },
      { singleton: true }
    );

    // 런타임 서비스
    this.container.register(
      "runtime",
      async (container) => {
        const runtimeType = this.config.runtimeProvider || "workers";
        return await container.resolvePlugin(
          "runtime",
          runtimeType,
          this.config
        );
      },
      { singleton: true }
    );

    // 링크 저장소
    this.container.register(
      "linkRepository",
      async (container) => {
        const storage = await container.resolve("storage");
        const { StorageLinkRepository } = await import(
          "../../link-management/infrastructure/storage-link-repository.js"
        );
        return new StorageLinkRepository(storage);
      },
      { singleton: true }
    );

    // 콘텐츠 스크래퍼
    this.container.register("contentScraper", async (container) => {
      const scraperType = this.config.contentScraperProvider || "web";
      return await container.resolvePlugin(
        "contentScraper",
        scraperType,
        this.config
      );
    });

    // AI 요약기
    this.container.register("aiSummarizer", async (container) => {
      const aiClient = await container.resolve("aiClient");
      const summarizerType =
        this.config.aiSummarizerProvider || this.config.aiProvider || "openai";
      return await container.resolvePlugin(
        "aiSummarizer",
        summarizerType,
        aiClient,
        this.config
      );
    });

    // 알림기
    this.container.register("notifier", async (container) => {
      const notifierType = this.config.notifierProvider || "discord";
      return await container.resolvePlugin(
        "notifier",
        notifierType,
        this.config
      );
    });

    // 백그라운드 태스크 러너
    this.container.register("backgroundTaskRunner", async (container) => {
      const taskRunnerType =
        this.config.backgroundTaskRunnerProvider || "workers";
      return await container.resolvePlugin(
        "backgroundTaskRunner",
        taskRunnerType,
        this.config
      );
    });

    // 메인 애플리케이션 서비스
    this.container.register(
      "linkManagementService",
      async (container) => {
        const { LinkManagementService } = await import(
          "../../link-management/application/link-management-service.js"
        );

        return new LinkManagementService(
          await container.resolve("linkRepository"),
          await container.resolve("contentScraper"),
          await container.resolve("aiSummarizer"),
          await container.resolve("notifier"),
          await container.resolve("backgroundTaskRunner")
        );
      },
      { singleton: true }
    );

    return this;
  }

  /**
   * 설정된 컨테이너를 빌드합니다.
   */
  build() {
    return this.container;
  }
}
