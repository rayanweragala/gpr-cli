const React = require('react');
const { Box, Text, useInput } = require('ink');
const TextInput = require('ink-text-input').default || require('ink-text-input');
const SelectInput = require('ink-select-input').default || require('ink-select-input');
const {
  buildApi,
  listOpenPullRequests,
  getPullRequest,
  mergePullRequest,
  formatApiError
} = require('../../lib/api');

async function mergeCommand(args, context) {
  const number = args[0] ? Number(args[0]) : undefined;

  if (args[0] && Number.isNaN(number)) {
    context.push(React.createElement(Text, { color: '#EF4444' }, '✖ Usage: /merge [pr-number]'));
    return;
  }

  if (number) {
    await loadMerge(number, context);
    return;
  }

  context.setMode('loading');

  try {
    const api = buildApi(context.config);
    const pullRequests = await listOpenPullRequests(api, context.repo.owner, context.repo.repo);

    if (!pullRequests.length) {
      context.push(React.createElement(Text, { color: '#F59E0B' }, 'No open pull requests found.'));
      context.setMode('idle');
      return;
    }

    context.setMode('form');
    context.setActiveForm(React.createElement(MergePicker, {
      pullRequests,
      onSelect: async (pullRequest) => {
        context.setActiveForm(null);
        await loadMerge(pullRequest.number, context);
      },
      onCancel: () => cancel(context, 'Merge cancelled.')
    }));
  } catch (error) {
    context.push(React.createElement(Text, { color: '#EF4444' }, `✖ ${formatApiError(error).message}`));
    context.setMode('idle');
  }
}

function MergePicker(props) {
  useInput((input, key) => {
    if (key.escape && typeof props.onCancel === 'function') {
      props.onCancel();
    }
  });

  return React.createElement(
    Box,
    { flexDirection: 'column' },
    React.createElement(Text, { color: '#F9FAFB', bold: true }, 'Select a pull request to merge'),
    React.createElement(SelectInput, {
      items: props.pullRequests.map((pullRequest) => ({
        label: `#${pullRequest.number} ${pullRequest.title} (${pullRequest.head.ref} → ${pullRequest.base.ref})`,
        value: pullRequest
      })),
      onSelect: (item) => props.onSelect(item.value)
    })
  );
}

async function loadMerge(number, context) {
  const { config, repo, push, setMode, setActiveForm } = context;
  setMode('loading');

  try {
    const api = buildApi(config);
    const pullRequest = await getPullRequest(api, repo.owner, repo.repo, number);

    if (pullRequest.merged_at) {
      push(React.createElement(Text, { color: '#F59E0B' }, `⚠ PR #${number} is already merged`));
      return;
    }

    if (pullRequest.state === 'closed') {
      push(React.createElement(Text, { color: '#EF4444' }, `✖ PR #${number} is closed, cannot merge`));
      return;
    }

    setMode('form');
    setActiveForm(React.createElement(MergeConfirm, {
      pullRequest,
      onConfirm: async (answer) => {
        if (String(answer || '').toLowerCase() !== 'y') {
          cancel(context, 'Merge cancelled.');
          return;
        }

        setActiveForm(null);
        setMode('loading');
        try {
          await mergePullRequest(api, repo.owner, repo.repo, number, { merge_method: 'merge' });
          push(React.createElement(Text, { color: '#10B981', bold: true }, `✔ PR #${number} merged successfully into ${pullRequest.base.ref}`));
        } catch (error) {
          const message = formatApiError(error).message;
          push(React.createElement(Text, { color: '#EF4444' }, `✖ ${message}`));
        } finally {
          setMode('idle');
        }
      },
      onCancel: () => cancel(context, 'Merge cancelled.')
    }));
  } catch (error) {
    push(React.createElement(Text, { color: '#EF4444' }, `✖ ${formatApiError(error).message}`));
    setMode('idle');
  }
}

function MergeConfirm(props) {
  const [answer, setAnswer] = React.useState('');

  useInput((input, key) => {
    if (key.escape && typeof props.onCancel === 'function') {
      props.onCancel();
    }
  });

  return React.createElement(
    Box,
    { flexDirection: 'column' },
    React.createElement(Text, { color: '#F9FAFB' }, `PR      : #${props.pullRequest.number} ${props.pullRequest.title}`),
    React.createElement(Text, { color: '#F9FAFB' }, `Branch  : ${props.pullRequest.head.ref} → ${props.pullRequest.base.ref}`),
    React.createElement(Text, { color: '#F9FAFB' }, `Merge PR #${props.pullRequest.number} into ${props.pullRequest.base.ref}? [y/N]`),
    React.createElement(TextInput, {
      value: answer,
      onChange: setAnswer,
      onSubmit: props.onConfirm
    })
  );
}

function cancel(context, message) {
  context.setActiveForm(null);
  context.setMode('idle');
  context.push(React.createElement(Text, { color: '#6B7280' }, message));
}

module.exports = mergeCommand;
