const React = require('react');
const { Box, Text } = require('ink');
const InkSpinner = require('ink-spinner').default || require('ink-spinner');

function Spinner(props) {
  return React.createElement(
    Box,
    null,
    React.createElement(Text, { color: '#F59E0B' }, React.createElement(InkSpinner, { type: 'dots' })),
    React.createElement(Text, { color: '#F59E0B' }, ` ${props.text}`)
  );
}

module.exports = Spinner;
