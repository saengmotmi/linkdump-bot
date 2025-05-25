// 핵심 비즈니스 로직 - 테스트 가능하도록 분리

import type { LinkData } from "../../shared/interfaces/index.js";

/**
 * URL 유효성 검증 결과 인터페이스
 */
export interface UrlValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * OG 태그 데이터 인터페이스
 */
export interface OGData {
  title: string;
  description: string;
  image: string;
  site_name: string;
}

/**
 * 알림 임베드 인터페이스 (구현체 무관)
 */
export interface NotificationEmbed {
  title: string;
  description: string;
  url: string;
  color: number;
  timestamp: string;
  thumbnail?: {
    url: string;
  };
}

/**
 * 알림 메시지 인터페이스 (구현체 무관)
 */
export interface NotificationMessage {
  embeds: NotificationEmbed[];
}

/**
 * URL 유효성 검증
 */
export function validateUrl(url: string): UrlValidationResult {
  if (!url || typeof url !== "string") {
    return { valid: false, error: "URL이 필요합니다" };
  }

  try {
    new URL(url);
    return { valid: true };
  } catch {
    return { valid: false, error: "유효하지 않은 URL 형식입니다" };
  }
}

/**
 * 링크 데이터 생성 (구식 호환성을 위해 유지, 새 코드에서는 Link 엔티티 사용 권장)
 * @deprecated Link 엔티티 클래스 사용을 권장합니다
 */
export function createLinkData(url: string, tags: string[] = []): LinkData {
  const validation = validateUrl(url);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  return {
    id: Date.now().toString(),
    url: url,
    title: undefined,
    description: undefined,
    summary: undefined,
    tags: Array.isArray(tags) ? tags : [],
    createdAt: new Date(),
    processedAt: undefined,
    status: "pending",
  };
}

/**
 * 중복 링크 체크
 */
export function isDuplicateLink(
  newUrl: string,
  existingLinks: LinkData[]
): boolean {
  return existingLinks.some((link) => link.url === newUrl);
}

/**
 * OG 태그에서 메타데이터 추출
 */
export function extractOGTags(html: string): OGData | null {
  if (!html || typeof html !== "string") {
    return null;
  }

  // HTML 속성값 추출을 위한 개선된 정규식 - head 섹션에서만 검색
  const getMetaContent = (property: string): string => {
    // head 섹션 추출 (없으면 전체 HTML 사용)
    const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
    const searchArea = headMatch ? headMatch[1] : html;

    // 쌍따옴표로 둘러싸인 경우
    let regex = new RegExp(
      `<meta[^>]*property="${property}"[^>]*content="([^"]*)"`,
      "i"
    );
    let match = searchArea.match(regex);
    if (match) return match[1];

    // 홑따옴표로 둘러싸인 경우
    regex = new RegExp(
      `<meta[^>]*property='${property}'[^>]*content='([^']*)'`,
      "i"
    );
    match = searchArea.match(regex);
    return match ? match[1] : "";
  };

  const getMetaName = (name: string): string => {
    // head 섹션 추출 (없으면 전체 HTML 사용)
    const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
    const searchArea = headMatch ? headMatch[1] : html;

    // 쌍따옴표로 둘러싸인 경우
    let regex = new RegExp(
      `<meta[^>]*name="${name}"[^>]*content="([^"]*)"`,
      "i"
    );
    let match = searchArea.match(regex);
    if (match) return match[1];

    // 홑따옴표로 둘러싸인 경우
    regex = new RegExp(`<meta[^>]*name='${name}'[^>]*content='([^']*)'`, "i");
    match = searchArea.match(regex);
    return match ? match[1] : "";
  };

  const getTitleContent = (): string => {
    const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    return match ? match[1] : "";
  };

  return {
    title: getMetaContent("og:title") || getTitleContent() || "",
    description:
      getMetaContent("og:description") || getMetaName("description") || "",
    image: getMetaContent("og:image") || "",
    site_name: getMetaContent("og:site_name") || "",
  };
}

/**
 * AI 프롬프트 생성
 */
export function generateAIPrompt(ogData: OGData, url: string): string {
  return `Create an engaging 3-line summary in Korean explaining "why someone should click this link". Focus on the value and benefits to the reader.

Website Information:
Title: ${ogData.title}
Description: ${ogData.description}
Site: ${ogData.site_name}
URL: ${url}

Write a compelling summary in Korean that motivates clicking:`;
}

/**
 * AI 응답 파싱 (구현체 무관)
 */
export function parseAIResponse(response: any, ogData: OGData): string {
  if (!response) {
    return `🔗 ${ogData.title}\n📝 ${ogData.description}\n🎯 자세한 내용을 확인해보세요!`;
  }

  // 다양한 AI 제공자의 응답 형식 지원
  const summary =
    response.response || // Workers AI
    response.result || // Workers AI 대체 필드
    response.content || // OpenAI/Claude
    response.text || // 기타 제공자
    response.message || // 기타 제공자
    "AI 요약을 생성할 수 없습니다.";

  return summary.trim();
}

/**
 * 알림 임베드 메시지 생성 (구현체 무관)
 */
export function createNotificationEmbed(
  linkData: LinkData
): NotificationMessage {
  const embed: NotificationEmbed = {
    title: linkData.title || "New Link",
    description: linkData.summary || linkData.description || "",
    url: linkData.url,
    color: 0x0099ff,
    timestamp: new Date().toISOString(),
  };

  // 이미지는 별도 처리가 필요한 경우 추가 파라미터로 받거나
  // LinkData 인터페이스에 image 필드를 추가해야 함
  // if (linkData.image) {
  //   embed.thumbnail = { url: linkData.image };
  // }

  return { embeds: [embed] };
}
