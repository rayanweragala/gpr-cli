const React = require('react');
const { Box, Text, useInput } = require('ink');

const COMMANDS = [
  { cmd: '/list', desc: 'List open pull requests' },
  { cmd: '/open', desc: 'Create a pull request for current branch' },
  { cmd: '/status', desc: 'PR status for current branch' },
  { cmd: '/diff', desc: 'Show branch diff summary' },
  { cmd: '/review', desc: 'Review a PR  e.g. /review 24' },
  { cmd: '/checkout', desc: 'Checkout a PR branch interactively' },
  { cmd: '/merge', desc: 'Merge a PR  e.g. /merge 24' },
  { cmd: '/mine', desc: 'Your open PRs across all org repos' },
  { cmd: '/watch', desc: 'Live auto-refresh PR dashboard' },
  { cmd: '/stale', desc: 'Stale PRs  e.g. /stale 14  (default 7d)' },
  { cmd: '/stats', desc: 'Your PR statistics for this repo' },
  { cmd: '/config', desc: 'Update GitBucket connection settings' },
  { cmd: '/clear', desc: 'Clear history' },
  { cmd: '/help', desc: 'Show all available commands' },
  { cmd: '/exit', desc: 'Quit GPR shell' }
];

function AutoSuggest(props) {
  const filtered = filterCommands(props.query);
  const visible = Boolean(props.visible) && filtered.length > 0;
  const selectedIndex = Math.max(0, Math.min(props.selectedIndex || 0, filtered.length - 1));

  useInput((input, key) => {
    if (!visible) {
      return;
    }

    if (key.upArrow) {
      if (typeof props.onMoveUp === 'function') {
        props.onMoveUp(filtered.length);
      }
      return;
    }

    if (key.downArrow) {
      if (typeof props.onMoveDown === 'function') {
        props.onMoveDown(filtered.length);
      }
      return;
    }

    if (key.tab) {
      if (filtered[selectedIndex] && typeof props.onSelect === 'function') {
        props.onSelect(filtered[selectedIndex].cmd);
      }
      return;
    }

    if (key.escape && typeof props.onClose === 'function') {
      props.onClose();
    }
  });

  if (!visible) {
    return null;
  }

  return React.createElement(
    Box,
    { flexDirection: 'column', borderStyle: 'round', borderColor: '#374151', paddingY: 0 },
    React.createElement(
      Box,
      { paddingX: 1, marginBottom: 0 },
      React.createElement(Text, { color: '#6B7280', dimColor: true }, '↑↓ navigate  Tab select  Esc close')
    ),
    React.createElement(
      Box,
      { paddingX: 1 },
      React.createElement(Text, { color: '#374151' }, '─'.repeat(40))
    ),
    ...filtered.map((item, index) => React.createElement(
      Box,
      { key: item.cmd, paddingX: 1, backgroundColor: index === selectedIndex ? '#7C3AED' : undefined },
      React.createElement(
        Box,
        { width: 16 },
        React.createElement(Text, { color: index === selectedIndex ? '#FFFFFF' : '#F9FAFB', bold: true }, item.cmd)
      ),
      React.createElement(Text, { color: index === selectedIndex ? '#E5E7EB' : '#6B7280' }, truncate(item.desc, descriptionWidth()))
    ))
  );
}

function filterCommands(query) {
  const value = String(query || '').trim();
  const maxSuggestions = (process.stdout.rows || 40) < 30 ? 5 : 8;

  if (!value.startsWith('/')) {
    return [];
  }

  return COMMANDS
    .filter((item) => item.cmd.startsWith(value.toLowerCase()))
    .slice(0, maxSuggestions);
}

function descriptionWidth() {
  const total = process.stdout.columns || 120;
  return Math.max(16, total - 24);
}

function truncate(value, width) {
  const text = String(value || '');
  return text.length <= width ? text : `${text.slice(0, Math.max(0, width - 1))}…`;
}

module.exports = AutoSuggest;
module.exports.COMMANDS = COMMANDS;
module.exports.filterCommands = filterCommands;
