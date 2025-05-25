import { injectable } from "tsyringe";
import type { BackgroundTaskRunner } from "../../../shared/interfaces/index.js";

/**
 * 로컬 개발 환경 백그라운드 태스크 러너
 */
@injectable()
export class LocalBackgroundRunner implements BackgroundTaskRunner {
  private taskQueue: Array<() => Promise<void>> = [];
  private isProcessing: boolean = false;

  /**
   * 백그라운드 태스크 스케줄링
   */
  async schedule(task: () => Promise<void>): Promise<void> {
    this.taskQueue.push(task);
    await this.processQueue();
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
   * 태스크 큐 처리
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.taskQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.taskQueue.length > 0) {
      const task = this.taskQueue.shift();

      if (task) {
        try {
          await task();
        } catch (error) {
          console.error("백그라운드 태스크 실행 실패:", error);
        }
      }
    }

    this.isProcessing = false;
  }

  /**
   * 대기 중인 태스크 수 조회
   */
  getPendingTaskCount(): number {
    return this.taskQueue.length;
  }

  /**
   * 모든 태스크 완료 대기
   */
  async waitForCompletion(): Promise<void> {
    while (this.isProcessing || this.taskQueue.length > 0) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
}
