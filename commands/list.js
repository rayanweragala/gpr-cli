const chalk = require('chalk');
const Table = require('cli-table3');
const { format } = require('timeago.js');
const { ensureConfig } = require('../lib/conf');
const { buildApi, listOpenPullRequests, formatApiError } = require('../lib/api');
const { getRepositoryContext } = require('../lib/git');

async function listCommand() {
  const config = await ensureConfig();
  const repo = await getRepositoryContext();
  const api = buildApi(config);

  console.log(chalk.white('┌──────────────────────────────────────────────────────────────────────────┐'));
  console.log(chalk.white('│  Open Pull Requests                                                     │'));
  console.log(chalk.white('└──────────────────────────────────────────────────────────────────────────┘'));
  console.log(`Repo    : ${repo.owner}/${repo.repo}`);

  let pullRequests;

  try {
    pullRequests = await listOpenPullRequests(api, repo.owner, repo.repo);
  } catch (error) {
    throw formatApiError(error);
  }

  if (!pullRequests.length) {
    console.log('No open pull requests found.');
    return;
  }

  const table = new Table({
    head: [
      chalk.bold.white('#'),
      chalk.bold.white('Title'),
      chalk.bold.white('Author'),
      chalk.bold.white('Branch'),
      chalk.bold.white('Base'),
      chalk.bold.white('Created')
    ],
    style: {
      head: [],
      border: []
    },
    wordWrap: true,
    colWidths: [4, 28, 18, 20, 10, 14]
  });

  pullRequests.forEach((pullRequest) => {
    table.push([
      pullRequest.number,
      pullRequest.title,
      pullRequest.user ? pullRequest.user.login : 'unknown',
      chalk.blue(pullRequest.head ? pullRequest.head.ref : ''),
      chalk.blue(pullRequest.base ? pullRequest.base.ref : ''),
      format(pullRequest.created_at)
    ]);
  });

  console.log(table.toString());
}

module.exports = listCommand;
