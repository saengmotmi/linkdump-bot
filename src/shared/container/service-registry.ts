import { container } from "tsyringe";

export interface ServiceConfig {
  token: symbol;
  import?: string;
  class?: string;
  factory: (deps: any) => any;
}

/**
 * 의존성 로드 및 클래스 매핑
 */
export async function loadDependencies(
  serviceConfig: ServiceConfig[]
): Promise<Record<string, any>> {
  // 의존성 로드
  const imports = await Promise.all(
    serviceConfig
      .filter((service) => service.import)
      .map((service) => import(service.import!))
  );

  // 클래스 매핑
  const classes: Record<string, any> = {};
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
  deps: any
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
  const deps = {
    container,
    ...classes,
    ...additionalDeps,
    // 동적 인스턴스 해결을 위한 헬퍼
    resolve: (token: symbol) => container.resolve(token),
  };

  // 서비스 등록
  await registerServices(serviceConfig, deps);
}
