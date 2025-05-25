import type { Notifier, LinkData } from "../../../shared/interfaces/index.js";
import type {
  DiscordEmbed,
  DiscordWebhookPayload,
} from "../../../shared/types/discord.js";

/**
 * Discord 웹훅 알림 구현체
 */
export class DiscordNotifier implements Notifier {
  private webhookUrls: string[];

  constructor(webhookUrls: string[]) {
    this.webhookUrls = webhookUrls;
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
    const payload: DiscordWebhookPayload = { embeds: [embed] };

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
      timestamp: linkData.createdAt.toISOString(),
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
    payload: DiscordWebhookPayload
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
