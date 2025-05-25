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

    // 큐 프로세서에 새 태스크 처리를 트리거
    await this.queueProcessor.triggerProcessing();
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
