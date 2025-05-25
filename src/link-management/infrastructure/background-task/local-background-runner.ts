import type {
  BackgroundTaskRunner,
  TaskQueue,
  QueueProcessor,
} from "../../../shared/interfaces/index.js";

/**
 * 로컬 개발 환경 백그라운드 태스크 러너
 * shared 큐 시스템을 사용하여 태스크를 관리합니다.
 */
export class LocalBackgroundRunner implements BackgroundTaskRunner {
  constructor(
    private taskQueue: TaskQueue,
    private queueProcessor: QueueProcessor
  ) {}

  /**
   * 백그라운드 태스크 스케줄링
   */
  async schedule(task: () => Promise<void>): Promise<void> {
    this.taskQueue.enqueue(task);

    // 큐 프로세서가 처리하도록 트리거
    if ("triggerProcessing" in this.queueProcessor) {
      await (this.queueProcessor as any).triggerProcessing();
    } else {
      await this.queueProcessor.start();
    }
  }

  /**
   * 지연된 태스크 스케줄링
   */
  scheduleDelayed(task: () => Promise<void>, delayMs: number): void {
    setTimeout(() => {
      this.schedule(task);
    }, delayMs);
  }

  /**
   * 반복 태스크 스케줄링
   */
  scheduleRepeating(
    task: () => Promise<void>,
    intervalMs: number,
    maxRuns: number = 5
  ): void {
    let runCount = 0;

    const repeatingTask = async () => {
      if (runCount >= maxRuns) {
        return;
      }

      try {
        await task();
        runCount++;

        if (runCount < maxRuns) {
          setTimeout(() => this.schedule(repeatingTask), intervalMs);
        }
      } catch (error) {
        console.error("반복 태스크 실행 실패:", error);
      }
    };

    this.schedule(repeatingTask);
  }

  /**
   * 대기 중인 태스크 수 조회
   */
  getPendingTaskCount(): number {
    return this.queueProcessor.getPendingTaskCount();
  }

  /**
   * 모든 태스크 완료 대기
   */
  async waitForCompletion(): Promise<void> {
    await this.queueProcessor.waitForCompletion();
  }
}
