# LinkDump Bot - 도메인 중심 아키텍처

## 🎯 아키텍처 개선 완료

기존의 기술 중심 분류에서 **도메인 중심 아키텍처**로 전환하여 비즈니스 로직이 명확하게 드러나는 구조를 구축했습니다.

## 🏗️ 도메인 중심 구조

### 📁 새로운 폴더 구조

```
src/
├── link-management/              # 링크 관리 도메인
│   ├── domain/                   # 도메인 레이어
│   │   ├── link.js              # 링크 엔티티
│   │   ├── link-repository.js   # 저장소 인터페이스 (도메인)
│   │   ├── link-service.js      # 도메인 서비스
│   │   └── business-logic.js    # 순수 비즈니스 함수들
│   ├── application/             # 애플리케이션 레이어
│   │   └── link-management-service.js  # 애플리케이션 서비스
│   └── infrastructure/          # 인프라스트럭처 레이어 (역할 중심)
│       ├── storage-link-repository.js  # 저장소 구현체
│       ├── storage/             # 📦 스토리지 구현체들
│       │   ├── r2-storage.js        # Cloudflare R2
│       │   └── file-storage.js      # 파일 시스템
│       ├── ai-provider/         # 🧠 AI 클라이언트들
│       │   ├── openai-client.js     # OpenAI API
│       │   └── workers-ai-client.js # Cloudflare Workers AI
│       ├── ai-summarizer/       # 🤖 AI 요약 구현체들
│       │   ├── openai-summarizer.js
│       │   └── workers-ai-summarizer.js
│       ├── content-scraper/     # 🔍 콘텐츠 스크래핑
│       │   └── web-scraper.js
│       ├── notification/        # 📢 알림 구현체들
│       │   └── discord-notifier.js
│       ├── background-task/     # ⚡ 백그라운드 태스크
│       │   ├── workers-background-runner.js
│       │   └── local-background-runner.js
│       └── runtime/             # 🌐 런타임 환경
│           └── workers-runtime.js
└── shared/                      # 공유 영역
    ├── interfaces/             # 기술적 인터페이스들
    └── utils/                  # 유틸리티 (팩토리, 컨테이너)

workers/
├── app.js                      # 메인 애플리케이션
└── wrangler.toml              # 배포 설정
```

## 🔄 레이어별 역할

### 1. 도메인 레이어 (Domain Layer)

**핵심 비즈니스 로직과 규칙을 담당**

#### `Link` 엔티티

```javascript
// 링크의 핵심 비즈니스 규칙과 불변성 보장
const link = new Link({ url, tags });
const processedLink = link.completeProcessing({ title, description, summary });
```

#### `LinkRepository` 인터페이스

```javascript
// 도메인에서 정의하는 저장소 계약 (의존성 역전)
class LinkRepository {
  async findByUrl(url) {
    /* 구현 필요 */
  }
  async save(link) {
    /* 구현 필요 */
  }
}
```

#### `LinkDomainService`

```javascript
// 복잡한 비즈니스 로직과 엔티티 간 상호작용
await linkDomainService.createLink(url, tags);
await linkDomainService.processLink(linkId);
```

### 2. 애플리케이션 레이어 (Application Layer)

**유스케이스 조율과 외부 서비스 통합**

#### `LinkManagementService`

```javascript
// 사용자 요청을 도메인 서비스와 외부 서비스로 조율
const result = await linkManagementService.addLink(url, tags);
// → 도메인 서비스 호출 + 백그라운드 처리 스케줄링 + Discord 알림
```

### 3. 인프라스트럭처 레이어 (Infrastructure Layer)

**역할 중심으로 명확하게 분리된 외부 시스템 연동**

#### 📦 스토리지 구현체

```javascript
// Cloudflare R2 스토리지
class R2Storage {
  async save(key, data) {
    // R2 버킷에 저장
  }
}

// 파일 시스템 스토리지
class FileStorage {
  async save(key, data) {
    // 로컬 파일에 저장
  }
}
```

