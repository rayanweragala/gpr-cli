const React = require('react');
const { render } = require('ink');
const { ensureConfig } = require('../lib/conf');
const { getRepositoryContext } = require('../lib/git');
const StatsScreen = require('../tui/screens/StatsScreen');

async function statsCommand() {
  const config = await ensureConfig();
  const repo = await getRepositoryContext();
  const app = render(React.createElement(StatsScreen, { config, repo }));
  await app.waitUntilExit();
}

module.exports = statsCommand;
