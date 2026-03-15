const React = require('react');
const { Box, Text, useInput } = require('ink');
const SelectInput = require('ink-select-input').default || require('ink-select-input');
const { buildApi, listOpenPullRequests, formatApiError } = require('../../lib/api');
const { fetchOrigin, branchExistsLocally, checkoutBranch } = require('../../lib/git');

async function checkoutCommand(_args, context) {
  const { config, repo, push, setMode, setActiveForm } = context;
  setMode('loading');

  try {
    const api = buildApi(config);
    const pullRequests = await listOpenPullRequests(api, repo.owner, repo.repo);

    if (!pullRequests.length) {
      push(React.createElement(Text, { color: '#F59E0B' }, 'No open pull requests found.'));
      setMode('idle');
      return;
    }

    setMode('form');
    setActiveForm(React.createElement(CheckoutForm, {
      pullRequests,
      onSelect: async (pullRequest) => {
        setActiveForm(null);
        setMode('loading');
        try {
          await fetchOrigin();
          const exists = await branchExistsLocally(pullRequest.head.ref);
          await checkoutBranch(pullRequest.head.ref, exists);
          push(React.createElement(
            Box,
            { flexDirection: 'column' },
            React.createElement(Text, { color: '#10B981', bold: true }, `✔ Switched to branch: ${pullRequest.head.ref}`),
            React.createElement(Text, { color: '#6B7280' }, 'Tip: Run "gpr status" to see PR details')
          ));
        } catch (error) {
          push(React.createElement(Text, { color: '#EF4444' }, `✖ ${error.message || 'Failed to checkout branch'}`));
        } finally {
          setMode('idle');
        }
      },
      onCancel: () => {
        setActiveForm(null);
        setMode('idle');
        push(React.createElement(Text, { color: '#6B7280' }, 'Checkout cancelled.'));
      }
    }));
  } catch (error) {
    push(React.createElement(Text, { color: '#EF4444' }, `✖ ${formatApiError(error).message}`));
    setMode('idle');
  }
}

function CheckoutForm(props) {
  useInput((input, key) => {
    if (key.escape && typeof props.onCancel === 'function') {
      props.onCancel();
    }
  });

  return React.createElement(
    Box,
    { flexDirection: 'column' },
    React.createElement(Text, { color: '#F9FAFB', bold: true }, 'Select a pull request branch to checkout'),
    React.createElement(SelectInput, {
      items: props.pullRequests.map((pullRequest) => ({
        label: `#${pullRequest.number} ${pullRequest.title} (${pullRequest.head.ref} → ${pullRequest.base.ref})`,
        value: pullRequest
      })),
      onSelect: (item) => props.onSelect(item.value)
    })
  );
}

module.exports = checkoutCommand;
