const fetch = require('node-fetch');

const WAKEUP_URL = 'https://apache-incubator-echarts-bot-1.glitch.me/probot';

(async function() {
    let isWorking = true;
    let err;
    try {
        const body = await fetch(WAKEUP_URL, {
            headers: {
                'Accept': 'text/html',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36'
            }
        }).then(res => res.text());
        if (body.indexOf('Welcome to') === -1) {
            isWorking = false;
            console.log('Response body:\n', body);
        }
    } catch (e) {
        err = e;
        isWorking = false;
    } finally {
        if (isWorking) {
            return console.log('✨ bot is now working~');
        }
        const errLog = '💤 bot may not be working...';
        console.error(errLog);
        if (await isNotificationNeeded()) {
            throw err || new Error(errLog);
        }
    }
})();

let lastNoticedWorkflowRunId;

async function isNotificationNeeded() {
    const failedActionRuns = await fetch('https://api.github.com/repos/apache/echarts-bot/actions/workflows/8490751/runs?status=failure&per_page=1')
        .then(res => res.json());
    const latestFailedRun = failedActionRuns.workflow_runs[0];
    if (!latestFailedRun) {
        return true;
    }
    if (latestFailedRun.id === lastNoticedWorkflowRunId) {
        console.log('skip notification for the same workflow run:', lastNoticedWorkflowRunId);
        return false;
    }
    const lastFailedTs = Date.parse(latestFailedRun.run_started_at);
    // send notification when the failure last for one hour and more
    if (Date.now() - lastFailedTs >= 60 * 60 * 1e3) {
        lastNoticedWorkflowRunId = latestFailedRun.id;
        return true;
    }
    return false;
}
