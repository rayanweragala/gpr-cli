const React = require('react');
const { Text } = require('ink');

function StatusBadge(props) {
  const state = props.state || 'none';

  if (state === 'open') {
    return React.createElement(Text, { color: '#10B981' }, '✔ Open');
  }

  if (state === 'closed') {
    return React.createElement(Text, { color: '#EF4444' }, '✖ Closed');
  }

  if (state === 'merged') {
    return React.createElement(Text, { color: '#7C3AED' }, '⬡ Merged');
  }

  return React.createElement(Text, { color: '#F59E0B' }, '─ No PR');
}

module.exports = StatusBadge;
