const React = require('react');
const { Box, Text, useInput } = require('ink');
const { format } = require('timeago.js');
const {
  buildApi,
  listOpenPullRequests,
  getPullRequest,
  getPullRequestReviews,
  getPullRequestComments,
  formatApiError
} = require('../../lib/api');
const theme = require('../theme');

const REFRESH_SECONDS = 20;
let activeDashboardId = 0;

async function dashboardCommand(_args, context) {
  const { config, repo, push, setMode, runCommand, pushCommand, setInputPaused } = context;
  setMode('loading');

  try {
    const api = buildApi(config);
    const pullRequests = await listOpenPullRequests(api, repo.owner, repo.repo);
    activeDashboardId += 1;
    const dashboardId = activeDashboardId;

    push(React.createElement(DashboardBlock, {
      dashboardId,
      config,
      repo,
      initialPullRequests: sortByUpdated(pullRequests),
      runCommand,
      pushCommand,
      setInputPaused
    }));
  } catch (error) {
    push(React.createElement(Text, { color: theme.ERROR }, `✖ ${formatApiError(error).message}`));
  } finally {
    setMode('idle');
  }
}

function DashboardBlock(props) {
  const [pullRequests, setPullRequests] = React.useState(props.initialPullRequests || []);
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const [refreshIn, setRefreshIn] = React.useState(REFRESH_SECONDS);
  const [lastUpdate, setLastUpdate] = React.useState(new Date().toLocaleTimeString('en-GB', { hour12: false }));
  const [error, setError] = React.useState(null);
  const [done, setDone] = React.useState(false);
  const [detail, setDetail] = React.useState(null);
  const [detailError, setDetailError] = React.useState(null);
  const [loadingDetails, setLoadingDetails] = React.useState(false);
  const isActive = !done && props.dashboardId === activeDashboardId;
  const selected = pullRequests[selectedIndex] || null;

  const refreshData = React.useCallback(async () => {
    try {
      const api = buildApi(props.config);
      const list = await listOpenPullRequests(api, props.repo.owner, props.repo.repo);
      const sorted = sortByUpdated(list);
      setPullRequests(sorted);
      setSelectedIndex((current) => clamp(current, 0, Math.max(0, sorted.length - 1)));
      setLastUpdate(new Date().toLocaleTimeString('en-GB', { hour12: false }));
      setError(null);
    } catch (issue) {
      setError(formatApiError(issue).message);
    } finally {
      setRefreshIn(REFRESH_SECONDS);
    }
  }, [props.config, props.repo.owner, props.repo.repo]);

  React.useEffect(() => {
    if (isActive && typeof props.setInputPaused === 'function') {
      props.setInputPaused(true);
    }

    return () => {
      if (typeof props.setInputPaused === 'function') {
        props.setInputPaused(false);
      }
    };
  }, [isActive, props]);

  React.useEffect(() => {
    if (!isActive) {
      return undefined;
    }

    const intervalId = setInterval(() => {
      setRefreshIn((value) => {
        if (value <= 1) {
          refreshData();
          return REFRESH_SECONDS;
        }

        return value - 1;
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [isActive, refreshData]);

  React.useEffect(() => {
    let cancelled = false;

    async function loadDetails() {
      if (!selected) {
        setDetail(null);
        setDetailError(null);
        return;
      }

      setLoadingDetails(true);
      setDetailError(null);

      try {
        const api = buildApi(props.config);
        const [pullRequest, reviews, comments] = await Promise.all([
          getPullRequest(api, props.repo.owner, props.repo.repo, selected.number),
          safeLoad(() => getPullRequestReviews(api, props.repo.owner, props.repo.repo, selected.number)),
          safeLoad(() => getPullRequestComments(api, props.repo.owner, props.repo.repo, selected.number))
        ]);

        if (!cancelled) {
          setDetail({ pullRequest, reviews, comments });
        }
      } catch (issue) {
        if (!cancelled) {
          setDetailError(formatApiError(issue).message);
          setDetail(null);
        }
      } finally {
        if (!cancelled) {
          setLoadingDetails(false);
        }
      }
    }

    loadDetails();
    return () => {
      cancelled = true;
    };
  }, [props.config, props.repo.owner, props.repo.repo, selected && selected.number]);

  useInput((input, key) => {
    if (!isActive) {
      return;
    }

    if (key.upArrow) {
      setSelectedIndex((value) => Math.max(0, value - 1));
      return;
    }

    if (key.downArrow) {
      setSelectedIndex((value) => Math.min(pullRequests.length - 1, value + 1));
      return;
    }

    if (key.return && selected) {
      runAndLeave(props, setDone, `/review ${selected.number}`);
      return;
    }

    if (input === 'm' && selected) {
      runAndLeave(props, setDone, `/merge ${selected.number}`);
      return;
    }

    if (input === 'c' && selected) {
      runAndLeave(props, setDone, `/close ${selected.number}`);
      return;
    }

    if (input === 'r') {
      refreshData();
      return;
    }

    if (input === 'v' && selected && selected.html_url) {
      props.pushCommand(`/review ${selected.number}`);
      props.runCommand(`/review ${selected.number}`);
      return;
    }

    if (input === 'q' || key.tab || key.escape) {
      setDone(true);
      if (typeof props.setInputPaused === 'function') {
        props.setInputPaused(false);
      }
    }
  });

  const width = process.stdout.columns || 120;
  const leftWidth = Math.max(44, Math.floor(width * 0.42));
  const rightWidth = Math.max(40, width - leftWidth - 4);

  return React.createElement(
    Box,
    { flexDirection: 'column', marginBottom: 1 },
    React.createElement(
      Box,
      { flexDirection: 'row' },
      React.createElement(Text, { color: theme.PRIMARY, bold: true }, `Dashboard — ${props.repo.owner}/${props.repo.repo}`),
      React.createElement(Text, { color: theme.TEXT_MUTED }, `  Updated: ${lastUpdate}  Refresh: ${refreshIn}s`),
      error ? React.createElement(Text, { color: theme.ERROR }, `  ✖ ${error}`) : null
    ),
    React.createElement(Text, { color: theme.BORDER_DIM }, '─'.repeat(Math.max(40, width - 2))),
    React.createElement(
      Box,
      { flexDirection: 'row' },
      React.createElement(
        Box,
        {
          flexDirection: 'column',
          width: leftWidth,
          borderStyle: 'round',
          borderColor: theme.BORDER_DIM,
          paddingX: 1
        },
        React.createElement(Text, { color: theme.SECONDARY, bold: true }, `Open PRs (${pullRequests.length})`),
        ...renderListRows(pullRequests, selectedIndex, isActive),
        pullRequests.length === 0
          ? React.createElement(Text, { color: theme.TEXT_MUTED }, 'No open pull requests found.')
          : null
      ),
      React.createElement(
        Box,
        { width: 2 },
        React.createElement(Text, { color: theme.BORDER_DIM }, ' ')
      ),
      React.createElement(
        Box,
        {
          flexDirection: 'column',
          width: rightWidth,
          borderStyle: 'round',
          borderColor: theme.BORDER_DIM,
          paddingX: 1
        },
        React.createElement(Text, { color: theme.SECONDARY, bold: true }, 'Details'),
        renderDetail(selected, detail, loadingDetails, detailError, rightWidth - 4)
      )
    ),
    React.createElement(
      Box,
      { marginTop: 1 },
      React.createElement(
        Text,
        { color: theme.TEXT_DIM },
        React.createElement(Text, { color: theme.WARNING }, '↑↓'),
        ' select  ',
        React.createElement(Text, { color: theme.WARNING }, 'Enter'),
        ' review  ',
        React.createElement(Text, { color: theme.WARNING }, 'm'),
        ' merge  ',
        React.createElement(Text, { color: theme.WARNING }, 'c'),
        ' close  ',
        React.createElement(Text, { color: theme.WARNING }, 'r'),
        ' refresh  ',
        React.createElement(Text, { color: theme.WARNING }, 'q/Tab'),
        ' return input'
      )
    )
  );
}

function renderListRows(pullRequests, selectedIndex, isActive) {
  return pullRequests.slice(0, 14).map((pullRequest, index) => {
    const selected = isActive && index === selectedIndex;
    return React.createElement(
      Box,
      { key: pullRequest.number, backgroundColor: selected ? theme.SELECTED_BG : undefined },
      React.createElement(Text, { color: selected ? theme.SELECTED_TEXT : theme.SECONDARY, bold: true }, `#${String(pullRequest.number).padEnd(4, ' ')}`),
      React.createElement(Text, { color: selected ? theme.SELECTED_TEXT : theme.TEXT_PRIMARY }, `${truncate(pullRequest.title, 30)}  `),
      React.createElement(Text, { color: selected ? theme.SELECTED_TEXT : theme.INFO }, truncate(pullRequest.head && pullRequest.head.ref, 18))
    );
  });
}

function renderDetail(selected, detail, loadingDetails, detailError, width) {
  if (!selected) {
    return React.createElement(Text, { color: theme.TEXT_MUTED }, 'Select a pull request.');
  }

  if (loadingDetails) {
    return React.createElement(Text, { color: theme.TEXT_MUTED }, 'Loading details...');
  }

  if (detailError) {
    return React.createElement(Text, { color: theme.ERROR }, `✖ ${detailError}`);
  }

  const pullRequest = detail && detail.pullRequest ? detail.pullRequest : selected;
  const reviews = detail && Array.isArray(detail.reviews) ? detail.reviews : [];
  const comments = detail && Array.isArray(detail.comments) ? detail.comments : [];
  const approved = reviews.filter((review) => review.state === 'APPROVED').length;
  const changesRequested = reviews.filter((review) => review.state === 'CHANGES_REQUESTED').length;

  return React.createElement(
    Box,
    { flexDirection: 'column' },
    React.createElement(Text, { color: theme.PRIMARY, bold: true }, `#${pullRequest.number} ${truncate(pullRequest.title, width)}`),
    React.createElement(Text, { color: theme.TEXT_MUTED }, `${pullRequest.head.ref} -> ${pullRequest.base.ref}`),
    React.createElement(Text, { color: theme.TEXT_MUTED }, `Author: ${(pullRequest.user && pullRequest.user.login) || 'unknown'}  Updated: ${format(pullRequest.updated_at)}`),
    React.createElement(Text, { color: theme.SUCCESS }, `+${pullRequest.additions || 0}`),
    React.createElement(Text, { color: theme.ERROR }, `-${pullRequest.deletions || 0}`),
    React.createElement(Text, { color: theme.TEXT_MUTED }, `Files: ${pullRequest.changed_files || 0}  Comments: ${comments.length}`),
    React.createElement(Text, { color: theme.TEXT_MUTED }, `Reviews: ${reviews.length}  Approved: ${approved}  Changes: ${changesRequested}`),
    React.createElement(Text, { color: theme.INFO }, `URL: ${pullRequest.html_url || '(not available)'}`),
    React.createElement(Text, { color: theme.BORDER_DIM }, '─'.repeat(Math.max(20, Math.min(width, 72)))),
    React.createElement(Text, { color: theme.TEXT_PRIMARY }, truncateMultiline(pullRequest.body || '(No description)', width, 6))
  );
}

function runAndLeave(props, setDone, command) {
  setDone(true);
  if (typeof props.setInputPaused === 'function') {
    props.setInputPaused(false);
  }
  props.pushCommand(command);
  props.runCommand(command);
}

async function safeLoad(work) {
  try {
    return await work();
  } catch (error) {
    if (error.response && error.response.status === 404) {
      return [];
    }

    throw error;
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function truncate(value, width) {
  const text = String(value || '');
  if (text.length <= width) {
    return text;
  }

  return `${text.slice(0, Math.max(0, width - 1))}…`;
}

function truncateMultiline(value, width, maxLines) {
  const lines = String(value || '').split('\n').map((line) => truncate(line, width));
  if (lines.length <= maxLines) {
    return lines.join('\n');
  }

  return `${lines.slice(0, maxLines).join('\n')}\n…`;
}

function sortByUpdated(pullRequests) {
  return (pullRequests || []).slice().sort((left, right) => (
    new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime()
  ));
}

module.exports = dashboardCommand;
