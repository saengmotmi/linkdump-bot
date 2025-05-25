import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  validateUrl,
  createLinkData,
  isDuplicateLink,
  extractOGTags,
  generateAIPrompt,
  parseAIResponse,
  createNotificationEmbed,
  parseWebhookUrls,
  getUnprocessedLinks,
  markLinkAsProcessed,
} from "../src/business-logic.js";

describe("URL 유효성 검증", () => {
  it("유효한 URL을 올바르게 검증한다", () => {
    const result = validateUrl("https://example.com");
    expect(result.valid).toBe(true);
  });

  it("빈 문자열을 거부한다", () => {
    const result = validateUrl("");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("URL이 필요합니다");
  });

  it("null을 거부한다", () => {
    const result = validateUrl(null);
    expect(result.valid).toBe(false);
    expect(result.error).toBe("URL이 필요합니다");
  });

  it("잘못된 URL 형식을 거부한다", () => {
    const result = validateUrl("not-a-url");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("유효하지 않은 URL 형식입니다");
  });

  it("다양한 프로토콜을 허용한다", () => {
    expect(validateUrl("http://example.com").valid).toBe(true);
    expect(validateUrl("https://example.com").valid).toBe(true);
    expect(validateUrl("ftp://example.com").valid).toBe(true);
  });
});

describe("링크 데이터 생성", () => {
  beforeEach(() => {
    // Date.now() 모킹으로 일관된 테스트
    vi.spyOn(Date, "now").mockReturnValue(1640995200000); // 2022-01-01
    vi.spyOn(Date.prototype, "toISOString").mockReturnValue(
      "2022-01-01T00:00:00.000Z"
    );
  });

  it("올바른 링크 데이터를 생성한다", () => {
    const linkData = createLinkData("https://example.com", ["tag1", "tag2"]);

    expect(linkData).toEqual({
      id: "1640995200000",
      url: "https://example.com",
      tags: ["tag1", "tag2"],
      addedAt: "2022-01-01T00:00:00.000Z",
      processed: false,
    });
  });

  it("태그 없이도 링크를 생성한다", () => {
    const linkData = createLinkData("https://example.com");
    expect(linkData.tags).toEqual([]);
  });

  it("잘못된 태그 형식을 빈 배열로 처리한다", () => {
    const linkData = createLinkData("https://example.com", "not-an-array");
    expect(linkData.tags).toEqual([]);
  });

  it("유효하지 않은 URL로 에러를 던진다", () => {
    expect(() => createLinkData("invalid-url")).toThrow(
      "유효하지 않은 URL 형식입니다"
    );
  });
});

describe("중복 링크 체크", () => {
  const existingLinks = [
    { url: "https://example.com" },
    { url: "https://google.com" },
  ];

  it("중복 링크를 감지한다", () => {
    expect(isDuplicateLink("https://example.com", existingLinks)).toBe(true);
  });

  it("새로운 링크를 허용한다", () => {
    expect(isDuplicateLink("https://github.com", existingLinks)).toBe(false);
  });

  it("빈 링크 배열에서는 중복이 없다", () => {
    expect(isDuplicateLink("https://example.com", [])).toBe(false);
  });
});

describe("OG 태그 추출", () => {
  it("완전한 OG 태그를 추출한다", () => {
    const html = `
      <html>
        <head>
          <title>페이지 제목</title>
          <meta property="og:title" content="OG 제목">
          <meta property="og:description" content="OG 설명">
          <meta property="og:image" content="https://example.com/image.jpg">
          <meta property="og:site_name" content="사이트명">
        </head>
      </html>
    `;

    const result = extractOGTags(html);
    expect(result).toEqual({
      title: "OG 제목",
      description: "OG 설명",
      image: "https://example.com/image.jpg",
      site_name: "사이트명",
    });
  });

  it("OG 태그가 없으면 title 태그를 사용한다", () => {
    const html = "<html><head><title>일반 제목</title></head></html>";
    const result = extractOGTags(html);
    expect(result.title).toBe("일반 제목");
  });

  it("description이 없으면 meta description을 사용한다", () => {
    const html =
      '<html><head><meta name="description" content="일반 설명"></head></html>';
    const result = extractOGTags(html);
    expect(result.description).toBe("일반 설명");
  });

  it("빈 HTML에 대해 null을 반환한다", () => {
    expect(extractOGTags("")).toBeNull();
    expect(extractOGTags(null)).toBeNull();
  });
});

