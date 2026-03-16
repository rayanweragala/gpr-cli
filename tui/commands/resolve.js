const React = require('react');
const { Box, Text } = require('ink');
const {
  buildApi,
  getPullRequest,
  formatApiError
} = require('../../lib/api');
const { createGitRunner, formatCommandError } = require('./gitTransport');
const theme = require('../theme');

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
    const runGitSafe = await createGitRunner(config);
    const pr = await getPullRequest(api, repo.owner, repo.repo, prNumber);
    const headBranch = pr.head.ref;
    const baseBranch = pr.base.ref;
    const originalBranchResult = await runGitSafe(['rev-parse', '--abbrev-ref', 'HEAD']).catch(() => ({ stdout: repo.branch || '' }));
    const originalBranch = String(originalBranchResult.stdout || repo.branch || '').trim();
    const originalStashList = await runGitSafe(['stash', 'list']).catch(() => ({ stdout: '' }));
    let didStash = false;

    push(React.createElement(
      Box,
      { flexDirection: 'column' },
      React.createElement(Text, { color: theme.PRIMARY, bold: true }, `Resolving conflicts for PR #${prNumber}`),
      React.createElement(Text, { color: theme.TEXT_MUTED }, `${headBranch} → ${baseBranch}`)
    ));

    try {
      await runGitSafe(['stash', 'push', '-m', 'gpr-resolve-auto-stash']);
      const newStashList = await runGitSafe(['stash', 'list']).catch(() => ({ stdout: '' }));
      didStash = String(newStashList.stdout || '') !== String(originalStashList.stdout || '');

      if (didStash) {
        push(React.createElement(Text, { color: theme.TEXT_MUTED }, '⠋ Local changes stashed temporarily'));
      }
    } catch (_error) {
      didStash = false;
    }

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

      if (originalBranch && originalBranch !== headBranch) {
        await runGitSafe(['checkout', originalBranch]).catch(() => null);
      }

      if (didStash) {
        await runGitSafe(['stash', 'pop']).catch(() => null);
        push(React.createElement(Text, { color: theme.TEXT_MUTED }, '✔ Local changes restored'));
      }

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

      if (originalBranch && originalBranch !== headBranch) {
        await runGitSafe(['checkout', originalBranch]).catch(() => null);
      }

      if (didStash) {
        await runGitSafe(['stash', 'pop']).catch(() => null);
      }

      push(React.createElement(
        Box,
        { flexDirection: 'column' },
        React.createElement(Text, { color: theme.ERROR, bold: true }, '✖ Rebase has conflicts, manual fix needed'),
        React.createElement(Text, { color: theme.TEXT_MUTED }, `${conflictedFiles.length || 'Unknown'} conflicted file${conflictedFiles.length === 1 ? '' : 's'} while rebasing ${headBranch} onto ${baseBranch}`),
        originalBranch && originalBranch !== headBranch
          ? React.createElement(Text, { color: theme.TEXT_DIM }, `Returned to ${originalBranch}`)
          : null,
        didStash
          ? React.createElement(Text, { color: theme.TEXT_DIM }, 'Restored your local changes after aborting the rebase')
          : null,
        React.createElement(
          Box,
          { flexDirection: 'column', marginTop: 1 },
          React.createElement(Text, { color: theme.TEXT_MUTED, bold: true }, 'Conflicted files:'),
          ...(conflictedFiles.length
            ? conflictedFiles.slice(0, 12).map((file) => React.createElement(
                Box,
                { key: file, flexDirection: 'column', paddingLeft: 2 },
                React.createElement(Text, { color: theme.WARNING }, `- ${file}`)
              ))
            : [React.createElement(Text, { key: 'none', color: theme.TEXT_DIM }, '  No conflicted files could be listed automatically.')]),
          conflictedFiles.length > 12
            ? React.createElement(Text, { color: theme.TEXT_DIM }, `  ...and ${conflictedFiles.length - 12} more`)
            : null
        ),
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
        ),
        React.createElement(
          Box,
          {
            flexDirection: 'column',
            marginTop: 1
          },
          React.createElement(Text, { color: theme.TEXT_MUTED, bold: true }, 'Inspect details:'),
          React.createElement(Text, { color: theme.TEXT_DIM }, 'git status'),
          React.createElement(Text, { color: theme.TEXT_DIM }, 'git diff --name-only --diff-filter=U'),
          React.createElement(Text, { color: theme.TEXT_DIM }, 'git diff -- <file>')
        )
      ));
    }
  } catch (error) {
    push(React.createElement(Text, { color: theme.ERROR }, `✖ ${formatCommandError(error)}`));
  } finally {
    setMode('idle');
  }
}

module.exports = resolveCommand;
