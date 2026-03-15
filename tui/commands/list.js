const React = require('react');
const { Box, Text, useInput } = require('ink');
const { format } = require('timeago.js');
const { buildApi, listOpenPullRequests, formatApiError } = require('../../lib/api');
const theme = require('../theme');

let activeListId = 0;

async function listCommand(_args, context) {
  const { config, repo, push, setMode, runCommand, setInputPaused } = context;
  setMode('loading');

  try {
    const api = buildApi(config);
    const pullRequests = await listOpenPullRequests(api, repo.owner, repo.repo);

    if (!pullRequests.length) {
      push(React.createElement(Text, { color: theme.WARNING }, 'No open pull requests found.'));
      return;
    }

    activeListId += 1;
    const listId = activeListId;

    push(React.createElement(ListOutput, {
      listId,
      pullRequests,
      owner: repo.owner,
      repo: repo.repo,
      setInputPaused,
      onReview: (pullRequest) => {
        context.pushCommand(`/review ${pullRequest.number}`);
        setInputPaused(false);
        runCommand(`/review ${pullRequest.number}`, context);
      }
    }));
  } catch (error) {
    push(React.createElement(Text, { color: theme.ERROR }, `✖ ${formatApiError(error).message}`));
  } finally {
    setMode('idle');
  }
}

function ListOutput(props) {
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const [done, setDone] = React.useState(false);
  const isActive = !done && props.listId === activeListId;

  React.useEffect(() => {
    if (isActive && typeof props.setInputPaused === 'function') {
      props.setInputPaused(true);
    }

    return () => {
      if (isActive && typeof props.setInputPaused === 'function') {
        props.setInputPaused(false);
      }
    };
  }, [isActive, props]);

  useInput((input, key) => {
    if (!isActive) {
      return;
    }

    if (key.upArrow) {
      setSelectedIndex((index) => Math.max(0, index - 1));
      return;
    }

    if (key.downArrow) {
      setSelectedIndex((index) => Math.min(props.pullRequests.length - 1, index + 1));
      return;
    }

    if (key.return) {
      setDone(true);
      if (typeof props.setInputPaused === 'function') {
        props.setInputPaused(false);
      }
      props.onReview(props.pullRequests[selectedIndex]);
      return;
    }

    if (key.tab) {
      setDone(true);
      if (typeof props.setInputPaused === 'function') {
        props.setInputPaused(false);
      }
    }
  });

  return React.createElement(
    Box,
    { flexDirection: 'column' },
    React.createElement(
      Box,
      { marginBottom: 0 },
      headerCell('#', 5),
      headerCell('Title', 30),
      headerCell('Author', 18),
      headerCell('Branch', 22),
      headerCell('Base', 16),
      headerCell('Age', 13)
    ),
    React.createElement(
      Box,
      { marginBottom: 1 },
      React.createElement(Text, { color: theme.BORDER_DIM }, '─'.repeat(Math.min((process.stdout.columns || 120) - 2, 104)))
    ),
    ...props.pullRequests.map((pullRequest, index) => {
      const selected = isActive && index === selectedIndex;
      return React.createElement(
        Box,
        { key: pullRequest.number, backgroundColor: selected ? theme.SELECTED_BG : undefined },
        dataCell(String(pullRequest.number), 5, selected ? theme.SELECTED_TEXT : theme.SECONDARY, true),
        dataCell(truncate(pullRequest.title, 29), 30, selected ? theme.SELECTED_TEXT : theme.TEXT_PRIMARY),
        dataCell(truncate(pullRequest.user ? pullRequest.user.login : '', 17), 18, selected ? theme.SELECTED_TEXT : theme.TEXT_MUTED),
        dataCell(truncate(pullRequest.head ? pullRequest.head.ref : '', 21), 22, selected ? theme.SELECTED_TEXT : theme.INFO),
        dataCell(truncate(pullRequest.base ? pullRequest.base.ref : '', 15), 16, selected ? theme.SELECTED_TEXT : theme.SUCCESS),
        dataCell(format(pullRequest.created_at), 13, selected ? theme.SELECTED_TEXT : getAgeColor(pullRequest.created_at))
      );
    }),
    isActive ? React.createElement(
      Box,
      { marginTop: 1 },
      React.createElement(
        Text,
        { color: theme.TEXT_DIM },
        React.createElement(Text, { color: theme.WARNING }, '↑↓'),
        ' navigate  ',
        React.createElement(Text, { color: theme.WARNING }, 'Enter'),
        ' view details  ',
        React.createElement(Text, { color: theme.WARNING }, 'Tab'),
        ' skip to input'
      )
    ) : null,
    React.createElement(Text, { color: theme.TEXT_MUTED }, `Total: ${props.pullRequests.length} open pull requests`)
  );
}

function headerCell(label, width) {
  return React.createElement(
    Box,
    { width },
    React.createElement(Text, { bold: true, color: theme.PRIMARY }, label)
  );
}

function dataCell(value, width, color, bold) {
  return React.createElement(
    Box,
    { width },
    React.createElement(Text, { color, bold: Boolean(bold) }, pad(value, width))
  );
}

function getAgeColor(createdAt) {
  const days = Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));
  if (days < 7) return theme.SUCCESS;
  if (days < 30) return theme.WARNING;
  return theme.ERROR;
}

function truncate(str, len) {
  const value = String(str || '');
  return value.length <= len ? value : `${value.slice(0, len - 1)}…`;
}

function pad(str, width) {
  const value = String(str || '');
  return value.length >= width ? value : value.padEnd(width, ' ');
}

module.exports = listCommand;
