const React = require('react');
const { Box, Text, useInput } = require('ink');
const { format } = require('timeago.js');
const { runGit } = require('../../lib/git');
const { buildApi, listOpenPullRequests, formatApiError } = require('../../lib/api');
const theme = require('../theme');

const REFRESH_SECONDS = 10;
let activeLgId = 0;

async function lgCommand(_args, context) {
  const { config, repo, push, setMode, runCommand, pushCommand, setInputPaused } = context;
  setMode('loading');

  try {
    const api = buildApi(config);
    const [gitData, pullRequests] = await Promise.all([
      loadGitData(),
      listOpenPullRequests(api, repo.owner, repo.repo).catch(() => [])
    ]);

    activeLgId += 1;
    const lgId = activeLgId;

    push(React.createElement(LgLayout, {
      lgId,
      config,
      repo,
      initialGitData: gitData,
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

function LgLayout(props) {
  const [gitData, setGitData] = React.useState(props.initialGitData || emptyGitData());
  const [pullRequests, setPullRequests] = React.useState(props.initialPullRequests || []);
  const [refreshIn, setRefreshIn] = React.useState(REFRESH_SECONDS);
  const [lastUpdate, setLastUpdate] = React.useState(new Date().toLocaleTimeString('en-GB', { hour12: false }));
  const [error, setError] = React.useState(null);
  const [done, setDone] = React.useState(false);
  const [focus, setFocus] = React.useState('commits');
  const [commitCursor, setCommitCursor] = React.useState(0);
  const [reflogCursor, setReflogCursor] = React.useState(0);
  const [prCursor, setPrCursor] = React.useState(0);
  const isActive = !done && props.lgId === activeLgId;

  const refresh = React.useCallback(async () => {
    try {
      const api = buildApi(props.config);
      const [nextGitData, nextPRs] = await Promise.all([
        loadGitData(),
        listOpenPullRequests(api, props.repo.owner, props.repo.repo).catch(() => [])
      ]);

      setGitData(nextGitData);
      const sortedPRs = sortByUpdated(nextPRs);
      setPullRequests(sortedPRs);
      setCommitCursor((value) => clamp(value, 0, Math.max(0, nextGitData.commits.length - 1)));
      setReflogCursor((value) => clamp(value, 0, Math.max(0, nextGitData.reflog.length - 1)));
      setPrCursor((value) => clamp(value, 0, Math.max(0, sortedPRs.length - 1)));
      setLastUpdate(new Date().toLocaleTimeString('en-GB', { hour12: false }));
      setError(null);
    } catch (issue) {
      setError(issue.message || 'Refresh failed');
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
          refresh();
          return REFRESH_SECONDS;
        }

        return value - 1;
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [isActive, refresh]);

  useInput((input, key) => {
    if (!isActive) {
      return;
    }

    if (key.tab) {
      const order = ['status', 'branches', 'commits', 'reflog', 'prs'];
      const current = order.indexOf(focus);
      const next = key.shift ? (current <= 0 ? order.length - 1 : current - 1) : (current >= order.length - 1 ? 0 : current + 1);
      setFocus(order[next]);
      return;
    }

    if (key.leftArrow) {
      setFocus((value) => (value === 'prs' ? 'commits' : value));
      return;
    }

    if (key.rightArrow) {
      setFocus((value) => (value === 'commits' || value === 'reflog' ? 'prs' : value));
      return;
    }

    if (key.upArrow) {
      if (focus === 'commits') {
        setCommitCursor((value) => Math.max(0, value - 1));
      } else if (focus === 'reflog') {
        setReflogCursor((value) => Math.max(0, value - 1));
      } else if (focus === 'prs') {
        setPrCursor((value) => Math.max(0, value - 1));
      }
      return;
    }

    if (key.downArrow) {
      if (focus === 'commits') {
        setCommitCursor((value) => Math.min(gitData.commits.length - 1, value + 1));
      } else if (focus === 'reflog') {
        setReflogCursor((value) => Math.min(gitData.reflog.length - 1, value + 1));
      } else if (focus === 'prs') {
        setPrCursor((value) => Math.min(pullRequests.length - 1, value + 1));
      }
      return;
    }

    if (input === 'r') {
      refresh();
      return;
    }

    if (input === 'o') {
      leaveAndRun(props, setDone, '/open');
      return;
    }

    if (input === 'q' || key.escape) {
      setDone(true);
      if (typeof props.setInputPaused === 'function') {
        props.setInputPaused(false);
      }
      return;
    }

    const selectedPR = pullRequests[prCursor];

    if (input === 'v' && selectedPR) {
      leaveAndRun(props, setDone, `/review ${selectedPR.number}`);
      return;
    }

    if (input === 'm' && selectedPR) {
      leaveAndRun(props, setDone, `/merge ${selectedPR.number}`);
      return;
    }

    if (input === 'c' && selectedPR) {
      leaveAndRun(props, setDone, `/close ${selectedPR.number}`);
      return;
    }

    if (input === 'b' && selectedPR) {
      leaveAndRun(props, setDone, `/checkout ${selectedPR.number}`);
      return;
    }
  });

  const width = process.stdout.columns || 150;
  const leftWidth = Math.max(56, Math.floor(width * 0.44));
  const rightWidth = Math.max(48, width - leftWidth - 4);
  const selectedCommit = gitData.commits[commitCursor] || null;
  const selectedReflog = gitData.reflog[reflogCursor] || null;
  const selectedPR = pullRequests[prCursor] || null;

  return React.createElement(
    Box,
    { flexDirection: 'column', marginBottom: 1 },
    React.createElement(
      Box,
      { borderStyle: 'single', borderColor: theme.BORDER, paddingX: 1, flexDirection: 'column' },
      React.createElement(
        Box,
        null,
        React.createElement(Text, { color: theme.PRIMARY, bold: true }, 'GPR'),
        React.createElement(Text, { color: theme.TEXT_MUTED }, '  lazy-shell')
      ),
      React.createElement(
        Box,
        null,
        React.createElement(Text, { color: theme.TEXT_MUTED }, 'repo: '),
        React.createElement(Text, { color: theme.TEXT_PRIMARY }, `${props.repo.owner}/${props.repo.repo}`),
        React.createElement(Text, { color: theme.TEXT_MUTED }, '  branch: '),
        React.createElement(Text, { color: theme.INFO }, props.repo.branch),
        React.createElement(Text, { color: theme.TEXT_MUTED }, `  updated: ${lastUpdate} (+${refreshIn}s)`),
        error ? React.createElement(Text, { color: theme.ERROR }, `  ✖ ${error}`) : null
      )
    ),
    React.createElement(
      Box,
      { flexDirection: 'row' },
      React.createElement(
        Box,
        { width: leftWidth, flexDirection: 'column' },
        panel('Status', focus === 'status', leftWidth, renderStatus(gitData.status)),
        panel('Branches', focus === 'branches', leftWidth, renderSimpleList(gitData.branches, 8)),
        panel('Commits', focus === 'commits', leftWidth, renderSelectableList(gitData.commits, commitCursor, focus === 'commits', formatCommitRow, 10)),
        panel('Reflog', focus === 'reflog', leftWidth, renderSelectableList(gitData.reflog, reflogCursor, focus === 'reflog', formatReflogRow, 8)),
        panel('Stash', false, leftWidth, renderSimpleList(gitData.stash, 3))
      ),
      React.createElement(Box, { width: 2 }, React.createElement(Text, { color: theme.BORDER_DIM }, ' ')),
      React.createElement(
        Box,
        { width: rightWidth, flexDirection: 'column' },
        panel('Patch', focus === 'commits' || focus === 'reflog', rightWidth, renderPatch(gitData, selectedCommit, selectedReflog, rightWidth - 6)),
        panel('PRs', focus === 'prs', rightWidth, renderSelectableList(pullRequests, prCursor, focus === 'prs', formatPrRow, 12)),
        panel('PR Detail', focus === 'prs', rightWidth, renderPrDetail(selectedPR, rightWidth - 6))
      )
    ),
    React.createElement(
      Box,
      { borderStyle: 'single', borderColor: theme.BORDER_DIM, paddingX: 1 },
      React.createElement(
        Text,
        { color: theme.TEXT_DIM },
        React.createElement(Text, { color: theme.WARNING }, 'Tab'),
        ' next-pane  ',
        React.createElement(Text, { color: theme.WARNING }, '↑↓'),
        ' move  ',
        React.createElement(Text, { color: theme.WARNING }, 'r'),
        ' refresh  ',
        React.createElement(Text, { color: theme.WARNING }, 'o'),
        ' open-pr  ',
        React.createElement(Text, { color: theme.WARNING }, 'v'),
        ' review-pr  ',
        React.createElement(Text, { color: theme.WARNING }, 'm'),
        ' merge-pr  ',
        React.createElement(Text, { color: theme.WARNING }, 'c'),
        ' close-pr  ',
        React.createElement(Text, { color: theme.WARNING }, 'q'),
        ' back-to-input',
        React.createElement(Text, { color: theme.TEXT_MUTED }, '  |  type / for command suggestions')
      )
    )
  );
}

function panel(title, active, width, children) {
  return React.createElement(
    Box,
    {
      flexDirection: 'column',
      borderStyle: 'round',
      borderColor: active ? theme.PRIMARY : theme.BORDER_DIM,
      paddingX: 1,
      width,
      marginBottom: 0
    },
    React.createElement(Text, { color: active ? theme.PRIMARY : theme.SECONDARY, bold: true }, title),
    children
  );
}

function renderStatus(lines) {
  if (!lines.length) {
    return React.createElement(Text, { color: theme.TEXT_MUTED }, 'clean working tree');
  }

  return React.createElement(
    Box,
    { flexDirection: 'column' },
    ...lines.slice(0, 5).map((line, index) => React.createElement(Text, { key: `status-${index}`, color: theme.TEXT_PRIMARY }, truncate(line, 80)))
  );
}

function renderSimpleList(lines, max) {
  if (!lines.length) {
    return React.createElement(Text, { color: theme.TEXT_MUTED }, '-');
  }

  return React.createElement(
    Box,
    { flexDirection: 'column' },
    ...lines.slice(0, max).map((line, index) => React.createElement(Text, { key: `line-${index}`, color: theme.TEXT_PRIMARY }, truncate(line, 80)))
  );
}

function renderSelectableList(rows, cursor, active, formatter, max) {
  if (!rows.length) {
    return React.createElement(Text, { color: theme.TEXT_MUTED }, '-');
  }

  return React.createElement(
    Box,
    { flexDirection: 'column' },
    ...rows.slice(0, max).map((row, index) => {
      const selected = active && index === cursor;
      return React.createElement(
        Box,
        { key: `row-${index}`, backgroundColor: selected ? theme.SELECTED_BG : undefined },
        React.createElement(Text, { color: selected ? theme.SELECTED_TEXT : theme.TEXT_PRIMARY }, formatter(row))
      );
    })
  );
}

function renderPatch(gitData, selectedCommit, selectedReflog, width) {
  if (selectedCommit && selectedCommit.patch && selectedCommit.patch.length) {
    return React.createElement(
      Box,
      { flexDirection: 'column' },
      ...selectedCommit.patch.slice(0, 12).map((line, index) => React.createElement(Text, {
        key: `patch-c-${index}`,
        color: colorForPatchLine(line)
      }, truncate(line, width)))
    );
  }

  if (selectedReflog && selectedReflog.patch && selectedReflog.patch.length) {
    return React.createElement(
      Box,
      { flexDirection: 'column' },
      ...selectedReflog.patch.slice(0, 12).map((line, index) => React.createElement(Text, {
        key: `patch-r-${index}`,
        color: colorForPatchLine(line)
      }, truncate(line, width)))
    );
  }

  if (gitData.lastPatch.length) {
    return React.createElement(
      Box,
      { flexDirection: 'column' },
      ...gitData.lastPatch.slice(0, 12).map((line, index) => React.createElement(Text, {
        key: `patch-l-${index}`,
        color: colorForPatchLine(line)
      }, truncate(line, width)))
    );
  }

  return React.createElement(Text, { color: theme.TEXT_MUTED }, 'No patch preview available.');
}

function renderPrDetail(pr, width) {
  if (!pr) {
    return React.createElement(Text, { color: theme.TEXT_MUTED }, 'No open PR selected.');
  }

  return React.createElement(
    Box,
    { flexDirection: 'column' },
    React.createElement(Text, { color: theme.PRIMARY, bold: true }, `#${pr.number} ${truncate(pr.title, width)}`),
    React.createElement(Text, { color: theme.TEXT_MUTED }, `${truncate(pr.head && pr.head.ref, 26)} -> ${truncate(pr.base && pr.base.ref, 26)}`),
    React.createElement(Text, { color: theme.TEXT_MUTED }, `Author: ${pr.user && pr.user.login ? pr.user.login : 'unknown'}`),
    React.createElement(Text, { color: theme.TEXT_MUTED }, `Updated: ${format(pr.updated_at)}`),
    React.createElement(Text, { color: theme.INFO }, truncate(pr.html_url || '', width))
  );
}

async function loadGitData() {
  const [status, branches, commits, reflog, stash, lastPatch] = await Promise.all([
    runGitSafe(['status', '--short', '--branch']),
    runGitSafe(['branch', '--sort=-committerdate']),
    runGitSafe(['log', '--oneline', '--decorate', '-n', '25']),
    runGitSafe(['reflog', '--date=relative', '-n', '25', '--pretty=format:%h %gd %gs (%cr)']),
    runGitSafe(['stash', 'list']),
    runGitSafe(['show', '--stat', '--oneline', '--no-color', '-n', '1'])
  ]);

  const commitRows = commits.lines.map((line) => {
    const parts = line.split(' ');
    const sha = parts[0] || '';
    return {
      sha,
      text: line,
      patch: []
    };
  });

  await Promise.all(commitRows.slice(0, 8).map(async (entry) => {
    if (!entry.sha) {
      return;
    }
    const patch = await runGitSafe(['show', '--stat', '--oneline', '--no-color', entry.sha]);
    entry.patch = patch.lines.slice(0, 16);
  }));

  const reflogRows = reflog.lines.map((line) => {
    const sha = line.split(' ')[0] || '';
    return {
      sha,
      text: line,
      patch: []
    };
  });

  await Promise.all(reflogRows.slice(0, 8).map(async (entry) => {
    if (!entry.sha) {
      return;
    }
    const patch = await runGitSafe(['show', '--stat', '--oneline', '--no-color', entry.sha]);
    entry.patch = patch.lines.slice(0, 16);
  }));

  return {
    status: status.lines,
    branches: branches.lines.map((line) => line.replace(/^\*/, '*').trim()),
    commits: commitRows,
    reflog: reflogRows,
    stash: stash.lines,
    lastPatch: lastPatch.lines.slice(0, 16)
  };
}

async function runGitSafe(args) {
  try {
    const result = await runGit(args);
    return {
      lines: String(result.stdout || '').split('\n').map((line) => line.trimEnd()).filter(Boolean)
    };
  } catch (error) {
    return {
      lines: [error.message || 'git command failed']
    };
  }
}

function emptyGitData() {
  return {
    status: [],
    branches: [],
    commits: [],
    reflog: [],
    stash: [],
    lastPatch: []
  };
}

function leaveAndRun(props, setDone, command) {
  setDone(true);
  if (typeof props.setInputPaused === 'function') {
    props.setInputPaused(false);
  }
  props.pushCommand(command);
  props.runCommand(command);
}

function sortByUpdated(pullRequests) {
  return (pullRequests || []).slice().sort((left, right) => (
    new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime()
  ));
}

function formatCommitRow(row) {
  return truncate(row && row.text ? row.text : '', 120);
}

function formatReflogRow(row) {
  return truncate(row && row.text ? row.text : '', 120);
}

function formatPrRow(row) {
  if (!row) {
    return '';
  }

  return `#${String(row.number).padEnd(4, ' ')} ${truncate(row.title, 38)}`;
}

function truncate(text, max) {
  const value = String(text || '');
  if (value.length <= max) {
    return value;
  }

  return `${value.slice(0, Math.max(0, max - 1))}…`;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function colorForPatchLine(line) {
  if (line.startsWith('+')) {
    return theme.SUCCESS;
  }
  if (line.startsWith('-')) {
    return theme.ERROR;
  }
  if (line.startsWith('diff --git') || line.startsWith('@@')) {
    return theme.WARNING;
  }
  return theme.TEXT_PRIMARY;
}

module.exports = lgCommand;
