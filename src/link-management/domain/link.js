/**
 * 링크 도메인 엔티티
 * 링크의 핵심 비즈니스 규칙과 불변성을 보장합니다.
 */
export class Link {
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
  }) {
    this.validateUrl(url);

    this.id = id || this.generateId();
    this.url = url;
    this.title = title;
    this.description = description;
    this.image = image;
    this.summary = summary;
    this.tags = [...tags]; // 불변성 보장
    this.status = status;
    this.createdAt = createdAt;
    this.processedAt = processedAt;
    this.error = error;
  }

  /**
   * URL 유효성 검증
   */
  validateUrl(url) {
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
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * 링크 처리 시작
   */
  startProcessing() {
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
  completeProcessing({ title, description, image, summary }) {
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
  failProcessing(error) {
    return new Link({
      ...this.toObject(),
      status: "failed",
      processedAt: new Date(),
      error: error.message || error,
    });
  }

  /**
   * 태그 추가
   */
  addTags(newTags) {
    const uniqueTags = [...new Set([...this.tags, ...newTags])];

    return new Link({
      ...this.toObject(),
      tags: uniqueTags,
    });
  }

  /**
   * 처리 가능한 상태인지 확인
   */
  canBeProcessed() {
    return this.status === "pending";
  }

  /**
   * 완료된 상태인지 확인
   */
  isCompleted() {
    return this.status === "completed";
  }

  /**
   * 실패한 상태인지 확인
   */
  isFailed() {
    return this.status === "failed";
  }

  /**
   * Discord 전송용 데이터 생성
   */
  toDiscordData() {
    if (!this.isCompleted()) {
      throw new Error("완료된 링크만 Discord로 전송할 수 있습니다.");
    }

    return {
      url: this.url,
      title: this.title || "No Title",
      description: this.description || "No Description",
      image: this.image,
      summary: this.summary || "No Summary Available",
      tags: this.tags,
      createdAt: this.createdAt,
    };
  }

  /**
   * 객체로 변환 (직렬화용)
   */
  toObject() {
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
  static fromObject(obj) {
    return new Link({
      ...obj,
      createdAt: new Date(obj.createdAt),
      processedAt: obj.processedAt ? new Date(obj.processedAt) : null,
    });
  }
}
