const React = require('react');
const { Box, Text } = require('ink');
const { format } = require('timeago.js');
const {
  buildApi,
  getAuthenticatedUser,
  listOpenPullRequests,
  formatApiError
} = require('../../lib/api');
const theme = require('../theme');

async function waitingCommand(_args, context) {
  const { config, repo, push, setMode } = context;
  setMode('loading');

  try {
    const api = buildApi(config);
    const user = await getAuthenticatedUser(api);
    const pullRequests = await listOpenPullRequests(api, repo.owner, repo.repo);
    const waiting = pullRequests.filter((pullRequest) => {
      const requestedLogins = (pullRequest.requested_reviewers || []).map((reviewer) => reviewer.login);
      return requestedLogins.includes(user.login);
    });

    if (!waiting.length) {
      push(React.createElement(
        Box,
        { flexDirection: 'column' },
        React.createElement(Text, { color: theme.SUCCESS, bold: true }, '✔ No PRs waiting for your review'),
        React.createElement(Text, { color: theme.TEXT_MUTED }, 'You are all caught up!')
      ));
      return;
    }

    push(React.createElement(
      Box,
      { flexDirection: 'column' },
      React.createElement(Text, { color: theme.PRIMARY, bold: true }, 'PRs Waiting for Your Review'),
      React.createElement(Text, { color: theme.TEXT_MUTED }, 'You are assigned as reviewer on these:'),
      React.createElement(
        Box,
        { marginTop: 1, flexDirection: 'column' },
        ...waiting.map((pullRequest) => React.createElement(
          Box,
          { key: pullRequest.number, flexDirection: 'column', marginBottom: 1 },
          React.createElement(
            Box,
            { flexDirection: 'row' },
            React.createElement(Text, { color: theme.SECONDARY, bold: true }, `#${pullRequest.number}`),
            React.createElement(Text, { color: theme.TEXT_PRIMARY }, ` ${pullRequest.title}`)
          ),
          React.createElement(
            Box,
            { paddingLeft: 2, flexDirection: 'row' },
            React.createElement(Text, { color: theme.TEXT_MUTED }, `by ${pullRequest.user ? pullRequest.user.login : 'unknown'}`),
            React.createElement(Text, { color: theme.TEXT_MUTED }, '  '),
            React.createElement(Text, { color: theme.INFO }, pullRequest.head ? pullRequest.head.ref : ''),
            React.createElement(Text, { color: theme.TEXT_MUTED }, ' → '),
            React.createElement(Text, { color: theme.SUCCESS }, pullRequest.base ? pullRequest.base.ref : ''),
            React.createElement(Text, { color: theme.WARNING }, `  ${format(pullRequest.created_at)}`)
          ),
          React.createElement(
            Box,
            { paddingLeft: 2 },
            React.createElement(Text, { color: theme.TEXT_DIM }, `Type /review ${pullRequest.number} to review`)
          )
        ))
      ),
      React.createElement(
        Box,
        { marginTop: 1 },
        React.createElement(
          Text,
          { color: theme.TEXT_MUTED },
          `${waiting.length} PR${waiting.length > 1 ? 's' : ''} waiting for your review`
        )
      )
    ));
  } catch (error) {
    push(React.createElement(Text, { color: theme.ERROR }, `✖ ${formatApiError(error).message}`));
  } finally {
    setMode('idle');
  }
}

module.exports = waitingCommand;
