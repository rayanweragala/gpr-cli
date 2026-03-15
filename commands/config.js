const shellCommand = require('./shell');

async function configCommand() {
  const config = await shellCommand.tryReadConfig();
  const repo = await shellCommand.tryGetRepo();
  await shellCommand.renderShell({
    config,
    repo,
    initialCommand: '/config',
    autoExit: true,
    showWelcome: false
  });
}

module.exports = configCommand;
