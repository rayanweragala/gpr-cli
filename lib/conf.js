const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const inquirer = require('inquirer');
const chalk = require('chalk');
const { buildApi, getAuthenticatedUser, formatApiError } = require('./api');

const CONFIG_PATH = path.join(os.homedir(), '.gpr-config.json');

async function ensureConfig() {
  try {
    return await readConfig();
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }

    console.log(chalk.yellow('Config file not found. Starting setup...'));
    return setupConfig();
  }
}

async function readConfig() {
  const raw = await fs.readFile(CONFIG_PATH, 'utf8');
  const config = JSON.parse(raw);
  return normalizeConfig(config);
}

async function setupConfig() {
  const existing = await tryReadExistingConfig();
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'baseUrl',
      message: 'GitBucket base URL:',
      default: existing ? existing.baseUrl : 'https://repository-3.dxesk.cloud',
      filter: (value) => stripTrailingSlash(value.trim()),
      validate: (value) => value ? true : 'Base URL is required.'
    },
    {
      type: 'password',
      name: 'token',
      message: `API Token${existing && existing.token ? ` (${maskToken(existing.token)})` : ''}:`,
      mask: '*',
      default: existing ? existing.token : '',
      validate: (value) => value.trim() ? true : 'API token is required.'
    },
    {
      type: 'input',
      name: 'proxyUrl',
      message: 'Proxy URL (optional):',
      default: existing ? existing.proxyUrl || '' : '',
      filter: (value) => value.trim()
    }
  ]);

  const config = normalizeConfig(answers);
  await fs.writeFile(CONFIG_PATH, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
  await fs.chmod(CONFIG_PATH, 0o600);
  await printConnectivityResult(config);
  return config;
}

function getConfigPath() {
  return CONFIG_PATH;
}

function stripTrailingSlash(value) {
  return value.replace(/\/+$/, '');
}

function normalizeConfig(config) {
  return {
    baseUrl: stripTrailingSlash(config.baseUrl || ''),
    token: (config.token || '').trim(),
    proxyUrl: (config.proxyUrl || '').trim()
  };
}

async function tryReadExistingConfig() {
  try {
    return await readConfig();
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null;
    }

    throw error;
  }
}

function maskToken(token) {
  const suffix = token.slice(-6);
  return `****${suffix}`;
}

async function printConnectivityResult(config) {
  const api = buildApi(config);

  try {
    await getAuthenticatedUser(api);
    console.log(chalk.green('✔ Connection successful'));
  } catch (error) {
    const formatted = formatApiError(error);

    if (formatted.message === 'Invalid token. Run: gpr config to update.') {
      console.error(chalk.red('✖ Invalid token'));
      return;
    }

    if (isNetworkFailure(error)) {
      console.log(chalk.yellow('⚠ Could not reach GitBucket. If you need a proxy, run: gpr config and enter your proxy URL'));
      return;
    }

    console.error(chalk.red(`✖ ${formatted.message}`));
  }
}

function isNetworkFailure(error) {
  return [
    'ECONNABORTED',
    'ECONNREFUSED',
    'ENOTFOUND',
    'EHOSTUNREACH',
    'ECONNRESET',
    'EPROTO'
  ].includes(error.code);
}

module.exports = {
  ensureConfig,
  readConfig,
  setupConfig,
  getConfigPath,
  maskToken
};
