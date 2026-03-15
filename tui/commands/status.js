const React = require('react');
const { Box, Text } = require('ink');
const {
  buildApi,
  findPullRequestByBranchWithState,
  formatApiError
} = require('../../lib/api');
const StatusBadge = require('../components/StatusBadge');
const theme = require('../theme');

async function statusCommand(_args, context) {
  const { config, repo, push, setMode } = context;
  setMode('loading');

  try {
    const api = buildApi(config);
    const open = await findPullRequestByBranchWithState(api, repo.owner, repo.repo, repo.branch, 'open');
    const pullRequest = open || await findPullRequestByBranchWithState(api, repo.owner, repo.repo, repo.branch, 'closed');
    const state = open ? (open.merged_at ? 'merged' : 'open') : pullRequest ? (pullRequest.merged_at ? 'merged' : 'closed') : 'none';

    push(React.createElement(
      Box,
      { flexDirection: 'column' },
      React.createElement(
        Text,
        null,
        React.createElement(Text, { color: theme.TEXT_MUTED }, 'Branch : '),
        React.createElement(Text, { color: theme.INFO }, repo.branch)
      ),
      React.createElement(
        Box,
        null,
        React.createElement(Text, { color: theme.TEXT_MUTED }, 'PR     : '),
        React.createElement(StatusBadge, { state }),
        pullRequest ? React.createElement(Text, { color: theme.INFO }, ` — ${pullRequest.html_url}`) : null
      )
    ));
  } catch (error) {
    push(React.createElement(Text, { color: theme.ERROR }, `✖ ${formatApiError(error).message}`));
  } finally {
    setMode('idle');
  }
}

module.exports = statusCommand;