#### 🧠 AI 클라이언트

```javascript
// OpenAI API 클라이언트
class OpenAIClient {
  async generateText(prompt, options) {
    // OpenAI API 호출
  }
}

// Cloudflare Workers AI 클라이언트
class WorkersAIClient {
  async generateText(prompt, options) {
    // Workers AI 호출
  }
}
```

#### 🤖 AI 요약 구현체

```javascript
// OpenAI 기반 요약
class OpenAISummarizer {
  constructor(openaiClient) {
    this.openaiClient = openaiClient;
  }

  async summarize({ url, title, description }) {
    // 프롬프트 생성 + OpenAI 호출 + 결과 정리
  }
}

// Workers AI 기반 요약
class WorkersAISummarizer {
  constructor(workersAIClient) {
    this.workersAIClient = workersAIClient;
  }

  async summarize({ url, title, description }) {
    // 프롬프트 생성 + Workers AI 호출 + 결과 정리
  }
}
```

#### 🔍 콘텐츠 스크래핑

```javascript
// 웹 콘텐츠 스크래퍼
class WebContentScraper {
  async scrape(url) {
    // HTML 파싱 및 메타데이터 추출
  }
}
```

#### 📢 알림 구현체

```javascript
// Discord 웹훅 알림
class DiscordNotifier {
  async send(linkData) {
    // Discord Embed 생성 및 전송
  }
}
```

#### ⚡ 백그라운드 태스크

```javascript
// Cloudflare Workers 환경
class WorkersBackgroundRunner {
  constructor(workersRuntime) {
    this.workersRuntime = workersRuntime;
  }

  schedule(task) {
    // Workers 런타임을 통한 백그라운드 실행
  }
}

// 로컬 개발 환경
class LocalBackgroundRunner {
  schedule(task) {
    // 로컬 큐를 통한 백그라운드 실행
  }
}
```

#### 🌐 런타임 환경

```javascript
// Cloudflare Workers 런타임
class WorkersRuntime {
  async scheduleBackgroundTask(task) {
    // Workers의 waitUntil 사용
  }

  getCorsHeaders() {
    // CORS 헤더 생성
  }
}
```

## 🎁 개선된 Infrastructure의 장점

### 1. **역할 중심 명확한 분리**

제공자 이름 대신 역할로 폴더를 구성:

```
❌ 이전 (제공자 중심)        ✅ 현재 (역할 중심)
├── cloudflare/            ├── storage/
├── openai/               ├── ai-provider/
├── filesystem/           ├── ai-summarizer/
                          ├── content-scraper/
                          ├── notification/
                          ├── background-task/
                          └── runtime/
```

### 2. **구현체와 클라이언트 분리**

```javascript
// AI 클라이언트 (저수준 API 호출)
const openaiClient = new OpenAIClient(apiKey);
const text = await openaiClient.generateText(prompt);

// AI 요약기 (고수준 비즈니스 로직)
const summarizer = new OpenAISummarizer(openaiClient);
const summary = await summarizer.summarize({ url, title, description });
```

### 3. **환경별 구현체 교체 용이성**

```javascript
// 환경 변수로 간단하게 교체
AI_PROVIDER=openai          # 또는 workers-ai
STORAGE_TYPE=r2             # 또는 file
```

### 4. **확장성과 테스트 용이성**

```javascript
// 새로운 AI 제공자 추가
ai-provider/
├── openai-client.js
├── workers-ai-client.js
├── claude-client.js        # 새로 추가
└── gemini-client.js        # 새로 추가

// 각 구현체 독립 테스트
describe('OpenAISummarizer', () => {
  test('should generate summary', async () => {
    const mockClient = new MockOpenAIClient();
    const summarizer = new OpenAISummarizer(mockClient);
    // 테스트 로직
  });
});
```

## 🚀 사용법

### 의존성 컨테이너를 통한 초기화

