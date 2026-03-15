const React = require('react');
const { Box, Text } = require('ink');

const COMMANDS = [
  { cmd: '/list', desc: 'List open pull requests' },
  { cmd: '/open', desc: 'Create a pull request' },
  { cmd: '/status', desc: 'PR status for this branch' },
  { cmd: '/diff', desc: 'Show branch diff' },
  { cmd: '/review', desc: 'Review a PR  e.g. /review 24' },
  { cmd: '/checkout', desc: 'Checkout a PR branch' },
  { cmd: '/merge', desc: 'Merge a PR  e.g. /merge 24' },
  { cmd: '/mine', desc: 'Your PRs across all repos' },
  { cmd: '/watch', desc: 'Live auto-refresh dashboard' },
  { cmd: '/stale', desc: 'Stale PRs  e.g. /stale 14' },
  { cmd: '/stats', desc: 'Your PR statistics' },
  { cmd: '/config', desc: 'Update configuration' },
  { cmd: '/clear', desc: 'Clear history' },
  { cmd: '/help', desc: 'Show all commands' },
  { cmd: '/exit', desc: 'Quit GPR' }
];

function AutoSuggest(props) {
  const filtered = filterCommands(props.query).slice(0, 6);

  if (!filtered.length) {
    return null;
  }

  const selectedIndex = Math.max(0, Math.min(props.selectedIndex || 0, filtered.length - 1));

  return React.createElement(
    Box,
    { flexDirection: 'column', borderStyle: 'single', borderColor: '#374151' },
    ...filtered.map((item, index) => React.createElement(
      Box,
      { key: item.cmd, paddingX: 1, backgroundColor: index === selectedIndex ? '#7C3AED' : undefined },
      React.createElement(
        Box,
        { width: 18 },
        React.createElement(Text, { color: index === selectedIndex ? '#FFFFFF' : '#F9FAFB', bold: true }, item.cmd)
      ),
      React.createElement(Text, { color: index === selectedIndex ? '#E5E7EB' : '#6B7280' }, item.desc)
    ))
  );
}

function filterCommands(query) {
  const value = String(query || '').trim();

  if (!value.startsWith('/')) {
    return [];
  }

  return COMMANDS.filter((item) => item.cmd.startsWith(value.toLowerCase()));
}

module.exports = AutoSuggest;
module.exports.COMMANDS = COMMANDS;
module.exports.filterCommands = filterCommands;
