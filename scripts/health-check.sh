#!/bin/bash

# 헬스체크 스크립트 for LinkDump Bot
# 배포된 서비스의 상태를 간단히 확인

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 로그 함수들
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[OK]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Worker URL 가져오기
get_worker_url() {
    cd workers
    
    # wrangler.toml에서 worker 이름 추출
    WORKER_NAME=$(grep "name = " wrangler.toml | cut -d'"' -f2)
    
    if [ -z "$WORKER_NAME" ]; then
        log_error "wrangler.toml에서 worker 이름을 찾을 수 없습니다."
        exit 1
    fi
    
    # 기본 URL 패턴 사용
    WORKER_URL="https://${WORKER_NAME}.workers.dev"
    
    cd ..
    
    echo "$WORKER_URL"
}

# 간단한 헬스체크
health_check() {
    local worker_url=$(get_worker_url)
    
    log_info "헬스체크 시작..."
    log_info "Worker URL: $worker_url"
    
    # API 설정 엔드포인트 확인
    local response=$(curl -s -w '%{http_code}' --max-time 10 "$worker_url/api/config" 2>/dev/null || echo "000")
    local status_code="${response: -3}"
    
    if [ "$status_code" = "200" ]; then
        log_success "서비스가 정상적으로 작동 중입니다"
        echo -e "${BLUE}URL:${NC} $worker_url"
        return 0
    elif [ "$status_code" = "000" ]; then
        log_error "서비스에 연결할 수 없습니다 (네트워크 오류)"
        return 1
    else
        log_warning "서비스가 예상과 다른 응답을 반환했습니다 (Status: $status_code)"
        return 1
    fi
}

# 메인 실행
main() {
    health_check
}

main "$@" 