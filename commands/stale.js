const chalk = require('chalk');
const { ensureConfig } = require('../lib/conf');
const { buildApi, listOpenPullRequests, formatApiError } = require('../lib/api');
const { getRepositoryContext } = require('../lib/git');
const { printBox, renderPullRequestTable } = require('../lib/ui');

async function staleCommand(options) {
  const days = Number((options && options.days) || 7);
  const config = await ensureConfig();
  const repo = await getRepositoryContext();
  const api = buildApi(config);

  let pullRequests;

  try {
    pullRequests = await listOpenPullRequests(api, repo.owner, repo.repo);
  } catch (error) {
    throw formatApiError(error);
  }

  const threshold = Date.now() - (days * 24 * 60 * 60 * 1000);
  const stale = pullRequests.filter((pullRequest) => new Date(pullRequest.updated_at).getTime() < threshold);

  printBox(`Stale Pull Requests — ${repo.owner}/${repo.repo}`, Math.min((process.stdout.columns || 120) - 2, 92));

  if (!stale.length) {
    console.log(chalk.green('✔ No stale PRs! All pull requests have recent activity.'));
    return;
  }

  console.log(renderPullRequestTable(stale, {
    owner: repo.owner,
    repo: repo.repo,
    showAuthor: false,
    showUrl: false,
    showIdle: true
  }));
  console.log(`${stale.length} stale pull requests (no activity for ${days}+ days)`);
}

module.exports = staleCommand;
