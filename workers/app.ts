/**
 * 🚀 LinkDump Bot - 메인 진입점 (Main Entry Point)
 *
 * Cloudflare Workers 환경에서 실행되는 메인 애플리케이션입니다.
 *
 * 핵심 실행 흐름:
 * 1. 이 파일 (workers/app.ts) - HTTP 요청 받기
 * 2. cloudflare-container.ts - 의존성 주입 설정
 * 3. ApiRouter - API 요청 라우팅
 * 4. Controllers - 비즈니스 로직 실행
 * 5. Infrastructure 레이어 - 외부 서비스 호출
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
import { TOKENS, type CloudflareEnv } from "../src/shared/interfaces/index.js";
import { TemplateService } from "../src/web/template-service.js";
import type { ApiRouter } from "../src/web/api/api-router.js";

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

      // ⭐ 핵심 흐름 2단계: API 라우터 가져오기
      // 컨테이너에서 설정된 ApiRouter를 해결(resolve)
      const apiRouter = container.resolve<ApiRouter>(TOKENS.ApiRouter);

      const url = new URL(request.url);

      // API 요청 처리
      if (url.pathname.startsWith("/api/")) {
        return await apiRouter.handleRequest(request, env);
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
