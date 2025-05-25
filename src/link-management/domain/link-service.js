import { Link } from "./link.js";

/**
 * 링크 도메인 서비스
 * 복잡한 비즈니스 로직과 여러 엔티티 간의 상호작용을 처리합니다.
 */
export class LinkDomainService {
  constructor(linkRepository, contentScraper, aiSummarizer) {
    this.linkRepository = linkRepository;
    this.contentScraper = contentScraper;
    this.aiSummarizer = aiSummarizer;
  }

  /**
   * 새 링크 생성 및 중복 검사
   */
  async createLink(url, tags = []) {
    // 중복 검사
    const existingLink = await this.linkRepository.findByUrl(url);
    if (existingLink) {
      throw new Error(`이미 존재하는 링크입니다: ${url}`);
    }

    // 새 링크 생성
    const link = new Link({ url, tags });
    return await this.linkRepository.save(link);
  }

  /**
   * 링크 처리 (스크래핑 + AI 요약)
   */
  async processLink(linkId) {
    const link = await this.linkRepository.findById(linkId);
    if (!link) {
      throw new Error(`링크를 찾을 수 없습니다: ${linkId}`);
    }

    if (!link.canBeProcessed()) {
      throw new Error(`처리할 수 없는 링크 상태입니다: ${link.status}`);
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

      // 처리 완료
      const completedLink = processingLink.completeProcessing({
        title: scrapedData.title,
        description: scrapedData.description,
        image: scrapedData.image,
        summary,
      });

      return await this.linkRepository.save(completedLink);
    } catch (error) {
      // 처리 실패
      const failedLink = link.failProcessing(error);
      await this.linkRepository.save(failedLink);
      throw error;
    }
  }

  /**
   * 처리되지 않은 모든 링크 처리
   */
  async processAllPendingLinks() {
    const pendingLinks = await this.linkRepository.findByStatus("pending");
    const results = [];

    for (const link of pendingLinks) {
      try {
        const processedLink = await this.processLink(link.id);
        results.push({ success: true, link: processedLink });
      } catch (error) {
        results.push({
          success: false,
          linkId: link.id,
          error: error.message,
        });
      }
    }

    return results;
  }

  /**
   * Discord 전송 가능한 링크들 조회
   */
  async getLinksForDiscord() {
    const completedLinks = await this.linkRepository.findByStatus("completed");
    return completedLinks.map((link) => link.toDiscordData());
  }

  /**
   * 링크에 태그 추가
   */
  async addTagsToLink(linkId, tags) {
    const link = await this.linkRepository.findById(linkId);
    if (!link) {
      throw new Error(`링크를 찾을 수 없습니다: ${linkId}`);
    }

    const updatedLink = link.addTags(tags);
    return await this.linkRepository.save(updatedLink);
  }

  /**
   * 링크 통계 조회
   */
  async getLinkStatistics() {
    const allLinks = await this.linkRepository.findAll();

    const stats = {
      total: allLinks.length,
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      byTags: {},
    };

    allLinks.forEach((link) => {
      stats[link.status]++;

      link.tags.forEach((tag) => {
        stats.byTags[tag] = (stats.byTags[tag] || 0) + 1;
      });
    });

    return stats;
  }
}
