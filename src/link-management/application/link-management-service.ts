import "reflect-metadata";
import { injectable, inject } from "tsyringe";
import {
  LinkDomainService,
  LinkProcessingResult,
} from "../domain/link-service.js";
import { LinkRepository } from "../domain/link-repository.js";
import { Link } from "../domain/link.js";
import {
  ContentScraper,
  AISummarizer,
  Notifier,
  BackgroundTaskRunner,
  TOKENS,
} from "../../shared/interfaces/index.js";

/**
 * 링크 관리 애플리케이션 서비스
 * 도메인 서비스와 외부 서비스들을 조율하여 사용자 요청을 처리합니다.
 */
@injectable()
export class LinkManagementService {
  private linkDomainService: LinkDomainService;

  constructor(
    @inject(TOKENS.LinkRepository) private linkRepository: LinkRepository,
    @inject(TOKENS.ContentScraper) private contentScraper: ContentScraper,
    @inject(TOKENS.AISummarizer) private aiSummarizer: AISummarizer,
    @inject(TOKENS.Notifier) private notifier: Notifier,
    @inject(TOKENS.BackgroundTaskRunner)
    private backgroundTaskRunner: BackgroundTaskRunner
  ) {
    this.linkDomainService = new LinkDomainService(
      linkRepository,
      contentScraper,
      aiSummarizer
    );
  }

  /**
   * 완료된 링크를 알림으로 전송
   * @param link 전송할 링크
   * @param context 로깅용 컨텍스트 (선택사항)
   */
  private async sendNotificationIfCompleted(
    link: Link,
    context?: string
  ): Promise<void> {
    if (link.isCompleted()) {
      try {
        await this.notifier.send(link.toLinkData());
      } catch (error) {
        const contextMsg = context ? ` (${context})` : "";
        console.error(`알림 전송 실패${contextMsg} (${link.id}):`, error);
      }
    }
  }

  /**
   * 링크 추가 및 백그라운드 처리
   */
  async addLink(url: string, tags: string[] = []) {
    try {
      // 도메인 서비스를 통해 링크 생성
      const newLink = await this.linkDomainService.createLink(url, tags);

      // 백그라운드에서 링크 처리 스케줄링
      this.backgroundTaskRunner.schedule(async () => {
        try {
          const processedLink = await this.linkDomainService.processLink(
            newLink.id
          );

          // 알림으로 전송
          await this.sendNotificationIfCompleted(processedLink);
        } catch (error) {
          console.error(`링크 처리 실패 (${newLink.id}):`, error);
        }
      });

      return {
        success: true,
        link: newLink.toObject(),
        message: "링크가 추가되었습니다. 백그라운드에서 처리 중입니다.",
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * 모든 미처리 링크 처리 (관리자 요청)
   */
  async processAllLinks() {
    try {
      const results = await this.linkDomainService.processAllPendingLinks();

      // 성공적으로 처리된 링크들을 알림으로 전송
      const successfulLinks = results
        .filter((result: LinkProcessingResult) => result.success)
        .map((result: LinkProcessingResult) => result.link);

      for (const link of successfulLinks) {
        await this.sendNotificationIfCompleted(link, "processAllLinks");
      }

      return {
        success: true,
        processed: results.length,
        successful: successfulLinks.length,
        failed: results.filter((r: LinkProcessingResult) => !r.success).length,
        results,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * 링크 목록 조회
   */
  async getLinks() {
    try {
      const links = await this.linkDomainService.linkRepository.findAll();

      return {
        success: true,
        links: links.map((link: Link) => link.toObject()),
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * 링크 통계 조회
   */
  async getStatistics() {
    try {
      const stats = await this.linkDomainService.getLinkStatistics();

      return {
        success: true,
        statistics: stats,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * 특정 링크에 태그 추가
   */
  async addTagsToLink(linkId: string, tags: string[]) {
    try {
      const updatedLink = await this.linkDomainService.addTagsToLink(
        linkId,
        tags
      );

      return {
        success: true,
        link: updatedLink.toObject(),
        message: "태그가 추가되었습니다.",
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * 링크 삭제
   */
  async deleteLink(linkId: string) {
    try {
      const deleted = await this.linkDomainService.linkRepository.delete(
        linkId
      );

      if (deleted) {
        return {
          success: true,
          message: "링크가 삭제되었습니다.",
        };
      } else {
        return {
          success: false,
          error: "링크를 찾을 수 없습니다.",
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * 특정 링크 재처리
   */
  async reprocessLink(linkId: string) {
    try {
      const processedLink = await this.linkDomainService.processLink(linkId);

      // Discord로 전송
      await this.sendNotificationIfCompleted(processedLink, "reprocessLink");

      return {
        success: true,
        link: processedLink.toObject(),
        message: "링크가 재처리되었습니다.",
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
