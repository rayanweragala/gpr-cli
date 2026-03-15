const React = require('react');
const { render } = require('ink');
const { ensureConfig } = require('../lib/conf');
const { getRepositoryContext } = require('../lib/git');
const CheckoutScreen = require('../tui/screens/CheckoutScreen');

async function checkoutCommand() {
  const config = await ensureConfig();
  const repo = await getRepositoryContext();
  const app = render(React.createElement(CheckoutScreen, { config, repo }));
  await app.waitUntilExit();
}

module.exports = checkoutCommand;
