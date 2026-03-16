const { ensureConfig } = require('../lib/conf');
const { getRepositoryContext } = require('../lib/git');
const shellCommand = require('./shell');

async function reopenCommand(prNumber) {
  const config = await ensureConfig();
  const repo = await getRepositoryContext();
  await shellCommand.renderShell({
    config,
    repo,
    initialCommand: `/reopen ${prNumber}`,
    autoExit: true,
    showWelcome: false
  });
}

module.exports = reopenCommand;
