const chalk = require('chalk');
const { format } = require('timeago.js');
const { ensureConfig } = require('../lib/conf');
const {
  buildApi,
  getAuthenticatedUser,
  listPullRequests,
  formatApiError
} = require('../lib/api');
const { getRepositoryContext } = require('../lib/git');
const { printBox } = require('../lib/ui');

async function statsCommand() {
  const config = await ensureConfig();
  const repo = await getRepositoryContext();
  const api = buildApi(config);

  try {
    const [user, pullRequests] = await Promise.all([
      getAuthenticatedUser(api),
      listPullRequests(api, repo.owner, repo.repo, 'all')
    ]);

    const mine = pullRequests.filter((pullRequest) => pullRequest.user && pullRequest.user.login === user.login);
    const open = mine.filter((pullRequest) => pullRequest.state === 'open');
    const closed = mine.filter((pullRequest) => pullRequest.state !== 'open');
    const now = new Date();
    const thisMonth = mine.filter((pullRequest) => {
      const created = new Date(pullRequest.created_at);
      return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
    });
    const oldestOpen = open.slice().sort((a, b) => new Date(a.created_at) - new Date(b.created_at))[0];
    const mostRecent = mine.slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];

    printBox(`Your PR Stats — ${repo.owner}/${repo.repo}`, Math.min((process.stdout.columns || 120) - 2, 92));
    console.log(`  Total PRs opened    : ${mine.length}`);
    console.log(`  Currently open      : ${chalk.yellow(String(open.length))}`);
    console.log(`  Merged / Closed     : ${chalk.green(String(closed.length))}`);
    console.log(`  This month          : ${thisMonth.length}`);
    console.log(`  Oldest open PR      : ${oldestOpen ? chalk.red(`PR #${oldestOpen.number} — ${oldestOpen.title} (${format(oldestOpen.created_at)})`) : 'None'}`);
    console.log(`  Most recent PR      : ${mostRecent ? `PR #${mostRecent.number} — ${mostRecent.title} (${format(mostRecent.created_at)})` : 'None'}`);
  } catch (error) {
    throw formatApiError(error);
  }
}

module.exports = statsCommand;
