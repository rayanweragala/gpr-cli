const { ensureConfig } = require('../lib/conf');
const { getRepositoryContext } = require('../lib/git');
const shellCommand = require('./shell');

async function staleCommand(options) {
  const config = await ensureConfig();
  const repo = await getRepositoryContext();
  await shellCommand.renderShell({
    config,
    repo,
    initialCommand: `/stale ${options && options.days ? options.days : 7}`,
    autoExit: true,
    showWelcome: false
  });
}

module.exports = staleCommand;
