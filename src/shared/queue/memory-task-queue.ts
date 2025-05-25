import type { TaskQueue } from "../interfaces/index.js";

/**
 * 메모리 기반 태스크 큐 구현체
 * 로컬 개발 환경에서 사용되는 간단한 FIFO 큐입니다.
 */
export class MemoryTaskQueue implements TaskQueue {
  private queue: Array<() => Promise<void>> = [];

  /**
   * 태스크를 큐에 추가
   */
  enqueue(task: () => Promise<void>): void {
    this.queue.push(task);
  }

  /**
   * 큐에서 태스크를 제거하고 반환
   */
  dequeue(): (() => Promise<void>) | undefined {
    return this.queue.shift();
  }

  /**
   * 큐의 크기 반환
   */
  size(): number {
    return this.queue.length;
  }

  /**
   * 큐가 비어있는지 확인
   */
  isEmpty(): boolean {
    return this.queue.length === 0;
  }

  /**
   * 큐를 비움
   */
  clear(): void {
    this.queue.length = 0;
  }
}
