const React = require('react');
const { Text } = require('ink');
const theme = require('../theme');

function ErrorLine(props) {
  return React.createElement(Text, { color: theme.ERROR }, `✖ ${props.message}`);
}

module.exports = ErrorLine;
