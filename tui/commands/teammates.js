const React = require('react');
const { Box, Text } = require('ink');
const { format } = require('timeago.js');
const { buildApi, listOpenPullRequests, formatApiError } = require('../../lib/api');
const theme = require('../theme');

async function teammatesCommand(_args, context) {
  const { config, repo, push, setMode } = context;
  setMode('loading');

  try {
    const api = buildApi(config);
    const prs = await listOpenPullRequests(api, repo.owner, repo.repo);

    if (!prs.length) {
      push(React.createElement(Text, { color: theme.TEXT_MUTED }, 'No open pull requests found.'));
      return;
    }

    const byAuthor = {};
    prs.forEach((pullRequest) => {
      const login = pullRequest.user ? pullRequest.user.login : 'unknown';
      if (!byAuthor[login]) {
        byAuthor[login] = [];
      }
      byAuthor[login].push(pullRequest);
    });

    push(React.createElement(
      Box,
      { flexDirection: 'column' },
      React.createElement(Text, { color: theme.PRIMARY, bold: true }, `Team Activity — ${repo.owner}/${repo.repo}`),
      React.createElement(Text, { color: theme.TEXT_MUTED }, 'Open PRs grouped by team member:'),
      ...Object.entries(byAuthor).map(([author, authorPrs]) => React.createElement(
        Box,
        { key: author, flexDirection: 'column', marginTop: 1 },
        React.createElement(
          Box,
          { flexDirection: 'row' },
          React.createElement(Text, { color: theme.SECONDARY, bold: true }, author),
          React.createElement(
            Text,
            { color: theme.TEXT_MUTED },
            `  ${authorPrs.length} open PR${authorPrs.length > 1 ? 's' : ''}`
          )
        ),
        ...authorPrs.map((pullRequest) => React.createElement(
          Box,
          { key: pullRequest.number, flexDirection: 'row', paddingLeft: 2 },
          React.createElement(
            Box,
            { width: 6, overflow: 'hidden' },
            React.createElement(Text, { color: theme.TEXT_DIM }, `#${pullRequest.number}`),
          ),
          React.createElement(
            Box,
            { width: 40, overflow: 'hidden' },
            React.createElement(Text, { color: theme.TEXT_PRIMARY }, truncate(pullRequest.title, 39))
          ),
          React.createElement(
            Box,
            { width: 14, overflow: 'hidden' },
            React.createElement(Text, { color: getAgeColor(pullRequest.created_at) }, format(pullRequest.created_at))
          )
        ))
      )),
      React.createElement(
        Box,
        { marginTop: 1 },
        React.createElement(
          Text,
          { color: theme.TEXT_MUTED },
          `${prs.length} total open PRs across ${Object.keys(byAuthor).length} team member${Object.keys(byAuthor).length > 1 ? 's' : ''}`
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

function getAgeColor(createdAt) {
  const days = Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));
  if (days < 7) return theme.SUCCESS;
  if (days < 30) return theme.WARNING;
  return theme.ERROR;
}

module.exports = teammatesCommand;
