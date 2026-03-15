const React = require('react');
const { Box, Text, useApp, useInput } = require('ink');
const { buildApi, listOpenPullRequests, formatApiError } = require('../../lib/api');
const Header = require('../components/Header');
const Spinner = require('../components/Spinner');
const PRTable = require('../components/PRTable');

function WatchScreen(props) {
  const { exit } = useApp();
  const [pullRequests, setPullRequests] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [warning, setWarning] = React.useState(null);
  const [countdown, setCountdown] = React.useState(30);
  const [lastUpdated, setLastUpdated] = React.useState(null);

  const refresh = React.useCallback(async () => {
    const api = buildApi(props.config);

    try {
      const data = await listOpenPullRequests(api, props.repo.owner, props.repo.repo);
      setPullRequests(data);
      setWarning(null);
      setLastUpdated(new Date());
    } catch (error) {
      setWarning(formatApiError(error).message);
    }

    setLoading(false);
    setCountdown(30);
  }, [props.config, props.repo.owner, props.repo.repo]);

  useInput((input) => {
    if (input === 'q') {
      exit();
    }

    if (input === 'r') {
      refresh();
    }
  });

  React.useEffect(() => {
    refresh();

    const tick = setInterval(() => {
      setCountdown((current) => {
        if (current <= 1) {
          refresh();
          return 30;
        }

        return current - 1;
      });
    }, 1000);

    return () => {
      clearInterval(tick);
    };
  }, [refresh]);

  return React.createElement(
    Box,
    { flexDirection: 'column' },
    React.createElement(Header, { title: `Live PR Watch — ${props.repo.owner}/${props.repo.repo} 🔄`, repo: `${props.repo.owner}/${props.repo.repo}`, branch: props.repo.branch }),
    loading ? React.createElement(Spinner, { text: 'Loading pull requests...' }) : null,
    !loading ? React.createElement(PRTable, {
      pullRequests,
      owner: props.repo.owner,
      repo: props.repo.repo
    }) : null,
    React.createElement(
      Text,
      { color: warning ? '#F59E0B' : '#6B7280' },
      `${warning ? `Warning: ${warning} | ` : ''}Last updated: ${lastUpdated ? lastUpdated.toLocaleTimeString('en-GB', { hour12: false }) : '--:--:--'} | Refreshing in ${countdown}s | r refresh | q quit`
    )
  );
}

module.exports = WatchScreen;
