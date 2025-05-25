/**
 * 태스크 관련 유틸리티 함수들
 */

/**
 * 반복 태스크 생성 옵션
 */
export interface RepeatingTaskOptions {
  /** 반복 간격 (밀리초) */
  intervalMs: number;
  /** 최대 실행 횟수 (기본값: 5) */
  maxRuns?: number;
  /** 에러 발생 시 중단할지 여부 (기본값: false) */
  stopOnError?: boolean;
  /** 에러 핸들러 */
  onError?: (error: Error, runCount: number) => void;
  /** 완료 콜백 */
  onComplete?: (totalRuns: number) => void;
}

/**
 * 지연 태스크 생성 옵션
 */
export interface DelayedTaskOptions {
  /** 지연 시간 (밀리초) */
  delayMs: number;
  /** 에러 핸들러 */
  onError?: (error: Error) => void;
}

/**
 * 반복 실행되는 태스크를 생성합니다.
 *
 * @param task 실행할 태스크
 * @param options 반복 옵션
 * @param scheduler 태스크 스케줄러 함수
 * @returns 생성된 반복 태스크
 */
export function createRepeatingTask(
  task: () => Promise<void>,
  options: RepeatingTaskOptions,
  scheduler: (task: () => Promise<void>) => Promise<void> | void
): () => Promise<void> {
  const {
    intervalMs,
    maxRuns = 5,
    stopOnError = false,
    onError,
    onComplete,
  } = options;

  let runCount = 0;

  const repeatingTask = async () => {
    if (runCount >= maxRuns) {
      onComplete?.(runCount);
      return;
    }

    try {
      await task();
      runCount++;

      if (runCount < maxRuns) {
        setTimeout(() => scheduler(repeatingTask), intervalMs);
      } else {
        onComplete?.(runCount);
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      onError?.(err, runCount);

      if (stopOnError) {
        onComplete?.(runCount);
        return;
      }

      // 에러가 발생해도 계속 실행
      runCount++;
      if (runCount < maxRuns) {
        setTimeout(() => scheduler(repeatingTask), intervalMs);
      } else {
        onComplete?.(runCount);
      }
    }
  };

  return repeatingTask;
}

/**
 * 지연 실행되는 태스크를 생성합니다.
 *
 * @param task 실행할 태스크
 * @param options 지연 옵션
 * @returns 생성된 지연 태스크
 */
export function createDelayedTask(
  task: () => Promise<void>,
  options: DelayedTaskOptions
): () => Promise<void> {
  const { delayMs, onError } = options;

  return async () => {
    await new Promise((resolve) => setTimeout(resolve, delayMs));

    try {
      await task();
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      onError?.(err);
      throw err; // 에러를 다시 던져서 상위에서 처리할 수 있도록
    }
  };
}

/**
 * 재시도 가능한 태스크를 생성합니다.
 *
 * @param task 실행할 태스크
 * @param maxRetries 최대 재시도 횟수
 * @param retryDelayMs 재시도 간격 (밀리초)
 * @returns 생성된 재시도 태스크
 */
export function createRetryableTask(
  task: () => Promise<void>,
  maxRetries: number = 3,
  retryDelayMs: number = 1000
): () => Promise<void> {
  return async () => {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        await task();
        return; // 성공하면 종료
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < maxRetries) {
          console.warn(
            `태스크 실행 실패 (${attempt + 1}/${
              maxRetries + 1
            }), ${retryDelayMs}ms 후 재시도:`,
            lastError.message
          );
          await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
        }
      }
    }

    // 모든 재시도가 실패한 경우
    throw lastError;
  };
}

/**
 * 타임아웃이 있는 태스크를 생성합니다.
 *
 * @param task 실행할 태스크
 * @param timeoutMs 타임아웃 시간 (밀리초)
 * @returns 생성된 타임아웃 태스크
 */
export function createTimeoutTask(
  task: () => Promise<void>,
  timeoutMs: number
): () => Promise<void> {
  return async () => {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`태스크가 ${timeoutMs}ms 내에 완료되지 않았습니다.`));
      }, timeoutMs);
    });

    await Promise.race([task(), timeoutPromise]);
  };
}
