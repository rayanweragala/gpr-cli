const React = require('react');
const { Box, Text, useInput } = require('ink');
const TextInput = require('ink-text-input').default || require('ink-text-input');
const SelectInput = require('ink-select-input').default || require('ink-select-input');
const {
  buildApi,
  listOpenPullRequests,
  getPullRequest,
  closePullRequest,
  createIssueComment,
  formatApiError
} = require('../../lib/api');
const theme = require('../theme');

async function closeCommand(args, context) {
  const { config, repo, push, setMode, setActiveForm } = context;
  const prNumber = args[0] ? Number(args[0]) : null;

  if (args[0] && Number.isNaN(prNumber)) {
    push(React.createElement(Text, { color: theme.ERROR }, '✖ Usage: /close [pr-number]'));
    return;
  }

  setMode('loading');

  try {
    const api = buildApi(config);

    if (!prNumber) {
      const prs = await listOpenPullRequests(api, repo.owner, repo.repo);
      setMode('idle');

      if (!prs.length) {
        push(React.createElement(Text, { color: theme.TEXT_MUTED }, 'No open pull requests found.'));
        return;
      }

      setMode('form');
      setActiveForm(React.createElement(ClosePickerForm, {
        pullRequests: prs,
        onSelect: (number) => {
          context.dismissForm();
          setMode('loading');
          openCloseConfirm(number, api, context);
        },
        onCancel: () => {
          context.dismissForm();
          push(React.createElement(Text, { color: theme.TEXT_MUTED }, 'Close cancelled.'));
        }
      }));
      return;
    }

    await openCloseConfirm(prNumber, api, context);
  } catch (error) {
    push(React.createElement(Text, { color: theme.ERROR }, `✖ ${formatApiError(error).message}`));
    setMode('idle');
  }
}

async function openCloseConfirm(prNumber, api, context) {
  const { repo, push, setMode, setActiveForm } = context;
  const pr = await getPullRequest(api, repo.owner, repo.repo, prNumber);

  if (pr.state === 'closed') {
    push(React.createElement(Text, { color: theme.WARNING }, `⚠ PR #${prNumber} is already closed`));
    setMode('idle');
    return;
  }

  setMode('form');
  setActiveForm(React.createElement(CloseConfirmForm, {
    pr,
    onConfirm: async (reason) => {
      context.dismissForm();
      setMode('loading');

      try {
        await closePullRequest(api, repo.owner, repo.repo, prNumber);

        if (String(reason || '').trim()) {
          await createIssueComment(api, repo.owner, repo.repo, prNumber, `Closing: ${String(reason).trim()}`).catch(() => null);
        }

        push(React.createElement(
          Box,
          { flexDirection: 'column' },
          React.createElement(Text, { color: theme.SUCCESS }, `✔ PR #${prNumber} closed`),
          React.createElement(Text, { color: theme.TEXT_MUTED }, pr.title),
          String(reason || '').trim()
            ? React.createElement(Text, { color: theme.TEXT_MUTED }, `Reason: ${String(reason).trim()}`)
            : null
        ));
      } catch (error) {
        push(React.createElement(Text, { color: theme.ERROR }, `✖ ${formatApiError(error).message}`));
      } finally {
        setMode('idle');
      }
    },
    onCancel: () => {
      context.dismissForm();
      push(React.createElement(Text, { color: theme.TEXT_MUTED }, 'Close cancelled.'));
    }
  }));
}

function ClosePickerForm(props) {
  useInput((input, key) => {
    if (key.escape) {
      props.onCancel();
    }
  });

  return React.createElement(
    Box,
    { flexDirection: 'column' },
    React.createElement(Text, { color: theme.TEXT_PRIMARY, bold: true }, 'Select a pull request to close'),
    React.createElement(SelectInput, {
      items: props.pullRequests.map((pullRequest) => ({
        label: `#${pullRequest.number} ${pullRequest.title} (${pullRequest.head.ref} → ${pullRequest.base.ref})`,
        value: pullRequest.number
      })),
      onSelect: (item) => props.onSelect(item.value)
    })
  );
}

function CloseConfirmForm({ pr, onConfirm, onCancel }) {
  const [reason, setReason] = React.useState('');

  useInput((input, key) => {
    if (key.escape) {
      onCancel();
    }
  });

  return React.createElement(
    Box,
    {
      flexDirection: 'column',
      borderStyle: 'round',
      borderColor: theme.ERROR,
      paddingX: 2,
      paddingY: 1,
      marginY: 1
    },
    React.createElement(Text, { color: theme.ERROR, bold: true }, `Close PR #${pr.number}`),
    React.createElement(Text, { color: theme.TEXT_DIM }, pr.title),
    React.createElement(Text, { color: theme.BORDER_DIM }, '─'.repeat(50)),
    React.createElement(
      Box,
      { flexDirection: 'column', marginTop: 1 },
      React.createElement(Text, { color: theme.TEXT_MUTED }, 'Reason (optional):'),
      React.createElement(
        Box,
        { borderStyle: 'round', borderColor: theme.BORDER_DIM, paddingX: 1 },
        React.createElement(TextInput, {
          value: reason,
          onChange: setReason,
          onSubmit: (value) => onConfirm(value),
          placeholder: 'Why are you closing this PR?',
          focus: true
        })
      )
    ),
    React.createElement(
      Box,
      { marginTop: 1 },
      React.createElement(
        Text,
        { color: theme.TEXT_DIM },
        React.createElement(Text, { color: theme.ERROR }, 'Enter'),
        ' close PR  ',
        React.createElement(Text, { color: theme.WARNING }, 'Esc'),
        ' cancel'
      )
    )
  );
}

module.exports = closeCommand;
