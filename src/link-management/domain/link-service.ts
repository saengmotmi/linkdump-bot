import { Link, LinkProcessingData } from "./link.js";
import { LinkStatus } from "../../shared/interfaces/index.js";
import { LinkRepository } from "./link-repository.js";
import { ContentScraper, AISummarizer } from "../../shared/interfaces/index.js";
import {
  ContentTypeDetector,
  ContentTypeResult,
} from "./content-type-detector.js";

/**
 * 링크 처리 결과 인터페이스
 */
export interface LinkProcessingResult {
  success: boolean;
  link: Link;
  error?: string;
  contentType?: ContentTypeResult;
}

/**
 * 링크 도메인 서비스
 * 복잡한 비즈니스 로직과 엔티티 간의 상호작용을 처리합니다.
 */
export class LinkDomainService {
  private contentTypeDetector: ContentTypeDetector;

  constructor(
    public linkRepository: LinkRepository,
    private contentScraper: ContentScraper,
    private aiSummarizer: AISummarizer
  ) {
    this.contentTypeDetector = new ContentTypeDetector();
  }

  /**
   * 새 링크 생성
   */
  async createLink(url: string, tags: string[] = []): Promise<Link> {
    // 새 링크 생성
    const link = new Link({ url, tags });
    return await this.linkRepository.save(link);
  }

  /**
   * 링크 처리 (스크래핑 + 조건부 AI 요약)
   */
  async processLink(linkId: string): Promise<Link> {
    const link = await this.linkRepository.findById(linkId);
    if (!link) {
      throw new Error("링크를 찾을 수 없습니다.");
    }

    if (!link.canBeProcessed()) {
      throw new Error("처리할 수 없는 링크 상태입니다.");
    }

    try {
      // 처리 시작
      const processingLink = link.startProcessing();
      await this.linkRepository.save(processingLink);

      // 콘텐츠 스크래핑
      const scrapedData = await this.contentScraper.scrape(link.url);

      // 콘텐츠 타입 감지
      const contentTypeResult = this.contentTypeDetector.detect(
        link.url,
        scrapedData.title || undefined,
        scrapedData.description || undefined
      );

      let summary: string;

      if (contentTypeResult.shouldSummarize) {
        // AI 요약 생성 (LinkedIn, 아티클, 문서 등)
        console.log(`AI 요약 생성: ${contentTypeResult.reason}`);
        summary = await this.aiSummarizer.summarize({
          url: link.url,
          title: scrapedData.title,
          description: scrapedData.description,
        });
      } else {
        // OG 태그 기반 간단한 요약 (Twitter, 일반 사이트 등)
        console.log(`OG 태그 사용: ${contentTypeResult.reason}`);
        summary = this.createSimpleSummary(
          scrapedData.title,
          scrapedData.description,
          contentTypeResult.type
        );
      }

      // 처리 완료
      const completedLink = processingLink.completeProcessing({
        title: scrapedData.title || "No Title",
        description: scrapedData.description || "설명이 없습니다.",
        image: undefined,
        summary,
      });

      return await this.linkRepository.save(completedLink);
    } catch (error) {
      // 처리 실패
      const failedLink = link.failProcessing(error as Error);
      await this.linkRepository.save(failedLink);
      throw error;
    }
  }

  /**
   * OG 태그 기반 간단한 요약 생성
   */
  private createSimpleSummary(
    title?: string,
    description?: string,
    contentType?: string
  ): string {
    const cleanTitle = title || "제목 없음";
    const cleanDescription = description || "설명이 없습니다.";

    // 콘텐츠 타입별 이모지 추가
    const getTypeEmoji = (type?: string): string => {
      switch (type) {
        case "twitter":
          return "🐦";
        case "linkedin":
          return "💼";
        case "video":
          return "🎥";
        case "social_media":
          return "📱";
        case "general":
          return "🔗";
        default:
          return "📄";
      }
    };

    const emoji = getTypeEmoji(contentType);

    // Twitter/X의 경우 더 간단하게
    if (contentType === "twitter") {
      return `${emoji} ${cleanDescription}`;
    }

    // 기타 경우 제목 + 설명
    if (cleanTitle === cleanDescription) {
      return `${emoji} ${cleanTitle}`;
    }

    return `${emoji} ${cleanTitle}\n\n${cleanDescription}`;
  }

  /**
   * 모든 대기 중인 링크 처리
   */
  async processAllPendingLinks(): Promise<LinkProcessingResult[]> {
    const pendingLinks = await this.linkRepository.findByStatus("pending");
    const results: LinkProcessingResult[] = [];

    for (const link of pendingLinks) {
      try {
        const processedLink = await this.processLink(link.id);

        // 콘텐츠 타입 정보도 함께 반환
        const contentTypeResult = this.contentTypeDetector.detect(
          link.url,
          processedLink.title || undefined,
          processedLink.description || undefined
        );

        results.push({
          success: true,
          link: processedLink,
          contentType: contentTypeResult,
        });
      } catch (error) {
        console.error(`링크 처리 실패 (${link.id}):`, error);
        results.push({
          success: false,
          link: link,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return results;
  }

  /**
   * 알림으로 전송할 링크들 조회
   */
  async getLinksForNotification(): Promise<Link[]> {
    return this.linkRepository.findByStatus("completed");
  }

  /**
   * 링크에 태그 추가
   */
  async addTagsToLink(linkId: string, tags: string[]): Promise<Link> {
    const link = await this.linkRepository.findById(linkId);
    if (!link) {
      throw new Error("링크를 찾을 수 없습니다.");
    }

    const updatedLink = link.addTags(tags);
    return await this.linkRepository.save(updatedLink);
  }

  /**
   * 링크 통계 조회
   */
  async getLinkStatistics(): Promise<{
    total: number;
    byStatus: Record<LinkStatus, number>;
    byTags: Record<string, number>;
  }> {
    const allLinks = await this.linkRepository.findAll();

    const byStatus: Record<LinkStatus, number> = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
    };

    const byTags: Record<string, number> = {};

    for (const link of allLinks) {
      byStatus[link.status]++;

      for (const tag of link.tags) {
        byTags[tag] = (byTags[tag] || 0) + 1;
      }
    }

    return {
      total: allLinks.length,
      byStatus,
      byTags,
    };
  }
}
