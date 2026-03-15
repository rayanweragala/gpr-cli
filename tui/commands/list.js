const React = require('react');
const { Box, Text } = require('ink');
const { buildApi, listOpenPullRequests, formatApiError } = require('../../lib/api');
const PRTable = require('../components/PRTable');

async function listCommand(_args, context) {
  const { config, repo, push, setMode } = context;
  setMode('loading');

  try {
    const api = buildApi(config);
    const pullRequests = await listOpenPullRequests(api, repo.owner, repo.repo);

    if (!pullRequests.length) {
      push(React.createElement(Text, { color: '#F59E0B' }, 'No open pull requests found.'));
      return;
    }

    push(React.createElement(
      Box,
      { flexDirection: 'column' },
      React.createElement(PRTable, {
        pullRequests,
        owner: repo.owner,
        repo: repo.repo
      }),
      React.createElement(Text, { color: '#6B7280' }, `Total: ${pullRequests.length} open pull requests`)
    ));
  } catch (error) {
    push(React.createElement(Text, { color: '#EF4444' }, `✖ ${formatApiError(error).message}`));
  } finally {
    setMode('idle');
  }
}

module.exports = listCommand;
