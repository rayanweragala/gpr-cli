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
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const [reviewPR, setReviewPR] = React.useState(null);
  const api = React.useMemo(() => buildApi(props.config), [props.config]);
  const repoLabel = `${props.repo.owner}/${props.repo.repo}`;

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await listOpenPullRequests(api, props.repo.owner, props.repo.repo);
      setPullRequests(data);
      setSelectedIndex(0);
    } catch (issue) {
      setError(formatApiError(issue).message);
    }

    setLoading(false);
  }, [api, props.repo.owner, props.repo.repo]);

  React.useEffect(() => {
    load();
  }, [load]);

  useInput((input, key) => {
    if (reviewPR) {
      return;
    }

    if (key.upArrow) {
      setSelectedIndex((index) => Math.max(0, index - 1));
    }

    if (key.downArrow) {
      setSelectedIndex((index) => Math.min(Math.max(0, pullRequests.length - 1), index + 1));
    }

    if (key.return && pullRequests[selectedIndex]) {
      setReviewPR(pullRequests[selectedIndex]);
    }

    if (input === 'r') {
      load();
    }

    if (input === 'q' || key.escape) {
      exit();
    }
  }, { isActive: !loading });

  if (reviewPR) {
    return React.createElement(ReviewScreen, {
      config: props.config,
      repo: props.repo,
      prNumber: reviewPR.number,
      onBack: () => setReviewPR(null)
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
      selectedIndex
    }) : null,
    React.createElement(
      Text,
      { color: '#6B7280' },
      `Total: ${pullRequests.length} open pull requests | ↑↓ navigate | Enter review | r refresh | q quit`
    )
  );
}

module.exports = ListScreen;
