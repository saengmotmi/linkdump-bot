/**
 * 콘텐츠 타입 감지기
 * URL과 OG 태그를 기반으로 콘텐츠 타입을 판단하고, 소셜미디어별로 다른 처리 방식을 결정합니다.
 */

export type ContentType =
  | "article" // 블로그, 뉴스 아티클 등 - AI 요약 필요
  | "linkedin" // LinkedIn 포스트 - AI 요약 필요
  | "twitter" // Twitter/X 포스트 - OG 태그만 사용
  | "social_media" // 기타 소셜미디어 - OG 태그만 사용
  | "general" // 일반 웹사이트 - OG 태그만 사용
  | "documentation" // 문서/가이드 - AI 요약 필요
  | "video" // 동영상 콘텐츠 - OG 태그만 사용
  | "unknown"; // 알 수 없음 - 기본 처리

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

    // 소셜미디어 플랫폼 감지
    const socialMediaResult = this.detectSocialMedia(domain, path);
    if (socialMediaResult) {
      return socialMediaResult;
    }

    // 아티클/블로그 감지
    const articleResult = this.detectArticle(domain, path, title, description);
    if (articleResult) {
      return articleResult;
    }

    // 문서/가이드 감지
    const docResult = this.detectDocumentation(domain, path, title);
    if (docResult) {
      return docResult;
    }

    // 동영상 콘텐츠 감지
    const videoResult = this.detectVideo(domain, path);
    if (videoResult) {
      return videoResult;
    }

    // 기본값: 일반 웹사이트
    return {
      type: "general",
      shouldSummarize: false,
      reason: "일반 웹사이트로 판단됨",
    };
  }

  /**
   * 소셜미디어 플랫폼 감지
   */
  private detectSocialMedia(
    domain: string,
    path: string
  ): ContentTypeResult | null {
    // LinkedIn
    if (domain.includes("linkedin.com")) {
      if (path.includes("/posts/") || path.includes("/feed/update/")) {
        return {
          type: "linkedin",
          shouldSummarize: true,
          reason: "LinkedIn 포스트 - 전문적 내용으로 요약 필요",
        };
      }
    }

    // Twitter/X
    if (domain.includes("twitter.com") || domain.includes("x.com")) {
      return {
        type: "twitter",
        shouldSummarize: false,
        reason: "Twitter/X 포스트 - 짧은 내용으로 OG 태그만 사용",
      };
    }

    // 기타 소셜미디어
    const socialDomains = [
      "facebook.com",
      "instagram.com",
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
   * 아티클/블로그 콘텐츠 감지
   */
  private detectArticle(
    domain: string,
    path: string,
    title?: string,
    description?: string
  ): ContentTypeResult | null {
    // 블로그 플랫폼
    const blogPlatforms = [
      "medium.com",
      "substack.com",
      "notion.so",
      "tistory.com",
      "naver.com",
      "brunch.co.kr",
      "velog.io",
      "dev.to",
    ];

    if (blogPlatforms.some((blog) => domain.includes(blog))) {
      return {
        type: "article",
        shouldSummarize: true,
        reason: "블로그 플랫폼 - 긴 내용으로 요약 필요",
      };
    }

    // 뉴스 사이트
    const newsSites = [
      "news",
      "times",
      "post",
      "herald",
      "daily",
      "journal",
      "chosun.com",
      "donga.com",
      "joongang.co.kr",
      "hani.co.kr",
    ];

    if (newsSites.some((news) => domain.includes(news))) {
      return {
        type: "article",
        shouldSummarize: true,
        reason: "뉴스 사이트 - 기사 내용 요약 필요",
      };
    }

    // URL 패턴으로 아티클 감지
    const articlePatterns = [
      "/blog/",
      "/article/",
      "/post/",
      "/posts/",
      "/news/",
      "/story/",
      "/stories/",
      "/read/",
      "/content/",
    ];

    if (articlePatterns.some((pattern) => path.includes(pattern))) {
      return {
        type: "article",
        shouldSummarize: true,
        reason: "URL 패턴으로 아티클 감지됨",
      };
    }

    // 제목/설명으로 아티클 감지
    if (title && description) {
      const longContent = title.length > 50 || description.length > 200;
      const hasArticleKeywords =
        /article|blog|post|story|guide|tutorial|how to/i.test(
          title + " " + description
        );

      if (longContent && hasArticleKeywords) {
        return {
          type: "article",
          shouldSummarize: true,
          reason: "긴 내용과 아티클 키워드로 판단됨",
        };
      }
    }

    return null;
  }

  /**
   * 문서/가이드 콘텐츠 감지
   */
  private detectDocumentation(
    domain: string,
    path: string,
    title?: string
  ): ContentTypeResult | null {
    // 문서 사이트
    const docSites = [
      "docs.",
      "documentation",
      "wiki",
      "guide",
      "manual",
      "readme",
      "tutorial",
      "learn",
      "academy",
    ];

    if (docSites.some((doc) => domain.includes(doc) || path.includes(doc))) {
      return {
        type: "documentation",
        shouldSummarize: true,
        reason: "문서/가이드 사이트 - 요약 필요",
      };
    }

    // GitHub README 등
    if (
      domain.includes("github.com") &&
      (path.includes("readme") || path.includes("wiki"))
    ) {
      return {
        type: "documentation",
        shouldSummarize: true,
        reason: "GitHub 문서 - 요약 필요",
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
