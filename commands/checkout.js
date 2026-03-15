const chalk = require('chalk');
const inquirer = require('inquirer');
const { ensureConfig } = require('../lib/conf');
const { buildApi, listOpenPullRequests, formatApiError } = require('../lib/api');
const { getRepositoryContext, fetchOrigin, branchExistsLocally, checkoutBranch } = require('../lib/git');
const { truncate } = require('../lib/ui');

async function checkoutCommand() {
  const config = await ensureConfig();
  const repo = await getRepositoryContext();
  const api = buildApi(config);

  let pullRequests;

  try {
    pullRequests = await listOpenPullRequests(api, repo.owner, repo.repo);
  } catch (error) {
    throw formatApiError(error);
  }

  if (!pullRequests.length) {
    throw handledError('No open pull requests found.');
  }

  const answer = await inquirer.prompt([
    {
      type: 'list',
      name: 'branch',
      message: 'Select a pull request branch to checkout:',
      choices: pullRequests.map((pullRequest) => ({
        name: `#${pullRequest.number} ${truncate(pullRequest.title, 24)} (${pullRequest.head.ref} → ${pullRequest.base.ref})`,
        value: pullRequest.head.ref
      }))
    }
  ]);

  try {
    await fetchOrigin();
    const existsLocally = await branchExistsLocally(answer.branch);
    await checkoutBranch(answer.branch, existsLocally);
  } catch (error) {
    throw error.handled ? error : handledError(error.message || 'Failed to checkout branch');
  }

  console.log(chalk.green(`✔ Switched to branch: ${answer.branch}`));
  console.log(chalk.cyan('Tip: Run "gpr status" to see PR details'));
}

function handledError(message) {
  const error = new Error(message);
  error.handled = true;
  return error;
}

module.exports = checkoutCommand;
