const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const React = require('react');
const { Box, Text, useInput } = require('ink');
const SelectInput = require('ink-select-input').default || require('ink-select-input');
const {
  buildApi,
  listOpenPullRequests,
  getPullRequest,
  formatApiError
} = require('../../lib/api');
const { createGitRunner, formatCommandError } = require('./gitTransport');
const theme = require('../theme');

const MAX_FILES = 3;
const MAX_DIFF_LINES = 12;
const SUMMARY_ONLY_THRESHOLD = 25;

async function reviewConflictsCommand(args, context) {
  const number = args[0] ? Number(args[0]) : undefined;
  const requestedFile = args[1] ? String(args[1]).trim() : '';

  if (args[0] && Number.isNaN(number)) {
    context.push(React.createElement(Text, { color: theme.ERROR }, '✖ Usage: /review-conflicts [pr-number] [file]'));
    return;
  }

  if (!number) {
    context.setMode('loading');

    try {
      const api = buildApi(context.config);
      const pullRequests = await listOpenPullRequests(api, context.repo.owner, context.repo.repo);

      if (!pullRequests.length) {
        context.push(React.createElement(Text, { color: theme.WARNING }, 'No open pull requests found.'));
        context.setMode('idle');
        return;
      }

      context.setMode('form');
      context.setActiveForm(React.createElement(ConflictPicker, {
        pullRequests,
        onCancel: () => cancel(context),
        onSelect: async (value) => {
          context.dismissForm();
          await inspectConflicts(value, '', context);
        }
      }));
    } catch (error) {
      context.push(React.createElement(Text, { color: theme.ERROR }, `✖ ${formatApiError(error).message}`));
      context.setMode('idle');
    }

    return;
  }

  await inspectConflicts(number, requestedFile, context);
}

function ConflictPicker(props) {
  useInput((input, key) => {
    if (key.escape && typeof props.onCancel === 'function') {
      props.onCancel();
    }
  });

  return React.createElement(
    Box,
    { flexDirection: 'column' },
    React.createElement(Text, { color: theme.TEXT_PRIMARY, bold: true }, 'Select a pull request to inspect conflicts'),
    React.createElement(SelectInput, {
      items: props.pullRequests.map((pullRequest) => ({
        label: `#${pullRequest.number} ${pullRequest.title} (${pullRequest.head.ref} → ${pullRequest.base.ref})`,
        value: pullRequest.number
      })),
      onSelect: (item) => props.onSelect(item.value)
    })
  );
}