```javascript
import { DependencyContainer } from "../src/shared/utils/dependency-container.js";

// Cloudflare Workers 환경
const container = DependencyContainer.createForCloudflareWorkers(env, ctx);
const linkManagementService = container.resolve("linkManagementService");

// 로컬 개발 환경
const container = DependencyContainer.createForLocal({
  openaiApiKey: process.env.OPENAI_API_KEY,
  discordWebhooks: [process.env.DISCORD_WEBHOOK],
  dataPath: "./data",
});
```

### 환경 변수를 통한 구현체 선택

```bash
# Cloudflare Workers 환경 변수
AI_PROVIDER=workers-ai          # 또는 openai
STORAGE_TYPE=r2                 # 또는 file
SCRAPER_TIMEOUT=10000
SCRAPER_USER_AGENT=LinkDump-Bot/1.0
DISCORD_WEBHOOKS=["https://..."]
```

### API 엔드포인트

| 메서드 | 경로                        | 설명           |
| ------ | --------------------------- | -------------- |
| POST   | `/api/links`                | 새 링크 추가   |
| GET    | `/api/links`                | 링크 목록 조회 |
| POST   | `/api/process`              | 모든 링크 처리 |
| GET    | `/api/statistics`           | 통계 조회      |
| DELETE | `/api/links/{id}`           | 링크 삭제      |
| POST   | `/api/links/{id}/reprocess` | 링크 재처리    |
| POST   | `/api/links/{id}/tags`      | 태그 추가      |

## 🔧 확장 방법

### 새로운 AI 제공자 추가

```javascript
// 1. AI 클라이언트 생성
class ClaudeClient {
  async generateText(prompt, options) {
    // Claude API 구현
  }
}

// 2. AI 요약기 생성
class ClaudeSummarizer {
  constructor(claudeClient) {
    this.claudeClient = claudeClient;
  }

  async summarize({ url, title, description }) {
    // Claude 기반 요약 로직
  }
}

// 3. 의존성 컨테이너에 등록
container.register("aiClient", () => {
  const aiType = env.AI_PROVIDER;
  switch (aiType) {
    case "claude":
      return new ClaudeClient(env.CLAUDE_API_KEY);
    // ... 기존 케이스들
  }
});
```

### 새로운 스토리지 추가

```javascript
// Redis 스토리지 구현체
class RedisStorage {
  async save(key, data) {
    // Redis 저장 로직
  }

  async load(key) {
    // Redis 조회 로직
  }
}

// 의존성 컨테이너에 등록
container.register("storage", () => {
  const storageType = env.STORAGE_TYPE;
  switch (storageType) {
    case "redis":
      return new RedisStorage(env.REDIS_URL);
    // ... 기존 케이스들
  }
});
```

### 새로운 알림 채널 추가

```javascript
// Slack 알림 구현체
class SlackNotifier {
  async send(linkData) {
    // Slack API 구현
  }
}

// 복합 알림기
class MultiChannelNotifier {
  constructor(notifiers) {
    this.notifiers = notifiers;
  }

  async send(linkData) {
    await Promise.allSettled(
      this.notifiers.map((notifier) => notifier.send(linkData))
    );
  }
}
```

## 📊 이전 구조와의 비교

### 이전 (제공자 중심 + 인라인 구현)

```javascript
// 제공자 이름이 하드코드됨
├── cloudflare/
├── openai/
├── filesystem/

// 의존성 컨테이너에서 인라인으로 정의
container.register("contentScraper", () => {
  return {
    async scrape(url) {
      // 인라인 구현...
    },
  };
});
```

❌ 제공자 이름이 하드코드됨  
❌ 역할이 불분명함  
❌ 구현체가 드러나지 않음  
❌ 테스트하기 어려움

### 현재 (역할 중심 + 명시적 구현체)

```javascript
// 역할 중심 폴더 구조
├── storage/
├── ai-provider/
├── ai-summarizer/
├── content-scraper/
├── notification/
├── background-task/
└── runtime/

// 별도 파일로 분리된 구현체
import { WebContentScraper } from "...";

container.register("contentScraper", () => {
  return new WebContentScraper(options);
});
```

