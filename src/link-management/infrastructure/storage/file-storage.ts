import * as fs from "fs/promises";
import * as path from "path";
import type { Storage } from "../../../shared/interfaces/index.js";

/**
 * 파일 시스템 기반 스토리지 구현체
 */
export class FileStorage implements Storage {
  private basePath: string;

  constructor(private dataPath: string) {
    this.basePath = this.dataPath;
    this.ensureDataDirectory();
  }

  private async ensureDataDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.basePath, { recursive: true });
    } catch (error) {
      // 디렉토리가 이미 존재하는 경우 무시
    }
  }

  private _getFilePath(key: string): string {
    return path.join(this.basePath, key);
  }

  /**
   * 데이터 저장
   */
  async save(key: string, data: any): Promise<void> {
    await this.ensureDataDirectory();
    const filePath = this._getFilePath(key);
    const serialized = JSON.stringify(data, null, 2);
    await fs.writeFile(filePath, serialized, "utf8");
  }

  /**
   * 데이터 조회
   */
  async load(key: string): Promise<any> {
    try {
      const filePath = this._getFilePath(key);
      const content = await fs.readFile(filePath, "utf8");
      return JSON.parse(content);
    } catch (error: any) {
      if (error.code === "ENOENT") {
        return null;
      }
      throw new Error(`파일 조회 실패: ${error.message}`);
    }
  }

  /**
   * 데이터 조회 (null 반환)
   */
  async get<T = unknown>(key: string): Promise<T | null> {
    try {
      const filePath = this._getFilePath(key);
      const content = await fs.readFile(filePath, "utf8");
      return JSON.parse(content);
    } catch (error: any) {
      if (error.code === "ENOENT") {
        return null;
      }
      throw new Error(`파일 조회 실패: ${error.message}`);
    }
  }

  /**
   * 데이터 삭제
   */
  async delete(key: string): Promise<void> {
    try {
      const filePath = this._getFilePath(key);
      await fs.unlink(filePath);
    } catch (error: any) {
      if (error.code !== "ENOENT") {
        throw new Error(`파일 삭제 실패: ${error.message}`);
      }
    }
  }

  /**
   * 키 목록 조회
   */
  async list(prefix: string = ""): Promise<string[]> {
    try {
      await this.ensureDataDirectory();
      const files = await fs.readdir(this.basePath);
      return files.filter((file) => file.startsWith(prefix));
    } catch (error) {
      return [];
    }
  }

  /**
   * 키 존재 여부 확인
   */
  async exists(key: string): Promise<boolean> {
    try {
      const filePath = this._getFilePath(key);
      await fs.access(filePath);
      return true;
    } catch (error) {
      return false;
    }
  }
}
