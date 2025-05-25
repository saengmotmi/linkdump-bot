import { injectable } from "tsyringe";
import type {
  BackgroundTaskRunner,
  TaskQueue,
  QueueProcessor,
} from "../../../shared/interfaces/index.js";
import {
  createRepeatingTask,
  createDelayedTask,
} from "../../../shared/utils/task-utils.js";

interface WorkersContext {
  waitUntil(promise: Promise<any>): void;
}

/**
 * Cloudflare Workers 환경 백그라운드 태스크 러너
 * shared 큐 시스템과 Workers의 waitUntil을 조합하여 사용합니다.
 */
@injectable()
export class WorkersBackgroundRunner implements BackgroundTaskRunner {
  constructor(
    private options: { env: any; ctx: WorkersContext },
    private taskQueue?: TaskQueue,
    private queueProcessor?: QueueProcessor
  ) {}

  /**
   * 백그라운드 태스크 스케줄링
   */
  async schedule(task: () => Promise<void>): Promise<void> {
    // 큐 시스템이 있으면 사용, 없으면 직접 waitUntil 사용
    if (this.taskQueue && this.queueProcessor) {
      this.taskQueue.enqueue(task);

      // 큐 프로세서가 처리하도록 트리거
      if ("triggerProcessing" in this.queueProcessor) {
        await (this.queueProcessor as any).triggerProcessing();
      } else {
        await this.queueProcessor.start();
      }
    } else {
      // 기존 방식: Cloudflare Workers의 waitUntil을 직접 사용
      this.options.ctx.waitUntil(task());
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

    // Workers 환경에서는 waitUntil로 직접 처리
    this.options.ctx.waitUntil(delayedTask());
  }

  /**
   * 반복 태스크 스케줄링 (제한된 횟수)
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
    return this.queueProcessor?.getPendingTaskCount() || 0;
  }

  /**
   * 모든 태스크 완료 대기
   */
  async waitForCompletion(): Promise<void> {
    if (this.queueProcessor) {
      await this.queueProcessor.waitForCompletion();
    }
    // Workers 환경에서는 waitUntil로 처리되므로 별도 대기 불필요
  }
}
