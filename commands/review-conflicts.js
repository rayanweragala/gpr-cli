const { ensureConfig } = require('../lib/conf');
const { getRepositoryContext } = require('../lib/git');
const shellCommand = require('./shell');

async function reviewConflictsCommand(prNumber, file) {
  const config = await ensureConfig();
  const repo = await getRepositoryContext();
  await shellCommand.renderShell({
    config,
    repo,
    initialCommand: prNumber
      ? `/review-conflicts ${prNumber}${file ? ` ${file}` : ''}`
      : '/review-conflicts',
    autoExit: true,
    showWelcome: false
  });
}

module.exports = reviewConflictsCommand;
