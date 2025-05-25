import { Link, LinkStatus, LinkProcessingData } from "./link.js";
import { LinkRepository } from "./link-repository.js";
import { ContentScraper, AISummarizer } from "../../shared/interfaces/index.js";

/**
 * 링크 처리 결과 인터페이스
 */
export interface LinkProcessingResult {
  success: boolean;
  link: Link;
  error?: string;
}

/**
 * 링크 도메인 서비스
 * 복잡한 비즈니스 로직과 엔티티 간의 상호작용을 처리합니다.
 */
export class LinkDomainService {
  constructor(
    public linkRepository: LinkRepository,
    private contentScraper: ContentScraper,
    private aiSummarizer: AISummarizer
  ) {}

  /**
   * 새 링크 생성
   */
  async createLink(url: string, tags: string[] = []): Promise<Link> {
    // 새 링크 생성
    const link = new Link({ url, tags });
    return await this.linkRepository.save(link);
  }

  /**
   * 링크 처리 (스크래핑 + AI 요약)
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

      // AI 요약 생성
      const summary = await this.aiSummarizer.summarize({
        url: link.url,
        title: scrapedData.title,
        description: scrapedData.description,
      });

      // AI 타이틀 생성 (AISummarizer에 generateTitle 메서드가 있는 경우)
      let finalTitle = scrapedData.title || "";
      if (
        "generateTitle" in this.aiSummarizer &&
        typeof this.aiSummarizer.generateTitle === "function"
      ) {
        try {
          finalTitle = await (this.aiSummarizer as any).generateTitle({
            url: link.url,
            title: scrapedData.title,
            description: scrapedData.description,
            content: scrapedData.content,
          });
        } catch (error) {
          console.warn("AI 타이틀 생성 실패, 기본 타이틀 사용:", error);
          finalTitle = this.generateMeaningfulTitle(
            scrapedData.title,
            link.url
          );
        }
      } else {
        finalTitle = this.generateMeaningfulTitle(scrapedData.title, link.url);
      }

      // 처리 완료
      const completedLink = processingLink.completeProcessing({
        title: finalTitle,
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
   * 모든 대기 중인 링크 처리
   */
  async processAllPendingLinks(): Promise<LinkProcessingResult[]> {
    const pendingLinks = await this.linkRepository.findByStatus("pending");
    const results: LinkProcessingResult[] = [];

    for (const link of pendingLinks) {
      try {
        const processedLink = await this.processLink(link.id);
        results.push({
          success: true,
          link: processedLink,
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

  private generateMeaningfulTitle(
    title: string | undefined,
    url: string
  ): string {
    if (title && title.trim()) {
      return title.trim();
    }

    // URL에서 도메인명 추출
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;

      // X(트위터) 특별 처리
      if (hostname.includes("x.com") || hostname.includes("twitter.com")) {
        return "트윗";
      }

      // 일반적인 도메인명 사용
      return hostname.replace("www.", "");
    } catch {
      return "링크";
    }
  }
}
