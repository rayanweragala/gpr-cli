const React = require('react');
const { Box, Text } = require('ink');
const { format } = require('timeago.js');

const COLUMN_WIDTHS = {
  number: 5,
  title: 28,
  author: 16,
  branch: 22,
  base: 16,
  created: 13,
  url: 28
};

function PRTable(props) {
  const pullRequests = Array.isArray(props.pullRequests) ? props.pullRequests : [];

  if (!pullRequests.length) {
    return React.createElement(Text, { color: '#F9FAFB' }, 'No open pull requests found.');
  }

  const widths = getResponsiveWidths();
  const showAuthor = props.showAuthor !== false;
  const showUrl = props.showUrl !== false && widths.showUrl;

  return React.createElement(
    Box,
    { flexDirection: 'column' },
    React.createElement(HeaderRow, { widths, showAuthor, showUrl, showIdle: Boolean(props.showIdle) }),
    ...pullRequests.map((pullRequest, index) => React.createElement(DataRow, {
      key: pullRequest.number,
      pullRequest,
      owner: props.owner,
      repo: props.repo,
      widths,
      showAuthor,
      showUrl,
      showIdle: Boolean(props.showIdle),
      selected: index === (props.selectedIndex || 0)
    }))
  );
}

function HeaderRow(props) {
  return React.createElement(
    Box,
    {
      borderBottom: true,
      borderColor: '#7C3AED',
      marginTop: 0,
      marginBottom: 0,
      paddingY: 0
    },
    React.createElement(Cell, { width: props.widths.number, color: '#7C3AED', bold: true }, '#'),
    React.createElement(Cell, { width: props.widths.title, color: '#7C3AED', bold: true }, 'Title'),
    props.showAuthor ? React.createElement(Cell, { width: props.widths.author, color: '#7C3AED', bold: true }, 'Author') : null,
    React.createElement(Cell, { width: props.widths.branch, color: '#7C3AED', bold: true }, 'Branch'),
    React.createElement(Cell, { width: props.widths.base, color: '#7C3AED', bold: true }, 'Base'),
    React.createElement(Cell, { width: props.widths.created, color: '#7C3AED', bold: true }, props.showIdle ? 'Idle' : 'Created'),
    props.showUrl ? React.createElement(Cell, { width: props.widths.url, color: '#7C3AED', bold: true }, 'URL') : null
  );
}

function DataRow(props) {
  const textColor = props.selected ? '#FFFFFF' : undefined;
  const backgroundColor = props.selected ? '#7C3AED' : undefined;
  const createdValue = props.showIdle ? format(props.pullRequest.updated_at) : format(props.pullRequest.created_at);
  const createdColor = props.selected ? '#FFFFFF' : props.showIdle ? '#EF4444' : getAgeColor(props.pullRequest.created_at);

  return React.createElement(
    Box,
    {
      backgroundColor,
      marginTop: 0,
      marginBottom: 0,
      paddingY: 0
    },
    React.createElement(Cell, { width: props.widths.number, color: textColor || '#F9FAFB' }, truncate(String(props.pullRequest.number), props.widths.number)),
    React.createElement(Cell, { width: props.widths.title, color: textColor || '#F9FAFB' }, truncate(props.pullRequest.title, props.widths.title)),
    props.showAuthor ? React.createElement(
      Cell,
      { width: props.widths.author, color: textColor || '#6B7280' },
      truncate(props.pullRequest.user ? props.pullRequest.user.login : 'unknown', props.widths.author)
    ) : null,
    React.createElement(
      Cell,
      { width: props.widths.branch, color: textColor || '#3B82F6' },
      truncate(props.pullRequest.head ? props.pullRequest.head.ref : '', props.widths.branch)
    ),
    React.createElement(
      Cell,
      { width: props.widths.base, color: textColor || '#F9FAFB' },
      truncate(props.pullRequest.base ? props.pullRequest.base.ref : '', props.widths.base)
    ),
    React.createElement(
      Cell,
      { width: props.widths.created, color: createdColor },
      truncate(createdValue, props.widths.created)
    ),
    props.showUrl ? React.createElement(
      Cell,
      { width: props.widths.url, color: textColor || '#3B82F6' },
      truncate(`/${props.owner}/${props.repo}/pull/${props.pullRequest.number}`, props.widths.url)
    ) : null
  );
}

function Cell(props) {
  return React.createElement(
    Box,
    {
      width: props.width,
      overflow: 'hidden',
      marginTop: 0,
      marginBottom: 0,
      paddingY: 0
    },
    React.createElement(Text, { color: props.color, bold: Boolean(props.bold) }, pad(props.children, props.width))
  );
}

function getResponsiveWidths() {
  const termWidth = process.stdout.columns || 120;

  if (termWidth < 100) {
    return {
      ...COLUMN_WIDTHS,
      title: 22,
      branch: 18,
      base: 14,
      showUrl: false
    };
  }

  if (termWidth < 140) {
    return {
      ...COLUMN_WIDTHS,
      title: 26,
      branch: 20,
      base: 14,
      url: 20,
      showUrl: true
    };
  }

  return {
    ...COLUMN_WIDTHS,
    showUrl: true
  };
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
