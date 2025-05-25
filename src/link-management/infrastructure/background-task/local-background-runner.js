/**
 * 로컬 개발 환경 백그라운드 태스크 러너
 */
export class LocalBackgroundRunner {
  constructor() {
    this.taskQueue = [];
    this.isProcessing = false;
  }

  /**
   * 백그라운드 태스크 스케줄링
   */
  schedule(task) {
    this.taskQueue.push(task);
    this.processQueue();
  }

  /**
   * 지연된 태스크 스케줄링
   */
  scheduleDelayed(task, delayMs) {
    setTimeout(() => {
      this.schedule(task);
    }, delayMs);
  }

  /**
   * 반복 태스크 스케줄링
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

  /**
   * 태스크 큐 처리
   */
  async processQueue() {
    if (this.isProcessing || this.taskQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.taskQueue.length > 0) {
      const task = this.taskQueue.shift();

      try {
        await task();
      } catch (error) {
        console.error("백그라운드 태스크 실행 실패:", error);
      }
    }

    this.isProcessing = false;
  }

  /**
   * 대기 중인 태스크 수 조회
   */
  getPendingTaskCount() {
    return this.taskQueue.length;
  }

  /**
   * 모든 태스크 완료 대기
   */
  async waitForCompletion() {
    while (this.isProcessing || this.taskQueue.length > 0) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
}
