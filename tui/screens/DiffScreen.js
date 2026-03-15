const React = require('react');
const { Box, Text, useApp, useInput } = require('ink');
const { buildApi, findPullRequestByBranch, listBranches, formatApiError } = require('../../lib/api');
const { getDiffSummary } = require('../../lib/git');
const Header = require('../components/Header');
const Spinner = require('../components/Spinner');
const ErrorBox = require('../components/ErrorBox');

function DiffScreen(props) {
  const { exit } = useApp();
  const [state, setState] = React.useState({ loading: true, error: null, diff: null, base: 'main' });
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
      let baseBranch = 'main';

      try {
        const pullRequest = await findPullRequestByBranch(api, props.repo.owner, props.repo.repo, props.repo.branch);

        if (pullRequest && pullRequest.base && pullRequest.base.ref) {
          baseBranch = pullRequest.base.ref;
        } else {
          const branches = await listBranches(api, props.repo.owner, props.repo.repo);
          if (!branches.find((branch) => branch.name === baseBranch) && branches[0]) {
            baseBranch = branches.find((branch) => branch.name === 'master') ? 'master' : branches[0].name;
          }
        }

        const diff = await getDiffSummary(baseBranch, props.repo.branch);
        setState({ loading: false, error: null, diff, base: baseBranch });
      } catch (error) {
        const issue = error.handled ? error : formatApiError(error);
        setState({ loading: false, error: issue.message, diff: null, base: baseBranch });
      }

      if (!embedded) {
        setTimeout(exit, 0);
      }
    })();
  }, [embedded, exit, props.config, props.repo.branch, props.repo.owner, props.repo.repo]);

  return React.createElement(
    Box,
    { flexDirection: 'column' },
    React.createElement(Header, {
      title: `Branch Diff: ${props.repo.branch} → ${state.base}`,
      repo: `${props.repo.owner}/${props.repo.repo}`,
      branch: props.repo.branch
    }),
    state.loading ? React.createElement(Spinner, { text: 'Calculating branch diff...' }) : null,
    !state.loading && state.error ? React.createElement(ErrorBox, { message: state.error }) : null,
    !state.loading && !state.error && state.diff && state.diff.summary.filesChanged === 0
      ? React.createElement(Text, { color: '#10B981' }, `✔ No changes detected vs ${state.base}`)
      : null,
    !state.loading && !state.error && state.diff && state.diff.summary.filesChanged > 0
      ? React.createElement(DiffBody, { diff: state.diff })
      : null,
    embedded ? React.createElement(Text, { color: '#6B7280' }, 'q back') : null
  );
}

function DiffBody(props) {
  return React.createElement(
    Box,
    { flexDirection: 'column' },
    ...props.diff.files.map((file) => React.createElement(
      Box,
      { key: file.path },
      React.createElement(Text, { color: file.status === 'A' ? '#10B981' : file.status === 'D' ? '#EF4444' : '#F9FAFB', bold: file.status !== 'M' }, `${marker(file.status)}${file.path.padEnd(38, ' ')}`),
      React.createElement(Text, { color: '#10B981' }, ` +${file.additions}`),
      React.createElement(Text, { color: '#EF4444' }, `  -${file.deletions}`)
    )),
    React.createElement(Text, { color: '#6B7280' }, '────────────────────────────────────────────'),
    React.createElement(
      Text,
      { color: '#F9FAFB' },
      `${props.diff.summary.filesChanged} files changed  `
    ),
    React.createElement(Text, { color: '#10B981' }, `+${props.diff.summary.additions} additions  `),
    React.createElement(Text, { color: '#EF4444' }, `-${props.diff.summary.deletions} deletions`)
  );
}

function marker(status) {
  if (status === 'A') return '[NEW] ';
  if (status === 'D') return '[DEL] ';
  return '';
}

module.exports = DiffScreen;
