/**
 * 핵심 도메인 인터페이스들
 */

export interface LinkData {
  id: string;
  url: string;
  title?: string;
  description?: string;
  summary?: string;
  tags?: string[];
  createdAt: Date;
  processedAt?: Date;
  status: "pending" | "processed" | "failed";
}

/**
 * 스토리지 인터페이스
 */
export interface Storage {
  save(key: string, data: any): Promise<void>;
  load(key: string): Promise<any>;
  exists(key: string): Promise<boolean>;
  delete(key: string): Promise<void>;
  list(prefix?: string): Promise<string[]>;
}

/**
 * AI 클라이언트 인터페이스
 */
export interface AIClient {
  generateText(prompt: string, options?: any): Promise<string>;
}

/**
 * AI 요약기 인터페이스
 */
export interface AISummarizer {
  summarize(content: {
    url: string;
    title?: string;
    description?: string;
  }): Promise<string>;
}

/**
 * 콘텐츠 스크래퍼 인터페이스
 */
export interface ContentScraper {
  scrape(
    url: string
  ): Promise<{ title?: string; description?: string; content?: string }>;
}

/**
 * 알림기 인터페이스
 */
export interface Notifier {
  send(linkData: LinkData): Promise<void>;
}

/**
 * 백그라운드 태스크 러너 인터페이스
 */
export interface BackgroundTaskRunner {
  schedule(task: () => Promise<void>): Promise<void>;
}

/**
 * 런타임 인터페이스
 */
export interface Runtime {
  setCorsHeaders(response: Response): Response;
  getEnvironment(): any;
}

/**
 * 링크 저장소 인터페이스
 */
export interface LinkRepository {
  save(link: LinkData): Promise<void>;
  findById(id: string): Promise<LinkData | null>;
  findAll(): Promise<LinkData[]>;
  findUnprocessed(): Promise<LinkData[]>;
  update(id: string, updates: Partial<LinkData>): Promise<void>;
  delete(id: string): Promise<void>;
}

/**
 * 설정 인터페이스
 */
export interface Config {
  openaiApiKey?: string;
  discordWebhooks?: string[];
  dataPath?: string;
  aiProvider?: "openai" | "workers-ai" | "claude";
  storageProvider?: "file" | "r2" | "redis";
  env?: any;
  ctx?: any;
}

/**
 * DI 토큰들
 */
export const TOKENS = {
  // 설정
  Config: Symbol.for("Config"),

  // 인프라
  Storage: Symbol.for("Storage"),
  AIClient: Symbol.for("AIClient"),
  AISummarizer: Symbol.for("AISummarizer"),
  ContentScraper: Symbol.for("ContentScraper"),
  Notifier: Symbol.for("Notifier"),
  BackgroundTaskRunner: Symbol.for("BackgroundTaskRunner"),
  Runtime: Symbol.for("Runtime"),

  // 도메인
  LinkRepository: Symbol.for("LinkRepository"),
  LinkManagementService: Symbol.for("LinkManagementService"),
} as const;
