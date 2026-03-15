const React = require('react');
const { Box, Text } = require('ink');
const {
  buildApi,
  findPullRequestByBranch,
  listBranches,
  formatApiError
} = require('../../lib/api');
const { getDiffSummary } = require('../../lib/git');
const theme = require('../theme');

async function diffCommand(_args, context) {
  const { config, repo, push, setMode } = context;
  setMode('loading');

  try {
    const api = buildApi(config);
    let baseBranch = 'main';
    const pullRequest = await findPullRequestByBranch(api, repo.owner, repo.repo, repo.branch).catch(() => null);

    if (pullRequest && pullRequest.base && pullRequest.base.ref) {
      baseBranch = pullRequest.base.ref;
    } else {
      const branches = await listBranches(api, repo.owner, repo.repo);
      if (!branches.find((branch) => branch.name === 'main') && branches.length) {
        baseBranch = branches.find((branch) => branch.name === 'master')
          ? 'master'
          : branches[0].name;
      }
    }

    const diff = await getDiffSummary(baseBranch, repo.branch);

    if (diff.summary.filesChanged === 0) {
      push(React.createElement(Text, { color: theme.SUCCESS }, `✔ No changes detected vs ${baseBranch}`));
      return;
    }

    const terminalRows = process.stdout.rows || 40;
    const visibleFiles = Math.max(3, terminalRows - 10);
    const displayedFiles = diff.files.slice(0, visibleFiles);
    const hiddenCount = Math.max(0, diff.files.length - displayedFiles.length);

    push(React.createElement(
      Box,
      { flexDirection: 'column' },
      React.createElement(Text, { color: theme.PRIMARY, bold: true }, `Diff: ${repo.branch} → ${baseBranch}`),
      ...displayedFiles.map((file) => React.createElement(
        Box,
        { key: file.path },
        React.createElement(
          Text,
          {
            color: file.status === 'A' ? theme.SUCCESS : file.status === 'D' ? theme.ERROR : theme.TEXT_PRIMARY,
            bold: file.status !== 'M'
          },
          formatFileLine(file)
        )
      )),
      hiddenCount > 0
        ? React.createElement(
            Text,
            { color: theme.TEXT_MUTED },
            `... ${hiddenCount} more file${hiddenCount === 1 ? '' : 's'} not shown`
          )
        : null,
      React.createElement(
        Text,
        { color: theme.TEXT_MUTED },
        `${diff.summary.filesChanged} files changed  `
      ),
      React.createElement(Text, { color: theme.SUCCESS }, `+${diff.summary.additions} additions  `),
      React.createElement(Text, { color: theme.ERROR }, `-${diff.summary.deletions} deletions`)
    ));
  } catch (error) {
    const issue = error.handled ? error : formatApiError(error);
    push(React.createElement(Text, { color: theme.ERROR }, `✖ ${issue.message}`));
  } finally {
    setMode('idle');
  }
}

function marker(status) {
  if (status === 'A') {
    return '[NEW] ';
  }

  if (status === 'D') {
    return '[DEL] ';
  }

  return '';
}

function formatFileLine(file) {
  const stats = `  +${file.additions}  -${file.deletions}`;
  const maxWidth = Math.max(24, (process.stdout.columns || 120) - stats.length);
  const path = truncate(`${marker(file.status)}${file.path}`, maxWidth);
  return `${path}${stats}`;
}

function truncate(value, width) {
  const text = String(value || '');
  return text.length <= width ? text : `${text.slice(0, Math.max(0, width - 1))}…`;
}

module.exports = diffCommand;
