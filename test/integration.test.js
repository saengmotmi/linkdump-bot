import { describe, it, expect, vi } from 'vitest'
import { 
  createLinkData, 
  isDuplicateLink, 
  extractOGTags,
  createDiscordEmbed,
  getUnprocessedLinks,
  markLinkAsProcessed 
} from '../src/business-logic.js'

describe('통합 테스트: 링크 처리 플로우', () => {
  it('새 링크 추가부터 Discord 전송까지 전체 플로우가 작동한다', () => {
    // 1. 새 링크 생성
    const newUrl = 'https://tech.kakao.com/2023/12/01/new-feature'
    const tags = ['tech', 'kakao']
    
    vi.spyOn(Date, 'now').mockReturnValue(1640995200000)
    vi.spyOn(Date.prototype, 'toISOString').mockReturnValue('2022-01-01T00:00:00.000Z')
    
    const linkData = createLinkData(newUrl, tags)
    
    expect(linkData).toEqual({
      id: '1640995200000',
      url: newUrl,
      tags,
      addedAt: '2022-01-01T00:00:00.000Z',
      processed: false
    })

    // 2. 기존 링크와 중복 체크
    const existingLinks = [
      { url: 'https://example.com' },
      { url: 'https://google.com' }
    ]
    
    expect(isDuplicateLink(newUrl, existingLinks)).toBe(false)

    // 3. HTML에서 OG 태그 추출
    const mockHtml = `
      <html>
        <head>
          <title>카카오 신기능 소개</title>
          <meta property="og:title" content="혁신적인 새 기능 출시">
          <meta property="og:description" content="사용자 경험을 향상시키는 놀라운 신기능">
          <meta property="og:image" content="https://tech.kakao.com/image.jpg">
          <meta property="og:site_name" content="카카오 기술 블로그">
        </head>
      </html>
    `
    
    const ogData = extractOGTags(mockHtml)
    expect(ogData).toEqual({
      title: '혁신적인 새 기능 출시',
      description: '사용자 경험을 향상시키는 놀라운 신기능',
      image: 'https://tech.kakao.com/image.jpg',
      site_name: '카카오 기술 블로그'
    })

    // 4. AI 요약 생성 (모킹)
    const mockAISummary = `🚀 카카오에서 혁신적인 신기능을 출시했습니다!
📱 사용자 경험을 크게 향상시키는 놀라운 업데이트
💡 개발자들의 노하우와 기술적 인사이트를 확인해보세요`

    // 5. 링크를 처리 완료로 표시
    const processedLink = markLinkAsProcessed(linkData, ogData, mockAISummary)
    
    expect(processedLink.processed).toBe(true)
    expect(processedLink.ogData).toEqual(ogData)
    expect(processedLink.summary).toBe(mockAISummary)
    expect(processedLink.processedAt).toBe('2022-01-01T00:00:00.000Z')

    // 6. Discord 임베드 생성
    const discordEmbed = createDiscordEmbed(processedLink)
    
    expect(discordEmbed).toEqual({
      embeds: [{
        title: '혁신적인 새 기능 출시',
        description: mockAISummary,
        url: newUrl,
        color: 0x0099ff,
        timestamp: expect.any(String),
        thumbnail: { url: 'https://tech.kakao.com/image.jpg' }
      }]
    })
  })

  it('미처리 링크들을 올바르게 필터링하고 처리한다', () => {
    const linksData = {
      links: [
        { 
          id: '1', 
          url: 'https://processed.com', 
          processed: true,
          summary: '이미 처리됨'
        },
        { 
          id: '2', 
          url: 'https://unprocessed1.com', 
          processed: false 
        },
        { 
          id: '3', 
          url: 'https://unprocessed2.com', 
          processed: false 
        }
      ]
    }

    // 미처리 링크 필터링
    const unprocessedLinks = getUnprocessedLinks(linksData)
    expect(unprocessedLinks).toHaveLength(2)
    expect(unprocessedLinks.map(link => link.id)).toEqual(['2', '3'])

    // 각 미처리 링크를 처리
    vi.spyOn(Date.prototype, 'toISOString').mockReturnValue('2022-01-01T01:00:00.000Z')
    
    const processedLinks = unprocessedLinks.map(link => {
      const ogData = { title: `제목-${link.id}`, description: `설명-${link.id}` }
      const summary = `요약-${link.id}`
      return markLinkAsProcessed(link, ogData, summary)
    })

    expect(processedLinks).toHaveLength(2)
    expect(processedLinks.every(link => link.processed)).toBe(true)
    expect(processedLinks[0].summary).toBe('요약-2')
    expect(processedLinks[1].summary).toBe('요약-3')
  })
})

describe('에러 처리 시나리오', () => {
  it('잘못된 HTML에서도 안전하게 처리한다', () => {
    const invalidHtml = '<html><head></head><body>잘못된 HTML</body>'
    const ogData = extractOGTags(invalidHtml)
    
    expect(ogData).toEqual({
      title: '',
      description: '',
      image: '',
      site_name: ''
    })
  })

  it('필수 데이터가 없어도 Discord 임베드를 생성한다', () => {
    const incompleteLink = {
      url: 'https://example.com',
      summary: '요약만 있음'
      // ogData 없음
    }
    
    const embed = createDiscordEmbed(incompleteLink)
    expect(embed.embeds[0].title).toBe('New Link')
    expect(embed.embeds[0].description).toBe('요약만 있음')
  })

  it('잘못된 링크 데이터 구조를 안전하게 처리한다', () => {
    const invalidLinksData = { links: null }
    const result = getUnprocessedLinks(invalidLinksData)
    expect(result).toEqual([])
  })
})