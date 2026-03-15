const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

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

async function ensureBranchIsPushed(branch) {
  try {
    const { stdout } = await runGit(['ls-remote', '--heads', 'origin', branch]);

    if (!stdout.trim()) {
      throw handledError(`Push your branch first: git push origin ${branch}`);
    }
  } catch (error) {
    if (error.handled) {
      throw error;
    }

    throw handledError(`Push your branch first: git push origin ${branch}`);
  }
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
  return execFileAsync('git', args, { encoding: 'utf8' });
}

function handledError(message) {
  const error = new Error(message);
  error.handled = true;
  return error;
}

module.exports = {
  getRepositoryContext,
  ensureBranchIsPushed,
  parseRemoteUrl,
  runGit
};
