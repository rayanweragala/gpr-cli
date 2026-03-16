const React = require('react');
const { Box, Text } = require('ink');
const { execFile } = require('child_process');
const { promisify } = require('util');
const {
  buildApi,
  getPullRequest,
  formatApiError
} = require('../../lib/api');
const theme = require('../theme');

const execFileAsync = promisify(execFile);

async function resolveCommand(args, context) {
  const { config, repo, push, setMode } = context;
  const prNumber = args[0] ? Number(args[0]) : null;

  if (!prNumber || Number.isNaN(prNumber)) {
    push(React.createElement(Text, { color: theme.ERROR }, '✖ Usage: /resolve <pr-number>  e.g. /resolve 24'));
    return;
  }

  setMode('loading');

  try {
    const api = buildApi(config);
    const pr = await getPullRequest(api, repo.owner, repo.repo, prNumber);
    const headBranch = pr.head.ref;
    const baseBranch = pr.base.ref;

    push(React.createElement(
      Box,
      { flexDirection: 'column' },
      React.createElement(Text, { color: theme.PRIMARY, bold: true }, `Resolving conflicts for PR #${prNumber}`),
      React.createElement(Text, { color: theme.TEXT_MUTED }, `${headBranch} → ${baseBranch}`)
    ));

    push(React.createElement(Text, { color: theme.TEXT_MUTED }, '⠋ Fetching latest from remote...'));
    await runGitSafe(['fetch', 'origin']);

    push(React.createElement(Text, { color: theme.TEXT_MUTED }, `⠋ Checking out ${headBranch}...`));
    try {
      await runGitSafe(['checkout', headBranch]);
    } catch (_error) {
      await runGitSafe(['checkout', '-B', headBranch, `origin/${headBranch}`]);
    }

    push(React.createElement(Text, { color: theme.TEXT_MUTED }, `⠋ Pulling latest ${headBranch}...`));
    await runGitSafe(['pull', 'origin', headBranch]).catch(() => null);

    push(React.createElement(Text, { color: theme.TEXT_MUTED }, `⠋ Rebasing onto ${baseBranch}...`));

    try {
      await runGitSafe(['rebase', `origin/${baseBranch}`]);

      push(React.createElement(Text, { color: theme.TEXT_MUTED }, '⠋ Pushing resolved branch...'));
      await runGitSafe(['push', 'origin', headBranch, '--force-with-lease']);

      push(React.createElement(
        Box,
        { flexDirection: 'column' },
        React.createElement(Text, { color: theme.SUCCESS, bold: true }, '✔ Conflicts resolved successfully!'),
        React.createElement(Text, { color: theme.TEXT_MUTED }, `${headBranch} rebased onto ${baseBranch}`),
        React.createElement(Text, { color: theme.TEXT_MUTED }, 'Branch pushed to remote.'),
        React.createElement(Text, { color: theme.TEXT_DIM }, `Now run /merge ${prNumber} to merge the PR`)
      ));
    } catch (_rebaseError) {
      let conflictedFiles = [];

      try {
        const result = await runGitSafe(['diff', '--name-only', '--diff-filter=U']);
        conflictedFiles = String(result.stdout || '').trim().split('\n').filter(Boolean);
      } catch (_error) {
        conflictedFiles = [];
      }

      await runGitSafe(['rebase', '--abort']).catch(() => null);

      push(React.createElement(
        Box,
        { flexDirection: 'column' },
        React.createElement(Text, { color: theme.ERROR, bold: true }, '✖ Rebase has conflicts, manual fix needed'),
        React.createElement(Text, { color: theme.TEXT_MUTED }, 'Conflicted files:'),
        ...(conflictedFiles.length
          ? conflictedFiles.map((file) => React.createElement(
              Box,
              { key: file, paddingLeft: 2 },
              React.createElement(Text, { color: theme.WARNING }, '⚡ '),
              React.createElement(Text, { color: theme.TEXT_PRIMARY }, file)
            ))
          : [React.createElement(Text, { key: 'none', color: theme.TEXT_DIM }, 'No conflicted files could be listed automatically.')]),
        React.createElement(
          Box,
          {
            flexDirection: 'column',
            marginTop: 1,
            borderStyle: 'round',
            borderColor: theme.BORDER_DIM,
            paddingX: 2,
            paddingY: 1
          },
          React.createElement(Text, { color: theme.TEXT_MUTED, bold: true }, 'To fix manually:'),
          React.createElement(Text, { color: theme.TEXT_DIM }, `1. git checkout ${headBranch}`),
          React.createElement(Text, { color: theme.TEXT_DIM }, `2. git rebase origin/${baseBranch}`),
          React.createElement(Text, { color: theme.TEXT_DIM }, '3. Fix conflicts in each file above'),
          React.createElement(Text, { color: theme.TEXT_DIM }, '4. git add .'),
          React.createElement(Text, { color: theme.TEXT_DIM }, '5. git rebase --continue'),
          React.createElement(Text, { color: theme.TEXT_DIM }, `6. git push origin ${headBranch} --force-with-lease`),
          React.createElement(Text, { color: theme.TEXT_DIM }, `7. Come back and run /merge ${prNumber}`)
        )
      ));
    }
  } catch (error) {
    push(React.createElement(Text, { color: theme.ERROR }, `✖ ${formatCommandError(error)}`));
  } finally {
    setMode('idle');
  }
}

async function runGitSafe(args) {
  return execFileAsync('git', args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: {
      ...process.env,
      GIT_TERMINAL_PROMPT: '0'
    }
  });
}

function formatCommandError(error) {
  const stderr = String(error && error.stderr ? error.stderr : '').trim();
  const stdout = String(error && error.stdout ? error.stdout : '').trim();
  const message = stderr || stdout || (error && error.message) || '';

  if (message) {
    return message;
  }

  return formatApiError(error).message;
}

module.exports = resolveCommand;