✅ 역할이 명확하게 드러남  
✅ 제공자에 독립적인 구조  
✅ 구현체가 명확하게 분리됨  
✅ 독립적으로 테스트 가능  
✅ 높은 재사용성

## 🧪 테스트 전략

### Infrastructure 레이어 테스트

```javascript
describe("WebContentScraper", () => {
  test("should extract Open Graph tags", async () => {
    const scraper = new WebContentScraper();
    const html = '<meta property="og:title" content="Test Title">';
    const result = scraper.parseMetadata(html);
    expect(result.title).toBe("Test Title");
  });
});

describe("OpenAISummarizer", () => {
  test("should generate summary with fallback", async () => {
    const mockClient = {
      generateText: jest.fn().mockRejectedValue(new Error("API Error")),
    };
    const summarizer = new OpenAISummarizer(mockClient);

    const result = await summarizer.summarize({
      url: "https://example.com",
      title: "Test Title",
      description: "Test Description",
    });

    expect(result).toBe("Test Title: Test Description");
  });
});
```

### 통합 테스트

```javascript
describe("LinkManagementService Integration", () => {
  test("should process link end-to-end", async () => {
    const container = DependencyContainer.createForLocal(testConfig);
    const service = container.resolve("linkManagementService");

    const result = await service.addLink("https://example.com");
    expect(result.success).toBe(true);
  });
});
```

## 🔮 향후 확장 계획

### 1. 더 많은 구현체 추가

```
infrastructure/
├── storage/
│   ├── r2-storage.js
│   ├── file-storage.js
│   ├── redis-storage.js         # Redis 캐시
│   └── postgres-storage.js      # PostgreSQL
├── ai-provider/
│   ├── openai-client.js
│   ├── workers-ai-client.js
│   ├── claude-client.js         # Anthropic Claude
│   ├── gemini-client.js         # Google Gemini
│   └── local-llm-client.js      # 로컬 LLM
├── notification/
│   ├── discord-notifier.js
│   ├── slack-notifier.js        # Slack 알림
│   ├── email-notifier.js        # 이메일 알림
│   └── webhook-notifier.js      # 범용 웹훅
└── content-scraper/
    ├── web-scraper.js
    ├── puppeteer-scraper.js     # 동적 콘텐츠
    └── readability-scraper.js   # 본문 추출
```

### 2. 모니터링 및 관찰성

```javascript
// 메트릭 수집
monitoring/
├── cloudflare-analytics.js     # Cloudflare Analytics
├── prometheus-metrics.js       # Prometheus
└── datadog-metrics.js          # Datadog

// 로깅
logging/
├── structured-logger.js        # 구조화된 로그
├── cloudflare-logger.js        # Cloudflare Logs
└── winston-logger.js           # Winston
```

### 3. 캐싱 레이어

```javascript
// 캐시 구현체
cache/
├── redis-cache.js              # Redis 캐시
├── memory-cache.js             # 메모리 캐시
├── cloudflare-kv-cache.js      # Cloudflare KV
└── multi-tier-cache.js         # 다단계 캐시
```

## 📈 성능 및 품질

- **코드 응집도**: 관련 기능이 역할별로 한 곳에 모임
- **결합도 감소**: 레이어 간 명확한 인터페이스
- **테스트 커버리지**: 각 구현체의 완전한 독립 테스트 가능
- **유지보수성**: 변경 영향 범위의 최소화
- **확장성**: 새로운 구현체 추가의 용이성
- **가독성**: 역할 중심 구조로 코드 이해도 향상

이제 LinkDump Bot은 진정한 도메인 중심 아키텍처를 갖추어 비즈니스 로직이 명확하게 드러나고, Infrastructure 레이어에서 각 기술적 관심사가 **역할 중심**으로 명확하게 분리되어 확장과 유지보수가 용이한 구조가 되었습니다! 🎉
