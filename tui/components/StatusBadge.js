const React = require('react');
const { Text } = require('ink');
const theme = require('../theme');

function StatusBadge(props) {
  const state = String(props.state || 'none').toLowerCase();

  if (state === 'open') {
    return React.createElement(Text, { color: theme.SUCCESS, bold: true }, '✔ Open');
  }

  if (state === 'closed') {
    return React.createElement(Text, { color: theme.ERROR, bold: true }, '✖ Closed');
  }

  if (state === 'merged') {
    return React.createElement(Text, { color: theme.PRIMARY, bold: true }, '⬡ Merged');
  }

  return React.createElement(Text, { color: theme.TEXT_MUTED, bold: true }, '─ No PR');
}

module.exports = StatusBadge;
