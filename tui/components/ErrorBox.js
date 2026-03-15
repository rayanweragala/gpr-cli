const React = require('react');
const { Box, Text } = require('ink');

function ErrorBox(props) {
  return React.createElement(
    Box,
    {
      borderStyle: 'round',
      borderColor: '#EF4444',
      paddingX: 1,
      marginY: 1
    },
    React.createElement(Text, { color: '#EF4444' }, `✖ ${props.message}`)
  );
}

module.exports = ErrorBox;
