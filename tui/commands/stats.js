const React = require('react');
const { Box, Text } = require('ink');
const { format } = require('timeago.js');
const {
  buildApi,
  getAuthenticatedUser,
  listPullRequests,
  formatApiError
} = require('../../lib/api');
const theme = require('../theme');

async function statsCommand(_args, context) {
  const { config, repo, push, setMode } = context;
  setMode('loading');

  try {
    const api = buildApi(config);
    const [user, pullRequests] = await Promise.all([
      getAuthenticatedUser(api),
      listPullRequests(api, repo.owner, repo.repo, 'all')
    ]);
    const mine = pullRequests.filter((pullRequest) => pullRequest.user && pullRequest.user.login === user.login);
    const open = mine.filter((pullRequest) => pullRequest.state === 'open');
    const closed = mine.filter((pullRequest) => pullRequest.state !== 'open');
    const now = new Date();
    const thisMonth = mine.filter((pullRequest) => {
      const createdAt = new Date(pullRequest.created_at);
      return createdAt.getMonth() === now.getMonth() && createdAt.getFullYear() === now.getFullYear();
    });
    const oldestOpen = open.slice().sort((left, right) => new Date(left.created_at) - new Date(right.created_at))[0];
    const mostRecent = mine.slice().sort((left, right) => new Date(right.created_at) - new Date(left.created_at))[0];

    push(React.createElement(
      Box,
      { flexDirection: 'column' },
      React.createElement(Text, { color: theme.PRIMARY, bold: true }, 'Your PR statistics'),
      statRow('Total PRs opened', String(mine.length), theme.TEXT_PRIMARY),
      statRow('Currently open', String(open.length), theme.WARNING),
      statRow('Merged / Closed', String(closed.length), theme.SUCCESS),
      statRow('This month', String(thisMonth.length), theme.TEXT_PRIMARY),
      statRow(
        'Oldest open PR',
        oldestOpen ? `PR #${oldestOpen.number} — ${oldestOpen.title} (${format(oldestOpen.created_at)})` : 'None',
        theme.ERROR
      ),
      statRow(
        'Most recent PR',
        mostRecent ? `PR #${mostRecent.number} — ${mostRecent.title} (${format(mostRecent.created_at)})` : 'None',
        theme.SUCCESS
      )
    ));
  } catch (error) {
    push(React.createElement(Text, { color: theme.ERROR }, `✖ ${formatApiError(error).message}`));
  } finally {
    setMode('idle');
  }
}

function statRow(label, value, valueColor) {
  return React.createElement(
    Box,
    { flexDirection: 'row' },
    React.createElement(
      Box,
      { width: 24 },
      React.createElement(Text, { color: theme.TEXT_MUTED }, label)
    ),
    React.createElement(Text, { color: theme.TEXT_MUTED }, ' : '),
    React.createElement(Text, { color: valueColor }, value)
  );
}

module.exports = statsCommand;
