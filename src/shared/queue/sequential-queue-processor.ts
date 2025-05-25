import type { TaskQueue, QueueProcessor } from "../interfaces/index.js";

/**
 * 순차적 큐 프로세서
 * 태스크를 하나씩 순차적으로 처리합니다.
 */
export class SequentialQueueProcessor implements QueueProcessor {
  private processing = false;
  private stopped = false;

  constructor(private taskQueue: TaskQueue) {}

  /**
   * 큐 처리 시작
   */
  async start(): Promise<void> {
    if (this.processing) {
      return;
    }

    this.stopped = false;
    await this.processQueue();
  }

  /**
   * 큐 처리 중지
   */
  async stop(): Promise<void> {
    this.stopped = true;
    await this.waitForCompletion();
  }

  /**
   * 현재 처리 중인지 확인
   */
  isProcessing(): boolean {
    return this.processing;
  }

  /**
   * 모든 태스크 완료 대기
   */
  async waitForCompletion(): Promise<void> {
    while (this.processing || !this.taskQueue.isEmpty()) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  /**
   * 대기 중인 태스크 수 조회
   */
  getPendingTaskCount(): number {
    return this.taskQueue.size();
  }

  /**
   * 태스크 큐 처리
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.stopped) {
      return;
    }

    this.processing = true;

    while (!this.taskQueue.isEmpty() && !this.stopped) {
      const task = this.taskQueue.dequeue();

      if (task) {
        try {
          await task();
        } catch (error) {
          console.error("태스크 실행 실패:", error);
        }
      }
    }

    this.processing = false;
  }

  /**
   * 새 태스크가 추가되었을 때 처리 시작
   */
  async triggerProcessing(): Promise<void> {
    if (!this.processing && !this.stopped) {
      await this.processQueue();
    }
  }
}
