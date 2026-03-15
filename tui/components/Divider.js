const React = require('react');
const { Text } = require('ink');

function Divider() {
  const width = Math.max(20, (process.stdout.columns || 120) - 4);
  return React.createElement(Text, { color: '#374151' }, '─'.repeat(width));
}

module.exports = Divider;
