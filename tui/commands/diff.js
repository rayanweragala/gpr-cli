const React = require('react');
const { Box, Text } = require('ink');
const {
  buildApi,
  findPullRequestByBranch,
  listBranches,
  formatApiError
} = require('../../lib/api');
const { getDiffSummary } = require('../../lib/git');

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
      push(React.createElement(Text, { color: '#10B981' }, `✔ No changes detected vs ${baseBranch}`));
      return;
    }

    push(React.createElement(
      Box,
      { flexDirection: 'column' },
      React.createElement(Text, { color: '#7C3AED', bold: true }, `Diff: ${repo.branch} → ${baseBranch}`),
      ...diff.files.map((file) => React.createElement(
        Box,
        { key: file.path },
        React.createElement(Text, { color: file.status === 'A' ? '#10B981' : file.status === 'D' ? '#EF4444' : '#F9FAFB', bold: file.status !== 'M' }, `${marker(file.status)}${file.path}`),
        React.createElement(Text, { color: '#10B981' }, `  +${file.additions}`),
        React.createElement(Text, { color: '#EF4444' }, `  -${file.deletions}`)
      )),
      React.createElement(
        Text,
        { color: '#6B7280' },
        `${diff.summary.filesChanged} files changed  `
      ),
      React.createElement(Text, { color: '#10B981' }, `+${diff.summary.additions} additions  `),
      React.createElement(Text, { color: '#EF4444' }, `-${diff.summary.deletions} deletions`)
    ));
  } catch (error) {
    const issue = error.handled ? error : formatApiError(error);
    push(React.createElement(Text, { color: '#EF4444' }, `✖ ${issue.message}`));
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

module.exports = diffCommand;
