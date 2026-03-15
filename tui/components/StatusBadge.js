const React = require('react');
const { Text } = require('ink');

function StatusBadge(props) {
  const state = String(props.state || 'none').toLowerCase();

  if (state === 'open') {
    return React.createElement(Text, { color: '#10B981', bold: true }, '✔ Open');
  }

  if (state === 'closed') {
    return React.createElement(Text, { color: '#EF4444', bold: true }, '✖ Closed');
  }

  if (state === 'merged') {
    return React.createElement(Text, { color: '#7C3AED', bold: true }, '⬡ Merged');
  }

  return React.createElement(Text, { color: '#F59E0B', bold: true }, '─ No PR');
}

module.exports = StatusBadge;
