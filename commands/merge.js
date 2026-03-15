const { ensureConfig } = require('../lib/conf');
const { getRepositoryContext } = require('../lib/git');
const shellCommand = require('./shell');

async function mergeCommand(prNumber) {
  const config = await ensureConfig();
  const repo = await getRepositoryContext();
  await shellCommand.renderShell({
    config,
    repo,
    initialCommand: prNumber ? `/merge ${prNumber}` : '/merge',
    autoExit: true,
    showWelcome: false
  });
}

module.exports = mergeCommand;
