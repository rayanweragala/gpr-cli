const React = require('react');
const { render } = require('ink');
const { ensureConfig } = require('../lib/conf');
const { getRepositoryContext } = require('../lib/git');
const StatusScreen = require('../tui/screens/StatusScreen');

async function statusCommand() {
  const config = await ensureConfig();
  const repo = await getRepositoryContext();
  const app = render(React.createElement(StatusScreen, { config, repo }));
  await app.waitUntilExit();
}

module.exports = statusCommand;
