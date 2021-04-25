const got = require('got');

const WAKEUP_URL = 'https://apache-incubator-echarts-bot-1.glitch.me/probot';

(async function() {
  const { body } = await got(WAKEUP_URL);
  if (body.indexOf('Welcome to') === -1) {
    throw new Error('bot may not be working.');
  }
  console.log('bot is now working.');
})();
