const COMMANDS = [
  { name: 'help', usage: '/help', description: 'Show available slash commands', needsConfig: false, needsRepo: false },
  { name: 'list', usage: '/list', description: 'List open pull requests for the current repo', needsConfig: true, needsRepo: true },
  { name: 'open', usage: '/open', description: 'Create a pull request for the current branch', needsConfig: true, needsRepo: true },
  { name: 'status', usage: '/status', description: 'Show pull request status for the current branch', needsConfig: true, needsRepo: true },
  { name: 'diff', usage: '/diff', description: 'Show branch diff against the base branch', needsConfig: true, needsRepo: true },
  { name: 'review', usage: '/review [pr-number]', description: 'Review a pull request or pick one interactively', needsConfig: true, needsRepo: true },
  { name: 'checkout', usage: '/checkout', description: 'Pick an open pull request and switch to its branch', needsConfig: true, needsRepo: true },
  { name: 'merge', usage: '/merge [pr-number]', description: 'Merge an open pull request', needsConfig: true, needsRepo: true },
  { name: 'mine', usage: '/mine', description: 'Show your open pull requests across all repos', needsConfig: true, needsRepo: false },
  { name: 'watch', usage: '/watch', description: 'Live auto-refreshing pull request dashboard', needsConfig: true, needsRepo: true },
  { name: 'stale', usage: '/stale [days]', description: 'Show stale pull requests, defaulting to 7 days', needsConfig: true, needsRepo: true },
  { name: 'stats', usage: '/stats', description: 'Show your pull request statistics for the current repo', needsConfig: true, needsRepo: true },
  { name: 'config', usage: '/config', description: 'Update your GitBucket base URL, token, and proxy', needsConfig: false, needsRepo: false }
];

function parseSlashCommand(input) {
  const raw = String(input || '').trim();

  if (!raw) {
    return { name: 'help', args: {} };
  }

  if (!raw.startsWith('/')) {
    return { error: 'Commands must start with /. Try /help.' };
  }

  const parts = raw.slice(1).trim().split(/\s+/).filter(Boolean);

  if (!parts.length) {
    return { name: 'help', args: {} };
  }

  const name = parts[0].toLowerCase();
  const command = COMMANDS.find((item) => item.name === name);

  if (!command) {
    return { error: `Unknown command "${name}". Try /help.` };
  }

  if (name === 'review') {
    const prNumber = parts[1] ? Number(parts[1]) : undefined;
    if (parts[1] && Number.isNaN(prNumber)) {
      return { error: 'Review expects a numeric pull request number. Try /review 25.' };
    }

    return {
      name,
      args: {
        prNumber
      }
    };
  }

  if (name === 'merge') {
    const prNumber = parts[1] ? Number(parts[1]) : undefined;
    if (parts[1] && Number.isNaN(prNumber)) {
      return { error: 'Merge expects a numeric pull request number. Try /merge 24.' };
    }

    return {
      name,
      args: {
        prNumber
      }
    };
  }

  if (name === 'stale') {
    const maybeDays = parts[1];
    const days = maybeDays ? Number(maybeDays) : 7;
    if (maybeDays && Number.isNaN(days)) {
      return { error: 'Stale expects a day count. Try /stale 14.' };
    }

    return {
      name,
      args: {
        days
      }
    };
  }

  return { name, args: {} };
}

function getCommandSuggestions(input) {
  const value = String(input || '').trim().toLowerCase();

  if (!value || value === '/') {
    return COMMANDS;
  }

  const query = value.startsWith('/') ? value.slice(1) : value;
  return COMMANDS.filter((command) => command.name.startsWith(query));
}

function getCommand(name) {
  return COMMANDS.find((item) => item.name === name);
}

module.exports = {
  COMMANDS,
  parseSlashCommand,
  getCommandSuggestions,
  getCommand
};
