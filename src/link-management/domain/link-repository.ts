import { Link, LinkStatus } from "./link.js";

/**
 * 링크 저장소 인터페이스
 * 도메인 레이어에서 정의하여 의존성 역전 원칙을 적용합니다.
 */
export interface LinkRepository {
  /**
   * 모든 링크 조회
   */
  findAll(): Promise<Link[]>;

  /**
   * ID로 링크 조회
   */
  findById(id: string): Promise<Link | null>;

  /**
   * URL로 링크 조회
   */
  findByUrl(url: string): Promise<Link | null>;

  /**
   * 상태별 링크 조회
   */
  findByStatus(status: LinkStatus): Promise<Link[]>;

  /**
   * 링크 저장
   */
  save(link: Link): Promise<Link>;

  /**
   * 여러 링크 저장
   */
  saveAll(links: Link[]): Promise<Link[]>;

  /**
   * 링크 삭제
   */
  delete(id: string): Promise<boolean>;

  /**
   * 링크 존재 여부 확인
   */
  exists(url: string): Promise<boolean>;
}
