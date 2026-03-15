const React = require('react');
const { Box, Text } = require('ink');
const {
  buildApi,
  findPullRequestByBranchWithState,
  formatApiError
} = require('../../lib/api');
const StatusBadge = require('../components/StatusBadge');

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
        React.createElement(Text, { color: '#6B7280' }, 'Branch : '),
        React.createElement(Text, { color: '#3B82F6' }, repo.branch)
      ),
      React.createElement(
        Box,
        null,
        React.createElement(Text, { color: '#6B7280' }, 'PR     : '),
        React.createElement(StatusBadge, { state }),
        pullRequest ? React.createElement(Text, { color: '#F9FAFB' }, ` — ${pullRequest.html_url}`) : null
      )
    ));
  } catch (error) {
    push(React.createElement(Text, { color: '#EF4444' }, `✖ ${formatApiError(error).message}`));
  } finally {
    setMode('idle');
  }
}

module.exports = statusCommand;
