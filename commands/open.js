const chalk = require('chalk');
const inquirer = require('inquirer');
const ora = require('ora');
const { ensureConfig } = require('../lib/conf');
const {
  buildApi,
  findPullRequestByBranch,
  createPullRequest,
  listBranches,
  formatApiError
} = require('../lib/api');
const {
  getRepositoryContext
} = require('../lib/git');

async function openCommand() {
  const config = await ensureConfig();
  const repo = await getRepositoryContext();
  const api = buildApi(config);
  const branches = await safeApiCall(() => listBranches(api, repo.owner, repo.repo));

  if (!branches.length) {
    throw handledError('No branches found in this repository.');
  }

  const branchNames = branches.map((branch) => branch.name);

  if (!branchNames.includes(repo.branch)) {
    throw handledError(`Push your branch first: git push origin ${repo.branch}`);
  }

  const existingPullRequest = await safeApiCall(() =>
    findPullRequestByBranch(api, repo.owner, repo.repo, repo.branch)
  );

  if (existingPullRequest) {
    console.log(chalk.yellow('⚠ A PR already exists for this branch:'));
    console.log(`→  ${chalk.cyan.underline(existingPullRequest.html_url)}`);
    return;
  }
  const defaultBaseBranch = branchNames.includes('main')
    ? 'main'
    : branchNames.includes('master')
      ? 'master'
      : branchNames[0];

  if (!branchNames.includes('main')) {
    console.log(chalk.yellow(`⚠ Base branch "main" not found. Available branches: ${branchNames.join(', ')}`));
  }

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'title',
      message: 'PR Title:',
      default: toTitle(repo.branch),
      validate: (value) => value.trim() ? true : 'Title is required.'
    },
    {
      type: 'editor',
      name: 'body',
      message: 'PR Description (optional):',
      default: ''
    },
    {
      type: 'list',
      name: 'base',
      message: 'Base branch:',
      default: defaultBaseBranch,
      choices: branchNames
    }
  ]);

  const spinner = ora('Creating pull request...').start();

  try {
    const pullRequest = await createPullRequest(api, repo.owner, repo.repo, {
      title: answers.title.trim(),
      body: (answers.body || '').trim(),
      head: repo.branch,
      base: answers.base
    });

    spinner.stop();
    printSuccess(repo.branch, answers.base, pullRequest);
  } catch (error) {
    spinner.stop();
    throw formatApiError(error);
  }
}

async function safeApiCall(work) {
  try {
    return await work();
  } catch (error) {
    throw formatApiError(error);
  }
}

function printSuccess(branch, base, pullRequest) {
  const green = chalk.green;

  console.log(green('╔══════════════════════════════════════════════╗'));
  console.log(green('║       ✔  Pull Request Created!               ║'));
  console.log(green('╚══════════════════════════════════════════════╝'));
  console.log(`  Title  : ${pullRequest.title}`);
  console.log(`  From   : ${chalk.blue(branch)} → ${chalk.blue(base)}`);
  console.log(`  URL    : ${chalk.cyan.underline(pullRequest.html_url)}`);
}

function toTitle(branchName) {
  return branchName
    .replace(/[/-]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function handledError(message) {
  const error = new Error(message);
  error.handled = true;
  return error;
}

module.exports = openCommand;
