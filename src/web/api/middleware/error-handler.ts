/**
 * API 전역 에러 핸들러
 * 모든 API 에러를 일관된 형태로 처리합니다.
 */
export class ApiErrorHandler {
  /**
   * 에러를 처리하고 적절한 Response를 반환합니다.
   */
  static handleError(error: unknown, context?: string): Response {
    console.error(`API Error${context ? ` in ${context}` : ""}:`, error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    // 에러 타입별 상태 코드 결정
    let statusCode = 500;
    let errorType = "Internal Server Error";

    if (error instanceof ValidationError) {
      statusCode = 400;
      errorType = "Validation Error";
    } else if (error instanceof NotFoundError) {
      statusCode = 404;
      errorType = "Not Found";
    } else if (error instanceof UnauthorizedError) {
      statusCode = 401;
      errorType = "Unauthorized";
    } else if (error instanceof ForbiddenError) {
      statusCode = 403;
      errorType = "Forbidden";
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: errorType,
        message: errorMessage,
        ...(process.env.NODE_ENV === "development" && {
          stack: error instanceof Error ? error.stack : undefined,
        }),
      }),
      {
        status: statusCode,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  /**
   * 비동기 함수를 래핑하여 에러를 자동으로 처리합니다.
   */
  static async wrapAsync<T>(
    fn: () => Promise<T>,
    context?: string
  ): Promise<T | Response> {
    try {
      return await fn();
    } catch (error) {
      return this.handleError(error, context);
    }
  }

  /**
   * CORS 헤더를 Response에 추가합니다.
   */
  static addCorsHeaders(response: Response): Response {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  }
}

/**
 * 커스텀 에러 클래스들
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export class NotFoundError extends Error {
  constructor(message: string = "Resource not found") {
    super(message);
    this.name = "NotFoundError";
  }
}

export class UnauthorizedError extends Error {
  constructor(message: string = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  constructor(message: string = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}
