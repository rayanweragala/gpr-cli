const React = require('react');
const { Box, Text, useApp, useInput } = require('ink');
const { buildApi, listOpenPullRequests, formatApiError } = require('../../lib/api');
const Header = require('../components/Header');
const Spinner = require('../components/Spinner');
const ErrorBox = require('../components/ErrorBox');
const SuccessBox = require('../components/SuccessBox');
const PRTable = require('../components/PRTable');

function StaleScreen(props) {
  const { exit } = useApp();
  const [state, setState] = React.useState({ loading: true, error: null, stale: [] });
  const days = Number(props.days || 7);

  useInput((input, key) => {
    if (input === 'q' || key.escape) {
      if (typeof props.onBack === 'function') {
        props.onBack();
      } else {
        exit();
      }
    }
  });

  React.useEffect(() => {
    const api = buildApi(props.config);

    listOpenPullRequests(api, props.repo.owner, props.repo.repo)
      .then((pullRequests) => {
        const threshold = Date.now() - (days * 24 * 60 * 60 * 1000);
        setState({
          loading: false,
          error: null,
          stale: pullRequests.filter((pullRequest) => new Date(pullRequest.updated_at).getTime() < threshold)
        });
      })
      .catch((error) => setState({ loading: false, error: formatApiError(error).message, stale: [] }));
  }, [days, props.config, props.repo.owner, props.repo.repo]);

  return React.createElement(
    Box,
    { flexDirection: 'column' },
    React.createElement(Header, { title: 'Stale Pull Requests', repo: `${props.repo.owner}/${props.repo.repo}`, branch: props.repo.branch }),
    state.loading ? React.createElement(Spinner, { text: 'Checking for stale pull requests...' }) : null,
    !state.loading && state.error ? React.createElement(ErrorBox, { message: state.error }) : null,
    !state.loading && !state.error && !state.stale.length ? React.createElement(SuccessBox, {
      title: 'No stale PRs!',
      lines: [{ label: 'Status', value: 'All pull requests have recent activity.' }]
    }) : null,
    !state.loading && !state.error && state.stale.length ? React.createElement(PRTable, {
      pullRequests: state.stale,
      owner: props.repo.owner,
      repo: props.repo.repo,
      showAuthor: false,
      showUrl: false,
      showIdle: true
    }) : null,
    React.createElement(Text, { color: '#6B7280' }, `${state.stale.length} stale PRs (no activity for ${days}d+) | q quit`)
  );
}

module.exports = StaleScreen;
