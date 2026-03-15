const React = require('react');
const { Box, Text } = require('ink');
const Divider = require('./components/Divider');
const theme = require('./theme');

function TopBar(props) {
  const repo = props.repo;

  return React.createElement(
    Box,
    { flexDirection: 'column', borderStyle: 'single', borderColor: theme.BORDER, paddingX: 1 },
    React.createElement(
      Box,
      null,
      React.createElement(Text, { color: theme.PRIMARY, bold: true }, 'GPR'),
      React.createElement(Text, { color: theme.TEXT_MUTED }, '  pull request shell')
    ),
    repo
      ? React.createElement(
          Box,
          null,
          React.createElement(Text, { color: theme.TEXT_MUTED }, 'repo: '),
          React.createElement(Text, { color: theme.TEXT_PRIMARY }, `${repo.owner}/${repo.repo}`),
          React.createElement(Text, { color: theme.TEXT_MUTED }, '  branch: '),
          React.createElement(Text, { color: theme.INFO }, repo.branch)
        )
      : React.createElement(Text, { color: theme.WARNING }, '⚠ Not in a git repo'),
    React.createElement(Divider)
  );
}

module.exports = TopBar;
