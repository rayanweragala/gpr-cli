const React = require('react');
const { Text } = require('ink');
const theme = require('../theme');

function Divider() {
  const width = Math.max(20, (process.stdout.columns || 120) - 4);
  return React.createElement(Text, { color: theme.BORDER_DIM }, '─'.repeat(width));
}

module.exports = Divider;
