const React = require('react');
const { Box, Text, useApp, useInput } = require('ink');
const { format } = require('timeago.js');
const { buildApi, getAuthenticatedUser, listPullRequests, formatApiError } = require('../../lib/api');
const Header = require('../components/Header');
const Spinner = require('../components/Spinner');
const ErrorBox = require('../components/ErrorBox');

function StatsScreen(props) {
  const { exit } = useApp();
  const [state, setState] = React.useState({ loading: true, error: null, stats: null });
  const embedded = typeof props.onBack === 'function';

  useInput((input, key) => {
    if (!embedded) {
      return;
    }

    if (input === 'q' || key.escape) {
      props.onBack();
    }
  });

  React.useEffect(() => {
    const api = buildApi(props.config);

    (async () => {
      try {
        const [user, pullRequests] = await Promise.all([
          getAuthenticatedUser(api),
          listPullRequests(api, props.repo.owner, props.repo.repo, 'all')
        ]);

        const mine = pullRequests.filter((pullRequest) => pullRequest.user && pullRequest.user.login === user.login);
        const open = mine.filter((pullRequest) => pullRequest.state === 'open');
        const closed = mine.filter((pullRequest) => pullRequest.state !== 'open');
        const now = new Date();
        const thisMonth = mine.filter((pullRequest) => {
          const created = new Date(pullRequest.created_at);
          return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
        });
        const oldestOpen = open.slice().sort((a, b) => new Date(a.created_at) - new Date(b.created_at))[0];
        const mostRecent = mine.slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];

        setState({
          loading: false,
          error: null,
          stats: { mine, open, closed, thisMonth, oldestOpen, mostRecent }
        });
      } catch (error) {
        setState({ loading: false, error: formatApiError(error).message, stats: null });
      }

      if (!embedded) {
        setTimeout(exit, 0);
      }
    })();
  }, [embedded, exit, props.config, props.repo.owner, props.repo.repo]);

  return React.createElement(
    Box,
    { flexDirection: 'column' },
    React.createElement(Header, { title: 'Your PR Stats', repo: `${props.repo.owner}/${props.repo.repo}`, branch: props.repo.branch }),
    state.loading ? React.createElement(Spinner, { text: 'Calculating statistics...' }) : null,
    !state.loading && state.error ? React.createElement(ErrorBox, { message: state.error }) : null,
    !state.loading && !state.error && state.stats ? React.createElement(
      Box,
      { flexDirection: 'column' },
      React.createElement(Text, { color: '#F9FAFB' }, `Total PRs opened    : ${state.stats.mine.length}`),
      React.createElement(Text, { color: '#F59E0B' }, `Currently open      : ${state.stats.open.length}`),
      React.createElement(Text, { color: '#10B981' }, `Merged / Closed     : ${state.stats.closed.length}`),
      React.createElement(Text, { color: '#F9FAFB' }, `This month          : ${state.stats.thisMonth.length}`),
      React.createElement(Text, { color: '#EF4444' }, `Oldest open PR      : ${state.stats.oldestOpen ? `PR #${state.stats.oldestOpen.number} — ${state.stats.oldestOpen.title} (${format(state.stats.oldestOpen.created_at)})` : 'None'}`),
      React.createElement(Text, { color: '#F9FAFB' }, `Most recent PR      : ${state.stats.mostRecent ? `PR #${state.stats.mostRecent.number} — ${state.stats.mostRecent.title} (${format(state.stats.mostRecent.created_at)})` : 'None'}`)
    ) : null,
    embedded ? React.createElement(Text, { color: '#6B7280' }, 'q back') : null
  );
}

module.exports = StatsScreen;
