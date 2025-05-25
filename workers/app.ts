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
import { TOKENS, type Config } from "../src/shared/interfaces/index.js";

// Cloudflare Workers 환경 타입 정의
interface Env {
  LINKDUMP_STORAGE: R2Bucket;
  AI: Ai;
  DISCORD_WEBHOOKS?: string;
  OPENAI_API_KEY?: string;
  CF_PAGES?: string;
}

export default {
  async fetch(
    request: Request,
    env: Env,
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

      // 웹 페이지 서빙
      if (method === "GET") {
        return getWebPage();
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
async function handleGetConfig(env: Env): Promise<Response> {
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

/**
 * 웹 페이지 생성
 */
function getWebPage(): Response {
  const html = `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🔗 LinkDump Bot</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .container {
            background: white;
            border-radius: 20px;
            padding: 40px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            max-width: 600px;
            width: 100%;
        }
        h1 {
            color: #2c3e50;
            margin-bottom: 10px;
            font-size: 2.2em;
            font-weight: 700;
            text-align: center;
        }
        .subtitle {
            color: #7f8c8d;
            margin-bottom: 30px;
            font-size: 1.1em;
            text-align: center;
        }
        .form-group {
            margin-bottom: 20px;
        }
        label {
            display: block;
            margin-bottom: 8px;
            color: #2c3e50;
            font-weight: 600;
        }
        input[type="url"], input[type="text"] {
            width: 100%;
            padding: 12px 16px;
            border: 2px solid #e1e8ed;
            border-radius: 8px;
            font-size: 16px;
            transition: border-color 0.3s;
        }
        input[type="url"]:focus, input[type="text"]:focus {
            outline: none;
            border-color: #667eea;
        }
        .button-group {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
        }
        button {
            width: 100%;
            padding: 12px 24px;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
        }
        .btn-submit {
            background: linear-gradient(45deg, #667eea, #764ba2);
            color: white;
        }
        .btn-submit:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }
        .btn-submit:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
        }
        .url-input-container {
            position: relative;
        }
        .url-loading {
            position: absolute;
            right: 12px;
            top: 50%;
            transform: translateY(-50%);
            display: none;
        }
        .url-loading.show {
            display: block;
        }
        .url-loading::after {
            content: '';
            display: inline-block;
            width: 16px;
            height: 16px;
            border: 2px solid #f3f3f3;
            border-top: 2px solid #667eea;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        .preview-card {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 20px;
            display: none;
        }
        .preview-card.show {
            display: block;
            animation: slideIn 0.3s ease-out;
        }
        @keyframes slideIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .preview-title {
            font-size: 1.2em;
            font-weight: 600;
            color: #2c3e50;
            margin-bottom: 8px;
        }
        .preview-description {
            color: #6c757d;
            margin-bottom: 12px;
            line-height: 1.5;
        }
        .preview-summary {
            background: white;
            padding: 12px;
            border-radius: 8px;
            border-left: 4px solid #667eea;
            font-style: italic;
            color: #495057;
        }
        .preview-url {
            font-size: 0.9em;
            color: #6c757d;
            word-break: break-all;
            margin-bottom: 12px;
        }
        .message {
            padding: 12px 16px;
            border-radius: 8px;
            margin-bottom: 20px;
            display: none;
        }
        .message.show {
            display: block;
        }
        .message.success {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        .message.error {
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
        .loading {
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 3px solid #f3f3f3;
            border-top: 3px solid #667eea;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔗 링크 추가</h1>
        <p class="subtitle">링크를 추가하면 자동으로 AI 요약을 생성하여 등록된 Discord 채널로 전송됩니다.</p>
        
        <form id="linkForm">
            <div class="form-group">
                <label for="url">링크 URL</label>
                <div class="url-input-container">
                    <input type="url" id="url" name="url" placeholder="https://example.com" required>
                    <span class="url-loading"></span>
                </div>
            </div>
            
            <div class="form-group">
                <label for="tags">태그 (선택사항)</label>
                <input type="text" id="tags" name="tags" placeholder="기술, AI, 개발">
            </div>
            
            <div class="button-group">
                <button type="submit" id="submitBtn" class="btn-submit">링크 추가하기</button>
            </div>
        </form>
        
        <div id="previewCard" class="preview-card">
            <div class="preview-url" id="previewUrl"></div>
            <div class="preview-title" id="previewTitle"></div>
            <div class="preview-description" id="previewDescription"></div>
            <div class="preview-summary" id="previewSummary"></div>
        </div>
        
        <div id="message" class="message"></div>
    </div>

    <script>
        const form = document.getElementById('linkForm');
        const urlInput = document.getElementById('url');
        const tagsInput = document.getElementById('tags');
        const submitBtn = document.getElementById('submitBtn');
        const previewCard = document.getElementById('previewCard');
        const message = document.getElementById('message');
        const urlLoading = document.querySelector('.url-loading');

        let previewTimeout;
        let currentPreviewUrl = '';

        // URL 입력 시 자동 미리보기
        urlInput.addEventListener('input', () => {
            const url = urlInput.value.trim();
            
            // 이전 타이머 취소
            if (previewTimeout) {
                clearTimeout(previewTimeout);
            }

            // URL이 비어있으면 미리보기 숨기기
            if (!url) {
                hidePreview();
                currentPreviewUrl = '';
                return;
            }

            // 유효한 URL인지 확인
            try {
                new URL(url);
            } catch {
                // 유효하지 않은 URL이면 미리보기 숨기기
                hidePreview();
                currentPreviewUrl = '';
                return;
            }

            // 같은 URL이면 다시 요청하지 않음
            if (url === currentPreviewUrl) {
                return;
            }

            // 1초 후에 미리보기 생성
            previewTimeout = setTimeout(() => {
                generatePreview(url);
            }, 1000);
        });

        // 미리보기 생성 함수
        async function generatePreview(url) {
            if (!url || url === currentPreviewUrl) return;

            currentPreviewUrl = url;
            urlLoading.classList.add('show');
            hidePreview();

            try {
                const response = await fetch('/api/preview', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url })
                });

                const result = await response.json();

                // URL이 변경되었으면 결과 무시
                if (url !== currentPreviewUrl) return;

                if (result.success) {
                    showPreview(result.preview);
                } else {
                    console.warn('미리보기 생성 실패:', result.error);
                    hidePreview();
                }
            } catch (error) {
                console.warn('미리보기 생성 중 오류:', error);
                hidePreview();
            } finally {
                urlLoading.classList.remove('show');
            }
        }

        // 폼 제출
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const url = urlInput.value.trim();
            const tags = tagsInput.value.trim().split(',').map(tag => tag.trim()).filter(tag => tag);
            
            if (!url) {
                showMessage('URL을 입력해주세요.', 'error');
                return;
            }

            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="loading"></span> 처리 중...';

            try {
                const response = await fetch('/api/add-link', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url, tags })
                });

                const result = await response.json();

                if (result.success) {
                    showMessage('링크가 성공적으로 추가되었습니다! 백그라운드에서 처리 중입니다.', 'success');
                    form.reset();
                    hidePreview();
                } else {
                    showMessage('링크 추가 실패: ' + result.error, 'error');
                }
            } catch (error) {
                showMessage('링크 추가 중 오류가 발생했습니다.', 'error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '링크 추가하기';
            }
        });

        function showPreview(preview) {
            document.getElementById('previewUrl').textContent = preview.url;
            document.getElementById('previewTitle').textContent = preview.title || '제목 없음';
            document.getElementById('previewDescription').textContent = preview.description || '설명 없음';
            document.getElementById('previewSummary').textContent = preview.summary || '요약 없음';
            
            previewCard.classList.add('show');
        }

        function hidePreview() {
            previewCard.classList.remove('show');
        }

        function showMessage(text, type) {
            message.textContent = text;
            message.className = 'message show ' + type;
            setTimeout(() => {
                message.classList.remove('show');
            }, 5000);
        }
    </script>
</body>
</html>`;

  return new Response(html, {
    headers: { "Content-Type": "text/html" },
  });
}
