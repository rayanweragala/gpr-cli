const React = require('react');
const { render } = require('ink');
const { ensureConfig } = require('../lib/conf');
const { getRepositoryContext } = require('../lib/git');
const OpenScreen = require('../tui/screens/OpenScreen');

async function openCommand() {
  const config = await ensureConfig();
  const repo = await getRepositoryContext();
  const app = render(React.createElement(OpenScreen, { config, repo }));
  await app.waitUntilExit();
}

module.exports = openCommand;
