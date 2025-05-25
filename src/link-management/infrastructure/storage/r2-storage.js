/**
 * Cloudflare R2 스토리지 구현체
 */
export class R2Storage {
  constructor(r2Bucket) {
    this.bucket = r2Bucket;
  }

  /**
   * 데이터 저장
   */
  async save(key, data) {
    try {
      const serialized = JSON.stringify(data, null, 2);
      await this.bucket.put(key, serialized, {
        httpMetadata: {
          contentType: "application/json",
        },
      });
    } catch (error) {
      throw new Error(`R2 저장 실패: ${error.message}`);
    }
  }

  /**
   * 데이터 조회
   */
  async load(key) {
    try {
      const object = await this.bucket.get(key);
      if (!object) {
        return null;
      }

      const text = await object.text();
      return JSON.parse(text);
    } catch (error) {
      if (error.message.includes("NoSuchKey")) {
        return null;
      }
      throw new Error(`R2 조회 실패: ${error.message}`);
    }
  }
}