describe("AI 프롬프트 생성", () => {
  it("올바른 프롬프트를 생성한다", () => {
    const ogData = {
      title: "테스트 제목",
      description: "테스트 설명",
      site_name: "테스트 사이트",
    };

    const prompt = generateAIPrompt(ogData, "https://example.com");

    expect(prompt).toContain("테스트 제목");
    expect(prompt).toContain("테스트 설명");
    expect(prompt).toContain("테스트 사이트");
    expect(prompt).toContain("https://example.com");
    expect(prompt).toContain("Korean");
  });
});

describe("AI 응답 파싱", () => {
  const ogData = { title: "제목", description: "설명" };

  it("response 필드가 있으면 사용한다", () => {
    const response = { response: "테스트 응답" };
    expect(parseAIResponse(response, ogData)).toBe("테스트 응답");
  });

  it("result 필드가 있으면 사용한다", () => {
    const response = { result: "테스트 결과" };
    expect(parseAIResponse(response, ogData)).toBe("테스트 결과");
  });

  it("응답이 없으면 기본 메시지를 생성한다", () => {
    const result = parseAIResponse(null, ogData);
    expect(result).toContain("🔗 제목");
    expect(result).toContain("📝 설명");
  });
});

describe("Discord 임베드 생성", () => {
  it("링크 데이터로 임베드를 생성한다", () => {
    const linkData = {
      url: "https://example.com",
      title: "테스트 제목",
      description: "테스트 설명",
      summary: "테스트 요약",
      timestamp: "2024-01-01T00:00:00.000Z",
    };

    const embed = createNotificationEmbed(linkData);

    expect(embed.title).toBe("테스트 제목");
    expect(embed.description).toBe("테스트 설명");
    expect(embed.url).toBe("https://example.com");
    expect(embed.fields).toHaveLength(1);
    expect(embed.fields[0].name).toBe("AI 요약");
    expect(embed.fields[0].value).toBe("테스트 요약");
  });
});

describe("웹훅 URL 파싱", () => {
  it("쉼표로 구분된 URL들을 파싱한다", () => {
    const webhookString = "url1, url2, url3";
    const result = parseWebhookUrls(webhookString);
    expect(result).toEqual(["url1", "url2", "url3"]);
  });

  it("공백을 제거한다", () => {
    const webhookString = "  url1  ,  url2  ";
    const result = parseWebhookUrls(webhookString);
    expect(result).toEqual(["url1", "url2"]);
  });

  it("빈 문자열에 대해 빈 배열을 반환한다", () => {
    expect(parseWebhookUrls("")).toEqual([]);
    expect(parseWebhookUrls(null)).toEqual([]);
  });
});

describe("미처리 링크 필터링", () => {
  it("미처리 링크만 반환한다", () => {
    const linksData = {
      links: [
        { id: "1", processed: false },
        { id: "2", processed: true },
        { id: "3", processed: false },
      ],
    };

    const result = getUnprocessedLinks(linksData);
    expect(result).toHaveLength(2);
    expect(result.map((link) => link.id)).toEqual(["1", "3"]);
  });

  it("잘못된 데이터에 대해 빈 배열을 반환한다", () => {
    expect(getUnprocessedLinks(null)).toEqual([]);
    expect(getUnprocessedLinks({})).toEqual([]);
    expect(getUnprocessedLinks({ links: null })).toEqual([]);
  });
});

describe("링크 처리 완료 표시", () => {
  beforeEach(() => {
    vi.spyOn(Date.prototype, "toISOString").mockReturnValue(
      "2022-01-01T00:00:00.000Z"
    );
  });

  it("링크를 처리 완료로 표시한다", () => {
    const link = { id: "1", url: "https://example.com", processed: false };
    const ogData = { title: "제목" };
    const summary = "요약";

    const result = markLinkAsProcessed(link, ogData, summary);

    expect(result).toEqual({
      id: "1",
      url: "https://example.com",
      processed: true,
      ogData: { title: "제목" },
      summary: "요약",
      processedAt: "2022-01-01T00:00:00.000Z",
    });
  });
});
