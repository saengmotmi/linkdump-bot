import { LinkRepository } from "../domain/link-repository";
import { Link, LinkStatus } from "../domain/link";
import { Storage } from "../../shared/interfaces/index.js";

/**
 * 링크 데이터 컬렉션 인터페이스
 */
interface LinksData {
  links: Link[];
  lastUpdated?: string;
}

/**
 * 스토리지 기반 링크 저장소 구현체
 * 도메인의 LinkRepository 인터페이스를 구현합니다.
 */
export class StorageLinkRepository implements LinkRepository {
  private readonly STORAGE_KEY = "links.json";

  constructor(private storage: Storage) {}

  /**
   * 스토리지에서 링크 데이터 로드
   */
  private async _loadLinksData(): Promise<LinksData> {
    try {
      const data = await this.storage.load(this.STORAGE_KEY);
      if (!data) {
        return { links: [] };
      }

      const parsed = typeof data === "string" ? JSON.parse(data) : data;
      return {
        links: parsed.links.map((linkData: any) => Link.fromObject(linkData)),
        lastUpdated: parsed.lastUpdated,
      };
    } catch (error) {
      console.warn("링크 데이터 로드 실패, 빈 데이터로 초기화:", error);
      return { links: [] };
    }
  }

  /**
   * 스토리지에 링크 데이터 저장
   */
  private async _saveLinksData(linksData: LinksData): Promise<void> {
    const serializedData = {
      links: linksData.links.map((link) => link.toObject()),
      lastUpdated: new Date().toISOString(),
    };

    await this.storage.save(this.STORAGE_KEY, serializedData);
  }

  /**
   * 모든 링크 조회
   */
  async findAll(): Promise<Link[]> {
    const data = await this._loadLinksData();
    return data.links;
  }

  /**
   * ID로 링크 조회
   */
  async findById(id: string): Promise<Link | null> {
    const data = await this._loadLinksData();
    return data.links.find((link) => link.id === id) || null;
  }

  /**
   * URL로 링크 조회
   */
  async findByUrl(url: string): Promise<Link | null> {
    const data = await this._loadLinksData();
    return data.links.find((link) => link.url === url) || null;
  }

  /**
   * 상태별 링크 조회
   */
  async findByStatus(status: LinkStatus): Promise<Link[]> {
    const data = await this._loadLinksData();
    return data.links.filter((link) => link.status === status);
  }

  /**
   * 링크 저장
   */
  async save(link: Link): Promise<Link> {
    const data = await this._loadLinksData();
    const existingIndex = data.links.findIndex((l) => l.id === link.id);

    if (existingIndex >= 0) {
      // 기존 링크 업데이트
      data.links[existingIndex] = link;
    } else {
      // 새 링크 추가
      data.links.push(link);
    }

    await this._saveLinksData(data);
    return link;
  }

  /**
   * 여러 링크 저장
   */
  async saveAll(links: Link[]): Promise<Link[]> {
    const data = await this._loadLinksData();

    for (const link of links) {
      const existingIndex = data.links.findIndex((l) => l.id === link.id);

      if (existingIndex >= 0) {
        data.links[existingIndex] = link;
      } else {
        data.links.push(link);
      }
    }

    await this._saveLinksData(data);
    return links;
  }

  /**
   * 링크 삭제
   */
  async delete(id: string): Promise<boolean> {
    const data = await this._loadLinksData();
    const initialLength = data.links.length;

    data.links = data.links.filter((link) => link.id !== id);

    if (data.links.length < initialLength) {
      await this._saveLinksData(data);
      return true;
    }

    return false;
  }

  /**
   * 링크 존재 여부 확인
   */
  async exists(url: string): Promise<boolean> {
    const link = await this.findByUrl(url);
    return link !== null;
  }
}
