const React = require('react');
const { Box, Text, useApp, useInput } = require('ink');
const SelectInput = require('ink-select-input').default || require('ink-select-input');
const { buildApi, listOpenPullRequests, formatApiError } = require('../../lib/api');
const { fetchOrigin, branchExistsLocally, checkoutBranch } = require('../../lib/git');
const Header = require('../components/Header');
const Spinner = require('../components/Spinner');
const ErrorBox = require('../components/ErrorBox');
const SuccessBox = require('../components/SuccessBox');

function CheckoutScreen(props) {
  const { exit } = useApp();
  const [state, setState] = React.useState({ loading: true, error: null, pullRequests: [], success: null });

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
    listOpenPullRequests(api, props.repo.owner, props.repo.repo)
      .then((pullRequests) => setState({ loading: false, error: null, pullRequests, success: null }))
      .catch((error) => setState({ loading: false, error: formatApiError(error).message, pullRequests: [], success: null }));
  }, [props.config, props.repo.owner, props.repo.repo]);

  function onSelect(item) {
    setState((current) => ({ ...current, loading: true, error: null }));

    (async () => {
      try {
        await fetchOrigin();
        const exists = await branchExistsLocally(item.value);
        await checkoutBranch(item.value, exists);
        setState({ loading: false, error: null, pullRequests: state.pullRequests, success: item.value });
      } catch (error) {
        setState({ loading: false, error: error.message || 'Failed to checkout branch', pullRequests: state.pullRequests, success: null });
      }
    })();
  }

  return React.createElement(
    Box,
    { flexDirection: 'column' },
    React.createElement(Header, { title: 'Checkout Pull Request', repo: `${props.repo.owner}/${props.repo.repo}`, branch: props.repo.branch }),
    state.loading ? React.createElement(Spinner, { text: state.success ? 'Done' : 'Fetching branch...' }) : null,
    !state.loading && state.error ? React.createElement(ErrorBox, { message: state.error }) : null,
    !state.loading && state.success ? React.createElement(SuccessBox, {
      title: 'Branch Switched',
      lines: [
        { label: 'Branch', value: state.success },
        { label: 'Tip', value: 'Run "gpr status" to see PR details' }
      ]
    }) : null,
    !state.loading && !state.error && !state.success ? React.createElement(SelectInput, {
      items: state.pullRequests.map((pullRequest) => ({
        label: `#${pullRequest.number} ${pullRequest.title} (${pullRequest.head.ref} → ${pullRequest.base.ref})`,
        value: { branch: pullRequest.head.ref, number: pullRequest.number }
      })),
      onSelect: (item) => onSelect({ value: item.value.branch })
    }) : null,
    React.createElement(Text, { color: '#6B7280' }, 'q quit')
  );
}

module.exports = CheckoutScreen;
