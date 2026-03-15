const chalk = require('chalk');
const inquirer = require('inquirer');
const { format } = require('timeago.js');
const { ensureConfig } = require('../lib/conf');
const {
  buildApi,
  listOpenPullRequests,
  getPullRequest,
  getPullRequestReviews,
  getPullRequestComments,
  formatApiError
} = require('../lib/api');
const { getRepositoryContext } = require('../lib/git');
const { printBox, truncate } = require('../lib/ui');

async function reviewCommand(prNumber) {
  const config = await ensureConfig();
  const repo = await getRepositoryContext();
  const api = buildApi(config);
  const number = await resolvePrNumber(api, repo, prNumber);

  try {
    const pullRequest = await getPullRequest(api, repo.owner, repo.repo, number);
    const [reviews, comments] = await Promise.all([
      safeLoad(() => getPullRequestReviews(api, repo.owner, repo.repo, number)),
      safeLoad(() => getPullRequestComments(api, repo.owner, repo.repo, number))
    ]);

    printBox(`PR #${pullRequest.number} — ${truncate(pullRequest.title, 42)}`, Math.min((process.stdout.columns || 120) - 2, 92));
    console.log(`  Author   : ${pullRequest.user ? pullRequest.user.login : 'unknown'}`);
    console.log(`  Branch   : ${chalk.blue(pullRequest.head.ref)} → ${chalk.green(pullRequest.base.ref)}`);
    console.log(`  Status   : ${formatState(pullRequest)}`);
    console.log(`  Created  : ${format(pullRequest.created_at)}`);
    console.log(`  Updated  : ${format(pullRequest.updated_at)}`);
    console.log('');
    console.log('  Description:');
    console.log(`  ${chalk.gray('─'.repeat(53))}`);
    console.log(`  ${pullRequest.body && pullRequest.body.trim() ? pullRequest.body.trim().split('\n').join('\n  ') : '(No description)'}`);
    console.log(`  ${chalk.gray('─'.repeat(53))}`);
    console.log('');
    console.log(`  Files Changed  : ${pullRequest.changed_files || 0}`);
    console.log(`  Additions      : ${chalk.green(`+${pullRequest.additions || 0}`)}`);
    console.log(`  Deletions      : ${chalk.red(`-${pullRequest.deletions || 0}`)}`);
    console.log(`  Comments       : ${comments.length}`);
    console.log(`  Reviewers      : ${formatReviewers(pullRequest, reviews)}`);
  } catch (error) {
    throw formatApiError(error);
  }
}

async function safeLoad(work) {
  try {
    return await work();
  } catch (error) {
    if (error.response && error.response.status === 404) {
      return [];
    }

    throw error;
  }
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
      message: 'Select a pull request:',
      choices: pullRequests.map((pullRequest) => ({
        name: `#${pullRequest.number} ${truncate(pullRequest.title, 32)} (${pullRequest.head.ref} → ${pullRequest.base.ref})`,
        value: pullRequest.number
      }))
    }
  ]);

  return answer.number;
}

function formatState(pullRequest) {
  if (pullRequest.merged_at) {
    return chalk.magenta('Merged');
  }

  if (pullRequest.state === 'closed') {
    return chalk.red('Closed');
  }

  return chalk.green('Open');
}

function formatReviewers(pullRequest, reviews) {
  const latestByReviewer = new Map();

  reviews.forEach((review) => {
    if (review.user && review.user.login) {
      latestByReviewer.set(review.user.login, review.state);
    }
  });

  const requested = (pullRequest.requested_reviewers || []).map((reviewer) => reviewer.login);
  const reviewerLines = [];

  latestByReviewer.forEach((state, login) => {
    reviewerLines.push(`${login} (${formatReviewState(state)})`);
  });

  requested.forEach((login) => {
    if (!latestByReviewer.has(login)) {
      reviewerLines.push(`${login} (${chalk.yellow('pending ◌')})`);
    }
  });

  return reviewerLines.length ? reviewerLines.join(', ') : 'None';
}

function formatReviewState(state) {
  if (state === 'APPROVED') {
    return chalk.green('approved ✔');
  }

  if (state === 'CHANGES_REQUESTED') {
    return chalk.red('changes requested');
  }

  if (state === 'COMMENTED') {
    return chalk.yellow('commented');
  }

  return chalk.gray(String(state || 'pending').toLowerCase());
}

function handledError(message) {
  const error = new Error(message);
  error.handled = true;
  return error;
}

module.exports = reviewCommand;
