const { ensureConfig } = require('../lib/conf');
const { getRepositoryContext } = require('../lib/git');
const shellCommand = require('./shell');

async function closeCommand(prNumber) {
  const config = await ensureConfig();
  const repo = await getRepositoryContext();
  await shellCommand.renderShell({
    config,
    repo,
    initialCommand: prNumber ? `/close ${prNumber}` : '/close',
    autoExit: true,
    showWelcome: false
  });
}

module.exports = closeCommand;
