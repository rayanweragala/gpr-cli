const React = require('react');
const { Box, Text } = require('ink');
const {
  buildApi,
  listOpenPullRequests,
  getPullRequest,
  formatApiError
} = require('../../lib/api');
const theme = require('../theme');

async function conflictsCommand(_args, context) {
  const { config, repo, push, setMode } = context;
  setMode('loading');

  try {
    const api = buildApi(config);
    const pullRequests = await listOpenPullRequests(api, repo.owner, repo.repo);
    const details = [];

    for (let index = 0; index < pullRequests.length; index += 5) {
      const batch = pullRequests.slice(index, index + 5);
      const batchDetails = await Promise.all(batch.map((pullRequest) => (
        getPullRequest(api, repo.owner, repo.repo, pullRequest.number).catch(() => pullRequest)
      )));
      details.push(...batchDetails);
    }

    const conflicted = details.filter((pullRequest) => pullRequest.mergeable === false);
    const unknown = details.filter((pullRequest) => pullRequest.mergeable === null || typeof pullRequest.mergeable === 'undefined');
    const clean = details.filter((pullRequest) => pullRequest.mergeable === true);

    push(React.createElement(
      Box,
      { flexDirection: 'column' },
      React.createElement(Text, { color: theme.PRIMARY, bold: true }, 'Merge Conflict Scan'),
      React.createElement(Text, { color: theme.TEXT_MUTED }, `${repo.owner}/${repo.repo}`),
      React.createElement(
        Box,
        { marginTop: 1, flexDirection: 'column' },
        React.createElement(Text, { color: theme.SUCCESS, bold: true }, `✔ Clean (${clean.length})`),
        ...clean.map((pullRequest) => React.createElement(
          Box,
          { key: `clean-${pullRequest.number}`, paddingLeft: 2 },
          React.createElement(Text, { color: theme.TEXT_DIM }, `#${pullRequest.number}`),
          React.createElement(Text, { color: theme.TEXT_MUTED }, ` ${truncate(pullRequest.title, 45)}`)
        ))
      ),
      conflicted.length > 0
        ? React.createElement(
            Box,
            { marginTop: 1, flexDirection: 'column' },
            React.createElement(Text, { color: theme.ERROR, bold: true }, `✖ Has Conflicts (${conflicted.length})`),
            ...conflicted.map((pullRequest) => React.createElement(
              Box,
              { key: `conflict-${pullRequest.number}`, paddingLeft: 2, flexDirection: 'column' },
              React.createElement(
                Box,
                null,
                React.createElement(Text, { color: theme.ERROR }, `#${pullRequest.number}`),
                React.createElement(Text, { color: theme.TEXT_PRIMARY }, ` ${truncate(pullRequest.title, 40)}`)
              ),
              React.createElement(
                Box,
                { paddingLeft: 2 },
                React.createElement(
                  Text,
                  { color: theme.TEXT_DIM },
                  `by ${pullRequest.user ? pullRequest.user.login : 'unknown'}  ${pullRequest.head ? pullRequest.head.ref : ''} → ${pullRequest.base ? pullRequest.base.ref : ''}`
                )
              )
            ))
          )
        : null,
      unknown.length > 0
        ? React.createElement(
            Box,
            { marginTop: 1, flexDirection: 'column' },
            React.createElement(Text, { color: theme.WARNING }, `◌ Unknown status (${unknown.length})`),
            React.createElement(Text, { color: theme.TEXT_DIM }, 'GitBucket may not report mergeable state')
          )
        : null,
      React.createElement(
        Box,
        { marginTop: 1 },
        React.createElement(
          Text,
          { color: theme.TEXT_MUTED },
          `Scanned ${details.length} open PRs${conflicted.length > 0 ? ` — ${conflicted.length} need attention` : ' — all clear!'}`
        )
      )
    ));
  } catch (error) {
    push(React.createElement(Text, { color: theme.ERROR }, `✖ ${formatApiError(error).message}`));
  } finally {
    setMode('idle');
  }
}

function truncate(value, maxLength) {
  const text = String(value || '');
  return text.length <= maxLength ? text : `${text.slice(0, maxLength - 1)}…`;
}

module.exports = conflictsCommand;
