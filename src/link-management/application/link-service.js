import {
  validateUrl,
  createLinkData,
  isDuplicateLink,
  extractOGTags,
  generateAIPrompt,
  createDiscordEmbed,
  parseWebhookUrls,
  getUnprocessedLinks,
  markLinkAsProcessed,
} from "../business-logic.js";

/**
 * 링크 서비스 - 의존성 주입을 통한 느슨한 결합
 */
export class LinkService {
  constructor(storage, aiProvider, runtime) {
    this.storage = storage;
    this.aiProvider = aiProvider;
    this.runtime = runtime;
  }

  /**
   * 새 링크 추가
   */
  async addLink(url, tags = []) {
    // URL 유효성 검증
    const validation = validateUrl(url);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // 현재 링크 데이터 가져오기
    const linksData = await this._getLinksData();

    // 중복 체크
    if (isDuplicateLink(url, linksData.links)) {
      throw new Error("Link already exists");
    }

    // 새 링크 생성
    const newLink = createLinkData(url, tags);
    linksData.links.push(newLink);

    // 저장
    await this._saveLinksData(linksData);

    this.runtime.log("info", "Link added successfully", {
      url,
      linkId: newLink.id,
    });

    return newLink;
  }

  /**
   * 링크 처리 (OG 태그 스크래핑 + AI 요약)
   */
  async processLink(link) {
    try {
      this.runtime.log("info", "Processing link", {
        url: link.url,
        linkId: link.id,
      });

      // OG 태그 스크래핑
      const ogData = await this._scrapeOGTags(link.url);
      if (!ogData) {
        throw new Error("Failed to scrape OG tags");
      }

      // AI 요약 생성
      const summary = await this._generateSummary(ogData, link.url);

      // 링크 업데이트
      const updatedLink = markLinkAsProcessed(link, ogData, summary);

      this.runtime.log("info", "Link processed successfully", {
        url: link.url,
        linkId: link.id,
        title: ogData.title,
      });

      return updatedLink;
    } catch (error) {
      this.runtime.log("error", "Failed to process link", {
        url: link.url,
        linkId: link.id,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 모든 미처리 링크 처리
   */
  async processAllUnprocessedLinks() {
    const linksData = await this._getLinksData();
    const unprocessedLinks = getUnprocessedLinks(linksData);

    if (unprocessedLinks.length === 0) {
      return { processedCount: 0, links: [] };
    }

    const processedLinks = [];
    const errors = [];

    for (const link of unprocessedLinks) {
      try {
        const processedLink = await this.processLink(link);
        processedLinks.push(processedLink);

        // 링크 데이터 업데이트
        const linkIndex = linksData.links.findIndex((l) => l.id === link.id);
        if (linkIndex !== -1) {
          linksData.links[linkIndex] = processedLink;
        }
      } catch (error) {
        errors.push({ linkId: link.id, url: link.url, error: error.message });
      }
    }

    // 업데이트된 데이터 저장
    await this._saveLinksData(linksData);

    return {
      processedCount: processedLinks.length,
      links: processedLinks,
      errors,
    };
  }

  /**
   * Discord로 링크 전송
   */
  async sendToDiscord(linkData) {
    const webhookUrls = this.runtime.getEnvironmentVariable("DISCORD_WEBHOOKS");
    if (!webhookUrls) {
      this.runtime.log("warn", "No Discord webhooks configured");
      return;
    }

    const webhooks = parseWebhookUrls(webhookUrls);
    const payload = createDiscordEmbed(linkData);

    for (const webhook of webhooks) {
      try {
        await fetch(webhook, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        this.runtime.log("info", "Sent to Discord", { url: linkData.url });
      } catch (error) {
        this.runtime.log("error", "Failed to send to Discord", {
          url: linkData.url,
          error: error.message,
        });
      }
    }
  }

  /**
   * 링크 데이터 조회
   */
  async getLinksData() {
    return await this._getLinksData();
  }

  // Private methods

  async _getLinksData() {
    const object = await this.storage.get("links.json");
    if (!object) {
      return { links: [] };
    }

    const content = await object.text();
    return JSON.parse(content);
  }

  async _saveLinksData(linksData) {
    await this.storage.put("links.json", JSON.stringify(linksData, null, 2), {
      lastModified: new Date().toISOString(),
      updatedBy: "link-service",
    });
  }

  async _scrapeOGTags(url) {
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; LinkDump Bot/1.0)",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const html = await response.text();
      return extractOGTags(html);
    } catch (error) {
      this.runtime.log("error", "Failed to scrape OG tags", {
        url,
        error: error.message,
      });
      return null;
    }
  }

  async _generateSummary(ogData, url) {
    try {
      const prompt = generateAIPrompt(ogData, url);
      const summary = await this.aiProvider.generateText(prompt, {
        maxTokens: 150,
      });
      return summary.trim();
    } catch (error) {
      this.runtime.log("error", "Failed to generate AI summary", {
        url,
        error: error.message,
      });

      // 폴백: 기본 한국어 요약
      return `🔗 ${ogData.title}\n📝 ${ogData.description}\n🎯 자세한 내용을 확인해보세요!`;
    }
  }
}
