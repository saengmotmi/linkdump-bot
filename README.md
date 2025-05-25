# LinkDump Bot

Discord에 링크를 자동으로 공유하는 봇입니다. Claude AI와 GitHub Actions를 활용한 저비용 솔루션입니다.

## 🚀 기능

- 웹 인터페이스로 편리한 링크 추가
- 모바일 북마클릿으로 어디서든 즉시 추가
- Claude AI로 "클릭하고 싶게 만드는" 3줄 요약 자동 생성
- 여러 Discord 채널에 동시 전송
- GitHub Actions로 완전 자동화

## 💰 비용 (월 기준)

| 서비스 | 비용 |
|--------|------|
| **Railway/Render** | $0 (무료 티어) |
| **Claude API** | ~$2 (Haiku 모델) |
| **GitHub Actions** | 무료 (2000분) |
| **Discord 웹훅** | 무료 |
| **총 비용** | **~$2/월** |

## 📦 배포 방법

### 1. Railway (추천 - 가장 쉬움)
```bash
# 1. railway.app 가입
# 2. GitHub 연결
# 3. 환경변수 설정:
#    ANTHROPIC_API_KEY=your_api_key
#    DISCORD_WEBHOOKS=webhook1,webhook2
```

### 2. Render (대안)
```bash
# 1. render.com 가입  
# 2. GitHub 연결
# 3. render.yaml 사용하여 자동 배포
```

### 3. 기타 옵션
- **Vercel**: Serverless 함수로 배포 (무료)
- **Netlify**: 정적 + 함수 (무료)
- **Heroku**: $7/월 (유료)

## 🔧 설정

### GitHub Secrets 설정
```
ANTHROPIC_API_KEY=your_anthropic_api_key
DISCORD_WEBHOOKS=https://discord.com/api/webhooks/xxx/yyy,https://discord.com/api/webhooks/aaa/bbb
```

### 로컬 개발
```bash
# 1. 환경변수 설정
cp .env.example .env
# .env 파일 편집

# 2. 의존성 설치 및 실행
npm install
npm start

# 3. 브라우저에서 http://localhost:3000 접속
```

## 📱 사용법

### 웹 인터페이스
1. 배포된 URL 접속
2. 링크 입력 후 추가
3. 자동으로 Discord에 전송

### 모바일 북마클릿
1. 웹사이트에서 "링크덤프 추가" 북마크 추가
2. 공유하고 싶은 페이지에서 북마크 클릭
3. 즉시 추가됨

### CLI (개발용)
```bash
node src/add-link.js add-link https://example.com tech ai
```

## 🔄 작동 방식

1. **링크 추가**: 웹/모바일/CLI로 `links.json`에 저장
2. **자동 처리**: GitHub Action이 파일 변경 감지하여 실행
3. **AI 요약**: Claude가 OG 태그 + 클릭 유도 요약 생성
4. **Discord 전송**: 모든 등록된 웹훅으로 전송
5. **완료 표시**: 처리 상태 업데이트

## 🛡️ 보안

- Discord 웹훅 URL은 환경변수로 관리 (레포지토리에 노출 안됨)
- API 키들 모두 GitHub Secrets로 보호
- `.gitignore`로 민감한 파일 제외

## 📊 모니터링

- GitHub Actions 탭에서 처리 로그 확인
- Discord에서 실시간 결과 확인
- Railway/Render 대시보드에서 서버 상태 모니터링