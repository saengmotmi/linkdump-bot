/**
 * 🚀 LinkDump Bot - 메인 진입점 (Main Entry Point)
 *
 * Cloudflare Workers 환경에서 실행되는 메인 애플리케이션입니다.
 *
 * 핵심 실행 흐름:
 * 1. 이 파일 (workers/app.ts) - HTTP 요청 받기
 * 2. cloudflare-container.ts - 의존성 주입 설정
 * 3. LinkManagementService - 비즈니스 로직 실행
 * 4. Infrastructure 레이어 - 외부 서비스 호출
 *
 * 주요 기능:
 * - 웹 UI 서빙 (GET /)
 * - REST API 엔드포인트 (/api/*)
 * - Discord 웹훅 연동
 * - AI 기반 링크 처리
 *
 * 로컬 개발: npm run dev:local
 * 배포: npm run deploy
 */

import "reflect-metadata";
import { container } from "tsyringe";
// ⭐ 핵심! 의존성 주입 설정 - 이 파일이 전체 앱의 핵심 설정을 담당
import { createCloudflareContainer } from "../src/link-management/di/cloudflare-container.js";
import { LinkManagementService } from "../src/link-management/application/link-management-service.js";
import {
  TOKENS,
  type Config,
  type CloudflareEnv,
} from "../src/shared/interfaces/index.js";
import { TemplateService } from "../src/web/template-service.js";

export default {
  async fetch(
    request: Request,
    env: CloudflareEnv,
    ctx: ExecutionContext
  ): Promise<Response> {
    try {
      // ⭐ 핵심 흐름 1단계: 의존성 주입 컨테이너 설정
      // cloudflare-container.ts에서 모든 서비스들을 설정하고 연결
      await createCloudflareContainer(env, ctx);

      // ⭐ 핵심 흐름 2단계: 비즈니스 로직 서비스 가져오기
      // 컨테이너에서 설정된 서비스를 해결(resolve)
      const linkManagementService = container.resolve(LinkManagementService);

      const url = new URL(request.url);
      const method = request.method;

      // CORS 헤더 설정
      const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      };

      // OPTIONS 요청 처리
      if (method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
      }

      // API 라우팅
      if (url.pathname.startsWith("/api/")) {
        let response: Response;

        if (url.pathname === "/api/add-link" && method === "POST") {
          response = await handleAddLink(request, linkManagementService);
        } else if (url.pathname === "/api/process-links" && method === "POST") {
          response = await handleProcessLinks(linkManagementService);
        } else if (url.pathname === "/api/config" && method === "GET") {
          response = await handleGetConfig(env);
        } else if (url.pathname === "/api/links" && method === "GET") {
          response = await handleGetLinks(linkManagementService);
        } else if (url.pathname === "/api/preview" && method === "POST") {
          response = await handlePreviewRequest(request);
        } else {
          response = new Response("Not Found", { status: 404 });
        }

        // CORS 헤더 추가
        Object.entries(corsHeaders).forEach(([key, value]) => {
          response.headers.set(key, value);
        });

        return response;
      }

      // 웹 UI 제공
      if (url.pathname === "/" && request.method === "GET") {
        return await TemplateService.createWebPageResponse();
      }

      return new Response("Method Not Allowed", { status: 405 });
    } catch (error) {
      console.error("Worker error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return new Response(
        JSON.stringify({
          success: false,
          error: "Internal Server Error",
          details: errorMessage,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  },
};

/**
 * 링크 추가 핸들러
 */
async function handleAddLink(
  request: Request,
  linkManagementService: LinkManagementService
): Promise<Response> {
  try {
    const { url, tags } = (await request.json()) as {
      url: string;
      tags?: string[];
    };

    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: "URL is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const result = await linkManagementService.addLink(url, tags || []);

    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 400,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

/**
 * 모든 링크 처리 핸들러
 */
async function handleProcessLinks(
  linkManagementService: LinkManagementService
): Promise<Response> {
  try {
    const result = await linkManagementService.processAllLinks();

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

/**
 * 링크 목록 조회 핸들러
 */
async function handleGetLinks(
  linkManagementService: LinkManagementService
): Promise<Response> {
  try {
    const result = await linkManagementService.getLinks();

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

/**
 * 설정 조회 핸들러 - 실제 컨테이너 설정을 동적으로 조회
 */
async function handleGetConfig(env: CloudflareEnv): Promise<Response> {
  try {
    // 실제 컨테이너에서 설정 조회
    const config = container.resolve<Config>(TOKENS.Config);

    // 등록된 서비스들의 실제 구현체 확인
    const aiClient = container.resolve(TOKENS.AIClient);
    const storage = container.resolve(TOKENS.Storage);
    const notifier = container.resolve(TOKENS.Notifier);
    const backgroundTaskRunner = container.resolve(TOKENS.BackgroundTaskRunner);

    const responseConfig = {
      hasWebhooks: !!(config.webhookUrls && config.webhookUrls.length > 0),
      architecture: "TSyringe-based Dependency Injection",
      environment: env.CF_PAGES ? "Cloudflare Pages" : "Cloudflare Workers",
      services: {
        ai: (aiClient as { constructor: { name: string } }).constructor.name,
        storage: (storage as { constructor: { name: string } }).constructor
          .name,
        notifications: (notifier as { constructor: { name: string } })
          .constructor.name,
        backgroundTasks: (
          backgroundTaskRunner as { constructor: { name: string } }
        ).constructor.name,
      },
    };

    return new Response(
      JSON.stringify({ success: true, config: responseConfig }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

/**
 * 링크 미리보기 핸들러
 */
async function handlePreviewRequest(request: Request): Promise<Response> {
  try {
    const { url } = (await request.json()) as { url: string };

    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: "URL is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 컨테이너에서 서비스들 가져오기
    const contentScraper = container.resolve(TOKENS.ContentScraper) as any;
    const aiSummarizer = container.resolve(TOKENS.AISummarizer) as any;

    // 콘텐츠 스크래핑
    const scrapedData = await contentScraper.scrape(url);

    // AI 타이틀 생성 (가능한 경우)
    let title = scrapedData.title || "";
    if (
      "generateTitle" in aiSummarizer &&
      typeof aiSummarizer.generateTitle === "function"
    ) {
      try {
        title = await aiSummarizer.generateTitle({
          url,
          title: scrapedData.title,
          description: scrapedData.description,
          content: scrapedData.content,
        });
      } catch (error) {
        console.warn("AI 타이틀 생성 실패:", error);
        // 폴백 타이틀 생성
        if (!title) {
          try {
            const urlObj = new URL(url);
            const hostname = urlObj.hostname;
            if (
              hostname.includes("x.com") ||
              hostname.includes("twitter.com")
            ) {
              title = "트윗";
            } else {
              title = hostname.replace("www.", "");
            }
          } catch {
            title = "링크";
          }
        }
      }
    }

    // AI 요약 생성
    let summary = "";
    try {
      summary = await aiSummarizer.summarize({
        url,
        title: scrapedData.title,
        description: scrapedData.description,
      });
    } catch (error) {
      console.warn("AI 요약 생성 실패:", error);
      summary = scrapedData.description || "요약을 생성할 수 없습니다.";
    }

    return new Response(
      JSON.stringify({
        success: true,
        preview: {
          url,
          title,
          description: scrapedData.description || "",
          summary,
        },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
