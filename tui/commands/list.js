const React = require('react');
const { Box, Text, useInput } = require('ink');
const { format } = require('timeago.js');
const { buildApi, listOpenPullRequests, formatApiError } = require('../../lib/api');

let activeListId = 0;

async function listCommand(_args, context) {
  const { config, repo, push, setMode, runCommand, setInputPaused } = context;
  setMode('loading');

  try {
    const api = buildApi(config);
    const pullRequests = await listOpenPullRequests(api, repo.owner, repo.repo);

    if (!pullRequests.length) {
      push(React.createElement(Text, { color: '#F59E0B' }, 'No open pull requests found.'));
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
    push(React.createElement(Text, { color: '#EF4444' }, `✖ ${formatApiError(error).message}`));
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
      React.createElement(Text, { color: '#374151' }, '─'.repeat(Math.min((process.stdout.columns || 120) - 2, 104)))
    ),
    ...props.pullRequests.map((pullRequest, index) => {
      const selected = isActive && index === selectedIndex;
      return React.createElement(
        Box,
        { key: pullRequest.number, backgroundColor: selected ? '#7C3AED' : undefined },
        dataCell(String(pullRequest.number), 5, selected ? '#FFFFFF' : '#06B6D4', true),
        dataCell(truncate(pullRequest.title, 29), 30, selected ? '#FFFFFF' : '#F9FAFB'),
        dataCell(truncate(pullRequest.user ? pullRequest.user.login : '', 17), 18, selected ? '#E5E7EB' : '#6B7280'),
        dataCell(truncate(pullRequest.head ? pullRequest.head.ref : '', 21), 22, selected ? '#BFDBFE' : '#3B82F6'),
        dataCell(truncate(pullRequest.base ? pullRequest.base.ref : '', 15), 16, selected ? '#BBF7D0' : '#10B981'),
        dataCell(format(pullRequest.created_at), 13, selected ? '#FFFFFF' : getAgeColor(pullRequest.created_at))
      );
    }),
    isActive ? React.createElement(
      Box,
      { marginTop: 1 },
      React.createElement(
        Text,
        { color: '#6B7280' },
        React.createElement(Text, { color: '#F59E0B' }, '↑↓'),
        ' navigate  ',
        React.createElement(Text, { color: '#F59E0B' }, 'Enter'),
        ' view details  ',
        React.createElement(Text, { color: '#F59E0B' }, 'Tab'),
        ' skip to input'
      )
    ) : null,
    React.createElement(Text, { color: '#6B7280' }, `Total: ${props.pullRequests.length} open pull requests`)
  );
}

function headerCell(label, width) {
  return React.createElement(
    Box,
    { width },
    React.createElement(Text, { bold: true, color: '#7C3AED' }, label)
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
  if (days < 7) return '#10B981';
  if (days < 30) return '#F59E0B';
  return '#EF4444';
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
