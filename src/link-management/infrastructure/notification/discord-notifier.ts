import { injectable, inject } from "tsyringe";
import type { Notifier, LinkData } from "../../../shared/interfaces/index.js";

interface DiscordEmbed {
  title?: string;
  description?: string;
  url?: string;
  color?: number;
  fields?: Array<{
    name: string;
    value: string;
    inline?: boolean;
  }>;
  timestamp?: Date | string;
  footer?: {
    text: string;
  };
  image?: {
    url: string;
  };
  thumbnail?: {
    url: string;
  };
}

interface DiscordPayload {
  embeds: DiscordEmbed[];
}

/**
 * Discord 웹훅 기반 알림 구현체
 */
@injectable()
export class DiscordNotifier implements Notifier {
  private webhookUrls: string[];

  constructor(@inject("DISCORD_WEBHOOKS") webhookUrls: string[] = []) {
    this.webhookUrls = Array.isArray(webhookUrls)
      ? webhookUrls
      : [webhookUrls].filter(Boolean);
  }

  /**
   * Discord로 링크 정보 전송
   */
  async send(linkData: LinkData): Promise<void> {
    if (this.webhookUrls.length === 0) {
      console.warn("Discord 웹훅이 설정되지 않았습니다.");
      return;
    }

    const embed = this.createEmbed(linkData);
    const payload: DiscordPayload = { embeds: [embed] };

    const results = await Promise.allSettled(
      this.webhookUrls.map((webhook) => this.sendToWebhook(webhook, payload))
    );

    const failures = results.filter((result) => result.status === "rejected");
    if (failures.length > 0) {
      console.error(
        `Discord 전송 실패: ${failures.length}/${this.webhookUrls.length}`
      );
      failures.forEach((failure) => console.error(failure.reason));
    }
  }

  /**
   * Discord Embed 생성
   */
  private createEmbed(linkData: LinkData): DiscordEmbed {
    return {
      title: this.truncateText(linkData.title || "No Title", 256),
      description: this.truncateText(
        linkData.summary || "No Summary Available",
        4096
      ),
      url: linkData.url,
      color: 0x0099ff,
      fields: [
        {
          name: "🏷️ 태그",
          value:
            linkData.tags && linkData.tags.length > 0
              ? linkData.tags.join(", ")
              : "없음",
          inline: true,
        },
        {
          name: "📅 추가일",
          value: this.formatDate(linkData.createdAt),
          inline: true,
        },
      ],
      timestamp: linkData.createdAt,
      footer: {
        text: "LinkDump Bot",
      },
    };
  }

  /**
   * 웹훅으로 메시지 전송
   */
  private async sendToWebhook(
    webhookUrl: string,
    payload: DiscordPayload
  ): Promise<Response> {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(
        `Discord 웹훅 전송 실패: ${response.status} ${response.statusText}`
      );
    }

    return response;
  }

  /**
   * 텍스트 길이 제한
   */
  private truncateText(text: string | undefined, maxLength: number): string {
    if (!text || text.length <= maxLength) {
      return text || "";
    }
    return text.substring(0, maxLength - 3) + "...";
  }

  /**
   * 날짜 포맷팅
   */
  private formatDate(date: Date | string): string {
    return new Date(date).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
}
