#!/usr/bin/env node

const { Command } = require('commander');
const chalk = require('chalk');
const openCommand = require('./commands/open');
const listCommand = require('./commands/list');
const statusCommand = require('./commands/status');
const configCommand = require('./commands/config');

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

program.parseAsync(process.argv);

function run(command) {
  return async () => {
    try {
      await command();
    } catch (error) {
      if (error && error.handled) {
        process.exitCode = 1;
        return;
      }

      console.error(chalk.red(error.message || 'Unexpected error'));
      process.exitCode = 1;
    }
  };
}
