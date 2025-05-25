/**
 * 웹 콘텐츠 스크래핑 구현체
 * HTML에서 메타데이터를 추출합니다.
 */
export class WebContentScraper {
  constructor(options = {}) {
    this.timeout = options.timeout || 10000;
    this.userAgent = options.userAgent || "LinkDump-Bot/1.0";
  }

  /**
   * URL에서 콘텐츠 스크래핑
   */
  async scrape(url) {
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": this.userAgent,
        },
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      return this.parseMetadata(html);
    } catch (error) {
      throw new Error(`스크래핑 실패: ${error.message}`);
    }
  }

  /**
   * HTML에서 메타데이터 파싱
   */
  parseMetadata(html) {
    // Open Graph 태그 우선 추출
    const ogTitle = this.extractMetaContent(html, "og:title");
    const ogDescription = this.extractMetaContent(html, "og:description");
    const ogImage = this.extractMetaContent(html, "og:image");

    // 기본 HTML 태그 fallback
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    const descriptionMatch = this.extractMetaContent(html, "description");

    return {
      title: ogTitle || (titleMatch ? titleMatch[1].trim() : null),
      description: ogDescription || descriptionMatch,
      image: ogImage,
      scrapedAt: new Date(),
    };
  }

  /**
   * 메타 태그 content 추출
   */
  extractMetaContent(html, property) {
    const patterns = [
      new RegExp(
        `<meta\\s+property=["']og:${property}["']\\s+content=["']([^"']*?)["']`,
        "i"
      ),
      new RegExp(
        `<meta\\s+name=["']${property}["']\\s+content=["']([^"']*?)["']`,
        "i"
      ),
      new RegExp(
        `<meta\\s+content=["']([^"']*?)["']\\s+property=["']og:${property}["']`,
        "i"
      ),
      new RegExp(
        `<meta\\s+content=["']([^"']*?)["']\\s+name=["']${property}["']`,
        "i"
      ),
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return null;
  }
}
