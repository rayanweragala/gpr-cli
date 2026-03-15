const React = require('react');
const { Text } = require('ink');

function ErrorLine(props) {
  return React.createElement(Text, { color: '#EF4444' }, `✖ ${props.message}`);
}

module.exports = ErrorLine;
