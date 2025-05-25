import { describe, it, expect, vi } from 'vitest'
import { 
  validateUrl,
  createLinkData,
  isDuplicateLink,
  extractOGTags,
  getUnprocessedLinks
} from '../src/business-logic.js'

describe('성능 테스트', () => {
  it('대량의 URL 유효성 검사를 빠르게 처리한다', () => {
    const urls = Array.from({ length: 1000 }, (_, i) => `https://example${i}.com`)
    
    const start = performance.now()
    const results = urls.map(url => validateUrl(url))
    const end = performance.now()
    
    expect(results.every(result => result.valid)).toBe(true)
    expect(end - start).toBeLessThan(100) // 100ms 이내
  })

  it('대량의 중복 검사를 효율적으로 처리한다', () => {
    // 1000개의 기존 링크
    const existingLinks = Array.from({ length: 1000 }, (_, i) => ({
      url: `https://existing${i}.com`
    }))
    
    // 500개의 새 URL (일부는 중복)
    const newUrls = [
      ...Array.from({ length: 250 }, (_, i) => `https://existing${i}.com`), // 중복
      ...Array.from({ length: 250 }, (_, i) => `https://new${i}.com`) // 새 링크
    ]
    
    const start = performance.now()
    const duplicateResults = newUrls.map(url => isDuplicateLink(url, existingLinks))
    const end = performance.now()
    
    const duplicateCount = duplicateResults.filter(Boolean).length
    expect(duplicateCount).toBe(250) // 정확히 250개가 중복
    expect(end - start).toBeLessThan(200) // 200ms 이내
  })

  it('대용량 HTML에서 OG 태그 추출이 빠르다', () => {
    // 큰 HTML 문서 시뮬레이션
    const largeHtml = `
      <html>
        <head>
          <title>테스트 페이지</title>
          <meta property="og:title" content="OG 제목">
          <meta property="og:description" content="OG 설명">
          ${'<meta name="dummy" content="더미 데이터">'.repeat(1000)}
        </head>
        <body>
          ${'<div>더미 컨텐츠</div>'.repeat(5000)}
        </body>
      </html>
    `
    
    const start = performance.now()
    const ogData = extractOGTags(largeHtml)
    const end = performance.now()
    
    expect(ogData.title).toBe('OG 제목')
    expect(ogData.description).toBe('OG 설명')
    expect(end - start).toBeLessThan(50) // 50ms 이내
  })

  it('대량의 링크에서 미처리 링크 필터링이 빠르다', () => {
    // 10,000개의 링크 (50% 처리됨)
    const linksData = {
      links: Array.from({ length: 10000 }, (_, i) => ({
        id: i.toString(),
        url: `https://example${i}.com`,
        processed: i % 2 === 0 // 짝수 인덱스는 처리됨
      }))
    }
    
    const start = performance.now()
    const unprocessedLinks = getUnprocessedLinks(linksData)
    const end = performance.now()
    
    expect(unprocessedLinks).toHaveLength(5000) // 정확히 5000개가 미처리
    expect(end - start).toBeLessThan(100) // 100ms 이내
  })

  it('메모리 효율적으로 링크 데이터를 생성한다', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1640995200000)
    vi.spyOn(Date.prototype, 'toISOString').mockReturnValue('2022-01-01T00:00:00.000Z')
    
    const initialMemory = process.memoryUsage().heapUsed
    
    // 1000개의 링크 데이터 생성
    const linkDataArray = Array.from({ length: 1000 }, (_, i) => 
      createLinkData(`https://example${i}.com`, [`tag${i}`])
    )
    
    const finalMemory = process.memoryUsage().heapUsed
    const memoryIncrease = finalMemory - initialMemory
    
    expect(linkDataArray).toHaveLength(1000)
    expect(memoryIncrease).toBeLessThan(5 * 1024 * 1024) // 5MB 이내
  })
})

describe('스트레스 테스트', () => {
  it('극한의 중복 검사 시나리오를 처리한다', () => {
    // 극단적인 케이스: 10,000개 중에서 1개 찾기
    const existingLinks = Array.from({ length: 10000 }, (_, i) => ({
      url: `https://example${i}.com`
    }))
    
    // 맨 마지막 URL을 찾는 최악의 경우
    const targetUrl = 'https://example9999.com'
    
    const start = performance.now()
    const isDuplicate = isDuplicateLink(targetUrl, existingLinks)
    const end = performance.now()
    
    expect(isDuplicate).toBe(true)
    expect(end - start).toBeLessThan(50) // 50ms 이내 (선형 검색도 충분히 빨라야 함)
  })

  it('복잡한 HTML 구조에서도 안정적으로 작동한다', () => {
    // 중첩된 태그와 특수 문자가 있는 복잡한 HTML
    const complexHtml = `
      <html>
        <head>
          <title>복잡한 "제목" & 특수문자</title>
          <meta property="og:title" content='OG "제목" with &quot;quotes&quot;'>
          <meta property="og:description" content="설명에는 <태그>와 &amp; 특수문자가 있습니다">
          <meta property="og:image" content="https://example.com/image.jpg?v=1&size=large">
          <meta name="description" content="일반 description">
          <meta property="og:site_name" content="사이트 & 이름">
        </head>
        <body>
          <meta property="og:title" content="body 안의 잘못된 위치">
        </body>
      </html>
    `
    
    const ogData = extractOGTags(complexHtml)
    
    expect(ogData.title).toBe('OG "제목" with &quot;quotes&quot;')
    expect(ogData.description).toBe('설명에는 <태그>와 &amp; 특수문자가 있습니다')
    expect(ogData.image).toBe('https://example.com/image.jpg?v=1&size=large')
    expect(ogData.site_name).toBe('사이트 & 이름')
  })
})