import { promises as fs } from "fs";
import path from "path";

/**
 * 파일 시스템 스토리지 구현체
 */
export class FileStorage {
  constructor(basePath = "./data") {
    this.basePath = basePath;
    this._ensureDirectory();
  }

  async _ensureDirectory() {
    try {
      await fs.mkdir(this.basePath, { recursive: true });
    } catch (error) {
      // 디렉토리가 이미 존재하는 경우 무시
    }
  }

  _getFilePath(key) {
    return path.join(this.basePath, key);
  }

  /**
   * 데이터 저장
   */
  async save(key, data) {
    await this._ensureDirectory();
    const filePath = this._getFilePath(key);
    const serialized = JSON.stringify(data, null, 2);
    await fs.writeFile(filePath, serialized, "utf8");
  }

  /**
   * 데이터 조회
   */
  async load(key) {
    try {
      const filePath = this._getFilePath(key);
      const content = await fs.readFile(filePath, "utf8");
      return JSON.parse(content);
    } catch (error) {
      if (error.code === "ENOENT") {
        return null;
      }
      throw new Error(`파일 조회 실패: ${error.message}`);
    }
  }

  /**
   * 데이터 삭제
   */
  async delete(key) {
    try {
      const filePath = this._getFilePath(key);
      await fs.unlink(filePath);
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw new Error(`파일 삭제 실패: ${error.message}`);
      }
    }
  }

  /**
   * 키 목록 조회
   */
  async list(prefix = "") {
    try {
      await this._ensureDirectory();
      const files = await fs.readdir(this.basePath);
      return files.filter((file) => file.startsWith(prefix));
    } catch (error) {
      return [];
    }
  }
}
