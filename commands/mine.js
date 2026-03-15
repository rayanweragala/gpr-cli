const React = require('react');
const { render } = require('ink');
const { ensureConfig } = require('../lib/conf');
const MineScreen = require('../tui/screens/MineScreen');

async function mineCommand() {
  const config = await ensureConfig();
  const app = render(React.createElement(MineScreen, { config }));
  await app.waitUntilExit();
}

module.exports = mineCommand;
