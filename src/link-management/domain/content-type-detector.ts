/**
 * 콘텐츠 타입 감지기
 * 소셜미디어와 비디오를 걸러내고, 나머지는 콘텐츠 길이 기반으로 AI 요약 여부를 결정합니다.
 */

export type ContentType =
  | "social_media" // 소셜미디어 - OG 태그만 사용
  | "video" // 동영상 콘텐츠 - OG 태그만 사용
  | "long_content" // 긴 콘텐츠 - AI 요약 필요
  | "short_content"; // 짧은 콘텐츠 - OG 태그만 사용

export interface ContentTypeResult {
  type: ContentType;
  shouldSummarize: boolean;
  reason: string;
}

/**
 * 콘텐츠 타입 감지기 클래스
 */
export class ContentTypeDetector {
  /**
   * URL과 메타데이터를 기반으로 콘텐츠 타입을 감지합니다.
   */
  detect(url: string, title?: string, description?: string): ContentTypeResult {
    const domain = this.extractDomain(url);
    const path = this.extractPath(url);

    // 1. 소셜미디어 플랫폼 감지
    const socialMediaResult = this.detectSocialMedia(domain, path);
    if (socialMediaResult) {
      return socialMediaResult;
    }

    // 2. 동영상 콘텐츠 감지
    const videoResult = this.detectVideo(domain, path);
    if (videoResult) {
      return videoResult;
    }

    // 3. 콘텐츠 길이 기반 판단
    return this.detectByContentLength(title, description);
  }

  /**
   * 소셜미디어 플랫폼 감지
   */
  private detectSocialMedia(
    domain: string,
    path: string
  ): ContentTypeResult | null {
    const socialDomains = [
      "twitter.com",
      "x.com",
      "facebook.com",
      "instagram.com",
      "linkedin.com",
      "tiktok.com",
      "snapchat.com",
      "reddit.com",
      "discord.com",
      "telegram.org",
      "whatsapp.com",
    ];

    if (socialDomains.some((social) => domain.includes(social))) {
      return {
        type: "social_media",
        shouldSummarize: false,
        reason: "소셜미디어 플랫폼 - OG 태그만 사용",
      };
    }

    return null;
  }

  /**
   * 동영상 콘텐츠 감지
   */
  private detectVideo(domain: string, path: string): ContentTypeResult | null {
    const videoPlatforms = [
      "youtube.com",
      "youtu.be",
      "vimeo.com",
      "twitch.tv",
      "netflix.com",
      "disney.com",
      "hulu.com",
    ];

    if (videoPlatforms.some((video) => domain.includes(video))) {
      return {
        type: "video",
        shouldSummarize: false,
        reason: "동영상 플랫폼 - OG 태그만 사용",
      };
    }

    return null;
  }

  /**
   * 콘텐츠 길이 기반 감지
   */
  private detectByContentLength(
    title?: string,
    description?: string
  ): ContentTypeResult {
    const titleLength = title?.length || 0;
    const descriptionLength = description?.length || 0;
    const totalLength = titleLength + descriptionLength;

    // 콘텐츠 길이 임계값 설정
    const LONG_CONTENT_THRESHOLD = 200; // 제목 + 설명이 200자 이상이면 긴 콘텐츠로 판단

    if (totalLength >= LONG_CONTENT_THRESHOLD) {
      return {
        type: "long_content",
        shouldSummarize: true,
        reason: `긴 콘텐츠 감지 (${totalLength}자) - AI 요약 필요`,
      };
    } else {
      return {
        type: "short_content",
        shouldSummarize: false,
        reason: `짧은 콘텐츠 (${totalLength}자) - OG 태그만 사용`,
      };
    }
  }

  /**
   * URL에서 도메인 추출
   */
  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname.toLowerCase();
    } catch {
      return "";
    }
  }

  /**
   * URL에서 경로 추출
   */
  private extractPath(url: string): string {
    try {
      return new URL(url).pathname.toLowerCase();
    } catch {
      return "";
    }
  }
}
