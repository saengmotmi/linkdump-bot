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

// 서비스 의존성 타입 정의
export type ServiceDependencies = {
  resolve<T = unknown>(token: symbol): T;
} & {
  [className: string]: new (...args: any[]) => any; // 동적으로 로드되는 클래스들
};

export interface ServiceConfig {
  token: symbol;
  importFn?: () => Promise<any>; // 문자열 대신 함수로 변경
  class?: string;
  factory: (deps: ServiceDependencies) => any;
}

/**
 * 의존성 로드 및 클래스 매핑
 */
export async function loadDependencies(
  serviceConfig: ServiceConfig[]
): Promise<Record<string, new (...args: any[]) => any>> {
  // 의존성 로드
  const imports = await Promise.all(
    serviceConfig
      .filter((service) => service.importFn)
      .map((service) => service.importFn!())
  );

  // 클래스 매핑
  const classes: Record<string, new (...args: any[]) => any> = {};
  serviceConfig.forEach((service, index) => {
    if (service.class && service.importFn) {
      const importIndex = serviceConfig
        .slice(0, index)
        .filter((s) => s.importFn).length;
      classes[service.class] = imports[importIndex][service.class];
    }
  });

  return classes;
}

/**
 * 서비스 등록
 */
export async function registerServices(
  serviceConfig: ServiceConfig[],
  deps: ServiceDependencies
): Promise<void> {
  for (const service of serviceConfig) {
    const instance = await service.factory(deps);
    container.registerInstance(service.token, instance);
  }
}

/**
 * 서비스 설정을 기반으로 컨테이너 설정
 */
export async function setupContainer(
  serviceConfig: ServiceConfig[],
  additionalDeps: Record<string, any> = {}
): Promise<void> {
  // 의존성 로드
  const classes = await loadDependencies(serviceConfig);

  // 의존성 컨텍스트 준비
  const deps: ServiceDependencies = {
    ...classes,
    ...additionalDeps,
    // 동적 인스턴스 해결을 위한 헬퍼
    resolve: <T = unknown>(token: symbol): T => container.resolve<T>(token),
  } as ServiceDependencies;

  // 서비스 등록
  await registerServices(serviceConfig, deps);
}
