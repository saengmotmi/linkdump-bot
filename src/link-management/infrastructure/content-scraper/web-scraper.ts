import * as cheerio from "cheerio";
import type { ContentScraper } from "../../../shared/interfaces/index.js";

interface ScrapingOptions {
  timeout?: number;
  userAgent?: string;
}

interface ScrapedContent {
  title?: string;
  description?: string;
  image?: string;
  scrapedAt: Date;
}

/**
 * 웹 콘텐츠 스크래퍼 구현체
 * HTML에서 메타데이터를 추출합니다.
 */
export class WebContentScraper implements ContentScraper {
  private options: Required<ScrapingOptions>;

  constructor(options: ScrapingOptions = {}) {
    this.options = {
      timeout: options.timeout ?? 10000,
      userAgent: options.userAgent ?? "LinkDump Bot 1.0",
    };
  }

  /**
   * URL에서 콘텐츠 스크래핑
   */
  async scrape(url: string): Promise<{
    title?: string;
    description?: string;
    content?: string;
  }> {
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": this.options.userAgent,
        },
        signal: AbortSignal.timeout(this.options.timeout),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      const metadata = this.parseMetadata(html);

      return {
        title: metadata.title,
        description: metadata.description,
        content: html.substring(0, 1000), // 처음 1000자만 content로 제공
      };
    } catch (error: any) {
      throw new Error(`스크래핑 실패: ${error.message}`);
    }
  }

  /**
   * HTML에서 메타데이터 파싱 - cheerio 사용
   */
  private parseMetadata(html: string): ScrapedContent {
    try {
      const $ = cheerio.load(html);

      // Open Graph 태그 추출
      const ogTitle = $('meta[property="og:title"]').attr("content");
      const ogDescription = $('meta[property="og:description"]').attr(
        "content"
      );
      const ogImage = $('meta[property="og:image"]').attr("content");
      const ogSiteName = $('meta[property="og:site_name"]').attr("content");

      // Twitter Card 태그 추출
      const twitterTitle = $('meta[name="twitter:title"]').attr("content");
      const twitterDescription = $('meta[name="twitter:description"]').attr(
        "content"
      );
      const twitterImage = $('meta[name="twitter:image"]').attr("content");

      // 기본 HTML 태그 추출
      const htmlTitle = $("title").text().trim();
      const metaDescription = $('meta[name="description"]').attr("content");

      // JSON-LD 구조화 데이터 추출 시도
      const jsonLdData = this.extractJsonLd($);

      // 우선순위에 따른 값 선택
      const title = this.selectBestValue([
        ogTitle,
        twitterTitle,
        jsonLdData?.name || jsonLdData?.headline,
        htmlTitle,
      ]);

      const description = this.selectBestValue([
        ogDescription,
        twitterDescription,
        jsonLdData?.description,
        metaDescription,
      ]);

      const image = this.selectBestValue([
        ogImage,
        twitterImage,
        jsonLdData?.image,
      ]);

      console.log(
        `스크래핑 결과 - 제목: ${title}, 설명: ${description?.substring(
          0,
          50
        )}...`
      );

      return {
        title: title || undefined,
        description: description || undefined,
        image: image || undefined,
        scrapedAt: new Date(),
      };
    } catch (error) {
      console.warn("Cheerio 파싱 실패, 폴백 방식 사용:", error);
      return this.parseMetadataFallback(html);
    }
  }

  /**
   * JSON-LD 구조화 데이터 추출
   */
  private extractJsonLd($: cheerio.CheerioAPI): any {
    try {
      const jsonLdScript = $('script[type="application/ld+json"]')
        .first()
        .html();
      if (jsonLdScript) {
        const jsonData = JSON.parse(jsonLdScript);
        // 배열인 경우 첫 번째 요소 사용
        return Array.isArray(jsonData) ? jsonData[0] : jsonData;
      }
    } catch (error) {
      console.warn("JSON-LD 파싱 실패:", error);
    }
    return null;
  }

  /**
   * 가장 적절한 값 선택 (빈 문자열이나 null 제외)
   */
  private selectBestValue(
    values: (string | undefined | null)[]
  ): string | null {
    for (const value of values) {
      if (value && value.trim().length > 0) {
        return value.trim();
      }
    }
    return null;
  }

  /**
   * 폴백 메타데이터 파싱 (정규식 사용)
   */
  private parseMetadataFallback(html: string): ScrapedContent {
    // Open Graph 태그 우선 추출
    const ogTitle = this.extractMetaContent(html, "og:title");
    const ogDescription = this.extractMetaContent(html, "og:description");
    const ogImage = this.extractMetaContent(html, "og:image");

    // 기본 HTML 태그 fallback
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    const descriptionMatch = this.extractMetaContent(html, "description");

    return {
      title: ogTitle || (titleMatch ? titleMatch[1].trim() : undefined),
      description: ogDescription || descriptionMatch || undefined,
      image: ogImage || undefined,
      scrapedAt: new Date(),
    };
  }

  /**
   * 메타 태그 content 추출 (정규식 - 폴백용)
   */
  private extractMetaContent(html: string, property: string): string | null {
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
