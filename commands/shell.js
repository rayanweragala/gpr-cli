const React = require('react');
const { render } = require('ink');
const { readConfig } = require('../lib/conf');
const { getRepositoryContext } = require('../lib/git');
const App = require('../tui/App');

async function shellCommand() {
  const [config, repo] = await Promise.all([
    tryReadConfig(),
    tryGetRepo()
  ]);

  return renderShell({
    config,
    repo,
    initialCommand: repo ? '/lg' : '',
    initialCommandSilent: true,
    showWelcome: !repo
  });
}

async function renderShell(options) {
  const app = render(React.createElement(App, {
    config: options.config || null,
    repo: options.repo || null,
    initialCommand: options.initialCommand || '',
    initialCommandSilent: Boolean(options.initialCommandSilent),
    autoExit: Boolean(options.autoExit),
    showWelcome: options.showWelcome !== false
  }));
  await app.waitUntilExit();
}

async function tryReadConfig() {
  try {
    return await readConfig();
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null;
    }

    throw error;
  }
}

async function tryGetRepo() {
  try {
    return await getRepositoryContext();
  } catch (_error) {
    return null;
  }
}

shellCommand.renderShell = renderShell;
shellCommand.tryReadConfig = tryReadConfig;
shellCommand.tryGetRepo = tryGetRepo;

module.exports = shellCommand;
