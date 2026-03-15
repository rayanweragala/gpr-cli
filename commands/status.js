const chalk = require('chalk');
const { ensureConfig } = require('../lib/conf');
const {
  buildApi,
  findPullRequestByBranchWithState,
  formatApiError
} = require('../lib/api');
const { getRepositoryContext } = require('../lib/git');

async function statusCommand() {
  const config = await ensureConfig();
  const repo = await getRepositoryContext();
  const api = buildApi(config);

  console.log(chalk.white('┌─────────────────────────────────────────┐'));
  console.log(chalk.white('│  GPR Status                             │'));
  console.log(chalk.white('└─────────────────────────────────────────┘'));
  console.log(`Repo    : ${repo.owner}/${repo.repo}`);
  console.log(`Branch  : ${chalk.blue(repo.branch)}`);

  let pullRequest;
  let state = 'none';

  try {
    pullRequest = await findPullRequestByBranchWithState(api, repo.owner, repo.repo, repo.branch, 'open');

    if (pullRequest) {
      state = 'open';
    } else {
      pullRequest = await findPullRequestByBranchWithState(api, repo.owner, repo.repo, repo.branch, 'closed');
      state = pullRequest ? 'closed' : 'none';
    }
  } catch (error) {
    throw formatApiError(error);
  }

  if (state === 'none') {
    console.log(`PR      : ${chalk.yellow('─ None')}`);
    return;
  }

  if (state === 'closed') {
    console.log(`PR      : ${chalk.red(`✖ Closed — ${pullRequest.html_url}`)}`);
    return;
  }

  console.log(`PR      : ${chalk.green(`✔ Open — ${pullRequest.html_url}`)}`);
}

module.exports = statusCommand;
