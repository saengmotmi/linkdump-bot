# LinkDump Bot ⚡

완전 Cloudflare 기반 링크 공유 봇입니다. 웹 인터페이스에서 링크를 추가하면 즉시 Claude AI가 요약을 생성하고 Discord로 전송합니다.

## 🚀 핵심 기능

- ⚡ **즉시 처리**: 링크 추가 즉시 백그라운드에서 AI 처리
- 🌐 **통합 웹 인터페이스**: 아름다운 그라데이션 UI
- 📱 **모바일 북마클릿**: 어떤 페이지에서든 원클릭 추가
- 🤖 **Claude AI 요약**: "왜 클릭해야 하는지" 중심의 매력적인 요약
- 💬 **Discord 자동 전송**: 여러 채널 동시 전송
- 🔄 **수동 처리**: 미처리 링크 일괄 처리 기능

## 🏗️ 완전 Cloudflare 아키텍처

```
사용자 → Cloudflare Worker (웹페이지 + API + AI 처리) → R2 Storage → Discord
                           ↑                              ↑
                  모든 것이 하나의 Worker              영구 저장소
```

## 💰 비용 (월 기준)

| 서비스 | 비용 |
|--------|------|
| **Cloudflare R2** | $0 (10GB 무료) |
| **Cloudflare Workers** | $0 (10만 요청 무료) |
| **Claude API** | ~$2 |
| **총 비용** | **~$2/월** |

## 📦 배포 방법

자세한 배포 가이드는 [SETUP.md](./SETUP.md)를 참고하세요.

```bash
# 1. Cloudflare 계정 생성 및 R2 버킷 생성
# 2. wrangler CLI 설치 및 로그인
npm install -g wrangler
wrangler auth

# 3. Workers 배포
cd workers
cp wrangler-complete.toml wrangler.toml
wrangler secret put ANTHROPIC_API_KEY
wrangler secret put DISCORD_WEBHOOKS
wrangler deploy
```

## 🔄 작동 방식

1. **링크 추가**: 웹 인터페이스에서 URL 입력
2. **즉시 저장**: Cloudflare R2에 즉시 저장
3. **백그라운드 처리**: Worker가 백그라운드에서 OG 태그 스크래핑 + AI 요약 생성
4. **Discord 전송**: 생성된 요약과 함께 Discord로 자동 전송

## 🎯 혁신적 장점

- ⚡ **즉시 피드백**: 링크 추가 즉시 성공 응답
- 🚀 **백그라운드 처리**: AI 처리가 사용자 경험을 방해하지 않음
- 🌍 **글로벌 성능**: Cloudflare 엣지 네트워크
- 💰 **극도로 저렴**: 거의 모든 것이 무료
- 🔧 **초간단 배포**: Secret 2개만 설정
- 📱 **완벽한 UX**: 반응형 + 애니메이션 + 로딩 상태

## 📱 사용 방법

1. **웹 인터페이스**: 배포된 Worker URL 접속하여 링크 추가
2. **북마클릿**: 제공된 북마클릿을 브라우저에 추가하여 원클릭 공유
3. **수동 처리**: "미처리 링크 수동 처리" 버튼으로 일괄 처리