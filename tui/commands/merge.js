const React = require('react');
const { Box, Text, useInput } = require('ink');
const SelectInput = require('ink-select-input').default || require('ink-select-input');
const {
  buildApi,
  listOpenPullRequests,
  getPullRequest,
  mergePullRequest,
  formatApiError
} = require('../../lib/api');
const theme = require('../theme');

async function mergeCommand(args, context) {
  const { config, repo, push, setMode, setActiveForm } = context;
  const prNumber = args[0] ? Number(args[0]) : null;

  if (args[0] && Number.isNaN(prNumber)) {
    push(React.createElement(Text, { color: theme.ERROR }, '✖ Usage: /merge [pr-number]'));
    return;
  }

  setMode('loading');

  try {
    const api = buildApi(config);
    const resolvedNumber = prNumber || await pickPR(api, repo, setActiveForm, context, setMode);

    if (!resolvedNumber) {
      return;
    }

    const pr = await getPullRequest(api, repo.owner, repo.repo, resolvedNumber);

    if (pr.merged_at) {
      push(React.createElement(
        Box,
        { flexDirection: 'column' },
        React.createElement(Text, { color: theme.WARNING }, `⚠ PR #${resolvedNumber} is already merged`)
      ));
      setMode('idle');
      return;
    }

    if (pr.state === 'closed') {
      push(React.createElement(Text, { color: theme.ERROR }, `✖ PR #${resolvedNumber} is closed, cannot merge`));
      setMode('idle');
      return;
    }

    if (pr.mergeable === false) {
      push(React.createElement(
        Box,
        { flexDirection: 'column' },
        React.createElement(Text, { color: theme.ERROR, bold: true }, `✖ PR #${resolvedNumber} has merge conflicts`),
        React.createElement(Text, { color: theme.TEXT_MUTED }, `Run /resolve ${resolvedNumber} to fix conflicts then try /merge ${resolvedNumber} again`)
      ));
      setMode('idle');
      return;
    }

    setMode('form');
    setActiveForm(React.createElement(MergeConfirmForm, {
      pr,
      onConfirm: async (mergeMethod) => {
        context.dismissForm();
        setMode('loading');

        try {
          await mergePullRequest(api, repo.owner, repo.repo, resolvedNumber, {
            merge_method: mergeMethod,
            commit_title: `Merge PR #${resolvedNumber}: ${pr.title}`,
            commit_message: pr.body || ''
          });

          push(React.createElement(
            Box,
            { flexDirection: 'column' },
            React.createElement(Text, { color: theme.SUCCESS, bold: true }, `✔ PR #${resolvedNumber} merged successfully!`),
            detailRow('Title', pr.title, theme.TEXT_PRIMARY),
            detailRow(
              'Merged',
              React.createElement(
                React.Fragment,
                null,
                React.createElement(Text, { color: theme.INFO }, pr.head.ref),
                React.createElement(Text, { color: theme.TEXT_MUTED }, ' → '),
                React.createElement(Text, { color: theme.SUCCESS }, pr.base.ref)
              ),
              theme.TEXT_PRIMARY
            )
          ));
        } catch (error) {
          const message = getMergeErrorMessage(error);

          if (/conflict/i.test(message)) {
            push(React.createElement(
              Box,
              { flexDirection: 'column' },
              React.createElement(Text, { color: theme.ERROR, bold: true }, '✖ Merge failed, conflicts detected'),
              React.createElement(Text, { color: theme.TEXT_MUTED }, `Run /resolve ${resolvedNumber} to fix`)
            ));
          } else if (/not mergeable/i.test(message)) {
            push(React.createElement(
              Box,
              { flexDirection: 'column' },
              React.createElement(Text, { color: theme.ERROR }, '✖ PR is not mergeable right now'),
              React.createElement(Text, { color: theme.TEXT_MUTED }, 'Check conflicts with /conflicts')
            ));
          } else {
            push(React.createElement(Text, { color: theme.ERROR }, `✖ Merge failed: ${message}`));
          }
        } finally {
          setMode('idle');
        }
      },
      onCancel: () => {
        context.dismissForm();
        push(React.createElement(Text, { color: theme.TEXT_MUTED }, 'Merge cancelled.'));
      }
    }));
  } catch (error) {
    push(React.createElement(Text, { color: theme.ERROR }, `✖ ${formatApiError(error).message}`));
    setMode('idle');
  }
}

