const chalk = require('chalk');
const { ensureConfig } = require('../lib/conf');
const { buildApi, findPullRequestByBranch, formatApiError } = require('../lib/api');
const { getRepositoryContext } = require('../lib/git');

async function statusCommand() {
  const config = await ensureConfig();
  const repo = await getRepositoryContext();
  const api = buildApi(config);

  let pullRequest;

  try {
    pullRequest = await findPullRequestByBranch(api, repo.owner, repo.repo, repo.branch);
  } catch (error) {
    throw formatApiError(error);
  }

  console.log(`Repo    : ${repo.owner}/${repo.repo}`);
  console.log(`Branch  : ${chalk.blue(repo.branch)}`);

  if (!pullRequest) {
    console.log('Status  : No PR found for this branch');
    return;
  }

  console.log(`Status  : ${chalk.green('Open')}`);
  console.log(`PR      : #${pullRequest.number} ${pullRequest.title}`);
  console.log(`URL     : ${chalk.cyan.underline(pullRequest.html_url)}`);
}

module.exports = statusCommand;
