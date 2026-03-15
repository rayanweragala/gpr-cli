const React = require('react');
const { render } = require('ink');
const { ensureConfig } = require('../lib/conf');
const { getRepositoryContext } = require('../lib/git');
const StaleScreen = require('../tui/screens/StaleScreen');

async function staleCommand(options) {
  const config = await ensureConfig();
  const repo = await getRepositoryContext();
  const app = render(React.createElement(StaleScreen, { config, repo, days: options && options.days }));
  await app.waitUntilExit();
}

module.exports = staleCommand;
