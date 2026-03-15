const readline = require('readline');
const { ensureConfig } = require('../lib/conf');
const { buildApi, listOpenPullRequests, formatApiError } = require('../lib/api');
const { getRepositoryContext } = require('../lib/git');
const { printBox, renderPullRequestTable } = require('../lib/ui');

async function watchCommand() {
  const config = await ensureConfig();
  const repo = await getRepositoryContext();
  const api = buildApi(config);
  let remaining = 30;
  let pullRequests = [];
  let lastError = null;

  await refresh();
  render();

  const countdown = setInterval(() => {
    remaining -= 1;

    if (remaining <= 0) {
      refresh().then(render).catch((error) => {
        lastError = formatApiError(error);
        remaining = 30;
        render();
      });
      return;
    }

    render();
  }, 1000);

  process.on('SIGINT', () => {
    clearInterval(countdown);
    process.exit(0);
  });

  async function refresh() {
    try {
      pullRequests = await listOpenPullRequests(api, repo.owner, repo.repo);
      lastError = null;
    } catch (error) {
      lastError = formatApiError(error);
    }

    remaining = 30;
  }

  function render() {
    readline.cursorTo(process.stdout, 0, 0);
    readline.clearScreenDown(process.stdout);
    printBox(`Live PR Watch — ${repo.owner}/${repo.repo}  🔄`, Math.min((process.stdout.columns || 120) - 2, 92));

    if (lastError) {
      console.log(`✖ ${lastError.message}`);
    } else if (!pullRequests.length) {
      console.log('No open pull requests found.');
    } else {
      console.log(renderPullRequestTable(pullRequests, {
        owner: repo.owner,
        repo: repo.repo
      }));
      console.log(`Total: ${pullRequests.length} open pull requests`);
    }

    const now = new Date().toLocaleTimeString('en-GB', { hour12: false });
    console.log('');
    console.log(`Last updated: ${now}  |  Refreshing in ${remaining}s  |  Press Ctrl+C to exit`);
  }
}

module.exports = watchCommand;
