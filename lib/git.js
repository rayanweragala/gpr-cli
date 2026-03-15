const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);
const GIT_ENV = {
  ...process.env,
  GIT_TERMINAL_PROMPT: '0'
};

async function getRepositoryContext() {
  const insideRepo = await isInsideGitRepository();

  if (!insideRepo) {
    throw handledError('Not a git repository');
  }

  const remoteUrl = await getOriginRemoteUrl();
  const parsed = parseRemoteUrl(remoteUrl);
  const branch = await getCurrentBranch();

  return {
    remoteUrl,
    owner: parsed.owner,
    repo: parsed.repo,
    branch
  };
}

async function isInsideGitRepository() {
  try {
    const { stdout } = await runGit(['rev-parse', '--is-inside-work-tree']);
    return stdout.trim() === 'true';
  } catch (_error) {
    return false;
  }
}

async function getOriginRemoteUrl() {
  const { stdout } = await runGit(['remote', '-v']);
  const remoteLine = stdout
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.startsWith('origin\t') && line.endsWith('(fetch)'));

  if (!remoteLine) {
    throw handledError('Unable to determine origin remote URL');
  }

  return remoteLine.split(/\s+/)[1];
}

async function getCurrentBranch() {
  const { stdout } = await runGit(['branch', '--show-current']);
  const branch = stdout.trim();

  if (!branch) {
    throw handledError('Unable to determine current branch');
  }

  return branch;
}

function parseRemoteUrl(remoteUrl) {
  const parts = remoteUrl.split('/git/');

  if (parts.length !== 2) {
    throw handledError('Unable to parse remote URL. Expected /git/OWNER/REPO.git');
  }

  const segments = parts[1].split('/');

  if (segments.length < 2) {
    throw handledError('Unable to parse remote URL. Expected /git/OWNER/REPO.git');
  }

  const owner = segments[0];
  const repo = segments[1].replace(/\.git$/, '');

  if (!owner || !repo) {
    throw handledError('Unable to parse remote URL. Expected /git/OWNER/REPO.git');
  }

  return { owner, repo };
}

async function runGit(args) {
  return execFileAsync('git', args, { encoding: 'utf8', env: GIT_ENV });
}

async function getRemoteBranches() {
  const { stdout } = await runGit(['branch', '-r']);
  return stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^origin\/HEAD -> .+$/, ''))
    .filter(Boolean);
}

async function getDiffSummary(baseBranch, currentBranch) {
  const range = await resolveDiffRange(baseBranch, currentBranch);
  const [numstatResult, statusResult, shortstatResult] = await Promise.all([
    runGit(['diff', '--numstat', range]),
    runGit(['diff', '--name-status', range]),
    runGit(['diff', '--shortstat', range])
  ]);
  const statusByPath = new Map();

  statusResult.stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      const match = line.match(/^([A-Z])\d*\s+(.+)$/);

      if (match) {
        statusByPath.set(match[2], match[1]);
      }
    });

  const files = numstatResult.stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split('\t');
      const additions = parts[0] === '-' ? 0 : Number(parts[0] || 0);
      const deletions = parts[1] === '-' ? 0 : Number(parts[1] || 0);
      const path = parts[2] || '';

      return {
        path,
        additions,
        deletions,
        status: statusByPath.get(path) || 'M'
      };
    });

  return {
    files,
    summary: parseShortStat(shortstatResult.stdout)
  };
}

async function resolveDiffRange(baseBranch, currentBranch) {
  const preferredRange = `origin/${baseBranch}...origin/${currentBranch}`;

  try {
    await runGit(['merge-base', `origin/${baseBranch}`, `origin/${currentBranch}`]);
    return preferredRange;
  } catch (error) {
    if (String(error.message || '').includes('Not a valid object name')) {
      throw error;
    }

    return `origin/${baseBranch}..origin/${currentBranch}`;
  }
}

async function fetchOrigin() {
  await runGit(['fetch', 'origin']);
}

async function branchExistsLocally(branch) {
  const { stdout } = await runGit(['branch', '--list', branch]);
  return Boolean(stdout.trim());
}

async function checkoutBranch(branch, existsLocally) {
  if (existsLocally) {
    await runGit(['checkout', branch]);
    return;
  }

  await runGit(['checkout', '-b', branch, '--track', `origin/${branch}`]);
}

function parseShortStat(output) {
  const text = output.trim();
  const filesChanged = Number((text.match(/(\d+)\s+files? changed/) || [])[1] || 0);
  const additions = Number((text.match(/(\d+)\s+insertions?\(\+\)/) || [])[1] || 0);
  const deletions = Number((text.match(/(\d+)\s+deletions?\(-\)/) || [])[1] || 0);

  return { filesChanged, additions, deletions };
}

function handledError(message) {
  const error = new Error(message);
  error.handled = true;
  return error;
}

module.exports = {
  getRepositoryContext,
  parseRemoteUrl,
  runGit,
  getRemoteBranches,
  getDiffSummary,
  fetchOrigin,
  branchExistsLocally,
  checkoutBranch
};
