const React = require('react');
const { Box, Text, useInput } = require('ink');
const chalk = require('chalk');
const { format } = require('timeago.js');
const InkTable = require('ink-table').default || require('ink-table');

function PRTable(props) {
  const pullRequests = Array.isArray(props.pullRequests) ? props.pullRequests : [];
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const selectable = typeof props.onSelect === 'function';

  useInput((input, key) => {
    if (!selectable || !pullRequests.length) {
      return;
    }

    if (key.upArrow) {
      setSelectedIndex((current) => (current === 0 ? pullRequests.length - 1 : current - 1));
    }

    if (key.downArrow) {
      setSelectedIndex((current) => (current === pullRequests.length - 1 ? 0 : current + 1));
    }

    if (key.return) {
      props.onSelect(pullRequests[selectedIndex]);
    }
  });

  React.useEffect(() => {
    if (selectedIndex >= pullRequests.length) {
      setSelectedIndex(0);
    }
  }, [pullRequests.length, selectedIndex]);

  if (!pullRequests.length) {
    return React.createElement(Text, { color: '#F9FAFB' }, 'No open pull requests found.');
  }

  const rows = pullRequests.map((pullRequest, index) => mapPullRequest(pullRequest, props, index === selectedIndex && selectable));

  return React.createElement(
    Box,
    { flexDirection: 'column' },
    React.createElement(InkTable, { data: rows }),
    selectable ? React.createElement(Text, { color: '#6B7280' }, 'Use ↑↓ to navigate and Enter to select.') : null
  );
}

function mapPullRequest(pullRequest, props, selected) {
  const row = {
    '#': decorate(`#${pullRequest.number}`, selected, chalk.bold.hex('#7C3AED')),
    Title: decorate(truncate(pullRequest.title, 28), selected, chalk.hex('#F9FAFB')),
    Branch: decorate(truncate(pullRequest.head ? pullRequest.head.ref : '', 22), selected, chalk.hex('#3B82F6')),
    Base: decorate(truncate(pullRequest.base ? pullRequest.base.ref : '', 16), selected, chalk.hex('#10B981')),
    [props.showIdle ? 'Idle' : 'Created']: decorate(
      props.showIdle ? format(pullRequest.updated_at) : format(pullRequest.created_at),
      selected,
      chalk.hex(props.showIdle ? '#EF4444' : createdColor(pullRequest.created_at))
    )
  };

  if (props.showAuthor !== false) {
    row.Author = decorate(truncate(pullRequest.user ? pullRequest.user.login : 'unknown', 16), selected, chalk.hex('#6B7280'));
  }

  if (props.showUrl !== false) {
    row.URL = decorate(truncate(`/${props.owner}/${props.repo}/pull/${pullRequest.number}`, 26), selected, chalk.hex('#3B82F6'));
  }

  return row;
}

function createdColor(createdAt) {
  const ageInDays = Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));

  if (ageInDays < 7) {
    return '#10B981';
  }

  if (ageInDays < 30) {
    return '#F59E0B';
  }

  return '#EF4444';
}

function truncate(value, length) {
  const text = String(value || '');
  return text.length > length ? `${text.slice(0, length - 1)}…` : text;
}

function decorate(text, selected, colorFn) {
  const marker = selected ? '› ' : '  ';
  const value = `${marker}${text}`;

  return selected ? chalk.bgHex('#F9FAFB').hex('#111827')(value) : colorFn(value);
}

module.exports = PRTable;
