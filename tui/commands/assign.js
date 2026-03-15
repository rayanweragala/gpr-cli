const React = require('react');
const { Box, Text, useInput } = require('ink');
const TextInput = require('ink-text-input').default || require('ink-text-input');
const SelectInput = require('ink-select-input').default || require('ink-select-input');
const {
  buildApi,
  listOpenPullRequests,
  getRepoCollaborators,
  requestReviewers,
  addAssignees,
  formatApiError
} = require('../../lib/api');

async function assignCommand(args, context) {
  const { config, repo, push, setMode, setActiveForm } = context;
  setMode('loading');

  try {
    const api = buildApi(config);

    if (args[0] && args[1]) {
      const prNumber = Number.parseInt(args[0], 10);
      const reviewer = args[1];

      if (Number.isNaN(prNumber)) {
        push(React.createElement(Text, { color: '#EF4444' }, '✖ Usage: /assign 24 rayan_synapse'));
        setMode('idle');
        return;
      }

      await assignReviewer(api, repo, prNumber, [reviewer], push);
      setMode('idle');
      return;
    }

    const requestedPrNumber = args[0] ? Number.parseInt(args[0], 10) : null;

    if (args[0] && Number.isNaN(requestedPrNumber)) {
      push(React.createElement(Text, { color: '#EF4444' }, '✖ Usage: /assign 24 [reviewer]'));
      setMode('idle');
      return;
    }

    const [allPullRequests, fetchedMembers] = await Promise.all([
      listOpenPullRequests(api, repo.owner, repo.repo),
      getRepoCollaborators(api, repo.owner, repo.repo)
    ]);

    const pullRequests = requestedPrNumber === null
      ? allPullRequests
      : allPullRequests.filter((pullRequest) => pullRequest.number === requestedPrNumber);
    let members = fetchedMembers;

    if (!members.length) {
      const testEndpoints = [
        `/repos/${repo.owner}/${repo.repo}/collaborators`,
        `/orgs/${repo.owner}/members`,
        `/repos/${repo.owner}/${repo.repo}/teams`
      ];

      for (const endpoint of testEndpoints) {
        try {
          const response = await api.get(endpoint);

          if (Array.isArray(response.data) && response.data.length > 0) {
            process.stderr.write(
              `[assign debug] Working endpoint: ${endpoint} returned ${response.data.length} members\n`
            );
            members = response.data
              .map((member) => ({
                login: member.login || member.name || member.slug,
                ...member
              }))
              .filter((member) => member.login);
            break;
          }
        } catch (error) {
          process.stderr.write(
            `[assign debug] Failed: ${endpoint} -> ${error.response?.status}\n`
          );
        }
      }
    }

    if (!pullRequests.length) {
      const message = requestedPrNumber === null
        ? 'No open pull requests found.'
        : `Pull request #${requestedPrNumber} was not found in open pull requests.`;
      push(React.createElement(Text, { color: '#F59E0B' }, message));
      setMode('idle');
      return;
    }

    setMode('form');
    setActiveForm(React.createElement(AssignForm, {
      pullRequests,
      members,
      initialPrNumber: requestedPrNumber,
      onSubmit: async ({ prNumber, reviewers }) => {
        setActiveForm(null);
        setMode('loading');

        try {
          await assignReviewer(api, repo, prNumber, reviewers, push);
        } catch (error) {
          push(React.createElement(Text, { color: '#EF4444' }, `✖ ${formatApiError(error).message}`));
        } finally {
          setMode('idle');
        }
      },
      onCancel: () => {
        setActiveForm(null);
        setMode('idle');
        push(React.createElement(Text, { color: '#6B7280' }, 'Assignment cancelled.'));
      }
    }));
  } catch (error) {
    push(React.createElement(Text, { color: '#EF4444' }, `✖ ${formatApiError(error).message}`));
    setMode('idle');
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
    React.createElement(Text, { color: '#10B981', bold: true }, `✔ Assigned to PR #${prNumber}`),
    ...reviewers.map((reviewer) => React.createElement(
      Box,
      { key: reviewer },
      React.createElement(Text, { color: '#6B7280' }, '  -> '),
      React.createElement(Text, { color: '#F59E0B' }, reviewer)
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
      return React.createElement(Text, { color: '#F59E0B' }, 'No open pull requests found.');
    }

    return React.createElement(
      Box,
      { flexDirection: 'column' },
      React.createElement(Text, { color: '#F9FAFB', bold: true }, 'Select a pull request'),
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
    return React.createElement(Text, { color: '#F59E0B' }, 'No open pull requests found.');
  }

  if (!hasMembers) {
    return React.createElement(
      Box,
      { flexDirection: 'column', paddingX: 1 },
      React.createElement(Text, { color: '#7C3AED', bold: true }, `PR #${selectedPr.number} - ${selectedPr.title}`),
      React.createElement(
        Box,
        { marginTop: 1 },
        React.createElement(Text, { color: '#6B7280' }, 'Enter reviewer username:')
      ),
      React.createElement(
        Box,
        { marginTop: 1, borderStyle: 'round', borderColor: '#7C3AED', paddingX: 1 },
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
        { color: '#6B7280', dimColor: true },
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
    React.createElement(Text, { color: '#7C3AED', bold: true }, props.title),
    React.createElement(Text, { color: '#6B7280', dimColor: true }, props.subtitle),
    React.createElement(
      Box,
      { marginTop: 1, flexDirection: 'column' },
      ...props.items.map((item, index) => React.createElement(
        Box,
        {
          key: item.login,
          backgroundColor: index === cursor ? '#374151' : undefined
        },
        React.createElement(Text, { color: props.selected.includes(item.login) ? '#10B981' : '#6B7280' }, props.selected.includes(item.login) ? '◉ ' : '○ '),
        React.createElement(Text, { color: index === cursor ? '#F9FAFB' : '#9CA3AF' }, item.login)
      ))
    ),
    React.createElement(
      Box,
      { marginTop: 1 },
      React.createElement(
        Text,
        { color: '#6B7280' },
        React.createElement(Text, { color: '#F59E0B' }, '↑↓'),
        ' navigate  ',
        React.createElement(Text, { color: '#F59E0B' }, 'Space'),
        ' toggle  ',
        React.createElement(Text, { color: '#F59E0B' }, 'Enter'),
        ' confirm  ',
        React.createElement(Text, { color: '#F59E0B' }, 'Esc'),
        ' cancel'
      )
    ),
    props.selected.length
      ? React.createElement(Text, { color: '#10B981' }, `Selected: ${props.selected.join(', ')}`)
      : null
  );
}

module.exports = assignCommand;
