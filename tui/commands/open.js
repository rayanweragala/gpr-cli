const React = require('react');
const { Box, Text, useInput } = require('ink');
const TextInput = require('ink-text-input').default || require('ink-text-input');
const SelectInput = require('ink-select-input').default || require('ink-select-input');
const {
  buildApi,
  findPullRequestByBranch,
  createPullRequest,
  listBranches,
  formatApiError
} = require('../../lib/api');

async function openCommand(_args, context) {
  const { config, repo, push, setMode, setActiveForm } = context;
  setMode('loading');

  try {
    const api = buildApi(config);
    const branchesData = await listBranches(api, repo.owner, repo.repo);
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

    setMode('form');
    setActiveForm(React.createElement(OpenForm, {
      repo,
      branches: branchNames,
      defaultBase,
      onSubmit: async (formData) => {
        setActiveForm(null);
        setMode('loading');
        try {
          const pr = await createPullRequest(api, repo.owner, repo.repo, formData);
          push(React.createElement(
            Box,
            { flexDirection: 'column' },
            React.createElement(Text, { color: '#10B981', bold: true }, '✔ Pull Request Created!'),
            line('Title', pr.title),
            line('From', `${formData.head} → ${formData.base}`, '#3B82F6'),
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

  useInput((input, key) => {
    if (key.escape && typeof props.onCancel === 'function') {
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
        onSelect: (item) => props.onSubmit({
          title: title.trim(),
          body: body.trim(),
          head: props.repo.branch,
          base: item.value
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
