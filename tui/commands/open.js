const React = require('react');
const { Box, Text, useInput } = require('ink');
const TextInput = require('ink-text-input').default || require('ink-text-input');
const {
  buildApi,
  findPullRequestByBranch,
  createPullRequest,
  listBranches,
  getAuthenticatedUser,
  addAssignees,
  formatApiError
} = require('../../lib/api');
const theme = require('../theme');

const TOTAL_STEPS = 3;
const PANEL_WIDTH = 50;

async function openCommand(_args, context) {
  const { config, repo, push, setMode, setActiveForm, dismissForm } = context;
  setMode('loading');

  try {
    const api = buildApi(config);
    const [branchesData, currentUser] = await Promise.all([
      listBranches(api, repo.owner, repo.repo),
      getAuthenticatedUser(api)
    ]);
    const branchNames = branchesData.map((branch) => branch.name);

    if (!branchNames.includes(repo.branch)) {
      push(React.createElement(Text, { color: theme.ERROR }, `✖ Push your branch first: git push origin ${repo.branch}`));
      setMode('idle');
      return;
    }

    const existing = await findPullRequestByBranch(api, repo.owner, repo.repo, repo.branch).catch(() => null);

    if (existing) {
      push(React.createElement(
        Box,
        { flexDirection: 'column', marginY: 1 },
        React.createElement(Text, { color: theme.SUCCESS, bold: true }, '✔ PR Already Exists'),
        detailLine('PR', `#${existing.number}`, theme.SECONDARY, 10),
        detailLine('Title', existing.title, theme.TEXT_PRIMARY, 10),
        detailLine('URL', existing.html_url, theme.INFO, 10)
      ));
      setMode('idle');
      return;
    }

    setMode('form');
    setActiveForm(React.createElement(OpenForm, {
      repo,
      branches: branchNames,
      currentUser: currentUser && currentUser.login ? currentUser.login : 'unknown',
      onSubmit: async (formData) => {
        dismissForm();
        setMode('loading');

        try {
          const created = await createPullRequest(api, repo.owner, repo.repo, {
            title: formData.title,
            body: formData.body,
            head: formData.head,
            base: formData.base
          });
          const pr = created && created.number
            ? created
            : await findPullRequestByBranch(api, repo.owner, repo.repo, formData.head).catch(() => created);

          if (pr && pr.number && formData.assignees && formData.assignees.length) {
            await addAssignees(api, repo.owner, repo.repo, pr.number, formData.assignees).catch(() => null);
          }

          push(React.createElement(
            Box,
            { flexDirection: 'column', marginY: 1 },
            React.createElement(Text, { color: theme.SUCCESS, bold: true }, '✔ Pull Request Created!'),
            detailLine('PR', pr && pr.number ? `#${pr.number}` : '(created)', theme.SECONDARY, 10),
            detailLine('Title', pr && pr.title ? pr.title : formData.title, theme.TEXT_PRIMARY, 10),
            detailLine('From', `${formData.head} → ${formData.base}`, theme.INFO, 10),
            detailLine('Assignee', formData.assignees && formData.assignees.length ? formData.assignees.join(', ') : 'none', theme.WARNING, 10),
            detailLine('URL', pr && pr.html_url ? pr.html_url : '(not returned by server)', theme.INFO, 10)
          ));
        } catch (error) {
          push(React.createElement(Text, { color: theme.ERROR }, `✖ ${formatApiError(error).message}`));
        } finally {
          setMode('idle');
        }
      },
      onCancel: () => {
        dismissForm();
        push(React.createElement(Text, { color: theme.TEXT_MUTED }, 'PR creation cancelled.'));
      }
    }));
  } catch (error) {
    push(React.createElement(Text, { color: theme.ERROR }, `✖ ${formatApiError(error).message}`));
    setMode('idle');
  }
}

