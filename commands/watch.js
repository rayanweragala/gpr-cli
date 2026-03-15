const React = require('react');
const { render } = require('ink');
const { ensureConfig } = require('../lib/conf');
const { getRepositoryContext } = require('../lib/git');
const WatchScreen = require('../tui/screens/WatchScreen');

async function watchCommand() {
  const config = await ensureConfig();
  const repo = await getRepositoryContext();
  const app = render(React.createElement(WatchScreen, { config, repo }));
  await app.waitUntilExit();
}

module.exports = watchCommand;
