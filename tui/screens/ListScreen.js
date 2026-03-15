const React = require('react');
const { Box, Text, useApp, useInput } = require('ink');
const { buildApi, listOpenPullRequests, formatApiError } = require('../../lib/api');
const Header = require('../components/Header');
const PRTable = require('../components/PRTable');
const Spinner = require('../components/Spinner');
const ErrorBox = require('../components/ErrorBox');
const ReviewScreen = require('./ReviewScreen');

function ListScreen(props) {
  const { exit } = useApp();
  const [pullRequests, setPullRequests] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [activeReview, setActiveReview] = React.useState(null);
  const api = React.useMemo(() => buildApi(props.config), [props.config]);
  const repoLabel = `${props.repo.owner}/${props.repo.repo}`;

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await listOpenPullRequests(api, props.repo.owner, props.repo.repo);
      setPullRequests(data);
    } catch (issue) {
      setError(formatApiError(issue).message);
    }

    setLoading(false);
  }, [api, props.repo.owner, props.repo.repo]);

  React.useEffect(() => {
    load();
  }, [load]);

  useInput((input) => {
    if (activeReview) {
      return;
    }

    if (input === 'q') {
      exit();
    }

    if (input === 'r') {
      load();
    }
  });

  if (activeReview) {
    return React.createElement(ReviewScreen, {
      config: props.config,
      repo: props.repo,
      prNumber: activeReview,
      inline: true,
      onBack: () => setActiveReview(null)
    });
  }

  return React.createElement(
    Box,
    { flexDirection: 'column' },
    React.createElement(Header, { title: 'Open Pull Requests', repo: repoLabel, branch: props.repo.branch }),
    loading ? React.createElement(Spinner, { text: 'Loading pull requests...' }) : null,
    !loading && error ? React.createElement(ErrorBox, { message: error }) : null,
    !loading && !error ? React.createElement(PRTable, {
      pullRequests,
      owner: props.repo.owner,
      repo: props.repo.repo,
      onSelect: (pullRequest) => setActiveReview(pullRequest.number)
    }) : null,
    React.createElement(
      Text,
      { color: '#6B7280' },
      `Total: ${pullRequests.length} open pull requests | ↑↓ navigate | Enter review | r refresh | q quit`
    )
  );
}

module.exports = ListScreen;
