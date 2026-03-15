const React = require('react');
const { Box, Text, useApp } = require('ink');
const { buildApi, findPullRequestByBranchWithState, formatApiError } = require('../../lib/api');
const Header = require('../components/Header');
const Spinner = require('../components/Spinner');
const ErrorBox = require('../components/ErrorBox');
const StatusBadge = require('../components/StatusBadge');

function StatusScreen(props) {
  const { exit } = useApp();
  const [state, setState] = React.useState({ loading: true, error: null, pullRequest: null, status: 'none' });

  React.useEffect(() => {
    const api = buildApi(props.config);

    (async () => {
      try {
        const open = await findPullRequestByBranchWithState(api, props.repo.owner, props.repo.repo, props.repo.branch, 'open');

        if (open) {
          setState({ loading: false, error: null, pullRequest: open, status: open.merged_at ? 'merged' : 'open' });
          setTimeout(exit, 0);
          return;
        }

        const closed = await findPullRequestByBranchWithState(api, props.repo.owner, props.repo.repo, props.repo.branch, 'closed');
        setState({ loading: false, error: null, pullRequest: closed, status: closed ? (closed.merged_at ? 'merged' : 'closed') : 'none' });
      } catch (error) {
        setState({ loading: false, error: formatApiError(error).message, pullRequest: null, status: 'none' });
      }

      setTimeout(exit, 0);
    })();
  }, [exit, props.config, props.repo.branch, props.repo.owner, props.repo.repo]);

  return React.createElement(
    Box,
    { flexDirection: 'column' },
    React.createElement(Header, {
      title: 'Status',
      repo: `${props.repo.owner}/${props.repo.repo}`,
      branch: props.repo.branch
    }),
    state.loading ? React.createElement(Spinner, { text: 'Checking pull request status...' }) : null,
    !state.loading && state.error ? React.createElement(ErrorBox, { message: state.error }) : null,
    !state.loading && !state.error ? React.createElement(
      Box,
      { flexDirection: 'column' },
      React.createElement(Text, { color: '#F9FAFB' }, `Repo   : ${props.repo.owner}/${props.repo.repo}`),
      React.createElement(Text, { color: '#3B82F6' }, `Branch : ${props.repo.branch}`),
      React.createElement(
        Box,
        null,
        React.createElement(Text, { color: '#F9FAFB' }, 'PR     : '),
        React.createElement(StatusBadge, { state: state.status }),
        state.pullRequest ? React.createElement(Text, { color: '#F9FAFB' }, ` — ${state.pullRequest.html_url}`) : null
      )
    ) : null
  );
}

module.exports = StatusScreen;
