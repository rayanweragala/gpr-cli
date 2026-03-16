const React = require('react');
const { Box, Text, useInput } = require('ink');
const theme = require('./theme');

const COMMANDS = [
  { cmd: '/list', desc: 'List open pull requests' },
  { cmd: '/open', desc: 'Create a pull request' },
  { cmd: '/status', desc: 'PR status for current branch' },
  { cmd: '/diff', desc: 'Show branch diff summary' },
  { cmd: '/review', desc: 'Review a PR  e.g. /review 24' },
  { cmd: '/checkout', desc: 'Checkout a PR branch' },
  { cmd: '/resolve', desc: 'Fix PR conflicts  e.g. /resolve 24' },
  { cmd: '/merge', desc: 'Merge a PR  e.g. /merge 24' },
  { cmd: '/close', desc: 'Close a PR  e.g. /close 24' },
  { cmd: '/reopen', desc: 'Reopen a closed PR  e.g. /reopen 24' },
  { cmd: '/sync', desc: 'Sync current branch with base branch' },
  { cmd: '/assign', desc: 'Assign reviewer e.g. /assign 24 user' },
  { cmd: '/waiting', desc: 'PRs waiting for your review' },
  { cmd: '/teammates', desc: 'Open PRs grouped by team member' },
  { cmd: '/conflicts', desc: 'Scan PRs for merge conflicts' },
  { cmd: '/remind', desc: 'Post reminder on a PR  e.g. /remind 24' },
  { cmd: '/mine', desc: 'Your PRs across all org repos' },
  { cmd: '/watch', desc: 'Live auto-refresh dashboard' },
  { cmd: '/stale', desc: 'Stale PRs  e.g. /stale 14' },
  { cmd: '/stats', desc: 'Your PR statistics' },
  { cmd: '/config', desc: 'Update connection settings' },
  { cmd: '/clear', desc: 'Clear shell history' },
  { cmd: '/help', desc: 'Show all commands' },
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
    { flexDirection: 'column', borderStyle: 'round', borderColor: theme.BORDER_DIM, paddingY: 0 },
    React.createElement(
      Box,
      { paddingX: 1, marginBottom: 0 },
      React.createElement(Text, { color: theme.TEXT_DIM, dimColor: true }, '↑↓ navigate  Tab select  Esc close')
    ),
    React.createElement(
      Box,
      { paddingX: 1 },
      React.createElement(Text, { color: theme.BORDER_DIM }, '─'.repeat(40))
    ),
    ...filtered.map((item, index) => React.createElement(
      Box,
      { key: item.cmd, paddingX: 1, backgroundColor: index === selectedIndex ? theme.SELECTED_BG : undefined },
      React.createElement(
        Box,
        { width: 16 },
        React.createElement(Text, { color: index === selectedIndex ? theme.SELECTED_TEXT : theme.TEXT_PRIMARY, bold: true }, item.cmd)
      ),
      React.createElement(Text, { color: index === selectedIndex ? theme.SELECTED_TEXT : theme.TEXT_MUTED }, truncate(item.desc, descriptionWidth()))
    ))
  );
}

function filterCommands(query) {
  const value = String(query || '').trim();

  if (!value.startsWith('/')) {
    return [];
  }

  return COMMANDS
    .filter((item) => item.cmd.startsWith(value.toLowerCase()));
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