async function pickPR(api, repo, setActiveForm, context, setMode) {
  const pullRequests = await listOpenPullRequests(api, repo.owner, repo.repo);

  if (!pullRequests.length) {
    context.push(React.createElement(Text, { color: theme.WARNING }, 'No open pull requests found.'));
    setMode('idle');
    return null;
  }

  return new Promise((resolve) => {
    setMode('form');
    setActiveForm(React.createElement(MergePickerForm, {
      pullRequests,
      onSelect: (number) => {
        context.dismissForm();
        setMode('loading');
        resolve(number);
      },
      onCancel: () => {
        context.dismissForm();
        context.push(React.createElement(Text, { color: theme.TEXT_MUTED }, 'Merge cancelled.'));
        resolve(null);
      }
    }));
  });
}

function MergePickerForm(props) {
  useInput((input, key) => {
    if (key.escape) {
      props.onCancel();
    }
  });

  return React.createElement(
    Box,
    { flexDirection: 'column' },
    React.createElement(Text, { color: theme.TEXT_PRIMARY, bold: true }, 'Select a pull request to merge'),
    React.createElement(SelectInput, {
      items: props.pullRequests.map((pullRequest) => ({
        label: `#${pullRequest.number} ${pullRequest.title} (${pullRequest.head.ref} → ${pullRequest.base.ref})`,
        value: pullRequest.number
      })),
      onSelect: (item) => props.onSelect(item.value)
    })
  );
}

function MergeConfirmForm({ pr, onConfirm, onCancel }) {
  const methods = ['merge', 'squash', 'rebase'];
  const [cursor, setCursor] = React.useState(0);

  useInput((input, key) => {
    if (key.upArrow) {
      setCursor((value) => Math.max(0, value - 1));
      return;
    }

    if (key.downArrow) {
      setCursor((value) => Math.min(methods.length - 1, value + 1));
      return;
    }

    if (key.return) {
      onConfirm(methods[cursor]);
      return;
    }

    if (key.escape) {
      onCancel();
    }
  });

  const descriptions = {
    merge: 'Create a merge commit',
    squash: 'Squash all commits into one',
    rebase: 'Rebase commits onto base branch'
  };

  return React.createElement(
    Box,
    {
      flexDirection: 'column',
      borderStyle: 'round',
      borderColor: theme.WARNING,
      paddingX: 2,
      paddingY: 1,
      marginY: 1
    },
    React.createElement(Text, { color: theme.WARNING, bold: true }, `Merge PR #${pr.number}`),
    React.createElement(Text, { color: theme.TEXT_DIM }, pr.title),
    React.createElement(Text, { color: theme.TEXT_DIM }, `${pr.head.ref} → ${pr.base.ref}`),
    React.createElement(Text, { color: theme.BORDER_DIM }, '─'.repeat(50)),
    React.createElement(
      Box,
      { flexDirection: 'column', marginTop: 1 },
      React.createElement(Text, { color: theme.TEXT_MUTED }, 'Merge method:'),
      ...methods.map((method, index) => React.createElement(
        Box,
        { key: method },
        React.createElement(Text, { color: index === cursor ? theme.PRIMARY : theme.TEXT_DIM }, index === cursor ? '❯ ' : '  '),
        React.createElement(Text, {
          color: index === cursor ? theme.TEXT_PRIMARY : theme.TEXT_MUTED,
          bold: index === cursor
        }, method),
        React.createElement(Text, { color: theme.TEXT_DIM }, `  ${descriptions[method]}`)
      ))
    ),
    React.createElement(
      Box,
      { marginTop: 1 },
      React.createElement(
        Text,
        { color: theme.TEXT_DIM },
        React.createElement(Text, { color: theme.SUCCESS }, 'Enter'),
        ' confirm  ',
        React.createElement(Text, { color: theme.WARNING }, 'Esc'),
        ' cancel'
      )
    )
  );
}

function detailRow(label, value, color) {
  return React.createElement(
    Box,
    { flexDirection: 'row' },
    React.createElement(
      Box,
      { width: 10 },
      React.createElement(Text, { color: theme.TEXT_MUTED }, label)
    ),
    React.createElement(Text, { color: theme.TEXT_MUTED }, ' : '),
    React.isValidElement(value)
      ? value
      : React.createElement(Text, { color: color || theme.TEXT_PRIMARY }, value)
  );
}

function getMergeErrorMessage(error) {
  const apiMessage = error && error.response && error.response.data
    ? error.response.data.message || error.response.data.error
    : null;

  return apiMessage || formatApiError(error).message;
}

module.exports = mergeCommand;