function OpenForm({ repo, branches, currentUser, onSubmit, onCancel }) {
  const [step, setStep] = React.useState(1);
  const [title, setTitle] = React.useState(prettifyBranch(repo.branch));
  const [description, setDescription] = React.useState('');
  const [baseBranch, setBaseBranch] = React.useState(
    branches.includes('main')
      ? 'main'
      : branches.includes('master')
        ? 'master'
        : branches[0] || 'main'
  );
  const [branchCursor, setBranchCursor] = React.useState(
    Math.max(0, branches.indexOf(
      branches.includes('main')
        ? 'main'
        : branches.includes('master')
          ? 'master'
          : branches[0] || 'main'
    ))
  );

  useInput((input, key) => {
    if (!key.escape) {
      return;
    }

    if (step === 1) {
      onCancel();
      return;
    }

    if (step === 2) {
      setStep(1);
      return;
    }

    if (step === 3) {
      setStep(2);
      return;
    }

    if (step === 4) {
      setStep(3);
    }
  });

  if (step === 1) {
    return React.createElement(
      FormPanel,
      {
        title: 'Create Pull Request',
        subtitle: `(Step 1 of ${TOTAL_STEPS})`,
        branchLine: `${repo.branch} → ?`,
        hint: hintLine('Enter', 'continue', 'Esc', 'cancel')
      },
      React.createElement(
        Box,
        { flexDirection: 'column', marginTop: 1 },
        React.createElement(Text, { color: theme.TEXT_MUTED }, 'PR Title'),
        React.createElement(
          Box,
          { borderStyle: 'round', borderColor: theme.SECONDARY, paddingX: 1, marginTop: 0 },
          React.createElement(TextInput, {
            value: title,
            onChange: setTitle,
            onSubmit: (value) => {
              const nextTitle = String(value || '').trim();
              if (nextTitle) {
                setTitle(nextTitle);
                setStep(2);
              }
            },
            focus: true
          })
        )
      )
    );
  }

  if (step === 2) {
    return React.createElement(
      FormPanel,
      {
        title: 'Create Pull Request',
        subtitle: `(Step 2 of ${TOTAL_STEPS})`,
        branchLine: `${repo.branch} → ?`,
        hint: hintLine('Enter', 'continue', 'Esc', 'go back')
      },
      React.createElement(
        Box,
        { flexDirection: 'column', marginTop: 1 },
        React.createElement(
          Box,
          { flexDirection: 'row' },
          React.createElement(Text, { color: theme.TEXT_MUTED }, 'PR Description'),
          React.createElement(Text, { color: theme.TEXT_DIM }, '  (optional)')
        ),
        React.createElement(
          Box,
          { borderStyle: 'round', borderColor: theme.BORDER_DIM, paddingX: 1, marginTop: 0 },
          React.createElement(TextInput, {
            value: description,
            onChange: setDescription,
            onSubmit: (value) => {
              setDescription(String(value || '').trim());
              setStep(3);
            },
            placeholder: 'What does this PR do?',
            focus: true
          })
        )
      )
    );
  }

  if (step === 3) {
    return React.createElement(BranchPickerStep, {
      repo,
      branches,
      cursor: branchCursor,
      setCursor: setBranchCursor,
      onSelect: (branch) => {
        setBaseBranch(branch);
        setStep(4);
      }
    });
  }

  return React.createElement(ConfirmStep, {
    repo,
    title,
    description,
    baseBranch,
    currentUser,
    onSubmit: () => onSubmit({
      title,
      body: description,
      head: repo.branch,
      base: baseBranch,
      assignees: [currentUser]
    })
  });
}

function BranchPickerStep({ repo, branches, cursor, setCursor, onSelect }) {
  useInput((input, key) => {
    if (key.upArrow) {
      setCursor((value) => Math.max(0, value - 1));
      return;
    }

    if (key.downArrow) {
      setCursor((value) => Math.min(branches.length - 1, value + 1));
      return;
    }

    if (key.return && branches[cursor]) {
      onSelect(branches[cursor]);
    }
  });

  const windowSize = 6;
  const startIndex = Math.max(0, Math.min(cursor - 2, Math.max(0, branches.length - windowSize)));
  const visibleBranches = branches.slice(startIndex, startIndex + windowSize);

  return React.createElement(
    FormPanel,
    {
      title: 'Create Pull Request',
      subtitle: `(Step 3 of ${TOTAL_STEPS})`,
      branchLine: `${repo.branch} → ${branches[cursor] || '?'}`,
      hint: hintLine('↑↓', 'navigate', 'Enter', 'select', 'Esc', 'back')
    },
    React.createElement(
      Box,
      { flexDirection: 'column', marginTop: 1 },
      React.createElement(Text, { color: theme.TEXT_MUTED }, 'Merge into which branch?'),
      React.createElement(
        Box,
        { flexDirection: 'column', marginTop: 1 },
        ...visibleBranches.map((branch, index) => {
          const realIndex = startIndex + index;
          const selected = realIndex === cursor;
          return React.createElement(
            Box,
            { key: branch, flexDirection: 'row' },
            React.createElement(Text, { color: selected ? theme.PRIMARY : theme.TEXT_DIM }, selected ? '❯ ' : '  '),
            React.createElement(Text, { color: selected ? theme.TEXT_PRIMARY : theme.TEXT_MUTED, bold: selected }, branch)
          );
        }),
        branches.length > windowSize
          ? React.createElement(Text, { color: theme.TEXT_DIM }, `  ...${branches.length - visibleBranches.length} more`)
          : null
      )
    )
  );
}

