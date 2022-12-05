const fetch = require('node-fetch');

const WAKEUP_URL = 'https://apache-incubator-echarts-bot-1.glitch.me/probot';

(async function() {
  const body = await fetch(WAKEUP_URL, {
    headers: {
      'Accept': 'text/html',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36'
    }
  }).then(res => res.text());
  if (body.indexOf('Welcome to') === -1) {
    console.log('Response body:\n', body);
    throw new Error('bot may not be working.');
  }
  console.log('･ﾟ✧ bot is now working.');
})();
