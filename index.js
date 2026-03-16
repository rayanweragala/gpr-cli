#!/usr/bin/env node

const { Command } = require('commander');
const chalk = require('chalk');
const shellCommand = require('./commands/shell');
const openCommand = require('./commands/open');
const listCommand = require('./commands/list');
const statusCommand = require('./commands/status');
const configCommand = require('./commands/config');
const diffCommand = require('./commands/diff');
const reviewCommand = require('./commands/review');
const reviewConflictsCommand = require('./commands/review-conflicts');
const checkoutCommand = require('./commands/checkout');
const mergeCommand = require('./commands/merge');
const conflictsCommand = require('./commands/conflicts');
const resolveCommand = require('./commands/resolve');
const closeCommand = require('./commands/close');
const reopenCommand = require('./commands/reopen');
const syncCommand = require('./commands/sync');
const mineCommand = require('./commands/mine');
const watchCommand = require('./commands/watch');
const staleCommand = require('./commands/stale');
const statsCommand = require('./commands/stats');

const program = new Command();

program
  .name('gpr')
  .description('Open and manage pull requests from your terminal.')
  .version('1.0.0');

program
  .command('open')
  .description('Create a pull request for the current branch')
  .action(run(openCommand));

program
  .command('list')
  .description('List open pull requests for the current repository')
  .action(run(listCommand));

program
  .command('status')
  .description('Show pull request status for the current branch')
  .action(run(statusCommand));

program
  .command('config')
  .description('Configure GitBucket connection details')
  .action(run(configCommand));

program
  .command('diff')
  .description('Show diff summary for the current branch')
  .action(run(diffCommand));

program
  .command('review [pr-number]')
  .description('Show detailed pull request information')
  .action(run(reviewCommand));

program
  .command('review-conflicts [pr-number] [file]')
  .description('Inspect rebase conflicts for a pull request')
  .action(run(reviewConflictsCommand));

program
  .command('checkout')
  .description('Checkout the branch for an open pull request')
  .action(run(checkoutCommand));

program
  .command('merge [pr-number]')
  .description('Merge an open pull request')
  .action(run(mergeCommand));

program
  .command('conflicts')
  .description('Scan open pull requests for merge conflicts')
  .action(run(conflictsCommand));

program
  .command('resolve <pr-number>')
  .description('Fix merge conflicts for a PR')
  .action(run(resolveCommand));

program
  .command('close [pr-number]')
  .description('Close a pull request')
  .action(run(closeCommand));

program
  .command('reopen <pr-number>')
  .description('Reopen a closed pull request')
  .action(run(reopenCommand));

program
  .command('sync')
  .description('Sync current branch with base')
  .action(run(syncCommand));

program
  .command('mine')
  .description('Show your open pull requests across all repos')
  .action(run(mineCommand));

program
  .command('watch')
  .description('Live auto-refreshing pull request dashboard')
  .action(run(watchCommand));

program
  .command('stale')
  .description('Show stale open pull requests')
  .option('--days <days>', 'Number of idle days before a PR is stale', '7')
  .action(run(staleCommand));

program
  .command('stats')
  .description('Show your pull request statistics for the current repo')
  .action(run(statsCommand));

main();

async function main() {
  if (process.argv.slice(2).length === 0) {
    await shellCommand();
    return;
  }

  await program.parseAsync(process.argv);
}

function run(command) {
  return async (...args) => {
    try {
      await command(...args);
    } catch (error) {
      if (error && error.handled) {
        console.error(chalk.red(`✖ ${error.message || 'Unexpected error'}`));
        process.exitCode = 1;
        return;
      }

      console.error(chalk.red(`✖ ${error.message || 'Unexpected error'}`));
      process.exitCode = 1;
    }
  };
}
