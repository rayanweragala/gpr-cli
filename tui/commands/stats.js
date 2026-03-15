const React = require('react');
const { Box, Text } = require('ink');
const { format } = require('timeago.js');
const {
  buildApi,
  getAuthenticatedUser,
  listPullRequests,
  formatApiError
} = require('../../lib/api');

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
      React.createElement(Text, { color: '#F9FAFB' }, `Total PRs opened    : ${mine.length}`),
      React.createElement(Text, { color: '#F59E0B' }, `Currently open      : ${open.length}`),
      React.createElement(Text, { color: '#10B981' }, `Merged / Closed     : ${closed.length}`),
      React.createElement(Text, { color: '#F9FAFB' }, `This month          : ${thisMonth.length}`),
      React.createElement(Text, { color: '#EF4444' }, `Oldest open PR      : ${oldestOpen ? `PR #${oldestOpen.number} — ${oldestOpen.title} (${format(oldestOpen.created_at)})` : 'None'}`),
      React.createElement(Text, { color: '#F9FAFB' }, `Most recent PR      : ${mostRecent ? `PR #${mostRecent.number} — ${mostRecent.title} (${format(mostRecent.created_at)})` : 'None'}`)
    ));
  } catch (error) {
    push(React.createElement(Text, { color: '#EF4444' }, `✖ ${formatApiError(error).message}`));
  } finally {
    setMode('idle');
  }
}

module.exports = statsCommand;
