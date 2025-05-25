/**
 * 링크 상태 타입
 */
export type LinkStatus = "pending" | "processing" | "completed" | "failed";

/**
 * 링크 생성자 매개변수 인터페이스
 */
export interface LinkConstructorParams {
  id?: string;
  url: string;
  title?: string | null;
  description?: string | null;
  image?: string | null;
  summary?: string | null;
  tags?: string[];
  status?: LinkStatus;
  createdAt?: Date;
  processedAt?: Date | null;
  error?: string | null;
}

/**
 * 링크 처리 완료 데이터 인터페이스
 */
export interface LinkProcessingData {
  title: string;
  description: string;
  image?: string;
  summary: string;
}

import type { LinkData } from "../../shared/interfaces/index.js";

/**
 * 링크 도메인 엔티티
 * 링크의 핵심 비즈니스 규칙과 불변성을 보장합니다.
 */
export class Link {
  public readonly id: string;
  public readonly url: string;
  public readonly title: string | null;
  public readonly description: string | null;
  public readonly image: string | null;
  public readonly summary: string | null;
  public readonly tags: readonly string[];
  public readonly status: LinkStatus;
  public readonly createdAt: Date;
  public readonly processedAt: Date | null;
  public readonly error: string | null;

  constructor({
    id,
    url,
    title = null,
    description = null,
    image = null,
    summary = null,
    tags = [],
    status = "pending",
    createdAt = new Date(),
    processedAt = null,
    error = null,
  }: LinkConstructorParams) {
    this.validateUrl(url);

    this.id = id || this.generateId();
    this.url = url;
    this.title = title;
    this.description = description;
    this.image = image;
    this.summary = summary;
    this.tags = Object.freeze([...tags]); // 불변성 보장
    this.status = status;
    this.createdAt = createdAt;
    this.processedAt = processedAt;
    this.error = error;
  }

  /**
   * URL 유효성 검증
   */
  private validateUrl(url: string): void {
    if (!url || typeof url !== "string") {
      throw new Error("URL은 필수이며 문자열이어야 합니다.");
    }

    try {
      new URL(url);
    } catch {
      throw new Error("유효하지 않은 URL 형식입니다.");
    }
  }

  /**
   * 고유 ID 생성
   */
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * 링크 처리 시작
   */
  startProcessing(): Link {
    if (this.status !== "pending") {
      throw new Error("이미 처리된 링크입니다.");
    }

    return new Link({
      ...this.toObject(),
      status: "processing",
    });
  }

  /**
   * 링크 처리 완료
   */
  completeProcessing({
    title,
    description,
    image,
    summary,
  }: LinkProcessingData): Link {
    if (this.status !== "processing") {
      throw new Error("처리 중인 링크가 아닙니다.");
    }

    return new Link({
      ...this.toObject(),
      title,
      description,
      image,
      summary,
      status: "completed",
      processedAt: new Date(),
      error: null,
    });
  }

  /**
   * 링크 처리 실패
   */
  failProcessing(error: Error | string): Link {
    return new Link({
      ...this.toObject(),
      status: "failed",
      processedAt: new Date(),
      error: typeof error === "string" ? error : error.message,
    });
  }

  /**
   * 태그 추가
   */
  addTags(newTags: string[]): Link {
    const uniqueTags = [...new Set([...this.tags, ...newTags])];

    return new Link({
      ...this.toObject(),
      tags: uniqueTags,
    });
  }

  /**
   * 처리 가능한 상태인지 확인
   */
  canBeProcessed(): boolean {
    return this.status === "pending";
  }

  /**
   * 완료된 상태인지 확인
   */
  isCompleted(): boolean {
    return this.status === "completed";
  }

  /**
   * 실패한 상태인지 확인
   */
  isFailed(): boolean {
    return this.status === "failed";
  }

  /**
   * 객체로 변환 (직렬화용)
   */
  toObject(): LinkConstructorParams {
    return {
      id: this.id,
      url: this.url,
      title: this.title,
      description: this.description,
      image: this.image,
      summary: this.summary,
      tags: [...this.tags],
      status: this.status,
      createdAt: this.createdAt,
      processedAt: this.processedAt,
      error: this.error,
    };
  }

  /**
   * 객체에서 링크 생성 (역직렬화용)
   */
  static fromObject(obj: any): Link {
    return new Link({
      ...obj,
      createdAt: new Date(obj.createdAt),
      processedAt: obj.processedAt ? new Date(obj.processedAt) : null,
    });
  }

  /**
   * LinkData 인터페이스로 변환 (알림 전송용)
   * Link 엔티티의 상태를 LinkData 형태로 변환합니다.
   */
  toLinkData(): LinkData {
    return {
      id: this.id,
      url: this.url,
      title: this.title || undefined,
      description: this.description || undefined,
      summary: this.summary || undefined,
      tags: [...this.tags],
      createdAt: this.createdAt,
      processedAt: this.processedAt || undefined,
      status: this.mapStatusToLinkDataStatus(),
    };
  }

  /**
   * Link 엔티티의 status를 LinkData의 status로 매핑
   */
  private mapStatusToLinkDataStatus(): "pending" | "processed" | "failed" {
    switch (this.status) {
      case "completed":
        return "processed";
      case "pending":
      case "processing":
        return "pending";
      case "failed":
        return "failed";
      default:
        return "pending";
    }
  }
}
