/**
 * 스토리지 인터페이스 - 다양한 스토리지 구현체를 지원
 */
export class StorageInterface {
  /**
   * 데이터 저장
   * @param {string} key - 저장할 키
   * @param {string} data - 저장할 데이터 (JSON 문자열)
   * @param {Object} metadata - 메타데이터 (선택사항)
   * @returns {Promise<void>}
   */
  async put(key, data, metadata = {}) {
    throw new Error("put method must be implemented");
  }

  /**
   * 데이터 조회
   * @param {string} key - 조회할 키
   * @returns {Promise<{text: () => Promise<string>} | null>}
   */
  async get(key) {
    throw new Error("get method must be implemented");
  }

  /**
   * 데이터 삭제
   * @param {string} key - 삭제할 키
   * @returns {Promise<void>}
   */
  async delete(key) {
    throw new Error("delete method must be implemented");
  }

  /**
   * 키 목록 조회
   * @param {string} prefix - 키 접두사 (선택사항)
   * @returns {Promise<string[]>}
   */
  async list(prefix = "") {
    throw new Error("list method must be implemented");
  }
}
