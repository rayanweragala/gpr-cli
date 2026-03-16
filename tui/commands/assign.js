const React = require('react');
const { Box, Text, useInput } = require('ink');
const TextInput = require('ink-text-input').default || require('ink-text-input');
const SelectInput = require('ink-select-input').default || require('ink-select-input');
const {
  buildApi,
  listOpenPullRequests,
  getRepoCollaborators,
  getOrgMembers,
  requestReviewers,
  addAssignees,
  formatApiError
} = require('../../lib/api');
const theme = require('../theme');

async function assignCommand(args, context) {
  const { config, repo, push, setMode, setActiveForm } = context;
  setMode('loading');
  let nextForm = null;

  try {
    const api = buildApi(config);

    if (args[0] && args[1]) {
      const prNumber = Number.parseInt(args[0], 10);
      const reviewer = args[1];

      if (Number.isNaN(prNumber)) {
        push(React.createElement(Text, { color: theme.ERROR }, '✖ Usage: /assign 24 rayan_synapse'));
        return;
      }

      await assignReviewer(api, repo, prNumber, [reviewer], push);
      return;
    }

    const requestedPrNumber = args[0] ? Number.parseInt(args[0], 10) : null;

    if (args[0] && Number.isNaN(requestedPrNumber)) {
      push(React.createElement(Text, { color: theme.ERROR }, '✖ Usage: /assign 24 [reviewer]'));
      return;
    }

    const [allPullRequests, fetchedMembers] = await Promise.all([
      listOpenPullRequests(api, repo.owner, repo.repo),
      loadAssignableMembers(api, repo.owner, repo.repo)
    ]);

    const pullRequests = requestedPrNumber === null
      ? allPullRequests
      : allPullRequests.filter((pullRequest) => pullRequest.number === requestedPrNumber);
    const members = fetchedMembers;

    if (!pullRequests.length) {
      const message = requestedPrNumber === null
        ? 'No open pull requests found.'
        : `Pull request #${requestedPrNumber} was not found in open pull requests.`;
      push(React.createElement(Text, { color: theme.WARNING }, message));
      return;
    }

    nextForm = React.createElement(AssignForm, {
      pullRequests,
      members,
      initialPrNumber: requestedPrNumber,
      onSubmit: async ({ prNumber, reviewers }) => {
        setActiveForm(null);
        setMode('loading');

        try {
          await assignReviewer(api, repo, prNumber, reviewers, push);
        } catch (error) {
          push(React.createElement(Text, { color: theme.ERROR }, `✖ ${formatApiError(error).message}`));
        } finally {
          setMode('idle');
        }
      },
      onCancel: () => {
        setActiveForm(null);
        setMode('idle');
        push(React.createElement(Text, { color: theme.TEXT_MUTED }, 'Assignment cancelled.'));
      }
    });
  } catch (error) {
    push(React.createElement(Text, { color: theme.ERROR }, `✖ ${formatApiError(error).message}`));
  } finally {
    setMode('idle');

    if (nextForm) {
      setActiveForm(nextForm);
      setMode('form');
    }
  }
}

async function loadAssignableMembers(api, owner, repo) {
  const collaborators = await loadMembersWithTimeout(
    () => getRepoCollaborators(api, owner, repo),
    'collaborators timeout'
  );

  if (collaborators.length) {
    return collaborators;
  }

  return loadMembersWithTimeout(
    () => getOrgMembers(api, owner),
    'organization members timeout'
  );
}

async function loadMembersWithTimeout(work, message) {
  try {
    const result = await Promise.race([
      work(),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error(message)), 5000);
      })
    ]);

    return Array.isArray(result) ? result : [];
  } catch (_error) {
    return [];
  }
}

async function assignReviewer(api, repo, prNumber, reviewers, push) {
  await Promise.allSettled([
    requestReviewers(api, repo.owner, repo.repo, prNumber, reviewers),
    addAssignees(api, repo.owner, repo.repo, prNumber, reviewers)
  ]);

  push(React.createElement(
    Box,
    { flexDirection: 'column' },
    React.createElement(Text, { color: theme.SUCCESS, bold: true }, `✔ Assigned to PR #${prNumber}`),
    ...reviewers.map((reviewer) => React.createElement(
      Box,
      { key: reviewer },
      React.createElement(Text, { color: theme.TEXT_MUTED }, '  -> '),
      React.createElement(Text, { color: theme.WARNING }, reviewer)
    ))
  ));
}

