const React = require('react');
const { Box, Text } = require('ink');
const {
  buildApi,
  findPullRequestByBranch,
  listBranches,
  formatApiError
} = require('../../lib/api');
const { createGitRunner, formatCommandError } = require('./gitTransport');
const theme = require('../theme');

async function syncCommand(_args, context) {
  const { config, repo, push, setMode } = context;
  setMode('loading');

  try {
    const api = buildApi(config);
    const runGitSafe = await createGitRunner(config);
    let baseBranch = 'main';

    try {
      const pr = await findPullRequestByBranch(api, repo.owner, repo.repo, repo.branch);
      if (pr && pr.base && pr.base.ref) {
        baseBranch = pr.base.ref;
      }
    } catch (_error) {
      baseBranch = 'main';
    }

    const branches = await listBranches(api, repo.owner, repo.repo).catch(() => []);
    if (!branches.find((branch) => branch.name === baseBranch)) {
      if (branches.find((branch) => branch.name === 'master')) {
        baseBranch = 'master';
      } else {
        baseBranch = branches[0] && branches[0].name ? branches[0].name : 'main';
      }
    }

    push(React.createElement(
      Box,
      { flexDirection: 'column' },
      React.createElement(Text, { color: theme.PRIMARY, bold: true }, `Syncing ${repo.branch} with ${baseBranch}`)
    ));

    push(React.createElement(Text, { color: theme.TEXT_MUTED }, '⠋ Fetching origin...'));
    await runGitSafe(['fetch', 'origin']);

    const originalStashList = await runGitSafe(['stash', 'list']);
    let didStash = false;

    try {
      await runGitSafe(['stash', 'push', '-m', 'gpr-sync-auto-stash']);
      const newStashList = await runGitSafe(['stash', 'list']);
      didStash = String(newStashList.stdout || '') !== String(originalStashList.stdout || '');

      if (didStash) {
        push(React.createElement(Text, { color: theme.TEXT_MUTED }, '⠋ Local changes stashed temporarily'));
      }
    } catch (_error) {
      didStash = false;
    }

    push(React.createElement(Text, { color: theme.TEXT_MUTED }, `⠋ Rebasing onto origin/${baseBranch}...`));

    try {
      await runGitSafe(['rebase', `origin/${baseBranch}`]);
      await runGitSafe(['push', 'origin', repo.branch, '--force-with-lease']);

      if (didStash) {
        await runGitSafe(['stash', 'pop']).catch(() => null);
        push(React.createElement(Text, { color: theme.TEXT_MUTED }, '✔ Local changes restored'));
      }

      push(React.createElement(
        Box,
        { flexDirection: 'column' },
        React.createElement(Text, { color: theme.SUCCESS, bold: true }, '✔ Branch synced successfully!'),
        React.createElement(Text, { color: theme.TEXT_MUTED }, `${repo.branch} is now up to date with ${baseBranch}`)
      ));
    } catch (_error) {
      await runGitSafe(['rebase', '--abort']).catch(() => null);

      if (didStash) {
        await runGitSafe(['stash', 'pop']).catch(() => null);
      }

      push(React.createElement(
        Box,
        { flexDirection: 'column' },
        React.createElement(Text, { color: theme.ERROR, bold: true }, '✖ Sync failed, conflicts detected'),
        React.createElement(Text, { color: theme.TEXT_MUTED }, 'Resolve conflicts manually then run /sync again'),
        React.createElement(Text, { color: theme.TEXT_DIM }, 'Or use /resolve <pr-number> for guided conflict resolution')
      ));
    }
  } catch (error) {
    push(React.createElement(Text, { color: theme.ERROR }, `✖ ${formatCommandError(error)}`));
  } finally {
    setMode('idle');
  }
}

module.exports = syncCommand;