function ConfirmStep({ repo, title, description, baseBranch, currentUser, onSubmit }) {
  useInput((input, key) => {
    if (key.return) {
      onSubmit();
    }
  });

  return React.createElement(
    FormPanel,
    {
      title: 'Create Pull Request',
      subtitle: '(Confirm)',
      branchLine: `${repo.branch} → ${baseBranch}`,
      borderColor: theme.SUCCESS,
      titleColor: theme.SUCCESS,
      hint: hintLine('Enter', 'submit', 'Esc', 'go back')
    },
    React.createElement(
      Box,
      { flexDirection: 'column', marginTop: 1 },
      detailLine('Title', title, theme.TEXT_PRIMARY, 14),
      detailLine('Description', description || '(none)', theme.TEXT_MUTED, 14),
      detailLine('From', repo.branch, theme.INFO, 14),
      detailLine('Into', baseBranch, theme.SUCCESS, 14),
      detailLine('Assignee', `${currentUser} (you)`, theme.WARNING, 14)
    )
  );
}

function FormPanel(props) {
  return React.createElement(
    Box,
    {
      flexDirection: 'column',
      borderStyle: 'round',
      borderColor: props.borderColor || theme.PRIMARY,
      paddingX: 2,
      paddingY: 1,
      marginY: 1
    },
    React.createElement(
      Box,
      { flexDirection: 'column', marginBottom: 1 },
      React.createElement(
        Box,
        { flexDirection: 'row' },
        React.createElement(Text, { color: props.titleColor || theme.PRIMARY, bold: true }, props.title),
        React.createElement(Text, { color: theme.TEXT_MUTED }, `  ${props.subtitle}`)
      ),
      React.createElement(Text, { color: theme.TEXT_DIM }, props.branchLine)
    ),
    React.createElement(Text, { color: theme.BORDER_DIM }, '─'.repeat(PANEL_WIDTH)),
    props.children,
    React.createElement(
      Box,
      { marginTop: 1 },
      props.hint
    )
  );
}

function hintLine(keyA, actionA, keyB, actionB, keyC, actionC) {
  return React.createElement(
    Text,
    { color: theme.TEXT_DIM },
    React.createElement(Text, { color: keyA === 'Enter' ? theme.SUCCESS : theme.WARNING }, keyA),
    ` ${actionA}`,
    keyB ? React.createElement(React.Fragment, null,
      '  ',
      React.createElement(Text, { color: theme.WARNING }, keyB),
      ` ${actionB}`
    ) : null,
    keyC ? React.createElement(React.Fragment, null,
      '  ',
      React.createElement(Text, { color: theme.WARNING }, keyC),
      ` ${actionC}`
    ) : null
  );
}

function detailLine(label, value, color, width) {
  return React.createElement(
    Box,
    { flexDirection: 'row' },
    React.createElement(
      Box,
      { width: width || 14, overflow: 'hidden' },
      React.createElement(Text, { color: theme.TEXT_MUTED }, label)
    ),
    React.createElement(Text, { color: theme.TEXT_MUTED }, ' : '),
    React.createElement(
      Box,
      { flexGrow: 1, overflow: 'hidden' },
      React.createElement(Text, { color: color || theme.TEXT_PRIMARY }, value)
    )
  );
}

function prettifyBranch(branch) {
  return String(branch || '')
    .replace(/^(feature|feat|fix|bug|hotfix)\//, '')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();
}

module.exports = openCommand;
