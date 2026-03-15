const React = require('react');
const { render } = require('ink');
const { readConfig } = require('../lib/conf');
const ConfigScreen = require('../tui/screens/ConfigScreen');

async function configCommand() {
  let existing = null;

  try {
    existing = await readConfig();
  } catch (_error) {
    existing = null;
  }

  const app = render(React.createElement(ConfigScreen, { existing }));
  await app.waitUntilExit();
}

module.exports = configCommand;
