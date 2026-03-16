const { execFile } = require('child_process');
const { promisify } = require('util');
const {
  buildApi,
  getAuthenticatedUser,
  formatApiError
} = require('../../lib/api');

const execFileAsync = promisify(execFile);

async function createGitRunner(config, options) {
  const cwd = options && options.cwd ? options.cwd : process.cwd();
  const authRemoteUrl = await getAuthenticatedRemoteUrl(config, cwd);

  return async function runGitSafe(args) {
    const nextArgs = rewriteRemoteArgs(args, authRemoteUrl);
    return execFileAsync('git', nextArgs, {
      cwd,
      encoding: 'utf8',
      env: buildGitEnv(config)
    });
  };
}

async function getAuthenticatedRemoteUrl(config, cwd) {
  const originUrl = await getOriginUrl(cwd);

  if (!originUrl.startsWith('http://') && !originUrl.startsWith('https://')) {
    return originUrl;
  }

  const api = buildApi(config);
  const user = await getAuthenticatedUser(api);
  const username = encodeURIComponent(user && user.login ? user.login : 'git');
  const password = encodeURIComponent(String(config.token || '').trim());
  const remote = new URL(originUrl);
  remote.username = username;
  remote.password = password;
  return remote.toString();
}

async function getOriginUrl(cwd) {
  const result = await execFileAsync('git', ['remote', 'get-url', 'origin'], {
    cwd: cwd || process.cwd(),
    encoding: 'utf8',
    env: buildGitEnv({})
  });

  return String(result.stdout || '').trim();
}

function rewriteRemoteArgs(args, authRemoteUrl) {
  if (!authRemoteUrl || !Array.isArray(args)) {
    return args;
  }

  return args.map((value, index) => (
    index > 0 && value === 'origin' ? authRemoteUrl : value
  ));
}

function buildGitEnv(config) {
  const env = {
    ...process.env,
    GIT_TERMINAL_PROMPT: '0'
  };

  if (config && config.proxyUrl) {
    env.HTTP_PROXY = config.proxyUrl;
    env.HTTPS_PROXY = config.proxyUrl;
    env.ALL_PROXY = config.proxyUrl;
  }

  return env;
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

module.exports = {
  createGitRunner,
  formatCommandError
};
