const React = require('react');
const { Box, Text, useApp, useInput } = require('ink');
const {
  buildApi,
  getAuthenticatedUser,
  listUserOrgs,
  listOrgRepos,
  listOpenPullRequests,
  formatApiError
} = require('../../lib/api');
const Header = require('../components/Header');
const Spinner = require('../components/Spinner');
const ErrorBox = require('../components/ErrorBox');
const PRTable = require('../components/PRTable');

function MineScreen(props) {
  const { exit } = useApp();
  const [state, setState] = React.useState({ loading: true, error: null, groups: [], total: 0, progress: 'Checking repo 0 of 0...' });

  useInput((input) => {
    if (input === 'q') {
      if (typeof props.onBack === 'function') {
        props.onBack();
      } else {
        exit();
      }
    }
  });

  React.useEffect(() => {
    const api = buildApi(props.config);

    (async () => {
      try {
        const user = await getAuthenticatedUser(api);
        const orgs = await listUserOrgs(api);
        const repoSets = await Promise.all(orgs.map(async (org) => {
          try {
            const repos = await listOrgRepos(api, org.login);
            return repos.map((repo) => ({ owner: org.login, repo: repo.name }));
          } catch (_error) {
            return [];
          }
        }));

        const repos = repoSets.flat();
        const groups = [];

        for (let index = 0; index < repos.length; index += 5) {
          const batch = repos.slice(index, index + 5);
          setState((current) => ({ ...current, progress: `Checking repo ${Math.min(index + 5, repos.length)} of ${repos.length}...` }));
          const results = await Promise.all(batch.map(async (target) => {
            try {
              const pullRequests = await listOpenPullRequests(api, target.owner, target.repo);
              const mine = pullRequests.filter((pullRequest) => pullRequest.user && pullRequest.user.login === user.login);
              return mine.length ? { ...target, pullRequests: mine } : null;
            } catch (_error) {
              return null;
            }
          }));

          groups.push(...results.filter(Boolean));
        }

        const total = groups.reduce((sum, group) => sum + group.pullRequests.length, 0);
        setState({ loading: false, error: null, groups, total, progress: '' });
      } catch (error) {
        setState({ loading: false, error: formatApiError(error).message, groups: [], total: 0, progress: '' });
      }
    })();
  }, [props.config]);

  return React.createElement(
    Box,
    { flexDirection: 'column' },
    React.createElement(Header, { title: 'Your Open Pull Requests', repo: 'all repos', branch: '-' }),
    state.loading ? React.createElement(Spinner, { text: state.progress }) : null,
    !state.loading && state.error ? React.createElement(ErrorBox, { message: state.error }) : null,
    !state.loading && !state.error ? React.createElement(
      Box,
      { flexDirection: 'column' },
      ...state.groups.map((group) => React.createElement(
        Box,
        { key: `${group.owner}/${group.repo}`, flexDirection: 'column', marginBottom: 1 },
        React.createElement(Text, { color: '#F9FAFB' }, `${group.owner}/${group.repo} (${group.pullRequests.length} PRs)`),
        React.createElement(PRTable, {
          pullRequests: group.pullRequests,
          owner: group.owner,
          repo: group.repo,
          showAuthor: false,
          showUrl: false
        })
      )),
      React.createElement(Text, { color: '#6B7280' }, `Total: ${state.total} PRs across ${state.groups.length} repos`)
    ) : null,
    React.createElement(Text, { color: '#6B7280' }, 'q quit')
  );
}

module.exports = MineScreen;
