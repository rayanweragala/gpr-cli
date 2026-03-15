const chalk = require('chalk');
const Table = require('cli-table3');
const { format } = require('timeago.js');

function getTermWidth() {
  return process.stdout.columns || 120;
}

function truncate(value, len) {
  const text = String(value || '');

  if (text.length <= len) {
    return text;
  }

  return `${text.slice(0, len - 1)}…`;
}

function printBox(title, width) {
  const safeWidth = Math.max(24, width || Math.min(getTermWidth() - 2, 92));
  const innerWidth = safeWidth - 2;
  const line = '─'.repeat(innerWidth);
  const label = padRight(`  ${title}`, innerWidth);

  console.log(chalk.white(`┌${line}┐`));
  console.log(chalk.white(`│${label}│`));
  console.log(chalk.white(`└${line}┘`));
}

function renderPullRequestTable(pullRequests, options) {
  const settings = options || {};
  const termWidth = getTermWidth();
  const showAuthor = settings.showAuthor !== false;
  const showUrl = settings.showUrl !== false;
  const showIdle = Boolean(settings.showIdle);
  const owner = settings.owner || '';
  const repo = settings.repo || '';
  const widths = getListColumnWidths(termWidth, { showAuthor, showUrl, showIdle });
  const head = [chalk.bold.white('#'), chalk.bold.white('Title')];

  if (showAuthor) {
    head.push(chalk.bold.white('Author'));
  }

  head.push(chalk.bold.white('Branch'));
  head.push(chalk.bold.white('Base'));
  head.push(chalk.bold.white(showIdle ? 'Idle' : 'Created'));

  if (showUrl) {
    head.push(chalk.bold.white('URL'));
  }

  const table = new Table({
    head,
    style: {
      head: [],
      border: []
    },
    wordWrap: false,
    colWidths: widths
  });

  pullRequests.forEach((pullRequest) => {
    const row = [
      chalk.bold.cyan(String(pullRequest.number)),
      chalk.white(truncate(pullRequest.title, 28))
    ];

    if (showAuthor) {
      row.push(chalk.gray(truncate(pullRequest.user ? pullRequest.user.login : 'unknown', 16)));
    }

    row.push(chalk.blue(truncate(pullRequest.head ? pullRequest.head.ref : '', 26)));
    row.push(chalk.green(truncate(pullRequest.base ? pullRequest.base.ref : '', 20)));
    row.push(showIdle ? chalk.red(format(pullRequest.updated_at)) : colorCreatedAt(pullRequest.created_at));

    if (showUrl) {
      row.push(chalk.cyan(truncate(toPullPath(owner, repo, pullRequest.number), widths[widths.length - 1])));
    }

    table.push(row);
  });

  return table.toString();
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

function getListColumnWidths(termWidth, options) {
  const settings = options || {};
  const showAuthor = settings.showAuthor !== false;
  const showUrl = settings.showUrl !== false;
  const showIdle = Boolean(settings.showIdle);
  const widths = [4, 28];
  const minimums = [4, 18];

  if (showAuthor) {
    widths.push(16);
    minimums.push(10);
  }

  widths.push(26, 20, showIdle ? 12 : 13);
  minimums.push(14, 10, showIdle ? 12 : 13);

  if (showUrl) {
    widths.push(24);
    minimums.push(14);
  }

  const paddingBudget = widths.length * 3 + 1;
  const preferredTotal = widths.reduce((sum, width) => sum + width, 0) + paddingBudget;

  if (termWidth >= preferredTotal) {
    if (showUrl) {
      const fixedTotal = widths.slice(0, -1).reduce((sum, width) => sum + width, 0) + paddingBudget;
      widths[widths.length - 1] = Math.max(widths[widths.length - 1], termWidth - fixedTotal);
    }

    return widths;
  }

  const fixedTotal = minimums.reduce((sum, width) => sum + width, 0) + paddingBudget;

  if (termWidth >= fixedTotal) {
    return minimums;
  }

  return minimums.map((width, index) => {
    if (index === minimums.length - 1 && showUrl) {
      return Math.max(10, termWidth - (minimums.slice(0, -1).reduce((sum, value) => sum + value, 0) + paddingBudget));
    }

    return width;
  });
}

function padRight(text, width) {
  return text.length >= width ? text.slice(0, width) : text.padEnd(width, ' ');
}

module.exports = {
  getTermWidth,
  truncate,
  printBox,
  renderPullRequestTable,
  colorCreatedAt,
  toPullPath
};
