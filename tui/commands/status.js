const React = require('react');
const { Box, Text } = require('ink');
const {
  buildApi,
  findPullRequestByBranchWithState,
  formatApiError
} = require('../../lib/api');
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
        Box,
        null,
        React.createElement(
          Box,
          { width: 10 },
          React.createElement(Text, { color: theme.TEXT_MUTED }, 'Branch')
        ),
        React.createElement(Text, { color: theme.TEXT_MUTED }, ' : '),
        React.createElement(Text, { color: theme.INFO }, repo.branch)
      ),
      React.createElement(
        Box,
        null,
        React.createElement(
          Box,
          { width: 10 },
          React.createElement(Text, { color: theme.TEXT_MUTED }, 'PR')
        ),
        React.createElement(Text, { color: theme.TEXT_MUTED }, ' : '),
        renderStatus(state, pullRequest)
      )
    ));
  } catch (error) {
    push(React.createElement(Text, { color: theme.ERROR }, `✖ ${formatApiError(error).message}`));
  } finally {
    setMode('idle');
  }
}

function renderStatus(state, pullRequest) {
  if (state === 'open' && pullRequest) {
    return React.createElement(
      React.Fragment,
      null,
      React.createElement(Text, { color: theme.SUCCESS }, '✔ Open — '),
      React.createElement(Text, { color: theme.INFO }, pullRequest.html_url)
    );
  }

  if (state === 'merged' && pullRequest) {
    return React.createElement(
      React.Fragment,
      null,
      React.createElement(Text, { color: theme.PRIMARY }, '⬡ Merged — '),
      React.createElement(Text, { color: theme.INFO }, pullRequest.html_url)
    );
  }

  if (state === 'closed' && pullRequest) {
    return React.createElement(
      React.Fragment,
      null,
      React.createElement(Text, { color: theme.ERROR }, '✖ Closed — '),
      React.createElement(Text, { color: theme.INFO }, pullRequest.html_url)
    );
  }

  return React.createElement(Text, { color: theme.TEXT_MUTED }, 'No PR');
}

module.exports = statusCommand;
