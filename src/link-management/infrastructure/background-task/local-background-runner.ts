import type {
  BackgroundTaskRunner,
  TaskQueue,
  QueueProcessor,
} from "../../../shared/interfaces/index.js";
import {
  createRepeatingTask,
  createDelayedTask,
} from "../../../shared/utils/task-utils.js";

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
    const delayedTask = createDelayedTask(task, {
      delayMs,
      onError: (error) => {
        console.error("지연된 태스크 실행 실패:", error);
      },
    });

    // 지연 태스크를 즉시 스케줄링 (내부에서 지연 처리됨)
    this.schedule(delayedTask);
  }

  /**
   * 반복 태스크 스케줄링
   */
  scheduleRepeating(
    task: () => Promise<void>,
    intervalMs: number,
    maxRuns: number = 5
  ): void {
    const repeatingTask = createRepeatingTask(
      task,
      {
        intervalMs,
        maxRuns,
        onError: (error, runCount) => {
          console.error(`반복 태스크 실행 실패 (${runCount}회차):`, error);
        },
        onComplete: (totalRuns) => {
          console.log(`반복 태스크 완료: 총 ${totalRuns}회 실행`);
        },
      },
      (nextTask) => this.schedule(nextTask)
    );

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