async function inspectConflicts(number, requestedFile, context) {
  const { config, repo, push, setMode, dismissForm } = context;
  dismissForm();
  setMode('loading');

  const rootRunner = await createGitRunner(config);
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'gpr-conflicts-'));
  let worktreeReady = false;

  try {
    const api = buildApi(config);
    const pr = await getPullRequest(api, repo.owner, repo.repo, number);
    const headBranch = pr.head.ref;
    const baseBranch = pr.base.ref;

    pushLines(push, [
      { text: `Inspecting conflicts for PR #${number}`, color: theme.PRIMARY, bold: true },
      { text: `${headBranch} → ${baseBranch}`, color: theme.TEXT_MUTED },
      { text: 'Using a temporary git worktree so your current branch is untouched', color: theme.TEXT_DIM }
    ]);

    push(React.createElement(Text, { color: theme.TEXT_MUTED }, '⠋ Creating temporary worktree...'));
    await rootRunner(['worktree', 'add', '--detach', tempDir, 'HEAD']);
    worktreeReady = true;

    const worktreeRunner = await createGitRunner(config, { cwd: tempDir });

    push(React.createElement(Text, { color: theme.TEXT_MUTED }, '⠋ Fetching remote branches...'));
    await worktreeRunner(['fetch', 'origin']);

    push(React.createElement(Text, { color: theme.TEXT_MUTED }, `⠋ Checking out ${headBranch} in temp worktree...`));
    await worktreeRunner(['checkout', '-B', headBranch, `origin/${headBranch}`]);

    push(React.createElement(Text, { color: theme.TEXT_MUTED }, `⠋ Simulating rebase onto ${baseBranch}...`));

    try {
      await worktreeRunner(['rebase', `origin/${baseBranch}`]);
      await worktreeRunner(['rebase', '--abort']).catch(() => null);

      pushLines(push, [
        { text: '✔ No rebase conflicts detected', color: theme.SUCCESS, bold: true },
        { text: `${headBranch} can be rebased onto ${baseBranch}`, color: theme.TEXT_MUTED },
        { text: `You can run /resolve ${number} or /merge ${number}`, color: theme.TEXT_DIM }
      ]);

      return;
    } catch (_error) {
      const conflictedFiles = await loadConflictedFiles(worktreeRunner);
      const previewFiles = pickPreviewFiles(conflictedFiles, requestedFile);
      const previews = [];

      for (const file of previewFiles) {
        previews.push({
          file,
          lines: await loadDiffPreview(worktreeRunner, file)
        });
      }

      await worktreeRunner(['rebase', '--abort']).catch(() => null);

      const lines = [
        { text: '✖ Rebase conflicts detected', color: theme.ERROR, bold: true },
        {
          text: `${conflictedFiles.length || 'Unknown'} conflicted file${conflictedFiles.length === 1 ? '' : 's'} while rebasing ${headBranch} onto ${baseBranch}`,
          color: theme.TEXT_MUTED
        }
      ];

      if (requestedFile && conflictedFiles.length && !conflictedFiles.includes(requestedFile)) {
        lines.push({ text: '', color: theme.TEXT_DIM });
        lines.push({ text: `Requested file not found in conflict set: ${truncateLine(requestedFile)}`, color: theme.WARNING });
      }

      if (requestedFile) {
        lines.push({ text: '', color: theme.TEXT_DIM });

        if (previews.length) {
          previews.forEach((preview) => {
            renderPreview(preview).forEach((line) => lines.push(line));
          });
        } else {
          lines.push({ text: `No preview available for ${truncateLine(requestedFile)}`, color: theme.TEXT_DIM });
        }
      } else {
        lines.push({ text: '', color: theme.TEXT_DIM });
        lines.push({ text: 'Conflicted files:', color: theme.TEXT_MUTED, bold: true });

        if (conflictedFiles.length) {
          conflictedFiles.slice(0, 8).forEach((file) => {
            lines.push({ text: `- ${truncateLine(file)}`, color: theme.WARNING });
          });
        } else {
          lines.push({ text: 'No conflicted files could be listed automatically.', color: theme.TEXT_DIM });
        }

        if (conflictedFiles.length > 8) {
          lines.push({ text: `...and ${conflictedFiles.length - 8} more`, color: theme.TEXT_DIM });
        }
      }

      if (conflictedFiles.length > SUMMARY_ONLY_THRESHOLD && !requestedFile) {
        lines.push({ text: '', color: theme.TEXT_DIM });
        lines.push({ text: 'Preview omitted for large conflict set', color: theme.TEXT_MUTED, bold: true });
        lines.push({ text: `Run /review-conflicts ${number} <file> to inspect one file`, color: theme.TEXT_DIM });
        lines.push({ text: `Example: /review-conflicts ${number} pom.xml`, color: theme.TEXT_DIM });
      } else if (!requestedFile) {
        previews.forEach((preview) => {
          lines.push({ text: '', color: theme.TEXT_DIM });
          renderPreview(preview).forEach((line) => lines.push(line));
        });
      }

      lines.push({ text: '', color: theme.TEXT_DIM });
      lines.push({ text: 'Next steps:', color: theme.TEXT_MUTED, bold: true });
      lines.push({ text: `1. Run /resolve ${number} to attempt the guided rebase in your real worktree`, color: theme.TEXT_DIM });
      lines.push({ text: `2. Or inspect manually with: git checkout ${headBranch}`, color: theme.TEXT_DIM });
      lines.push({ text: `3. git rebase origin/${baseBranch}`, color: theme.TEXT_DIM });
      lines.push({ text: '4. git status', color: theme.TEXT_DIM });
      lines.push({ text: '5. git diff --name-only --diff-filter=U', color: theme.TEXT_DIM });

      pushLines(push, lines);
    }
  } catch (error) {
    push(React.createElement(Text, { color: theme.ERROR }, `✖ ${formatCommandError(error)}`));
  } finally {
    if (worktreeReady) {
      await rootRunner(['worktree', 'remove', '--force', tempDir]).catch(() => null);
    }
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => null);
    setMode('idle');
  }
}

async function loadConflictedFiles(runGitSafe) {
  try {
    const result = await runGitSafe(['diff', '--name-only', '--diff-filter=U']);
    return String(result.stdout || '').trim().split('\n').filter(Boolean);
  } catch (_error) {
    return [];
  }
}

async function loadDiffPreview(runGitSafe, file) {
  try {
    const result = await runGitSafe(['diff', '--unified=3', '--', file]);
    return String(result.stdout || '')
      .split('\n')
      .slice(0, MAX_DIFF_LINES)
      .map((line) => line.replace(/\t/g, '  '));
  } catch (_error) {
    return [];
  }
}

function renderPreview(preview) {
  const rows = [
    { text: `Preview: ${truncateLine(preview.file)}`, color: theme.SECONDARY, bold: true }
  ];

  if (preview.lines.length) {
    preview.lines.forEach((line, index) => {
      rows.push({
        text: `  ${truncateLine(line)}`,
        color: line.startsWith('+')
          ? theme.SUCCESS
          : line.startsWith('-')
            ? theme.ERROR
            : line.startsWith('@@')
              ? theme.INFO
              : theme.TEXT_DIM
      });
    });
  } else {
    rows.push({ text: '  (No diff preview available)', color: theme.TEXT_DIM });
  }

  if (preview.lines.length >= MAX_DIFF_LINES) {
    rows.push({ text: '  ...preview truncated', color: theme.TEXT_DIM });
  }

  return rows;
}

function pickPreviewFiles(conflictedFiles, requestedFile) {
  if (requestedFile) {
    return conflictedFiles.includes(requestedFile) ? [requestedFile] : [];
  }

  if (conflictedFiles.length > SUMMARY_ONLY_THRESHOLD) {
    return [];
  }

  return conflictedFiles.slice(0, MAX_FILES);
}

function truncateLine(value) {
  const width = Math.max(60, (process.stdout.columns || 120) - 8);
  const text = String(value || '');
  return text.length <= width ? text : `${text.slice(0, width - 1)}…`;
}

function pushLines(push, lines) {
  lines.forEach((line) => {
    push(React.createElement(
      Text,
      {
        color: line.color,
        bold: Boolean(line.bold)
      },
      line.text
    ));
  });
}

function cancel(context) {
  context.dismissForm();
  context.push(React.createElement(Text, { color: theme.TEXT_MUTED }, 'Conflict review cancelled.'));
}

module.exports = reviewConflictsCommand;
