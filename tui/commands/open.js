const React = require('react');
const { Box, Text, useInput } = require('ink');
const TextInput = require('ink-text-input').default || require('ink-text-input');
const SelectInput = require('ink-select-input').default || require('ink-select-input');
const {
  buildApi,
  findPullRequestByBranch,
  createPullRequest,
  listBranches,
  getAuthenticatedUser,
  getRepoCollaborators,
  getOrgMembers,
  requestReviewers,
  addAssignees,
  formatApiError
} = require('../../lib/api');

async function openCommand(_args, context) {
  const { config, repo, push, setMode, setActiveForm } = context;
  setMode('loading');

  try {
    const api = buildApi(config);
    const [branchesData, currentUser] = await Promise.all([
      listBranches(api, repo.owner, repo.repo),
      getAuthenticatedUser(api)
    ]);
    const branchNames = branchesData.map((branch) => branch.name);

    if (!branchNames.includes(repo.branch)) {
      push(React.createElement(Text, { color: '#EF4444' }, `✖ Push your branch first: git push origin ${repo.branch}`));
      setMode('idle');
      return;
    }

    const existing = await findPullRequestByBranch(api, repo.owner, repo.repo, repo.branch).catch(() => null);

    if (existing) {
      push(React.createElement(
        Box,
        { flexDirection: 'column' },
        React.createElement(Text, { color: '#10B981', bold: true }, `✔ PR already exists: #${existing.number}`),
        React.createElement(Text, { color: '#F9FAFB' }, existing.title),
        React.createElement(Text, { color: '#3B82F6' }, existing.html_url)
      ));
      setMode('idle');
      return;
    }

    const defaultBase = branchNames.includes('main')
      ? 'main'
      : branchNames.includes('master')
        ? 'master'
        : branchNames[0];

    let members = await getRepoCollaborators(api, repo.owner, repo.repo);
    if (!members.length) {
      members = await getOrgMembers(api, repo.owner);
    }

    setMode('form');
    setActiveForm(React.createElement(OpenForm, {
      repo,
      branches: branchNames,
      defaultBase,
      members,
      currentUser,
      onSubmit: async (formData) => {
        setActiveForm(null);
        setMode('loading');
        try {
          const pr = await createPullRequest(api, repo.owner, repo.repo, {
            title: formData.title,
            body: formData.body,
            head: repo.branch,
            base: formData.base
          });

          if (formData.reviewers && formData.reviewers.length) {
            await requestReviewers(api, repo.owner, repo.repo, pr.number, formData.reviewers);
          }

          if (formData.assignees && formData.assignees.length) {
            await addAssignees(api, repo.owner, repo.repo, pr.number, formData.assignees);
          }

          push(React.createElement(
            Box,
            { flexDirection: 'column' },
            React.createElement(Text, { color: '#10B981', bold: true }, '✔ Pull Request Created!'),
            line('Title', pr.title),
            line('From', `${formData.head} → ${formData.base}`, '#3B82F6'),
            line('Reviewers', formData.reviewers && formData.reviewers.length ? formData.reviewers.join(', ') : 'none assigned', '#F59E0B'),
            line('Assignees', formData.assignees && formData.assignees.length ? formData.assignees.join(', ') : 'none assigned', '#10B981'),
            line('URL', pr.html_url, '#3B82F6')
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
        push(React.createElement(Text, { color: '#6B7280' }, 'PR creation cancelled.'));
      }
    }));
  } catch (error) {
    push(React.createElement(Text, { color: '#EF4444' }, `✖ ${formatApiError(error).message}`));
    setMode('idle');
  }
}

function OpenForm(props) {
  const [step, setStep] = React.useState('title');
  const [title, setTitle] = React.useState(prettyBranch(props.repo.branch));
  const [body, setBody] = React.useState('');
  const [selectedBase, setSelectedBase] = React.useState(props.defaultBase);
  const [selectedReviewers, setSelectedReviewers] = React.useState([]);
  const [selectedAssignees, setSelectedAssignees] = React.useState(
    props.currentUser && props.currentUser.login ? [props.currentUser.login] : []
  );
  const hasMembers = Array.isArray(props.members) && props.members.length > 0;

  useInput((input, key) => {
    if ((step === 'title' || step === 'body' || step === 'base' || step === 'submit') && key.escape && typeof props.onCancel === 'function') {
      props.onCancel();
    }
  });

  if (step === 'base') {
    return React.createElement(
      Box,
      { flexDirection: 'column' },
      React.createElement(Text, { color: '#F9FAFB', bold: true }, 'Select the base branch'),
      React.createElement(SelectInput, {
        items: props.branches.map((branch) => ({ label: branch, value: branch })),
        initialIndex: Math.max(0, props.branches.indexOf(selectedBase)),
        onSelect: (item) => {
          setSelectedBase(item.value);
          if (!hasMembers) {
            setStep('submit');
            return;
          }
          setStep('reviewers');
        }
      })
    );
  }

  if (step === 'reviewers') {
    return React.createElement(
      Box,
      { flexDirection: 'column' },
      React.createElement(Text, { color: '#F9FAFB', bold: true }, 'Select reviewers'),
      React.createElement(Text, { color: '#6B7280' }, '(optional — Enter to skip)'),
      React.createElement(MultiSelect, {
        items: props.members,
        selected: selectedReviewers,
        hint: 'optional — Enter to skip',
        onToggle: (login) => {
          setSelectedReviewers((items) => items.includes(login) ? items.filter((item) => item !== login) : [...items, login]);
        },
        onConfirm: (selected) => {
          setSelectedReviewers(selected);
          setStep('assignees');
        },
        onSkip: () => {
          setSelectedReviewers([]);
          setStep('assignees');
        }
      })
    );
  }

  if (step === 'assignees') {
    return React.createElement(
      Box,
      { flexDirection: 'column' },
      React.createElement(Text, { color: '#F9FAFB', bold: true }, 'Select assignees'),
      React.createElement(Text, { color: '#6B7280' }, '(you are pre-selected)'),
      React.createElement(MultiSelect, {
        items: props.members,
        selected: selectedAssignees,
        hint: 'you are pre-selected',
        onToggle: (login) => {
          setSelectedAssignees((items) => items.includes(login) ? items.filter((item) => item !== login) : [...items, login]);
        },
        onConfirm: (selected) => props.onSubmit({
          title: title.trim(),
          body: body.trim(),
          head: props.repo.branch,
          base: selectedBase,
          reviewers: selectedReviewers,
          assignees: selected
        }),
        onSkip: () => props.onSubmit({
          title: title.trim(),
          body: body.trim(),
          head: props.repo.branch,
          base: selectedBase,
          reviewers: selectedReviewers,
          assignees: []
        })
      })
    );
  }

  if (step === 'submit') {
    return React.createElement(
      Box,
      { flexDirection: 'column' },
      React.createElement(Text, { color: '#6B7280' }, 'No team members found, skipping reviewer assignment'),
      React.createElement(Text, { color: '#F9FAFB' }, 'Press Enter to create the pull request'),
      React.createElement(TextInput, {
        value: '',
        onChange: () => {},
        onSubmit: () => props.onSubmit({
          title: title.trim(),
          body: body.trim(),
          head: props.repo.branch,
          base: selectedBase,
          reviewers: [],
          assignees: selectedAssignees
        })
      })
    );
  }

  return React.createElement(
    Box,
    { flexDirection: 'column' },
    React.createElement(Text, { color: '#F9FAFB', bold: true }, step === 'title' ? 'PR title' : 'PR description (optional)'),
    React.createElement(TextInput, {
      value: step === 'title' ? title : body,
      onChange: step === 'title' ? setTitle : setBody,
      onSubmit: () => setStep(step === 'title' ? 'body' : 'base')
    })
  );
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
      props.onConfirm(props.selected);
    }
    if (key.escape && typeof props.onSkip === 'function') {
      props.onSkip();
    }
  });

  return React.createElement(
    Box,
    { flexDirection: 'column' },
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
        ' skip'
      )
    ),
    props.hint ? React.createElement(Text, { color: '#6B7280', dimColor: true }, props.hint) : null
  );
}

function prettyBranch(branch) {
  return String(branch || '')
    .replace(/[/-]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function line(label, value, color) {
  return React.createElement(
    Text,
    null,
    React.createElement(Text, { color: '#6B7280' }, `${label.padEnd(5, ' ')} : `),
    React.createElement(Text, { color: color || '#F9FAFB' }, value)
  );
}

module.exports = openCommand;
