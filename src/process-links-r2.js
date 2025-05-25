// R2용 링크 처리 로직 (파일 시스템 대신 메모리에서 작업)
const axios = require('axios');
const cheerio = require('cheerio');
const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

async function scrapeOGTags(url) {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });
    
    const $ = cheerio.load(response.data);
    
    return {
      title: $('meta[property="og:title"]').attr('content') || $('title').text() || '',
      description: $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content') || '',
      image: $('meta[property="og:image"]').attr('content') || '',
      site_name: $('meta[property="og:site_name"]').attr('content') || ''
    };
  } catch (error) {
    console.error(`Failed to scrape ${url}:`, error.message);
    return null;
  }
}

async function generateSummary(ogData, url) {
  try {
    const prompt = `다음 웹페이지 정보를 바탕으로 "왜 이 링크를 클릭해야 하는지"에 대한 매력적인 3줄 요약을 한국어로 작성해주세요:

제목: ${ogData.title}
설명: ${ogData.description}
사이트: ${ogData.site_name}
URL: ${url}

요약은 클릭 동기를 부여하는 방향으로 작성해주세요.`;

    const message = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 200,
      messages: [{ role: "user", content: prompt }]
    });

    return message.content[0].text.trim();
  } catch (error) {
    console.error('Failed to generate summary:', error.message);
    return `${ogData.title}\n${ogData.description}`;
  }
}

async function sendToDiscord(webhookUrl, linkData) {
  try {
    const embed = {
      title: linkData.ogData.title || 'New Link',
      description: linkData.summary,
      url: linkData.url,
      color: 0x0099ff,
      timestamp: new Date().toISOString()
    };

    if (linkData.ogData.image) {
      embed.thumbnail = { url: linkData.ogData.image };
    }

    await axios.post(webhookUrl, {
      embeds: [embed]
    });
    
    console.log(`Sent to Discord: ${linkData.url}`);
  } catch (error) {
    console.error(`Failed to send to Discord:`, error.message);
  }
}

async function processNewLinks(linksData) {
  // Get Discord webhooks from environment variable
  const webhooks = process.env.DISCORD_WEBHOOKS ? 
    process.env.DISCORD_WEBHOOKS.split(',').map(w => w.trim()) : [];
  
  if (webhooks.length === 0) {
    console.warn('No Discord webhooks configured in DISCORD_WEBHOOKS environment variable');
  }
  
  const unprocessedLinks = linksData.links.filter(link => !link.processed);
  
  for (const link of unprocessedLinks) {
    console.log(`Processing: ${link.url}`);
    
    const ogData = await scrapeOGTags(link.url);
    if (!ogData) continue;
    
    const summary = await generateSummary(ogData, link.url);
    
    link.ogData = ogData;
    link.summary = summary;
    link.processed = true;
    link.processedAt = new Date().toISOString();
    
    // Send to all configured Discord webhooks
    for (const webhook of webhooks) {
      await sendToDiscord(webhook, link);
    }
    
    // Add delay to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log(`Processed ${unprocessedLinks.length} links`);
  return linksData;
}

module.exports = { processNewLinks };