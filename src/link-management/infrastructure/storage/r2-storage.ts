import { injectable, inject } from "tsyringe";
import type { Storage } from "../../../shared/interfaces/index.js";
import { TOKENS } from "../../../shared/interfaces/index.js";

interface R2Object {
  key: string;
  size: number;
  etag: string;
  httpEtag: string;
  uploaded: Date;
  httpMetadata?: Record<string, string>;
  customMetadata?: Record<string, string>;
  text(): Promise<string>;
}

interface R2Objects {
  objects?: R2Object[];
  truncated: boolean;
  cursor?: string;
}

interface R2Bucket {
  get(key: string): Promise<R2Object | null>;
  put(
    key: string,
    value: string | ArrayBuffer | ReadableStream,
    options?: any
  ): Promise<R2Object>;
  delete(key: string): Promise<void>;
  list(options?: any): Promise<R2Objects>;
}

/**
 * Cloudflare R2 스토리지 구현체
 */
@injectable()
export class R2Storage implements Storage {
  private bucket: R2Bucket;

  constructor(@inject(TOKENS.Storage) r2Bucket: R2Bucket) {
    this.bucket = r2Bucket;
  }

  /**
   * 데이터 저장
   */
  async save(key: string, data: any): Promise<void> {
    const jsonData = JSON.stringify(data);
    await this.bucket.put(key, jsonData, {
      httpMetadata: {
        contentType: "application/json",
      },
    });
  }

  /**
   * 데이터 조회 (Storage 인터페이스)
   */
  async load(key: string): Promise<any> {
    const object = await this.bucket.get(key);
    if (!object) {
      return null;
    }

    const text = await object.text();
    return JSON.parse(text);
  }

  /**
   * 데이터 조회 (추가 메서드)
   */
  async get(key: string): Promise<any | null> {
    return this.load(key);
  }

  /**
   * 데이터 삭제
   */
  async delete(key: string): Promise<void> {
    await this.bucket.delete(key);
  }

  /**
   * 키 존재 여부 확인
   */
  async exists(key: string): Promise<boolean> {
    const object = await this.bucket.get(key);
    return object !== null;
  }

  /**
   * 키 목록 조회 (Storage 인터페이스)
   */
  async list(prefix?: string): Promise<string[]> {
    const objects = await this.bucket.list(prefix ? { prefix } : {});
    return objects.objects?.map((obj: R2Object) => obj.key) || [];
  }

  /**
   * 모든 키 목록 조회 (추가 메서드)
   */
  async listKeys(): Promise<string[]> {
    return this.list();
  }
}
