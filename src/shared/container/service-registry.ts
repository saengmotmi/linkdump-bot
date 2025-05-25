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
<<<<<<< HEAD
  importFn: () => Promise<any>; // 인스턴스를 직접 반환
=======
  importFn?: () => Promise<any>; // 모듈 또는 인스턴스를 반환
  class?: string;
  factory: (deps: ServiceDependencies) => any;
  // 새로운 방식: importFn이 인스턴스를 직접 반환하는 경우
  isDirectInstance?: boolean;
>>>>>>> 10e7e03 (refactor: DI 컨테이너 구조 개선 - AI 바인딩 이름을 AI에서 WORKERS_AI로 변경 - importFn에서 조건부 로직과 인스턴스 생성을 통합 - class와 factory 분산 로직을 importFn으로 집중 - isDirectInstance 플래그로 새로운 방식 지원)
}

/**
 * 타입 안전한 resolve 함수 - 제네릭 사용
 */
export function safeResolve<T>(token: symbol): T {
  return container.resolve<T>(token);
}

/**
 * 서비스 등록 - 단순화된 버전
 */
export async function registerServices(
  serviceConfig: ServiceConfig[]
): Promise<void> {
  for (const service of serviceConfig) {
<<<<<<< HEAD
    // importFn이 인스턴스를 직접 반환
    const instance = await service.importFn();
=======
    let instance;

    if (service.isDirectInstance && service.importFn) {
      // importFn이 인스턴스를 직접 반환하는 경우
      instance = await service.importFn();
    } else {
      // 기존 방식: factory 함수 사용
      instance = await service.factory(deps);
    }

>>>>>>> 10e7e03 (refactor: DI 컨테이너 구조 개선 - AI 바인딩 이름을 AI에서 WORKERS_AI로 변경 - importFn에서 조건부 로직과 인스턴스 생성을 통합 - class와 factory 분산 로직을 importFn으로 집중 - isDirectInstance 플래그로 새로운 방식 지원)
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
