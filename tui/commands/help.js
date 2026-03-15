const React = require('react');
const { Box, Text } = require('ink');
const { COMMANDS } = require('../AutoSuggest');

async function helpCommand(_args, context) {
  context.push(React.createElement(
    Box,
    { flexDirection: 'column' },
    ...COMMANDS.map((item) => React.createElement(
      Box,
      { key: item.cmd },
      React.createElement(
        Box,
        { width: 18 },
        React.createElement(Text, { color: '#7C3AED', bold: true }, item.cmd)
      ),
      React.createElement(Text, { color: '#6B7280' }, item.desc)
    ))
  ));
}

module.exports = helpCommand;
