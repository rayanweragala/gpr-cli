const chalk = require('chalk');
const { setupConfig, getConfigPath } = require('../lib/conf');

async function configCommand() {
  await setupConfig();
  console.log(chalk.green(`Config saved to ${getConfigPath()}`));
}

module.exports = configCommand;
