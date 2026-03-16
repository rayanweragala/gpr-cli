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
  const { config, repo, push, setMode } = context;
  setMode('loading');

  try {
    const api = buildApi(config);
    const user = await getAuthenticatedUser(api);
    let orgs = await listUserOrgs(api).catch(() => []);
    const allRepos = [];

    if (!orgs.length && repo) {
      orgs = [{ login: repo.owner }];
    }

    for (const org of orgs) {
      try {
        const repos = await listOrgRepos(api, org.login);
        repos.forEach((targetRepo) => allRepos.push({
          owner: org.login,
          repo: targetRepo.name
        }));
      } catch (_error) {
        // Skip org fetch failures.
      }
    }

    if (!allRepos.length && repo) {
      allRepos.push({
        owner: repo.owner,
        repo: repo.repo
      });
    }

    const repoGroups = [];

    for (let index = 0; index < allRepos.length; index += 5) {
      const batch = allRepos.slice(index, index + 5);
      const results = await Promise.all(batch.map(async (target) => {
        try {
          const prs = await listOpenPullRequests(api, target.owner, target.repo);
          const mine = prs.filter((pullRequest) => (
            pullRequest.user &&
            pullRequest.user.login &&
            pullRequest.user.login.toLowerCase() === user.login.toLowerCase()
          ));
          return mine.length ? { ...target, pullRequests: mine } : null;
        } catch (_error) {
          return null;
        }
      }));

      repoGroups.push(...results.filter(Boolean));
    }

    const total = repoGroups.reduce((sum, group) => sum + group.pullRequests.length, 0);

    if (!total) {
      push(React.createElement(
        Box,
        { flexDirection: 'column' },
        React.createElement(Text, { color: theme.WARNING }, `No open PRs found for ${user.login}`),
        React.createElement(
          Text,
          { color: theme.TEXT_MUTED },
          `Checked ${allRepos.length} repos across ${orgs.length} org${orgs.length > 1 ? 's' : ''}`
        ),
        React.createElement(
          Text,
          { color: theme.TEXT_DIM },
          `Orgs checked: ${orgs.map((org) => org.login).join(', ')}`
        )
      ));
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
      React.createElement(
        Box,
        { marginTop: 1 },
        React.createElement(Text, { color: theme.TEXT_MUTED }, `Total: ${String(total)} open PRs across ${String(repoGroups.length)} repos`)
      )
    ));
  } catch (error) {
    push(React.createElement(Text, { color: theme.ERROR }, `✖ ${formatApiError(error).message}`));
  } finally {
    setMode('idle');
  }
}

module.exports = mineCommand;