function AssignForm(props) {
  const [step, setStep] = React.useState(props.initialPrNumber ? 'reviewer' : 'pr');
  const [selectedPr, setSelectedPr] = React.useState(
    props.initialPrNumber
      ? props.pullRequests.find((pullRequest) => pullRequest.number === props.initialPrNumber) || null
      : null
  );
  const [reviewers, setReviewers] = React.useState([]);
  const [manualInput, setManualInput] = React.useState('');
  const hasMembers = props.members && props.members.length > 0;

  useInput((_input, key) => {
    if (key.escape && typeof props.onCancel === 'function') {
      props.onCancel();
      return;
    }

    if (step === 'reviewer' && hasMembers && key.return) {
      if (reviewers.length > 0 && selectedPr) {
        props.onSubmit({
          prNumber: selectedPr.number,
          reviewers
        });
      }
    }
  });

  if (step === 'pr') {
    if (!props.pullRequests.length) {
      return React.createElement(Text, { color: theme.WARNING }, 'No open pull requests found.');
    }

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
          setStep('reviewer');
        }
      })
    );
  }

  if (!selectedPr) {
    return React.createElement(Text, { color: theme.WARNING }, 'No open pull requests found.');
  }

  if (!hasMembers) {
    return React.createElement(
      Box,
      { flexDirection: 'column', paddingX: 1 },
      React.createElement(Text, { color: theme.PRIMARY, bold: true }, `PR #${selectedPr.number} - ${selectedPr.title}`),
      React.createElement(
        Box,
        { marginTop: 1 },
        React.createElement(Text, { color: theme.TEXT_MUTED }, 'Enter reviewer username:')
      ),
      React.createElement(
        Box,
        { marginTop: 1, borderStyle: 'round', borderColor: theme.PRIMARY, paddingX: 1 },
        React.createElement(TextInput, {
          value: manualInput,
          onChange: setManualInput,
          onSubmit: (value) => {
            const reviewersList = String(value || '')
              .trim()
              .split(/[\s,]+/)
              .filter(Boolean);

            if (reviewersList.length) {
              props.onSubmit({
                prNumber: selectedPr.number,
                reviewers: reviewersList
              });
            }
          },
          placeholder: 'e.g. rayan_synapse',
          focus: true
        })
      ),
      React.createElement(
        Text,
        { color: theme.TEXT_DIM, dimColor: true },
        'Enter to confirm  Esc to cancel  Separate multiple usernames with comma'
      )
    );
  }

  return React.createElement(MultiSelect, {
    title: `Assign reviewer for PR #${selectedPr.number}:`,
    subtitle: selectedPr.title,
    items: props.members,
    selected: reviewers,
    onToggle: (login) => {
      setReviewers((items) => (
        items.includes(login)
          ? items.filter((item) => item !== login)
          : [...items, login]
      ));
    }
  });
}

function MultiSelect(props) {
  const [cursor, setCursor] = React.useState(0);

  useInput((input, key) => {
    if (key.upArrow) {
      setCursor((value) => Math.max(0, value - 1));
      return;
    }

    if (key.downArrow) {
      setCursor((value) => Math.min(props.items.length - 1, value + 1));
      return;
    }

    if (input === ' ' && props.items[cursor]) {
      props.onToggle(props.items[cursor].login);
    }
  });

  return React.createElement(
    Box,
    { flexDirection: 'column', paddingX: 1 },
    React.createElement(Text, { color: theme.PRIMARY, bold: true }, props.title),
    React.createElement(Text, { color: theme.TEXT_MUTED, dimColor: true }, props.subtitle),
    React.createElement(
      Box,
      { marginTop: 1, flexDirection: 'column' },
      ...props.items.map((item, index) => React.createElement(
        Box,
        {
          key: item.login,
          backgroundColor: index === cursor ? theme.SELECTED_BG : undefined
        },
        React.createElement(Text, { color: props.selected.includes(item.login) ? theme.SUCCESS : theme.TEXT_MUTED }, props.selected.includes(item.login) ? '◉ ' : '○ '),
        React.createElement(Text, { color: index === cursor ? theme.SELECTED_TEXT : theme.TEXT_DIM }, item.login)
      ))
    ),
    React.createElement(
      Box,
      { marginTop: 1 },
      React.createElement(
        Text,
        { color: theme.TEXT_MUTED },
        React.createElement(Text, { color: theme.WARNING }, '↑↓'),
        ' navigate  ',
        React.createElement(Text, { color: theme.WARNING }, 'Space'),
        ' toggle  ',
        React.createElement(Text, { color: theme.WARNING }, 'Enter'),
        ' confirm  ',
        React.createElement(Text, { color: theme.WARNING }, 'Esc'),
        ' cancel'
      )
    ),
    props.selected.length
      ? React.createElement(Text, { color: theme.SUCCESS }, `Selected: ${props.selected.join(', ')}`)
      : null
  );
}

module.exports = assignCommand;
