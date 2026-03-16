const React = require('react');
const { Box, Text, useInput } = require('ink');
const TextInput = require('ink-text-input').default || require('ink-text-input');
const SelectInput = require('ink-select-input').default || require('ink-select-input');
const {
  buildApi,
  createIssueComment,
  getAuthenticatedUser,
  listOpenPullRequests,
  formatApiError
} = require('../../lib/api');
const theme = require('../theme');

async function remindCommand(args, context) {
  const { config, repo, push, setMode, setActiveForm, dismissForm } = context;
  const prNumber = args[0] ? Number.parseInt(args[0], 10) : null;
  const customMessage = args.slice(1).join(' ').replace(/^["']|["']$/g, '');
  setMode('loading');

  try {
    const api = buildApi(config);
    const user = await getAuthenticatedUser(api);

    if (!prNumber) {
      const pullRequests = await listOpenPullRequests(api, repo.owner, repo.repo);
      if (!pullRequests.length) {
        push(React.createElement(Text, { color: theme.WARNING }, 'No open pull requests found.'));
        return;
      }
      setMode('form');
      setActiveForm(React.createElement(RemindForm, {
        pullRequests,
        onSubmit: async ({ number, message }) => {
          dismissForm();
          setMode('loading');
          try {
            await createIssueComment(api, repo.owner, repo.repo, number, message);
            push(React.createElement(Text, { color: theme.SUCCESS }, `✔ Reminder posted on PR #${number}`));
          } catch (error) {
            push(React.createElement(Text, { color: theme.ERROR }, `✖ ${formatApiError(error).message}`));
          } finally {
            setMode('idle');
          }
        },
        onCancel: () => {
          dismissForm();
          push(React.createElement(Text, { color: theme.TEXT_MUTED }, 'Reminder cancelled.'));
        }
      }));
      return;
    }

    if (Number.isNaN(prNumber)) {
      push(React.createElement(Text, { color: theme.ERROR }, '✖ Usage: /remind 24 "optional message"'));
      return;
    }

    const defaultMessage = customMessage
      || `Friendly reminder — this PR needs review when you get a chance.`;

    await createIssueComment(api, repo.owner, repo.repo, prNumber, defaultMessage);

    push(React.createElement(
      Box,
      { flexDirection: 'column' },
      React.createElement(Text, { color: theme.SUCCESS, bold: true }, `✔ Reminder posted on PR #${prNumber}`),
      React.createElement(
        Box,
        { paddingLeft: 2 },
        React.createElement(Text, { color: theme.TEXT_MUTED }, `Message: ${truncate(defaultMessage, 60)}`)
      )
    ));
  } catch (error) {
    push(React.createElement(Text, { color: theme.ERROR }, `✖ ${formatApiError(error).message}`));
  } finally {
    if (!context.hasActiveForm()) {
      setMode('idle');
    }
  }
}

function RemindForm(props) {
  const [step, setStep] = React.useState('pr');
  const [selectedPr, setSelectedPr] = React.useState(null);
  const [message, setMessage] = React.useState('Friendly reminder — this PR needs review!');

  useInput((input, key) => {
    if (key.escape && typeof props.onCancel === 'function') {
      props.onCancel();
    }
  });

  if (step === 'pr') {
    return React.createElement(
      Box,
      { flexDirection: 'column' },
      React.createElement(Text, { color: theme.TEXT_PRIMARY, bold: true }, 'Select a pull request'),
      React.createElement(SelectInput, {
        items: props.pullRequests.map((pullRequest) => ({
          label: `#${pullRequest.number} ${pullRequest.title}`,
          value: pullRequest
        })),
        onSelect: (item) => {
          setSelectedPr(item.value);
          setStep('message');
        }
      })
    );
  }

  return React.createElement(
    Box,
    { flexDirection: 'column' },
    React.createElement(Text, { color: theme.TEXT_PRIMARY, bold: true }, `Reminder for PR #${selectedPr.number}`),
    React.createElement(Text, { color: theme.TEXT_MUTED }, selectedPr.title),
    React.createElement(TextInput, {
      value: message,
      onChange: setMessage,
      onSubmit: (value) => props.onSubmit({
        number: selectedPr.number,
        message: String(value || '').trim() || 'Friendly reminder — this PR needs review!'
      }),
      focus: true
    })
  );
}

function truncate(value, maxLength) {
  const text = String(value || '');
  return text.length <= maxLength ? text : `${text.slice(0, maxLength - 1)}…`;
}

module.exports = remindCommand;
