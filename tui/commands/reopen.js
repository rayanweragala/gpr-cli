const React = require('react');
const { Box, Text } = require('ink');
const {
  buildApi,
  reopenPullRequest,
  formatApiError
} = require('../../lib/api');
const theme = require('../theme');

async function reopenCommand(args, context) {
  const { config, repo, push, setMode } = context;
  const prNumber = args[0] ? Number(args[0]) : null;

  if (!prNumber || Number.isNaN(prNumber)) {
    push(React.createElement(Text, { color: theme.ERROR }, '✖ Usage: /reopen <pr-number>'));
    return;
  }

  setMode('loading');

  try {
    const api = buildApi(config);
    const pr = await reopenPullRequest(api, repo.owner, repo.repo, prNumber);

    push(React.createElement(
      Box,
      { flexDirection: 'column' },
      React.createElement(Text, { color: theme.SUCCESS, bold: true }, `✔ PR #${prNumber} reopened`),
      React.createElement(Text, { color: theme.TEXT_MUTED }, pr.title),
      React.createElement(Text, { color: theme.INFO }, `${pr.head && pr.head.ref ? pr.head.ref : '?'} → ${pr.base && pr.base.ref ? pr.base.ref : '?'}`)
    ));
  } catch (error) {
    push(React.createElement(Text, { color: theme.ERROR }, `✖ ${formatApiError(error).message}`));
  } finally {
    setMode('idle');
  }
}

module.exports = reopenCommand;
