const React = require('react');
const { render } = require('ink');
const { ensureConfig } = require('../lib/conf');
const { getRepositoryContext } = require('../lib/git');
const ReviewScreen = require('../tui/screens/ReviewScreen');

async function reviewCommand(prNumber) {
  const config = await ensureConfig();
  const repo = await getRepositoryContext();
  const app = render(React.createElement(ReviewScreen, { config, repo, prNumber }));
  await app.waitUntilExit();
}

module.exports = reviewCommand;
