const React = require('react');
const { Box, Text } = require('ink');
const { buildApi, listOpenPullRequests, formatApiError } = require('../../lib/api');
const PRTable = require('../components/PRTable');

async function staleCommand(args, context) {
  const { config, repo, push, setMode } = context;
  const days = Number(args[0] || 7);

  if (Number.isNaN(days) || days < 1) {
    push(React.createElement(Text, { color: '#EF4444' }, '✖ Usage: /stale [days]'));
    return;
  }

  setMode('loading');

  try {
    const api = buildApi(config);
    const pullRequests = await listOpenPullRequests(api, repo.owner, repo.repo);
    const threshold = Date.now() - (days * 24 * 60 * 60 * 1000);
    const stale = pullRequests.filter((pullRequest) => new Date(pullRequest.updated_at).getTime() < threshold);

    if (!stale.length) {
      push(React.createElement(Text, { color: '#10B981' }, '✔ No stale PRs! All pull requests have recent activity.'));
      return;
    }

    push(React.createElement(
      Box,
      { flexDirection: 'column' },
      React.createElement(PRTable, {
        pullRequests: stale,
        owner: repo.owner,
        repo: repo.repo,
        showAuthor: false,
        showUrl: false,
        showIdle: true
      }),
      React.createElement(Text, { color: '#6B7280' }, `${stale.length} stale pull requests (no activity for ${days}+ days)`)
    ));
  } catch (error) {
    push(React.createElement(Text, { color: '#EF4444' }, `✖ ${formatApiError(error).message}`));
  } finally {
    setMode('idle');
  }
}

module.exports = staleCommand;
