import { container } from "tsyringe";

// 서비스 의존성 타입 정의
export type ServiceDependencies = {
  resolve<T = unknown>(token: symbol): T;
} & {
  [className: string]: new (...args: any[]) => any; // 동적으로 로드되는 클래스들
};

export interface ServiceConfig {
  token: symbol;
  import?: string;
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
      .filter((service) => service.import)
      .map((service) => import(service.import!))
  );

  // 클래스 매핑
  const classes: Record<string, new (...args: any[]) => any> = {};
  serviceConfig.forEach((service, index) => {
    if (service.class && service.import) {
      const importIndex = serviceConfig
        .slice(0, index)
        .filter((s) => s.import).length;
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
