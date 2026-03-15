const React = require('react');
const { render } = require('ink');
const { ensureConfig } = require('../lib/conf');
const { getRepositoryContext } = require('../lib/git');
const DiffScreen = require('../tui/screens/DiffScreen');

async function diffCommand() {
  const config = await ensureConfig();
  const repo = await getRepositoryContext();
  const app = render(React.createElement(DiffScreen, { config, repo }));
  await app.waitUntilExit();
}

module.exports = diffCommand;
