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
  const termWidth = process.stdout.columns || 120;
  const boxWidth = Math.max(50, Math.min(termWidth - 2, 92));

  printBox('Open Pull Requests', boxWidth);
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
      chalk.bold.white('Created'),
      chalk.bold.white('URL')
    ],
    style: {
      head: [],
      border: []
    },
    wordWrap: false,
    colWidths: getColumnWidths(termWidth)
  });

  pullRequests.forEach((pullRequest) => {
    table.push([
      chalk.bold.cyan(String(pullRequest.number)),
      chalk.white(truncate(pullRequest.title, 28)),
      chalk.gray(truncate(pullRequest.user ? pullRequest.user.login : 'unknown', 16)),
      chalk.blue(truncate(pullRequest.head ? pullRequest.head.ref : '', 26)),
      chalk.green(truncate(pullRequest.base ? pullRequest.base.ref : '', 20)),
      colorCreatedAt(pullRequest.created_at),
      chalk.cyan(truncate(toPullPath(repo.owner, repo.repo, pullRequest.number), getUrlWidth(termWidth)))
    ]);
  });

  console.log(table.toString());
  console.log(`Total: ${pullRequests.length} open pull requests`);
}

function getColumnWidths(termWidth) {
  const preferred = [4, 28, 16, 26, 20, 13];
  const minimum = [4, 18, 10, 14, 10, 13];
  const paddingBudget = 17;
  const minUrlWidth = 12;
  const preferredUsed = preferred.reduce((sum, width) => sum + width, 0) + paddingBudget + minUrlWidth;

  if (termWidth >= preferredUsed) {
    return [...preferred, termWidth - (preferred.reduce((sum, width) => sum + width, 0) + paddingBudget)];
  }

  return [...minimum, Math.max(minUrlWidth, termWidth - (minimum.reduce((sum, width) => sum + width, 0) + paddingBudget))];
}

function getUrlWidth(termWidth) {
  return getColumnWidths(termWidth)[6];
}

function truncate(value, len) {
  const text = String(value || '');

  if (text.length <= len) {
    return text;
  }

  return `${text.slice(0, len - 1)}…`;
}

function colorCreatedAt(createdAt) {
  const ageInDays = Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));
  const text = format(createdAt);

  if (ageInDays < 7) {
    return chalk.green(text);
  }

  if (ageInDays < 30) {
    return chalk.yellow(text);
  }

  return chalk.red(text);
}

function toPullPath(owner, repo, number) {
  return `/${owner}/${repo}/pull/${number}`;
}

function printBox(title, width) {
  const innerWidth = Math.max(10, width - 2);
  const line = '─'.repeat(innerWidth);
  const label = padRight(`  ${title}`, innerWidth);

  console.log(chalk.white(`┌${line}┐`));
  console.log(chalk.white(`│${label}│`));
  console.log(chalk.white(`└${line}┘`));
}

function padRight(text, width) {
  return text.length >= width ? text.slice(0, width) : text.padEnd(width, ' ');
}

module.exports = listCommand;
