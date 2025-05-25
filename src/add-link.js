const fs = require('fs');

function addLink(url, tags = []) {
  const data = JSON.parse(fs.readFileSync('links.json', 'utf8'));
  
  // Check if link already exists
  const exists = data.links.some(link => link.url === url);
  if (exists) {
    console.log('Link already exists:', url);
    return;
  }
  
  const newLink = {
    id: Date.now().toString(),
    url: url,
    tags: tags,
    addedAt: new Date().toISOString(),
    processed: false
  };
  
  data.links.push(newLink);
  fs.writeFileSync('links.json', JSON.stringify(data, null, 2));
  
  console.log('Added new link:', url);
}

function addDiscordWebhook(webhookUrl, name = '') {
  const data = JSON.parse(fs.readFileSync('links.json', 'utf8'));
  
  // Check if webhook already exists
  const exists = data.subscriptions.discord_webhooks.includes(webhookUrl);
  if (exists) {
    console.log('Webhook already exists');
    return;
  }
  
  data.subscriptions.discord_webhooks.push(webhookUrl);
  fs.writeFileSync('links.json', JSON.stringify(data, null, 2));
  
  console.log('Added Discord webhook:', name || webhookUrl);
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];
  
  if (command === 'add-link') {
    const url = args[1];
    const tags = args.slice(2);
    if (!url) {
      console.log('Usage: node src/add-link.js add-link <url> [tags...]');
      process.exit(1);
    }
    addLink(url, tags);
  } else if (command === 'add-webhook') {
    const webhook = args[1];
    const name = args[2];
    if (!webhook) {
      console.log('Usage: node src/add-link.js add-webhook <webhook-url> [name]');
      process.exit(1);
    }
    addDiscordWebhook(webhook, name);
  } else {
    console.log('Available commands:');
    console.log('  add-link <url> [tags...]');
    console.log('  add-webhook <webhook-url> [name]');
  }
}

module.exports = { addLink, addDiscordWebhook };