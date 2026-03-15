const React = require('react');
const { Box, Text } = require('ink');
const Divider = require('./components/Divider');

function TopBar(props) {
  const repo = props.repo;

  return React.createElement(
    Box,
    { flexDirection: 'column', borderStyle: 'single', borderColor: '#374151', paddingX: 1 },
    React.createElement(
      Box,
      null,
      React.createElement(Text, { color: '#7C3AED', bold: true }, 'GPR'),
      React.createElement(Text, { color: '#6B7280' }, '  pull request shell')
    ),
    repo
      ? React.createElement(
          Box,
          null,
          React.createElement(Text, { color: '#6B7280' }, 'repo: '),
          React.createElement(Text, { color: '#F9FAFB' }, `${repo.owner}/${repo.repo}`),
          React.createElement(Text, { color: '#6B7280' }, '  branch: '),
          React.createElement(Text, { color: '#3B82F6' }, repo.branch)
        )
      : React.createElement(Text, { color: '#F59E0B' }, '⚠ Not in a git repo'),
    React.createElement(Divider)
  );
}

module.exports = TopBar;
