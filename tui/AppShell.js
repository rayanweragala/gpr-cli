const React = require('react');
const { Box, Text, useApp, useInput } = require('ink');
const { readConfig } = require('../lib/conf');
const { getRepositoryContext } = require('../lib/git');
const { getCommandSuggestions, parseSlashCommand, getCommand } = require('./lib/commandRouter');
const CommandPaletteScreen = require('./screens/CommandPaletteScreen');
const Spinner = require('./components/Spinner');
const ErrorBox = require('./components/ErrorBox');
const ListScreen = require('./screens/ListScreen');
const OpenScreen = require('./screens/OpenScreen');
const StatusScreen = require('./screens/StatusScreen');
const DiffScreen = require('./screens/DiffScreen');
const ReviewScreen = require('./screens/ReviewScreen');
const CheckoutScreen = require('./screens/CheckoutScreen');
const MergeScreen = require('./screens/MergeScreen');
const MineScreen = require('./screens/MineScreen');
const WatchScreen = require('./screens/WatchScreen');
const StaleScreen = require('./screens/StaleScreen');
const StatsScreen = require('./screens/StatsScreen');
const ConfigScreen = require('./screens/ConfigScreen');

const SCREEN_BY_COMMAND = {
  list: ListScreen,
  open: OpenScreen,
  status: StatusScreen,
  diff: DiffScreen,
  review: ReviewScreen,
  checkout: CheckoutScreen,
  merge: MergeScreen,
  mine: MineScreen,
  watch: WatchScreen,
  stale: StaleScreen,
  stats: StatsScreen,
  config: ConfigScreen
};

function AppShell() {
  const { exit } = useApp();
  const [input, setInput] = React.useState('');
  const [error, setError] = React.useState(null);
  const [notice, setNotice] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [view, setView] = React.useState({ name: 'help', props: {} });
  const [context, setContext] = React.useState({ repo: null, config: null, existing: null });
  const [homeMeta, setHomeMeta] = React.useState({ repoLabel: '-', branchLabel: '-' });

  const refreshHomeMeta = React.useCallback(async () => {
    try {
      const repo = await getRepositoryContext();
      setHomeMeta({ repoLabel: `${repo.owner}/${repo.repo}`, branchLabel: repo.branch });
    } catch (_error) {
      setHomeMeta({ repoLabel: 'Not in a GitBucket repo', branchLabel: '-' });
    }
  }, []);

  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const repo = await getRepositoryContext();
        if (!cancelled) {
          setHomeMeta({ repoLabel: `${repo.owner}/${repo.repo}`, branchLabel: repo.branch });
        }
      } catch (_error) {
        if (!cancelled) {
          setHomeMeta({ repoLabel: 'Not in a GitBucket repo', branchLabel: '-' });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useInput((inputValue, key) => {
    if (view.name === 'help') {
      if (key.escape) {
        exit();
      }
      return;
    }

    if (inputValue === 'q' || key.escape) {
      setView({ name: 'help', props: {} });
      setError(null);
      setNotice(null);
    }
  }, { isActive: view.name === 'help' });

  const suggestions = React.useMemo(() => getCommandSuggestions(input), [input]);

  async function openView(rawInput) {
    const parsed = parseSlashCommand(rawInput);

    if (parsed.error) {
      setError(parsed.error);
      return;
    }

    if (parsed.name === 'help') {
      setView({ name: 'help', props: {} });
      setError(null);
      setNotice(null);
      setInput('');
      return;
    }

    const command = getCommand(parsed.name);
    setLoading(true);
    setError(null);
    setNotice(null);

    try {
      let config = null;
      let existing = null;
      let repo = null;

      try {
        existing = await readConfig();
      } catch (issue) {
        if (issue.code !== 'ENOENT') {
          throw issue;
        }
      }

      if (command.needsConfig) {
        if (!existing) {
          setNotice('Config file not found. Complete /config first.');
          setView({ name: 'config', props: { existing: null } });
          setContext({ repo: null, config: null, existing: null });
          setInput('/config');
          return;
        }

        config = existing;
      }

      if (command.needsRepo) {
        repo = await getRepositoryContext();
        setHomeMeta({ repoLabel: `${repo.owner}/${repo.repo}`, branchLabel: repo.branch });
      }

      setContext({ repo, config, existing });
      setView({ name: parsed.name, props: parsed.args || {} });
      setInput(rawInput.trim() || `/${parsed.name}`);
    } catch (issue) {
      setError(issue.message || 'Unexpected error');
      setView({ name: 'help', props: {} });
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return React.createElement(
      Box,
      { flexDirection: 'column' },
      React.createElement(Spinner, { text: 'Preparing command...' })
    );
  }

  if (view.name === 'help') {
    return React.createElement(CommandPaletteScreen, {
      repoLabel: homeMeta.repoLabel,
      branchLabel: homeMeta.branchLabel,
      input,
      suggestions,
      error,
      notice,
      onInputChange: setInput,
      onSubmit: openView
    });
  }

  const Screen = SCREEN_BY_COMMAND[view.name];

  if (!Screen) {
    return React.createElement(ErrorBox, { message: `Unknown screen "${view.name}"` });
  }

  return React.createElement(
    Box,
    { flexDirection: 'column' },
    React.createElement(Screen, {
      ...view.props,
      config: view.name === 'config' ? undefined : context.config,
      existing: view.name === 'config' ? context.existing : undefined,
      repo: context.repo,
      onBack: async () => {
        await refreshHomeMeta();
        setView({ name: 'help', props: {} });
        setError(null);
        setNotice(null);
        setInput('');
      }
    }),
    React.createElement(Text, { color: '#6B7280' }, 'q back to command palette')
  );
}

module.exports = AppShell;
