const React = require('react');
const { render } = require('ink');
const { ensureConfig } = require('../lib/conf');
const { getRepositoryContext } = require('../lib/git');
const MergeScreen = require('../tui/screens/MergeScreen');

async function mergeCommand(prNumber) {
  const config = await ensureConfig();
  const repo = await getRepositoryContext();
  const app = render(React.createElement(MergeScreen, { config, repo, prNumber }));
  await app.waitUntilExit();
}

module.exports = mergeCommand;
