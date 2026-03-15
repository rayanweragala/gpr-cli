const React = require('react');
const { render } = require('ink');
const { ensureConfig } = require('../lib/conf');
const { getRepositoryContext } = require('../lib/git');
const ListScreen = require('../tui/screens/ListScreen');

async function listCommand() {
  const config = await ensureConfig();
  const repo = await getRepositoryContext();
  const app = render(React.createElement(ListScreen, { config, repo }));
  await app.waitUntilExit();
}

module.exports = listCommand;
