import { injectable } from "tsyringe";
import type {
  BackgroundTaskRunner,
  TaskQueue,
  QueueProcessor,
} from "../../../shared/interfaces/index.js";

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

      // 큐 프로세서에 새 태스크 처리를 트리거
      await this.queueProcessor.triggerProcessing();
    } else {
      // 기존 방식: Cloudflare Workers의 waitUntil을 직접 사용
      this.options.ctx.waitUntil(task());
    }
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
