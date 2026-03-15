const chalk = require('chalk');
const inquirer = require('inquirer');
const { ensureConfig } = require('../lib/conf');
const {
  buildApi,
  listOpenPullRequests,
  getPullRequest,
  mergePullRequest,
  formatApiError
} = require('../lib/api');
const { getRepositoryContext } = require('../lib/git');
const { truncate } = require('../lib/ui');

async function mergeCommand(prNumber) {
  const config = await ensureConfig();
  const repo = await getRepositoryContext();
  const api = buildApi(config);
  const number = await resolvePrNumber(api, repo, prNumber);

  let pullRequest;

  try {
    pullRequest = await getPullRequest(api, repo.owner, repo.repo, number);
  } catch (error) {
    throw formatApiError(error);
  }

  if (pullRequest.merged_at) {
    console.log(chalk.yellow(`⚠ PR #${number} is already merged`));
    return;
  }

  if (pullRequest.state === 'closed') {
    throw handledError(`PR #${number} is closed, cannot merge`);
  }

  if (pullRequest.mergeable === false) {
    throw handledError('PR has conflicts, resolve before merging');
  }

  console.log(`PR      : #${pullRequest.number} ${pullRequest.title}`);
  console.log(`Branch  : ${chalk.blue(pullRequest.head.ref)} → ${chalk.green(pullRequest.base.ref)}`);

  const answer = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: `Merge PR #${pullRequest.number} "${truncate(pullRequest.title, 28)}" into ${pullRequest.base.ref}?`,
      default: false
    }
  ]);

  if (!answer.confirm) {
    console.log(chalk.yellow('⚠ Merge cancelled'));
    return;
  }

  try {
    await mergePullRequest(api, repo.owner, repo.repo, number, { merge_method: 'merge' });
  } catch (error) {
    const formatted = formatApiError(error);

    if (/already merged/i.test(formatted.message)) {
      console.log(chalk.yellow(`⚠ PR #${number} is already merged`));
      return;
    }

    if (/closed/i.test(formatted.message)) {
      throw handledError(`PR #${number} is closed, cannot merge`);
    }

    if (/conflict|mergeable/i.test(formatted.message)) {
      throw handledError('PR has conflicts, resolve before merging');
    }

    throw formatted;
  }

  console.log(chalk.green(`✔ PR #${number} merged successfully into ${pullRequest.base.ref}`));
}

async function resolvePrNumber(api, repo, prNumber) {
  if (prNumber) {
    return Number(prNumber);
  }

  const pullRequests = await listOpenPullRequests(api, repo.owner, repo.repo);

  if (!pullRequests.length) {
    throw handledError('No open pull requests found.');
  }

  const answer = await inquirer.prompt([
    {
      type: 'list',
      name: 'number',
      message: 'Select a pull request to merge:',
      choices: pullRequests.map((pullRequest) => ({
        name: `#${pullRequest.number} ${truncate(pullRequest.title, 30)} (${pullRequest.head.ref} → ${pullRequest.base.ref})`,
        value: pullRequest.number
      }))
    }
  ]);

  return answer.number;
}

function handledError(message) {
  const error = new Error(message);
  error.handled = true;
  return error;
}

module.exports = mergeCommand;
