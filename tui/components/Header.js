const React = require('react');
const { Box, Text } = require('ink');

function Header(props) {
  const title = props.title || 'Dashboard';
  const repo = props.repo || '-';
  const branch = props.branch || '-';

  return React.createElement(
    Box,
    {
      borderStyle: 'round',
      borderColor: '#7C3AED',
      flexDirection: 'column',
      paddingX: 1,
      marginBottom: 1
    },
    React.createElement(Text, { color: '#F9FAFB', bold: true }, `GPR — ${title}`),
    React.createElement(
      Text,
      { color: '#6B7280' },
      `repo: ${repo}  branch: ${branch}`
    )
  );
}

module.exports = Header;
