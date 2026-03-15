const React = require('react');
const { Box, Text, useApp, useInput } = require('ink');
const TextInput = require('ink-text-input').default || require('ink-text-input');
const SelectInput = require('ink-select-input').default || require('ink-select-input');
const { buildApi, listOpenPullRequests, getPullRequest, mergePullRequest, formatApiError } = require('../../lib/api');
const Header = require('../components/Header');
const Spinner = require('../components/Spinner');
const ErrorBox = require('../components/ErrorBox');
const SuccessBox = require('../components/SuccessBox');

function MergeScreen(props) {
  const { exit } = useApp();
  const [selected, setSelected] = React.useState(props.prNumber ? Number(props.prNumber) : null);
  const [state, setState] = React.useState({ loading: true, error: null, pullRequests: [], pullRequest: null, success: null, phase: 'select', answer: '' });

  useInput((input, key) => {
    if (input === 'q' || key.escape) {
      if (typeof props.onBack === 'function') {
        props.onBack();
      } else {
        exit();
      }
    }
  });

  React.useEffect(() => {
    const api = buildApi(props.config);

    if (!selected) {
      listOpenPullRequests(api, props.repo.owner, props.repo.repo)
        .then((pullRequests) => setState({ loading: false, error: null, pullRequests, pullRequest: null, success: null, phase: 'select', answer: '' }))
        .catch((error) => setState({ loading: false, error: formatApiError(error).message, pullRequests: [], pullRequest: null, success: null, phase: 'select', answer: '' }));
      return;
    }

    setState((current) => ({ ...current, loading: true, error: null }));
    getPullRequest(api, props.repo.owner, props.repo.repo, selected)
      .then((pullRequest) => setState((current) => ({ ...current, loading: false, pullRequest, phase: 'confirm' })))
      .catch((error) => setState((current) => ({ ...current, loading: false, error: formatApiError(error).message })));
  }, [props.config, props.repo.owner, props.repo.repo, selected]);

  function doMerge() {
    const api = buildApi(props.config);
    setState((current) => ({ ...current, loading: true, error: null }));
    mergePullRequest(api, props.repo.owner, props.repo.repo, selected, { merge_method: 'merge' })
      .then(() => setState((current) => ({
        ...current,
        loading: false,
        success: `PR #${selected} merged successfully into ${current.pullRequest.base.ref}`,
        phase: 'done'
      })))
      .catch((error) => setState((current) => ({ ...current, loading: false, error: formatApiError(error).message })));
  }

  return React.createElement(
    Box,
    { flexDirection: 'column' },
    React.createElement(Header, { title: 'Merge Pull Request', repo: `${props.repo.owner}/${props.repo.repo}`, branch: props.repo.branch }),
    state.loading ? React.createElement(Spinner, { text: state.phase === 'confirm' ? 'Loading pull request...' : 'Merging pull request...' }) : null,
    !state.loading && state.error ? React.createElement(ErrorBox, { message: state.error }) : null,
    !selected && !state.loading && !state.error ? React.createElement(SelectInput, {
      items: state.pullRequests.map((pullRequest) => ({
        label: `#${pullRequest.number} ${pullRequest.title} (${pullRequest.head.ref} → ${pullRequest.base.ref})`,
        value: pullRequest.number
      })),
      onSelect: (item) => setSelected(item.value)
    }) : null,
    selected && !state.loading && !state.error && state.pullRequest && state.phase !== 'done' ? React.createElement(
      Box,
      { flexDirection: 'column' },
      React.createElement(Text, { color: '#F9FAFB' }, `PR      : #${state.pullRequest.number} ${state.pullRequest.title}`),
      React.createElement(Text, { color: '#F9FAFB' }, `Branch  : ${state.pullRequest.head.ref} → ${state.pullRequest.base.ref}`),
      React.createElement(Text, { color: '#F9FAFB' }, `Merge PR #${state.pullRequest.number} into ${state.pullRequest.base.ref}? [y/N]`),
      React.createElement(TextInput, {
        value: state.answer,
        onChange: (value) => setState((current) => ({ ...current, answer: value })),
        onSubmit: (value) => {
          if (value.toLowerCase() === 'y') {
            doMerge();
            return;
          }

          if (typeof props.onBack === 'function') {
            props.onBack();
          } else {
            exit();
          }
        }
      })
    ) : null,
    state.success ? React.createElement(SuccessBox, { title: 'Merge Complete', lines: [{ label: 'Result', value: state.success }] }) : null,
    React.createElement(Text, { color: '#6B7280' }, 'q quit')
  );
}

module.exports = MergeScreen;
