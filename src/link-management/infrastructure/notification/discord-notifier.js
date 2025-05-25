/**
 * Discord 웹훅 기반 알림 구현체
 */
export class DiscordNotifier {
  constructor(webhookUrls = []) {
    this.webhookUrls = Array.isArray(webhookUrls)
      ? webhookUrls
      : [webhookUrls].filter(Boolean);
  }

  /**
   * Discord로 링크 정보 전송
   */
  async send(linkData) {
    if (this.webhookUrls.length === 0) {
      console.warn("Discord 웹훅이 설정되지 않았습니다.");
      return;
    }

    const embed = this.createEmbed(linkData);
    const payload = { embeds: [embed] };

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
  createEmbed(linkData) {
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
          value: linkData.tags.length > 0 ? linkData.tags.join(", ") : "없음",
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
      ...(linkData.image && {
        image: { url: linkData.image },
        thumbnail: { url: linkData.image },
      }),
    };
  }

  /**
   * 웹훅으로 메시지 전송
   */
  async sendToWebhook(webhookUrl, payload) {
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
  truncateText(text, maxLength) {
    if (!text || text.length <= maxLength) {
      return text;
    }
    return text.substring(0, maxLength - 3) + "...";
  }

  /**
   * 날짜 포맷팅
   */
  formatDate(date) {
    return new Date(date).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
}
