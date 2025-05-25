// Cloudflare 구현체들
import { R2Storage } from "../implementations/cloudflare/r2-storage.js";
import { WorkersAI } from "../implementations/cloudflare/workers-ai.js";
import { WorkersRuntime } from "../implementations/cloudflare/workers-runtime.js";

// 다른 구현체들
import { OpenAIProvider } from "../implementations/openai/openai-provider.js";
import { FileSystemStorage } from "../implementations/filesystem/fs-storage.js";

/**
 * 제공자 팩토리 - 설정에 따라 적절한 구현체 생성
 */
export class ProviderFactory {
  /**
   * 스토리지 제공자 생성
   */
  static createStorage(type, config = {}) {
    switch (type) {
      case "r2":
        if (!config.bucket) {
          throw new Error("R2 bucket is required for R2 storage");
        }
        return new R2Storage(config.bucket);

      case "filesystem":
        return new FileSystemStorage(config.basePath);

      default:
        throw new Error(`Unknown storage type: ${type}`);
    }
  }

  /**
   * AI 제공자 생성
   */
  static createAIProvider(type, config = {}) {
    switch (type) {
      case "workers-ai":
        if (!config.aiBinding) {
          throw new Error("AI binding is required for Workers AI");
        }
        return new WorkersAI(config.aiBinding, config.defaultModel);

      case "openai":
        if (!config.apiKey) {
          throw new Error("API key is required for OpenAI");
        }
        return new OpenAIProvider(config.apiKey, config.defaultModel);

      default:
        throw new Error(`Unknown AI provider type: ${type}`);
    }
  }

  /**
   * 런타임 제공자 생성
   */
  static createRuntime(type, config = {}) {
    switch (type) {
      case "workers":
        if (!config.env || !config.ctx) {
          throw new Error("env and ctx are required for Workers runtime");
        }
        return new WorkersRuntime(config.env, config.ctx);

      default:
        throw new Error(`Unknown runtime type: ${type}`);
    }
  }

  /**
   * 설정 객체로부터 모든 제공자 생성
   */
  static createProviders(config) {
    const storage = this.createStorage(
      config.storage.type,
      config.storage.config
    );
    const aiProvider = this.createAIProvider(config.ai.type, config.ai.config);
    const runtime = this.createRuntime(
      config.runtime.type,
      config.runtime.config
    );

    return { storage, aiProvider, runtime };
  }

  /**
   * Cloudflare Workers 환경용 기본 설정
   */
  static createCloudflareConfig(env, ctx) {
    return {
      storage: {
        type: "r2",
        config: { bucket: env.LINKDUMP_STORAGE },
      },
      ai: {
        type: "workers-ai",
        config: {
          aiBinding: env.AI,
          defaultModel: "@cf/meta/llama-3.2-1b-instruct",
        },
      },
      runtime: {
        type: "workers",
        config: { env, ctx },
      },
    };
  }

  /**
   * 로컬 개발 환경용 기본 설정
   */
  static createLocalConfig(openaiApiKey) {
    return {
      storage: {
        type: "filesystem",
        config: { basePath: "./data" },
      },
      ai: {
        type: "openai",
        config: {
          apiKey: openaiApiKey,
          defaultModel: "gpt-3.5-turbo",
        },
      },
      runtime: {
        type: "local",
        config: {},
      },
    };
  }
}
