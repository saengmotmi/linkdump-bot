/**
 * 🔧 서비스 레지스트리 - 공통 의존성 주입 로직
 *
 * 환경별 컨테이너(cloudflare-container, local-container)에서
 * 공통으로 사용하는 서비스 등록 로직을 제공합니다.
 *
 * 주요 기능:
 * - 동적 모듈 로딩
 * - 서비스 팩토리 패턴
 * - 의존성 해결 헬퍼
 */

import { container } from "tsyringe";

export interface ServiceConfig {
  token: symbol;
  importFn: () => Promise<any>; // 인스턴스를 직접 반환
  isDirectInstance: boolean; // 항상 true
  factory: () => void; // 사용되지 않음 (하위 호환성을 위해 유지)
}

/**
 * 서비스 등록 - 단순화된 버전
 */
export async function registerServices(
  serviceConfig: ServiceConfig[]
): Promise<void> {
  for (const service of serviceConfig) {
    // importFn이 인스턴스를 직접 반환
    const instance = await service.importFn();
    container.registerInstance(service.token, instance);
  }
}

/**
 * 서비스 설정을 기반으로 컨테이너 설정 - 단순화된 버전
 */
export async function setupContainer(
  serviceConfig: ServiceConfig[]
): Promise<void> {
  // 서비스 등록
  await registerServices(serviceConfig);
}
