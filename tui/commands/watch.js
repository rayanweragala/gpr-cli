const React = require('react');
const { Box, Text } = require('ink');
const { buildApi, listOpenPullRequests, formatApiError } = require('../../lib/api');
const PRTable = require('../components/PRTable');
const theme = require('../theme');

async function watchCommand(_args, context) {
  context.push(React.createElement(WatchBlock, {
    config: context.config,
    repo: context.repo
  }));
}

function WatchBlock(props) {
  const [pullRequests, setPullRequests] = React.useState([]);
  const [tick, setTick] = React.useState(30);
  const [lastUpdate, setLastUpdate] = React.useState(null);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    let countdown = 30;

    const fetchData = async () => {
      try {
        const api = buildApi(props.config);
        const data = await listOpenPullRequests(api, props.repo.owner, props.repo.repo);
        setPullRequests(data);
        setLastUpdate(new Date().toLocaleTimeString('en-GB', { hour12: false }));
        setError(null);
      } catch (issue) {
        setError(formatApiError(issue).message);
      }
      setTick(30);
    };

    fetchData();

    const intervalId = setInterval(() => {
      countdown -= 1;
      setTick(countdown);

      if (countdown <= 0) {
        countdown = 30;
        fetchData();
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [props.config, props.repo.owner, props.repo.repo]);

  return React.createElement(
    Box,
    { flexDirection: 'column', marginBottom: 1 },
    React.createElement(Text, { color: theme.PRIMARY, bold: true }, `⟳ Live Watch — ${props.repo.owner}/${props.repo.repo}`),
    error
      ? React.createElement(Text, { color: theme.ERROR }, `✖ ${error}`)
      : React.createElement(PRTable, {
          pullRequests,
          owner: props.repo.owner,
          repo: props.repo.repo
        }),
    React.createElement(Text, { color: theme.TEXT_MUTED }, `Updated: ${lastUpdate || 'loading...'}  |  Refreshing in ${tick}s  |  /watch again to add another`)
  );
}

module.exports = watchCommand;
