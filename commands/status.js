const chalk = require('chalk');
const { ensureConfig } = require('../lib/conf');
const { buildApi, findPullRequestByBranch, formatApiError } = require('../lib/api');
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

  try {
    pullRequest = await findPullRequestByBranch(api, repo.owner, repo.repo, repo.branch);
  } catch (error) {
    throw formatApiError(error);
  }

  if (!pullRequest) {
    console.log(`PR      : ${chalk.yellow('✖ No PR found for this branch')}`);
    return;
  }

  console.log(`PR      : ${chalk.green(`✔ Open — ${pullRequest.html_url}`)}`);
}

module.exports = statusCommand;
