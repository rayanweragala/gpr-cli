const { ensureConfig } = require('../lib/conf');
const shellCommand = require('./shell');

async function mineCommand() {
  const config = await ensureConfig();
  const repo = await shellCommand.tryGetRepo();
  await shellCommand.renderShell({
    config,
    repo,
    initialCommand: '/mine',
    autoExit: true,
    showWelcome: false
  });
}

module.exports = mineCommand;
