const { ensureConfig } = require('../lib/conf');
const { getRepositoryContext } = require('../lib/git');
const shellCommand = require('./shell');

async function syncCommand() {
  const config = await ensureConfig();
  const repo = await getRepositoryContext();
  await shellCommand.renderShell({
    config,
    repo,
    initialCommand: '/sync',
    autoExit: true,
    showWelcome: false
  });
}

module.exports = syncCommand;
