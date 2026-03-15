const chalk = require('chalk');
const { ensureConfig } = require('../lib/conf');
const {
  buildApi,
  findPullRequestByBranch,
  listBranches,
  formatApiError
} = require('../lib/api');
const { getRepositoryContext, getDiffSummary } = require('../lib/git');
const { printBox } = require('../lib/ui');

async function diffCommand() {
  const config = await ensureConfig();
  const repo = await getRepositoryContext();
  const api = buildApi(config);

  let baseBranch = 'main';

  try {
    const pullRequest = await findPullRequestByBranch(api, repo.owner, repo.repo, repo.branch);

    if (pullRequest && pullRequest.base && pullRequest.base.ref) {
      baseBranch = pullRequest.base.ref;
    }

    if (!pullRequest) {
      const branches = await listBranches(api, repo.owner, repo.repo);

      if (!branches.find((branch) => branch.name === baseBranch) && branches[0]) {
        baseBranch = branches.find((branch) => branch.name === 'master')
          ? 'master'
          : branches[0].name;
      }
    }
  } catch (error) {
    throw formatApiError(error);
  }

  let diff;

  try {
    diff = await getDiffSummary(baseBranch, repo.branch);
  } catch (error) {
    if (String(error.message || '').includes(`origin/${repo.branch}`)) {
      error.handled = true;
      error.message = 'Push your branch first';
    }

    throw error;
  }

  if (!diff.files.length || diff.summary.filesChanged === 0) {
    console.log(chalk.green(`✔ No changes detected vs ${baseBranch}`));
    return;
  }

  printBox(`Branch Diff: ${repo.branch} → ${baseBranch}`, Math.min((process.stdout.columns || 120) - 2, 92));

  diff.files.forEach((file) => {
    const marker = formatMarker(file.status);
    const color = file.status === 'A' ? chalk.green.bold : file.status === 'D' ? chalk.red.bold : chalk.white;
    const path = `${marker}${file.path}`.padEnd(38, ' ');

    console.log(
      `  ${color(path)} ${chalk.green(`+${file.additions}`.padStart(5, ' '))}  ${chalk.red(`-${file.deletions}`.padStart(5, ' '))}`
    );
  });

  console.log(`  ${chalk.gray('─'.repeat(Math.min((process.stdout.columns || 120) - 4, 53)))}`);
  console.log(
    `  ${diff.summary.filesChanged} files changed   ${chalk.green(`+${diff.summary.additions} additions`)}   ${chalk.red(`-${diff.summary.deletions} deletions`)}`
  );
}

function formatMarker(status) {
  if (status === 'A') {
    return '[NEW] ';
  }

  if (status === 'D') {
    return '[DEL] ';
  }

  return '';
}

module.exports = diffCommand;
