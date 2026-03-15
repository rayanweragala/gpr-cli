const React = require('react');
const { Box, Text, useInput } = require('ink');
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

      await requestReviewers(api, repo.owner, repo.repo, prNumber, [reviewer]);
      await addAssignees(api, repo.owner, repo.repo, prNumber, [reviewer]);
      push(React.createElement(
        Box,
        { flexDirection: 'column' },
        React.createElement(Text, { color: '#10B981' }, `✔ Assigned ${reviewer} to PR #${prNumber}`)
      ));
      setMode('idle');
      return;
    }

    const pullRequests = await listOpenPullRequests(api, repo.owner, repo.repo);
    let members = await getRepoCollaborators(api, repo.owner, repo.repo);

    if (!members.length) {
      members = await getOrgMembers(api, repo.owner);
    }

    if (!pullRequests.length) {
      push(React.createElement(Text, { color: '#F59E0B' }, 'No open pull requests found.'));
      setMode('idle');
      return;
    }

    if (!members.length) {
      push(React.createElement(Text, { color: '#F59E0B' }, 'No team members found for assignment.'));
      setMode('idle');
      return;
    }

    setMode('form');
    setActiveForm(React.createElement(AssignForm, {
      pullRequests,
      members,
      onSubmit: async ({ prNumber, assignees, reviewers }) => {
        setActiveForm(null);
        setMode('loading');
        try {
          const assigned = [...new Set([...(reviewers || []), ...(assignees || [])])];

          if (!assigned.length) {
            push(React.createElement(Text, { color: '#F59E0B' }, `No reviewers or assignees selected for PR #${prNumber}.`));
            return;
          }

          await requestReviewers(api, repo.owner, repo.repo, prNumber, reviewers);
          await addAssignees(api, repo.owner, repo.repo, prNumber, assignees);
          push(React.createElement(
            Text,
            { color: '#10B981' },
            `✔ PR #${prNumber} assigned to ${assigned.join(', ')}`
          ));
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

function AssignForm(props) {
  const [phase, setPhase] = React.useState('pr');
  const [selectedPr, setSelectedPr] = React.useState(null);
  const [reviewers, setReviewers] = React.useState([]);

  useInput((input, key) => {
    if (key.escape && typeof props.onCancel === 'function') {
      props.onCancel();
    }
  });

  if (phase === 'pr') {
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
          value: pullRequest.number
        })),
        onSelect: (item) => {
          setSelectedPr(item.value);
          setPhase('reviewers');
        }
      })
    );
  }

  return React.createElement(MultiSelect, {
    title: 'Select reviewers / assignees',
    items: props.members,
    selected: reviewers,
    hint: 'Select at least one person',
    onToggle: (login) => {
      setReviewers((items) => items.includes(login) ? items.filter((item) => item !== login) : [...items, login]);
    },
    onConfirm: (selected) => props.onSubmit({
      prNumber: selectedPr,
      reviewers: selected,
      assignees: selected
    }),
    onCancel: props.onCancel
  });
}

function MultiSelect(props) {
  const [cursor, setCursor] = React.useState(0);

  useInput((input, key) => {
    if (key.upArrow) {
      setCursor((value) => Math.max(0, value - 1));
    }
    if (key.downArrow) {
      setCursor((value) => Math.min(props.items.length - 1, value + 1));
    }
    if (input === ' ') {
      if (props.items[cursor]) {
        props.onToggle(props.items[cursor].login);
      }
    }
    if (key.return) {
      if (!props.selected.length) {
        return;
      }
      props.onConfirm(props.selected);
    }
    if (key.escape && typeof props.onCancel === 'function') {
      props.onCancel();
    }
  });

  return React.createElement(
    Box,
    { flexDirection: 'column' },
    React.createElement(Text, { color: '#F9FAFB', bold: true }, props.title),
    ...props.items.map((item, index) => React.createElement(
      Box,
      { key: item.login },
      React.createElement(Text, { color: props.selected.includes(item.login) ? '#10B981' : '#6B7280' }, props.selected.includes(item.login) ? '◉ ' : '○ '),
      React.createElement(Text, {
        backgroundColor: index === cursor ? '#374151' : undefined,
        color: index === cursor ? '#F9FAFB' : '#9CA3AF'
      }, item.login)
    )),
    React.createElement(
      Box,
      { marginTop: 1 },
      React.createElement(
        Text,
        { color: '#6B7280' },
        React.createElement(Text, { color: '#F59E0B' }, 'Space'),
        ' toggle  ',
        React.createElement(Text, { color: '#F59E0B' }, 'Enter'),
        ' confirm  ',
        React.createElement(Text, { color: '#F59E0B' }, 'Esc'),
        ' cancel'
      )
    ),
    props.hint ? React.createElement(Text, { color: '#6B7280' }, props.hint) : null
  );
}

module.exports = assignCommand;
