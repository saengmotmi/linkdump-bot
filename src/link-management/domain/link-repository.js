/**
 * 링크 저장소 인터페이스
 * 도메인 레이어에서 정의하여 의존성 역전 원칙을 적용합니다.
 */
export class LinkRepository {
  /**
   * 모든 링크 조회
   * @returns {Promise<Link[]>}
   */
  async findAll() {
    throw new Error("구현되지 않은 메서드입니다.");
  }

  /**
   * ID로 링크 조회
   * @param {string} id
   * @returns {Promise<Link|null>}
   */
  async findById(id) {
    throw new Error("구현되지 않은 메서드입니다.");
  }

  /**
   * URL로 링크 조회
   * @param {string} url
   * @returns {Promise<Link|null>}
   */
  async findByUrl(url) {
    throw new Error("구현되지 않은 메서드입니다.");
  }

  /**
   * 상태별 링크 조회
   * @param {string} status
   * @returns {Promise<Link[]>}
   */
  async findByStatus(status) {
    throw new Error("구현되지 않은 메서드입니다.");
  }

  /**
   * 링크 저장
   * @param {Link} link
   * @returns {Promise<Link>}
   */
  async save(link) {
    throw new Error("구현되지 않은 메서드입니다.");
  }

  /**
   * 여러 링크 저장
   * @param {Link[]} links
   * @returns {Promise<Link[]>}
   */
  async saveAll(links) {
    throw new Error("구현되지 않은 메서드입니다.");
  }

  /**
   * 링크 삭제
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  async delete(id) {
    throw new Error("구현되지 않은 메서드입니다.");
  }

  /**
   * 링크 존재 여부 확인
   * @param {string} url
   * @returns {Promise<boolean>}
   */
  async exists(url) {
    throw new Error("구현되지 않은 메서드입니다.");
  }
}
