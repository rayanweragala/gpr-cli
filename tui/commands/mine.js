const React = require('react');
const { Box, Text } = require('ink');
const {
  buildApi,
  getAuthenticatedUser,
  listUserOrgs,
  listOrgRepos,
  listOpenPullRequests,
  formatApiError
} = require('../../lib/api');
const PRTable = require('../components/PRTable');
const theme = require('../theme');

async function mineCommand(_args, context) {
  const { config, push, setMode } = context;
  setMode('loading');

  try {
    const api = buildApi(config);
    const user = await getAuthenticatedUser(api);
    const orgs = await listUserOrgs(api);
    const repoGroups = [];
    const repoSets = await Promise.all(orgs.map(async (org) => {
      try {
        const repos = await listOrgRepos(api, org.login);
        return repos.map((repo) => ({ owner: org.login, repo: repo.name }));
      } catch (_error) {
        return [];
      }
    }));
    const repos = repoSets.flat();

    for (let index = 0; index < repos.length; index += 5) {
      const batch = repos.slice(index, index + 5);
      const results = await Promise.all(batch.map(async (target) => {
        try {
          const prs = await listOpenPullRequests(api, target.owner, target.repo);
          const mine = prs.filter((pullRequest) => pullRequest.user && pullRequest.user.login === user.login);
          return mine.length ? { ...target, pullRequests: mine } : null;
        } catch (_error) {
          return null;
        }
      }));

      repoGroups.push(...results.filter(Boolean));
    }

    const total = repoGroups.reduce((sum, group) => sum + group.pullRequests.length, 0);

    if (!total) {
      push(React.createElement(Text, { color: theme.WARNING }, 'No open pull requests found.'));
      return;
    }

    push(React.createElement(
      Box,
      { flexDirection: 'column' },
      ...repoGroups.map((group) => React.createElement(
        Box,
        { key: `${group.owner}/${group.repo}`, flexDirection: 'column', marginBottom: 1 },
        React.createElement(Text, { color: theme.TEXT_PRIMARY, bold: true }, `${group.owner}/${group.repo} (${group.pullRequests.length} PRs)`),
        React.createElement(PRTable, {
          pullRequests: group.pullRequests,
          owner: group.owner,
          repo: group.repo,
          showUrl: false
        })
      )),
      React.createElement(Text, { color: theme.TEXT_MUTED }, `Total: ${total} open PRs across ${repoGroups.length} repos`)
    ));
  } catch (error) {
    push(React.createElement(Text, { color: theme.ERROR }, `✖ ${formatApiError(error).message}`));
  } finally {
    setMode('idle');
  }
}

module.exports = mineCommand;
