const React = require('react');
const { Box, Text } = require('ink');
const { format } = require('timeago.js');

function PRTable(props) {
  const pullRequests = Array.isArray(props.pullRequests) ? props.pullRequests : [];

  if (!pullRequests.length) {
    return React.createElement(Text, { color: '#F59E0B' }, 'No open pull requests found.');
  }

  const cols = getColumns();
  const showAuthor = props.showAuthor !== false && cols.author > 0;
  const showUrl = props.showUrl !== false && cols.url > 0;

  return React.createElement(
    Box,
    { flexDirection: 'column' },
    React.createElement(
      Box,
      null,
      cell('#', cols.num, '#7C3AED', true),
      cell('Title', cols.title, '#7C3AED', true),
      showAuthor ? cell('Author', cols.author, '#7C3AED', true) : null,
      cell('Branch', cols.branch, '#7C3AED', true),
      cell('Base', cols.base, '#7C3AED', true),
      cell(props.showIdle ? 'Idle' : 'Age', cols.created, '#7C3AED', true),
      showUrl ? cell('URL', cols.url, '#7C3AED', true) : null
    ),
    React.createElement(Text, { color: '#374151' }, '─'.repeat(Math.max(20, totalWidth(cols, showAuthor, showUrl)))),
    ...pullRequests.map((pullRequest) => React.createElement(
      Box,
      { key: pullRequest.number },
      cell(String(pullRequest.number), cols.num, '#22D3EE', true),
      cell(truncate(props.showIdle ? pullRequest.title : pullRequest.title, cols.title), cols.title, '#F9FAFB'),
      showAuthor ? cell(truncate(pullRequest.user ? pullRequest.user.login : 'unknown', cols.author), cols.author, '#6B7280') : null,
      cell(truncate(pullRequest.head ? pullRequest.head.ref : '', cols.branch), cols.branch, '#3B82F6'),
      cell(truncate(pullRequest.base ? pullRequest.base.ref : '', cols.base), cols.base, '#10B981'),
      cell(
        truncate(format(props.showIdle ? pullRequest.updated_at : pullRequest.created_at), cols.created),
        cols.created,
        props.showIdle ? '#EF4444' : getAgeColor(props.showIdle ? pullRequest.updated_at : pullRequest.created_at)
      ),
      showUrl ? cell(truncate(`/${props.owner}/${props.repo}/pull/${pullRequest.number}`, cols.url), cols.url, '#22D3EE') : null
    ))
  );
}

function getColumns() {
  const tw = process.stdout.columns || 120;

  if (tw >= 140) {
    return { num: 5, title: 30, author: 16, branch: 24, base: 18, created: 13, url: 26 };
  }

  if (tw >= 100) {
    return { num: 5, title: 26, author: 14, branch: 20, base: 16, created: 13, url: 0 };
  }

  return { num: 4, title: 22, author: 0, branch: 18, base: 14, created: 12, url: 0 };
}

function totalWidth(cols, showAuthor, showUrl) {
  return cols.num + cols.title + cols.branch + cols.base + cols.created + (showAuthor ? cols.author : 0) + (showUrl ? cols.url : 0);
}

function cell(value, width, color, bold) {
  return React.createElement(
    Box,
    { width, overflow: 'hidden' },
    React.createElement(Text, { color, bold: Boolean(bold) }, pad(value, width))
  );
}

function truncate(value, len) {
  const text = String(value || '');
  return text.length > len ? `${text.slice(0, len - 1)}…` : text;
}

function pad(value, width) {
  const text = truncate(value, width);
  return text.length >= width ? text : text.padEnd(width, ' ');
}

function getAgeColor(createdAt) {
  const days = Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));
  if (days < 7) {
    return '#10B981';
  }
  if (days < 30) {
    return '#F59E0B';
  }
  return '#EF4444';
}

module.exports = PRTable;
