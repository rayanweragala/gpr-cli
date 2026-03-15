const React = require('react');
const { Box, Text } = require('ink');

function SuccessBox(props) {
  const lines = Array.isArray(props.lines) ? props.lines : [];

  return React.createElement(
    Box,
    { flexDirection: 'column' },
    React.createElement(
      Box,
      {
        borderStyle: 'double',
        borderColor: '#10B981',
        paddingX: 1,
        marginBottom: 1
      },
      React.createElement(Text, { color: '#10B981', bold: true }, `✔  ${props.title}`)
    ),
    ...lines.map((line) => React.createElement(
      Text,
      { key: line.label, color: '#F9FAFB' },
      `${line.label.padEnd(10, ' ')} : ${line.value}`
    ))
  );
}

module.exports = SuccessBox;
