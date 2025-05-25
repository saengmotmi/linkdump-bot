#!/bin/bash

# 배포 후 테스트 스크립트 for LinkDump Bot
# Cloudflare Workers 배포 후 API 엔드포인트 테스트

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 로그 함수들
log_info() {
    echo -e "${BLUE}[TEST]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[FAIL]${NC} $1"
}

# 설정
WORKER_URL=""
TEST_TIMEOUT=30
FAILED_TESTS=0
TOTAL_TESTS=0

# Worker URL 가져오기
get_worker_url() {
    log_info "Worker URL 확인 중..."
    
    cd workers
    
    # wrangler.toml에서 worker 이름 추출
    WORKER_NAME=$(grep "name = " wrangler.toml | cut -d'"' -f2)
    
    if [ -z "$WORKER_NAME" ]; then
        log_error "wrangler.toml에서 worker 이름을 찾을 수 없습니다."
        exit 1
    fi
    
    # 계정 정보 가져오기
    ACCOUNT_ID=$(wrangler whoami | grep "Account ID" | awk '{print $3}' || echo "")
    
    if [ -z "$ACCOUNT_ID" ]; then
        # 기본 URL 패턴 사용
        WORKER_URL="https://${WORKER_NAME}.workers.dev"
    else
        WORKER_URL="https://${WORKER_NAME}.${ACCOUNT_ID}.workers.dev"
    fi
    
    cd ..
    
    log_info "Worker URL: $WORKER_URL"
}

# HTTP 요청 테스트 함수
test_http_request() {
    local method=$1
    local endpoint=$2
    local expected_status=$3
    local description=$4
    local data=$5
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    log_info "테스트: $description"
    
    local curl_cmd="curl -s -w '%{http_code}' --max-time $TEST_TIMEOUT"
    
    if [ "$method" = "POST" ]; then
        if [ -n "$data" ]; then
            curl_cmd="$curl_cmd -X POST -H 'Content-Type: application/json' -d '$data'"
        else
            curl_cmd="$curl_cmd -X POST"
        fi
    fi
    
    curl_cmd="$curl_cmd '$WORKER_URL$endpoint'"
    
    local response=$(eval $curl_cmd 2>/dev/null || echo "000")
    local status_code="${response: -3}"
    local body="${response%???}"
    
    if [ "$status_code" = "$expected_status" ]; then
        log_success "$description (Status: $status_code)"
        return 0
    else
        log_error "$description (Expected: $expected_status, Got: $status_code)"
        if [ -n "$body" ] && [ "$body" != "000" ]; then
            echo "Response body: $body"
        fi
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
    fi
}

# 기본 연결 테스트
test_basic_connectivity() {
    log_info "=== 기본 연결 테스트 ==="
    
    # 루트 경로 테스트 (일반적으로 404 또는 200)
    test_http_request "GET" "/" "404" "루트 경로 접근"
    
    # 존재하지 않는 경로 테스트
    test_http_request "GET" "/nonexistent" "404" "존재하지 않는 경로"
}

# API 엔드포인트 테스트
test_api_endpoints() {
    log_info "=== API 엔드포인트 테스트 ==="
    
    # 설정 조회 테스트
    test_http_request "GET" "/api/config" "200" "설정 조회 API"
    
    # 링크 목록 조회 테스트
    test_http_request "GET" "/api/links" "200" "링크 목록 조회 API"
    
    # 링크 추가 테스트 (유효한 URL)
    local test_url="https://example.com"
    local add_link_data="{\"url\":\"$test_url\",\"tags\":[\"test\"]}"
    test_http_request "POST" "/api/add-link" "200" "링크 추가 API (유효한 URL)" "$add_link_data"
    
    # 링크 추가 테스트 (잘못된 데이터)
    local invalid_data="{\"invalid\":\"data\"}"
    test_http_request "POST" "/api/add-link" "400" "링크 추가 API (잘못된 데이터)" "$invalid_data"
    
    # 링크 처리 API 테스트
    test_http_request "POST" "/api/process-links" "200" "링크 처리 API"
}

# 성능 테스트
test_performance() {
    log_info "=== 성능 테스트 ==="
    
    local start_time=$(date +%s%N)
    
    if test_http_request "GET" "/api/config" "200" "응답 시간 테스트"; then
        local end_time=$(date +%s%N)
        local duration=$(( (end_time - start_time) / 1000000 )) # 밀리초로 변환
        
        if [ $duration -lt 5000 ]; then
            log_success "응답 시간: ${duration}ms (양호)"
        elif [ $duration -lt 10000 ]; then
            log_warning "응답 시간: ${duration}ms (보통)"
        else
            log_warning "응답 시간: ${duration}ms (느림)"
        fi
    fi
}

# 보안 테스트
test_security() {
    log_info "=== 보안 테스트 ==="
    
    # CORS 헤더 확인
    local cors_response=$(curl -s -I --max-time $TEST_TIMEOUT "$WORKER_URL/api/config" 2>/dev/null || echo "")
    
    if echo "$cors_response" | grep -i "access-control-allow-origin" > /dev/null; then
        log_success "CORS 헤더 설정됨"
    else
        log_warning "CORS 헤더가 설정되지 않음"
    fi
    
    # SQL Injection 시도 (400 또는 404 응답 기대)
    local sql_injection_data="{\"url\":\"'; DROP TABLE links; --\",\"tags\":[\"test\"]}"
    test_http_request "POST" "/api/add-link" "400" "SQL Injection 방어 테스트" "$sql_injection_data"
}

# 메인 테스트 실행
main() {
    log_info "=== LinkDump Bot 배포 후 테스트 시작 ==="
    
    # Worker URL 가져오기
    get_worker_url
    
    # 기본 연결 테스트
    test_basic_connectivity
    
    # API 엔드포인트 테스트
    test_api_endpoints
    
    # 성능 테스트
    test_performance
    
    # 보안 테스트
    test_security
    
    # 결과 요약
    log_info "=== 테스트 결과 요약 ==="
    
    local passed_tests=$((TOTAL_TESTS - FAILED_TESTS))
    
    echo -e "${BLUE}총 테스트:${NC} $TOTAL_TESTS"
    echo -e "${GREEN}통과:${NC} $passed_tests"
    echo -e "${RED}실패:${NC} $FAILED_TESTS"
    
    if [ $FAILED_TESTS -eq 0 ]; then
        log_success "모든 테스트가 통과했습니다! 🎉"
        echo -e "${GREEN}배포가 성공적으로 완료되었습니다.${NC}"
        echo -e "${BLUE}Worker URL:${NC} $WORKER_URL"
        exit 0
    else
        log_error "일부 테스트가 실패했습니다."
        echo -e "${YELLOW}배포는 완료되었지만 일부 기능에 문제가 있을 수 있습니다.${NC}"
        echo -e "${BLUE}Worker URL:${NC} $WORKER_URL"
        exit 1
    fi
}

# 스크립트 실행
main "$@" 