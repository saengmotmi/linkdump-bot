/**
 * Cloudflare Workers 환경 백그라운드 태스크 러너
 */
export class WorkersBackgroundRunner {
  constructor(workersRuntime) {
    this.workersRuntime = workersRuntime;
  }

  /**
   * 백그라운드 태스크 스케줄링
   */
  schedule(task) {
    this.workersRuntime.scheduleBackgroundTask(task);
  }

  /**
   * 지연된 태스크 스케줄링
   */
  scheduleDelayed(task, delayMs) {
    this.workersRuntime.scheduleBackgroundTask(async () => {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      await task();
    });
  }

  /**
   * 반복 태스크 스케줄링 (제한된 횟수)
   */
  scheduleRepeating(task, intervalMs, maxRuns = 5) {
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
