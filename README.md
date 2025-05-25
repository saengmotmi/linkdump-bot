# 🔗 LinkDump Bot

TypeScript 기반의 링크 수집 및 요약 봇입니다. TSyringe를 사용한 의존성 주입으로 깔끔한 아키텍처를 구현했습니다.

## ✨ 주요 기능

- 🔗 **링크 자동 수집**: URL을 추가하면 자동으로 메타데이터 추출
- 🤖 **AI 요약**: Cloudflare Workers AI로 콘텐츠 자동 요약
- 📢 **Discord 알림**: 처리 완료된 링크를 Discord로 전송
- 🏗️ **Clean Architecture**: TSyringe 기반 의존성 주입
- ⚡ **멀티 환경**: Cloudflare Workers와 로컬 개발 지원

## 🚀 빠른 시작

### 1. 설치

```bash
npm install
```

### 2. 환경 설정

#### Cloudflare Workers 배포

```bash
# Discord 웹훅 설정 (필수)
wrangler secret put DISCORD_WEBHOOKS

# 입력 예시: ["https://discord.com/api/webhooks/..."]
```

#### 로컬 개발

```bash
# .env 파일 생성
DISCORD_WEBHOOKS=["https://discord.com/api/webhooks/..."]
```

### 3. 배포

```bash
# Cloudflare Workers 배포
cd workers
npx wrangler deploy
```

## 🏗️ 아키텍처

### 환경별 구현체

| 환경                   | AI                | 스토리지    | 알림    |
| ---------------------- | ----------------- | ----------- | ------- |
| **Cloudflare Workers** | Workers AI        | R2          | Discord |
| **로컬 개발**          | Workers AI (Mock) | File System | Discord |

### 핵심 컴포넌트

```typescript
// 애플리케이션 서비스 (TSyringe 자동 주입)
@injectable()
export class LinkManagementService {
  constructor(
    @inject(TOKENS.LinkRepository) linkRepository: LinkRepository,
    @inject(TOKENS.ContentScraper) contentScraper: ContentScraper,
    @inject(TOKENS.AISummarizer) aiSummarizer: AISummarizer,
    @inject(TOKENS.Notifier) private discordNotifier: Notifier,
    @inject(TOKENS.BackgroundTaskRunner)
    private backgroundTaskRunner: BackgroundTaskRunner
  ) {}
}
```

### DI 컨테이너 설정

```typescript
// Cloudflare Workers
await createCloudflareContainer(env, ctx);
const service = container.resolve(LinkManagementService);

// 로컬 개발
await createLocalContainer();
const service = container.resolve(LinkManagementService);
```

## 📡 API 엔드포인트

### POST /api/add-link

링크 추가

```bash
curl -X POST https://your-worker.workers.dev/api/add-link \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "tags": ["tech", "ai"]}'
```

### GET /api/links

링크 목록 조회

```bash
curl https://your-worker.workers.dev/api/links
```

### POST /api/process-links

미처리 링크 일괄 처리

```bash
curl -X POST https://your-worker.workers.dev/api/process-links
```

### GET /api/config

현재 설정 조회

```bash
curl https://your-worker.workers.dev/api/config
```

## 🔧 개발

### 타입 체크

```bash
npm run check:types
```

### 로컬 테스트

```bash
# 로컬 환경에서 서비스 테스트
npm run dev
```

## 📁 프로젝트 구조

```
linkdump-bot/
├── src/
│   ├── shared/
│   │   ├── interfaces/index.ts           # 인터페이스 & DI 토큰
│   │   └── container/
│   │       ├── service-registry.ts       # 공통 DI 로직
│   │       ├── cloudflare-container.ts   # Workers 설정
│   │       └── local-container.ts        # 로컬 설정
│   └── link-management/
│       ├── domain/                       # 비즈니스 로직
│       ├── application/                  # 애플리케이션 서비스
│       └── infrastructure/               # 외부 서비스 구현체
├── workers/
│   ├── app.ts                           # Workers 엔트리포인트
│   └── wrangler.toml                    # Workers 설정
└── package.json
```

## 🎯 핵심 특징

### TSyringe 기반 DI

- **표준 라이브러리**: Microsoft 공식 DI 컨테이너
- **타입 안전성**: 완전한 TypeScript 지원
- **데코레이터 기반**: `@injectable()`, `@inject()` 사용

### 환경별 최적화

- **Cloudflare Workers**: Workers AI + R2 스토리지로 서버리스 최적화
- **로컬 개발**: Workers AI Mock + 파일 시스템으로 개발 편의성

### Clean Architecture

- **도메인 중심**: 비즈니스 로직과 인프라 분리
- **의존성 역전**: 인터페이스 기반 설계
- **테스트 용이성**: Mock 주입 간편

## �� 라이선스

MIT License
