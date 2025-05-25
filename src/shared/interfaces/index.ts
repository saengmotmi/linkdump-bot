/**
 * 핵심 도메인 인터페이스들
 */

/**
 * 링크 상태 타입
 */
export type LinkStatus = "pending" | "processing" | "completed" | "failed";

export interface LinkData {
  id: string;
  url: string;
  title?: string;
  description?: string;
  summary?: string;
  tags?: string[];
  createdAt: Date;
  processedAt?: Date;
  status: LinkStatus;
}

/**
 * Cloudflare Workers 환경 타입 정의
 */
export interface CloudflareEnv {
  LINKDUMP_STORAGE: R2Bucket;
  AI: Ai;
  DISCORD_WEBHOOKS?: string;
  OPENAI_API_KEY?: string;
  CF_PAGES?: string;
}

/**
 * 저장소 인터페이스
 */
export interface Storage {
  save<T = unknown>(key: string, data: T): Promise<void>;
  load<T = unknown>(key: string): Promise<T>;
  get<T = unknown>(key: string): Promise<T | null>;
  delete(key: string): Promise<void>;
  list(): Promise<string[]>;
}

/**
 * AI 클라이언트 옵션
 */
export interface AIOptions {
  maxTokens?: number;
  temperature?: number;
  model?: string;
}

/**
 * AI 클라이언트 인터페이스
 */
export interface AIClient {
  generateText(prompt: string, options?: AIOptions): Promise<string>;
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
 * 태스크 큐 인터페이스
 */
export interface TaskQueue {
  enqueue(task: () => Promise<void>): void;
  dequeue(): (() => Promise<void>) | undefined;
  size(): number;
  isEmpty(): boolean;
  clear(): void;
}

/**
 * 큐 프로세서 인터페이스
 */
export interface QueueProcessor {
  start(): Promise<void>;
  stop(): Promise<void>;
  isProcessing(): boolean;
  waitForCompletion(): Promise<void>;
  getPendingTaskCount(): number;
  /**
   * 새 태스크가 추가되었을 때 처리를 트리거합니다.
   * 이미 처리 중이면 무시됩니다.
   */
  triggerProcessing(): Promise<void>;
}

/**
 * 설정 인터페이스 - 실제 설정값만 포함
 */
export interface Config {
  webhookUrls?: string[];
  dataPath?: string;
  env?: ExecutionContext;
  ctx?: ExecutionContext;
}

/**
 * DI 토큰들 - 실제 사용되는 것들만
 */
export const TOKENS = {
  // 설정
  Config: Symbol.for("Config"),

  // 인프라스트럭처 서비스들
  Storage: Symbol.for("Storage"),
  AIClient: Symbol.for("AIClient"),
  AISummarizer: Symbol.for("AISummarizer"),
  ContentScraper: Symbol.for("ContentScraper"),
  Notifier: Symbol.for("Notifier"),
  BackgroundTaskRunner: Symbol.for("BackgroundTaskRunner"),

  // 큐 관련 서비스들
  TaskQueue: Symbol.for("TaskQueue"),
  QueueProcessor: Symbol.for("QueueProcessor"),

  // 도메인 서비스들 (실제 인터페이스는 도메인 레이어에서 정의)
  LinkRepository: Symbol.for("LinkRepository"),
  LinkManagementService: Symbol.for("LinkManagementService"),

  // API 컨트롤러들
  LinkController: Symbol.for("LinkController"),
  ConfigController: Symbol.for("ConfigController"),
  PreviewController: Symbol.for("PreviewController"),
  ApiRouter: Symbol.for("ApiRouter"),
} as const;
