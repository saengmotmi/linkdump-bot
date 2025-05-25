# 🔗 LinkDump Bot

TypeScript와 TSyringe 의존성 주입, Cloudflare Workers를 사용한 강력한 링크 관리 봇입니다.

## ✨ 주요 기능

- 🔗 링크 수집 및 관리
- 🤖 Discord 웹훅 연동
- 🧠 AI 기반 링크 처리 (선택사항)
- 📊 링크 분석 및 분류
- 🚀 Cloudflare Workers 서버리스 배포
- 💉 의존성 주입을 통한 깔끔한 아키텍처

## 환경 설정

### 1. 환경 변수 설정

예시 환경 파일을 복사하고 설정을 구성하세요:

```bash
cp .env.example .env
```

`.env` 파일을 본인의 값으로 수정하세요:

```env
# Cloudflare Workers 배포 정보
WORKER_URL=https://your-worker-name.your-subdomain.workers.dev

# 개발 환경 설정
DEV_PORT=8787
DEV_URL=http://localhost:8787

# Discord Webhook URLs (배포 시 wrangler secret으로 설정)
DISCORD_WEBHOOKS=https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN

# OpenAI API Key (선택사항)
OPENAI_API_KEY=sk-your-openai-api-key

# 기타 설정
NODE_ENV=development
```

### 2. Cloudflare Workers 시크릿 설정

프로덕션 배포를 위해 민감한 값들을 Wrangler 시크릿으로 설정하세요:

```bash
# Discord Webhook URLs
cd workers
wrangler secret put DISCORD_WEBHOOKS

# OpenAI API Key (선택사항)
wrangler secret put OPENAI_API_KEY
```

## 빠른 시작

### 개발

```bash
# 의존성 설치
npm install

# 로컬 개발 서버 시작
npm run dev:local

# 또는 Cloudflare Workers 원격 환경으로 시작
npm run dev:remote

# 배포된 워커를 브라우저에서 열기
npm run open:worker
```

### 배포

```bash
# 배포
npm run deploy

# 배포 히스토리 보기
npm run deployments
```

## 사용 가능한 스크립트

| 스크립트              | 설명                            |
| --------------------- | ------------------------------- |
| `npm run dev:local`   | 로컬 개발 서버 시작             |
| `npm run dev:remote`  | Cloudflare Workers로 개발       |
| `npm run open:worker` | 배포된 워커를 브라우저에서 열기 |
| `npm run deploy`      | 배포                            |
| `npm run deployments` | 배포 히스토리 보기              |
| `npm run check:types` | TypeScript 타입 체크            |

## API 엔드포인트

- `GET /` - 웹 인터페이스
- `GET /api/config` - 설정 정보 조회
- `GET /api/links` - 링크 목록 조회
- `POST /api/add-link` - 새 링크 추가
- `POST /api/process-links` - 링크 처리

## 아키텍처

이 프로젝트는 다음을 사용합니다:

- **TSyringe** - 의존성 주입
- **Cloudflare Workers** - 서버리스 배포
- **TypeScript** - 타입 안전성
- **모듈형 아키텍처** - 유지보수성

## 기여하기

1. 저장소를 포크하세요
2. 기능 브랜치를 생성하세요 (`git checkout -b feature/amazing-feature`)
3. 변경사항을 커밋하세요 (`git commit -m 'Add some amazing feature'`)
4. 브랜치에 푸시하세요 (`git push origin feature/amazing-feature`)
5. Pull Request를 열어주세요

## 라이선스

이 프로젝트는 MIT 라이선스 하에 있습니다.
