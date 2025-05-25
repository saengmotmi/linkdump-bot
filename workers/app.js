// 리팩토링된 아키텍처를 사용하는 Cloudflare Worker
import { createCloudflareContainer } from "../src/shared/plugins/cloudflare-plugins.js";

export default {
  async fetch(request, env, ctx) {
    try {
      // 플러그인 기반 의존성 컨테이너 생성
      const container = await createCloudflareContainer(env, ctx);
      const linkManagementService = await container.resolve(
        "linkManagementService"
      );

      const url = new URL(request.url);
      const path = url.pathname;
      const method = request.method;

      // CORS 헤더 설정
      const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      };

      // OPTIONS 요청 처리 (CORS preflight)
      if (method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
      }

      // API 라우팅
      if (path.startsWith("/api/")) {
        let response;

        switch (true) {
          case path === "/api/links" && method === "POST":
            response = await handleAddLink(request, linkManagementService);
            break;

          case path === "/api/links" && method === "GET":
            response = await handleGetLinks(linkManagementService);
            break;

          case path === "/api/process" && method === "POST":
            response = await handleProcessLinks(linkManagementService);
            break;

          case path === "/api/statistics" && method === "GET":
            response = await handleGetStatistics(linkManagementService);
            break;

          case path.match(/^\/api\/links\/(.+)$/) && method === "DELETE":
            const deleteId = path.match(/^\/api\/links\/(.+)$/)[1];
            response = await handleDeleteLink(deleteId, linkManagementService);
            break;

          case path.match(/^\/api\/links\/(.+)\/reprocess$/) &&
            method === "POST":
            const reprocessId = path.match(
              /^\/api\/links\/(.+)\/reprocess$/
            )[1];
            response = await handleReprocessLink(
              reprocessId,
              linkManagementService
            );
            break;

          case path.match(/^\/api\/links\/(.+)\/tags$/) && method === "POST":
            const tagId = path.match(/^\/api\/links\/(.+)\/tags$/)[1];
            response = await handleAddTags(
              request,
              tagId,
              linkManagementService
            );
            break;

          default:
            response = new Response(
              JSON.stringify({ error: "API 엔드포인트를 찾을 수 없습니다" }),
              { status: 404, headers: { "Content-Type": "application/json" } }
            );
        }

        // CORS 헤더 추가
        Object.entries(corsHeaders).forEach(([key, value]) => {
          response.headers.set(key, value);
        });

        return response;
      }

      // 정적 파일 또는 기본 응답
      return new Response("LinkDump Bot API", {
        headers: { "Content-Type": "text/plain", ...corsHeaders },
      });
    } catch (error) {
      console.error("애플리케이션 오류:", error);
      return new Response(
        JSON.stringify({
          error: "내부 서버 오류",
          message: error.message,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  },
};

// API 핸들러 함수들
async function handleAddLink(request, linkManagementService) {
  try {
    const { url, tags } = await request.json();

    if (!url) {
      return new Response(JSON.stringify({ error: "URL이 필요합니다" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const result = await linkManagementService.addLink(url, tags);
    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("링크 추가 오류:", error);
    return new Response(
      JSON.stringify({ error: "링크 추가 실패", message: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

async function handleGetLinks(linkManagementService) {
  try {
    const links = await linkManagementService.getAllLinks();
    return new Response(JSON.stringify({ links }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("링크 조회 오류:", error);
    return new Response(
      JSON.stringify({ error: "링크 조회 실패", message: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

async function handleProcessLinks(linkManagementService) {
  try {
    const result = await linkManagementService.processAllPendingLinks();
    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("링크 처리 오류:", error);
    return new Response(
      JSON.stringify({ error: "링크 처리 실패", message: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

async function handleGetStatistics(linkManagementService) {
  try {
    const stats = await linkManagementService.getStatistics();
    return new Response(JSON.stringify(stats), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("통계 조회 오류:", error);
    return new Response(
      JSON.stringify({ error: "통계 조회 실패", message: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

async function handleDeleteLink(id, linkManagementService) {
  try {
    const result = await linkManagementService.deleteLink(id);
    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("링크 삭제 오류:", error);
    return new Response(
      JSON.stringify({ error: "링크 삭제 실패", message: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

async function handleReprocessLink(id, linkManagementService) {
  try {
    const result = await linkManagementService.reprocessLink(id);
    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("링크 재처리 오류:", error);
    return new Response(
      JSON.stringify({ error: "링크 재처리 실패", message: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

async function handleAddTags(request, id, linkManagementService) {
  try {
    const { tags } = await request.json();

    if (!tags || !Array.isArray(tags)) {
      return new Response(JSON.stringify({ error: "태그 배열이 필요합니다" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const result = await linkManagementService.addTagsToLink(id, tags);
    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("태그 추가 오류:", error);
    return new Response(
      JSON.stringify({ error: "태그 추가 실패", message: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
