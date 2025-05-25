// 임시 타입 선언 - JavaScript 인프라스트럭처 파일들
declare module "*/storage/r2-storage.js" {
  import { Storage } from "../shared/interfaces/index.js";
  export class R2Storage implements Storage {
    constructor(bucket: any);
    save(key: string, data: any): Promise<boolean>;
    load(key: string): Promise<any>;
    exists(key: string): Promise<boolean>;
    delete(key: string): Promise<boolean>;
    list(prefix?: string): Promise<string[]>;
  }
}

declare module "*/storage/file-storage.js" {
  import { Storage } from "../shared/interfaces/index.js";
  export class FileStorage implements Storage {
    constructor(dataPath: string);
    save(key: string, data: any): Promise<boolean>;
    load(key: string): Promise<any>;
    exists(key: string): Promise<boolean>;
    delete(key: string): Promise<boolean>;
    list(prefix?: string): Promise<string[]>;
  }
}

declare module "*/ai-provider/workers-ai-client.js" {
  import { AIClient } from "../shared/interfaces/index.js";
  export class WorkersAIClient implements AIClient {
    constructor(ai: any);
    generateText(prompt: string): Promise<string>;
  }
}

declare module "*/ai-provider/openai-client.js" {
  import { AIClient } from "../shared/interfaces/index.js";
  export class OpenAIClient implements AIClient {
    constructor(apiKey: string);
    generateText(prompt: string): Promise<string>;
  }
}

declare module "*/ai-summarizer/workers-ai-summarizer.js" {
  import { AISummarizer, AIClient } from "../shared/interfaces/index.js";
  export class WorkersAISummarizer implements AISummarizer {
    constructor(aiClient: AIClient);
    summarize(content: string): Promise<string>;
  }
}

declare module "*/ai-summarizer/openai-summarizer.js" {
  import { AISummarizer, AIClient } from "../shared/interfaces/index.js";
  export class OpenAISummarizer implements AISummarizer {
    constructor(aiClient: AIClient);
    summarize(content: string): Promise<string>;
  }
}

declare module "*/content-scraper/web-scraper.js" {
  import { ContentScraper } from "../shared/interfaces/index.js";
  export class WebContentScraper implements ContentScraper {
    scrape(url: string): Promise<{ title: string; content: string }>;
  }
}

declare module "*/notification/discord-notifier.js" {
  import { Notifier } from "../shared/interfaces/index.js";
  export class DiscordNotifier implements Notifier {
    constructor(webhooks: string[]);
    notify(message: string): Promise<void>;
  }
}

declare module "*/background-task/workers-background-runner.js" {
  import { BackgroundTaskRunner } from "../shared/interfaces/index.js";
  export class WorkersBackgroundRunner implements BackgroundTaskRunner {
    constructor(ctx: any);
    schedule(task: () => Promise<void>): void;
  }
}

declare module "*/background-task/local-background-runner.js" {
  import { BackgroundTaskRunner } from "../shared/interfaces/index.js";
  export class LocalBackgroundRunner implements BackgroundTaskRunner {
    schedule(task: () => Promise<void>): void;
  }
}

declare module "*/runtime/workers-runtime.js" {
  import { Runtime } from "../shared/interfaces/index.js";
  export class WorkersRuntime implements Runtime {
    getCorsHeaders(): Record<string, string>;
  }
}

declare module "*/storage-link-repository.js" {
  import { LinkRepository, Storage } from "../shared/interfaces/index.js";
  export class StorageLinkRepository implements LinkRepository {
    constructor(storage: Storage);
    save(link: any): Promise<void>;
    findById(id: string): Promise<any>;
    findAll(): Promise<any[]>;
    findByStatus(status: string): Promise<any[]>;
    updateStatus(id: string, status: string): Promise<void>;
  }
}

declare module "*/domain/link-service.js" {
  export class LinkDomainService {
    static validateUrl(url: string): boolean;
    static extractDomain(url: string): string;
    static generateId(): string;
  }
}
