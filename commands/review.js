const { ensureConfig } = require('../lib/conf');
const { getRepositoryContext } = require('../lib/git');
const shellCommand = require('./shell');

async function reviewCommand(prNumber) {
  const config = await ensureConfig();
  const repo = await getRepositoryContext();
  await shellCommand.renderShell({
    config,
    repo,
    initialCommand: prNumber ? `/review ${prNumber}` : '/review',
    autoExit: true,
    showWelcome: false
  });
}

module.exports = reviewCommand;
