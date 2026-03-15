const React = require('react');
const { Box, Text } = require('ink');
const { COMMANDS } = require('../AutoSuggest');
const theme = require('../theme');

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
        React.createElement(Text, { color: theme.PRIMARY, bold: true }, item.cmd)
      ),
      React.createElement(Text, { color: theme.TEXT_MUTED }, item.desc)
    ))
  ));
}

module.exports = helpCommand;
