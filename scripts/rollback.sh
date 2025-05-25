#!/bin/bash

# 롤백 스크립트 for LinkDump Bot
# 이전 배포 버전으로 롤백

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
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 배포 목록 확인
list_deployments() {
    log_info "배포 목록 확인 중..."
    
    cd workers
    
    if ! wrangler deployments list 2>/dev/null; then
        log_error "배포 목록을 가져올 수 없습니다."
        log_info "wrangler에 로그인되어 있는지 확인하세요: wrangler login"
        exit 1
    fi
    
    cd ..
}

# 특정 배포로 롤백
rollback_to_deployment() {
    local deployment_id=$1
    
    if [ -z "$deployment_id" ]; then
        log_error "배포 ID가 제공되지 않았습니다."
        echo "사용법: $0 <deployment-id>"
        echo "또는: $0 --list (배포 목록 확인)"
        exit 1
    fi
    
    log_info "배포 ID $deployment_id로 롤백 중..."
    
    cd workers
    
    if wrangler rollback "$deployment_id"; then
        log_success "롤백이 완료되었습니다."
        
        # 롤백 후 헬스체크
        cd ..
        if [ -f "scripts/health-check.sh" ]; then
            log_info "롤백 후 헬스체크 실행 중..."
            chmod +x scripts/health-check.sh
            ./scripts/health-check.sh
        fi
    else
        log_error "롤백에 실패했습니다."
        cd ..
        exit 1
    fi
    
    cd ..
}

# 이전 배포로 자동 롤백
rollback_to_previous() {
    log_info "이전 배포로 자동 롤백 중..."
    
    cd workers
    
    # 최근 배포 목록에서 두 번째 항목 가져오기
    local previous_deployment=$(wrangler deployments list --format json 2>/dev/null | jq -r '.[1].id' 2>/dev/null || echo "")
    
    if [ -z "$previous_deployment" ] || [ "$previous_deployment" = "null" ]; then
        log_error "이전 배포를 찾을 수 없습니다."
        log_info "수동으로 배포 ID를 지정하세요: $0 <deployment-id>"
        cd ..
        exit 1
    fi
    
    cd ..
    
    log_info "이전 배포 ID: $previous_deployment"
    rollback_to_deployment "$previous_deployment"
}

# 사용법 출력
show_usage() {
    echo "LinkDump Bot 롤백 스크립트"
    echo ""
    echo "사용법:"
    echo "  $0 --list                   배포 목록 확인"
    echo "  $0 --previous               이전 배포로 자동 롤백"
    echo "  $0 <deployment-id>          특정 배포 ID로 롤백"
    echo ""
    echo "예시:"
    echo "  $0 --list"
    echo "  $0 --previous"
    echo "  $0 abc123def456"
}

# 메인 실행
main() {
    if [ $# -eq 0 ]; then
        show_usage
        exit 1
    fi
    
    case "$1" in
        --list)
            list_deployments
            ;;
        --previous)
            rollback_to_previous
            ;;
        --help|-h)
            show_usage
            ;;
        *)
            rollback_to_deployment "$1"
            ;;
    esac
}

main "$@" 