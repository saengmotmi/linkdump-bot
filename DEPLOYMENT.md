# 🚀 배포 가이드

LinkDump Bot의 배포 및 관리를 위한 가이드입니다.

## 📋 사전 요구사항

### 1. Cloudflare 계정 설정

```bash
# Wrangler CLI 설치 (전역)
npm install -g wrangler

# Cloudflare 로그인
wrangler login

# 계정 정보 확인
wrangler whoami
```

### 2. 환경 설정

```bash
# Discord 웹훅 설정 (필수)
cd workers
wrangler secret put DISCORD_WEBHOOKS

# 입력 예시: ["https://discord.com/api/webhooks/..."]
```

### 3. R2 버킷 생성

```bash
# R2 버킷 생성 (wrangler.toml의 bucket_name과 일치해야 함)
wrangler r2 bucket create linkdump-data
```

## 🛠️ 배포 스크립트

### 전체 배포 프로세스

```bash
# 완전한 배포 (권장)
npm run deploy
```

이 명령은 다음 단계를 자동으로 실행합니다:

1. 환경 변수 확인
2. 의존성 설치
3. TypeScript 타입 체크
4. 프로젝트 빌드
5. 테스트 실행
6. Cloudflare Workers 배포
7. 배포 후 테스트

### 빠른 배포

```bash
# 빌드 및 테스트 없이 빠른 배포
npm run deploy:quick
```

### 배포 후 테스트만 실행

```bash
# 배포 후 API 테스트
npm run deploy:test
```

## 🔍 모니터링 및 관리

### 헬스체크

```bash
# 서비스 상태 확인
npm run health
```

### 배포 목록 확인

```bash
# 배포 히스토리 조회
npm run deployments
```

### 로그 확인

```bash
# 실시간 로그 확인
cd workers
wrangler tail

# 특정 기간 로그 확인
wrangler tail --since 1h
```

## 🔄 롤백

### 이전 배포로 롤백

```bash
# 바로 이전 배포로 자동 롤백
npm run rollback:previous
```

### 특정 배포로 롤백

```bash
# 배포 목록 확인
npm run deployments

# 특정 배포 ID로 롤백
npm run rollback <deployment-id>
```

### 롤백 스크립트 직접 사용

```bash
# 배포 목록 확인
./scripts/rollback.sh --list

# 이전 배포로 롤백
./scripts/rollback.sh --previous

# 특정 배포로 롤백
./scripts/rollback.sh abc123def456
```

## 🧪 테스트

### 배포 후 자동 테스트 항목

1. **기본 연결 테스트**

   - 루트 경로 접근
   - 존재하지 않는 경로 테스트

2. **API 엔드포인트 테스트**

   - `GET /api/config` - 설정 조회
   - `GET /api/links` - 링크 목록 조회
   - `POST /api/add-link` - 링크 추가 (유효/무효 데이터)
   - `POST /api/process-links` - 링크 처리

3. **성능 테스트**

   - API 응답 시간 측정

4. **보안 테스트**
   - CORS 헤더 확인
   - SQL Injection 방어 테스트

### 수동 테스트

```bash
# 설정 확인
curl https://your-worker.workers.dev/api/config

# 링크 추가
curl -X POST https://your-worker.workers.dev/api/add-link \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "tags": ["test"]}'

# 링크 목록 조회
curl https://your-worker.workers.dev/api/links
```

## 🚨 트러블슈팅

### 일반적인 문제들

#### 1. 배포 실패

```bash
# 로그인 상태 확인
wrangler whoami

# 다시 로그인
wrangler login

# 권한 확인
wrangler whoami
```

#### 2. 환경 변수 문제

```bash
# 시크릿 목록 확인
cd workers
wrangler secret list

# 시크릿 재설정
wrangler secret put DISCORD_WEBHOOKS
```

#### 3. R2 버킷 문제

```bash
# R2 버킷 목록 확인
wrangler r2 bucket list

# 버킷 생성
wrangler r2 bucket create linkdump-data
```

#### 4. 타입 에러

```bash
# 타입 체크
npm run check:types

# 의존성 재설치
rm -rf node_modules package-lock.json
npm install
```

### 로그 분석

```bash
# 에러 로그 확인
cd workers
wrangler tail --format pretty

# 특정 요청 추적
wrangler tail --search "ERROR"
```

## 📊 성능 최적화

### 1. 번들 크기 최적화

```bash
# 빌드 결과 확인
npm run build
ls -la dist/

# 불필요한 의존성 제거
npm audit
```

### 2. 캐싱 전략

- R2 스토리지 활용
- Workers KV 고려 (필요시)
- CDN 캐싱 설정

### 3. 모니터링

```bash
# 메트릭 확인
wrangler analytics

# 사용량 확인
wrangler usage
```

## 🔐 보안 체크리스트

- [ ] Discord 웹훅 URL 보안 확인
- [ ] 시크릿 변수 적절히 설정
- [ ] CORS 정책 검토
- [ ] 입력 검증 로직 확인
- [ ] 에러 메시지에 민감 정보 노출 방지

## 📈 배포 전략

### 1. 개발 환경

```bash
# 로컬 개발
npm run dev

# 로컬 테스트
npm run demo
```

### 2. 스테이징 환경

```bash
# 별도 worker로 배포 (선택사항)
cd workers
wrangler deploy --name linkdump-bot-staging
```

### 3. 프로덕션 환경

```bash
# 완전한 배포 프로세스
npm run deploy
```

## 📞 지원

배포 관련 문제가 발생하면:

1. 로그 확인: `wrangler tail`
2. 헬스체크 실행: `npm run health`
3. 이전 버전으로 롤백: `npm run rollback:previous`
4. GitHub Issues에 문제 보고
