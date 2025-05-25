import { injectable, inject } from "tsyringe";
import type { BackgroundTaskRunner } from "../../../shared/interfaces/index.js";

/**
 * Cloudflare Workers 환경 백그라운드 태스크 러너
 */
@injectable()
export class WorkersBackgroundRunner implements BackgroundTaskRunner {
  constructor(@inject("WORKERS_RUNTIME") private workersRuntime: any) {}

  /**
   * 백그라운드 태스크 스케줄링
   */
  async schedule(task: () => Promise<void>): Promise<void> {
    this.workersRuntime.scheduleBackgroundTask(task);
  }

  /**
   * 지연된 태스크 스케줄링
   */
  scheduleDelayed(task: () => Promise<void>, delayMs: number): void {
    this.workersRuntime.scheduleBackgroundTask(async () => {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      await task();
    });
  }

  /**
   * 반복 태스크 스케줄링 (제한된 횟수)
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
}
