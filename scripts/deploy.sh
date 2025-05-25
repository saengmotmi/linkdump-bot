#!/bin/bash

# 배포 스크립트 for LinkDump Bot
# Cloudflare Workers 배포 및 검증

set -e  # 에러 발생 시 스크립트 중단

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

# 환경 변수 확인
check_environment() {
    log_info "환경 변수 확인 중..."
    
    # wrangler CLI 설치 확인
    if ! command -v wrangler &> /dev/null; then
        log_error "wrangler CLI가 설치되지 않았습니다."
        log_info "설치 명령: npm install -g wrangler"
        exit 1
    fi
    
    # wrangler 로그인 확인
    if ! wrangler whoami &> /dev/null; then
        log_error "Cloudflare에 로그인되지 않았습니다."
        log_info "로그인 명령: wrangler login"
        exit 1
    fi
    
    log_success "환경 변수 확인 완료"
}

# 의존성 설치
install_dependencies() {
    log_info "의존성 설치 중..."
    
    if [ -f "yarn.lock" ]; then
        yarn install
    elif [ -f "package-lock.json" ]; then
        npm install
    else
        npm install
    fi
    
    log_success "의존성 설치 완료"
}

# 타입 체크
type_check() {
    log_info "TypeScript 타입 체크 중..."
    
    npm run check:types
    
    log_success "타입 체크 완료"
}

# 빌드
build_project() {
    log_info "프로젝트 빌드 중..."
    
    npm run build
    
    log_success "빌드 완료"
}

# 테스트 실행
run_tests() {
    log_info "테스트 실행 중..."
    
    if npm run test 2>/dev/null; then
        log_success "테스트 통과"
    else
        log_warning "테스트가 실패했거나 테스트가 없습니다. 배포를 계속합니다."
    fi
}

# Cloudflare Workers 배포
deploy_to_cloudflare() {
    log_info "Cloudflare Workers에 배포 중..."
    
    cd workers
    
    # wrangler.toml 파일 확인
    if [ ! -f "wrangler.toml" ]; then
        log_error "wrangler.toml 파일이 없습니다."
        exit 1
    fi
    
    # 배포 실행
    wrangler deploy
    
    cd ..
    
    log_success "Cloudflare Workers 배포 완료"
}

# 배포 후 테스트 실행
post_deploy_test() {
    log_info "배포 후 테스트 실행 중..."
    
    if [ -f "scripts/post-deploy-test.sh" ]; then
        chmod +x scripts/post-deploy-test.sh
        ./scripts/post-deploy-test.sh
    else
        log_warning "배포 후 테스트 스크립트가 없습니다."
    fi
}

# 메인 배포 프로세스
main() {
    log_info "=== LinkDump Bot 배포 시작 ==="
    
    # 1. 환경 확인
    check_environment
    
    # 2. 의존성 설치
    install_dependencies
    
    # 3. 타입 체크
    type_check
    
    # 4. 빌드
    build_project
    
    # 5. 테스트 실행
    run_tests
    
    # 6. 배포
    deploy_to_cloudflare
    
    # 7. 배포 후 테스트
    post_deploy_test
    
    log_success "=== 배포 완료! ==="
    log_info "배포된 URL을 확인하려면 'wrangler deployments list' 명령을 사용하세요."
}

# 스크립트 실행
main "$@" 