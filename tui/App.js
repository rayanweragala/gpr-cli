const React = require('react');
const { Box, Text, useApp, useInput } = require('ink');
const { readConfig } = require('../lib/conf');
const { getRepositoryContext } = require('../lib/git');
const TopBar = require('./TopBar');
const ContentArea = require('./ContentArea');
const InputBar = require('./InputBar');
const AutoSuggest = require('./AutoSuggest');
const { filterCommands } = require('./AutoSuggest');
const theme = require('./theme');

const COMMAND_MAP = {
  list: require('./commands/list'),
  open: require('./commands/open'),
  status: require('./commands/status'),
  diff: require('./commands/diff'),
  review: require('./commands/review'),
  checkout: require('./commands/checkout'),
  merge: require('./commands/merge'),
  assign: require('./commands/assign'),
  mine: require('./commands/mine'),
  watch: require('./commands/watch'),
  stale: require('./commands/stale'),
  stats: require('./commands/stats'),
  config: require('./commands/config'),
  help: require('./commands/help')
};

const REQUIREMENTS = {
  list: { config: true, repo: true },
  open: { config: true, repo: true },
  status: { config: true, repo: true },
  diff: { config: true, repo: true },
  review: { config: true, repo: true },
  checkout: { config: true, repo: true },
  merge: { config: true, repo: true },
  assign: { config: true, repo: true },
  mine: { config: true, repo: false },
  watch: { config: true, repo: true },
  stale: { config: true, repo: true },
  stats: { config: true, repo: true },
  config: { config: false, repo: false },
  help: { config: false, repo: false }
};

function App(props) {
  const { exit } = useApp();
  const nextId = React.useRef(0);
  const initialRun = React.useRef(false);
  const mountedRef = React.useRef(true);
  const contextRef = React.useRef(null);
  const [history, setHistory] = React.useState(createInitialHistory(props.showWelcome !== false));
  const [input, setInput] = React.useState('');
  const [mode, setMode] = React.useState('idle');
  const [activeForm, setActiveForm] = React.useState(null);
  const [cmdLog, setCmdLog] = React.useState([]);
  const [cmdLogIndex, setCmdLogIndex] = React.useState(-1);
  const [showSuggest, setShowSuggest] = React.useState(false);
  const [suggestIndex, setSuggestIndex] = React.useState(0);
  const [inputPaused, setInputPaused] = React.useState(false);
  const [config, setConfig] = React.useState(props.config || null);
  const [repo, setRepo] = React.useState(props.repo || null);
  const [initialDone, setInitialDone] = React.useState(false);

  const push = React.useCallback((element) => {
    const key = `entry-${nextId.current++}`;
    setHistory((items) => [...items, React.createElement(React.Fragment, { key }, element)]);
  }, []);

  const clearHistory = React.useCallback(() => {
    setHistory(createInitialHistory(props.showWelcome !== false));
  }, [props.showWelcome]);

  const refreshContext = React.useCallback(async () => {
    let nextConfig = null;
    let nextRepo = null;

    try {
      nextConfig = await readConfig();
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }

    try {
      nextRepo = await getRepositoryContext();
    } catch (_error) {
      nextRepo = null;
    }

    if (mountedRef.current) {
      setConfig(nextConfig);
      setRepo(nextRepo);
    }

    return { config: nextConfig, repo: nextRepo };
  }, []);

  React.useEffect(() => {
    mountedRef.current = true;
    refreshContext().catch(() => {});

    return () => {
      mountedRef.current = false;
    };
  }, [refreshContext]);

  React.useEffect(() => {
    if (!props.initialCommand || initialRun.current) {
      return;
    }

    initialRun.current = true;
    handleSubmit(props.initialCommand).finally(() => setInitialDone(true));
  });

  React.useEffect(() => {
    if (props.autoExit && initialDone && mode === 'idle' && !activeForm) {
      setTimeout(exit, 0);
    }
  }, [activeForm, exit, initialDone, mode, props.autoExit]);

  useInput((inputValue, key) => {
    if (key.ctrl && inputValue === 'c') {
      exit();
      return;
    }

    if (key.ctrl && inputValue === 'l') {
      clearHistory();
      setInput('');
      setShowSuggest(false);
      setInputPaused(false);
      return;
    }

    if (mode === 'form' && key.escape && activeForm && activeForm.props && typeof activeForm.props.onCancel === 'function') {
      activeForm.props.onCancel();
    }
  });

  function pushCommand(command) {
    push(React.createElement(Text, { color: theme.PRIMARY }, `❯ ${command}`));
    setCmdLog((items) => [...items.slice(-49), command]);
    setCmdLogIndex(-1);
  }

  async function executeCommand(command, providedContext) {
    const ctx = providedContext || contextRef.current;
    await runCommand(command, ctx);
  }

  async function handleSubmit(value) {
    if (mode !== 'idle') {
      return;
    }

    const typed = String(value || '').trim();
    const suggestions = filterCommands(typed);
    const selectedSuggestion = suggestions[Math.max(0, Math.min(suggestIndex, Math.max(0, suggestions.length - 1)))];
    const trimmed = shouldRunSuggestion(typed, showSuggest, selectedSuggestion)
      ? selectedSuggestion.cmd
      : typed;

    if (!trimmed) {
      return;
    }

    setInput('');
    setShowSuggest(false);
    setSuggestIndex(0);

    if (!trimmed.startsWith('/')) {
      push(React.createElement(Text, { color: theme.ERROR }, '✖ Commands start with /  Try /help'));
      return;
    }

    pushCommand(trimmed);
    await executeCommand(trimmed);
  }

  function onChange(value) {
    setInput(value);
    setShowSuggest(mode === 'idle' && value.startsWith('/') && value.trim().length > 0);
    setSuggestIndex(0);
  }

  function onUpArrow() {
    if (!cmdLog.length) {
      return;
    }

    const next = Math.min(cmdLogIndex + 1, cmdLog.length - 1);
    setCmdLogIndex(next);
    setInput(cmdLog[cmdLog.length - 1 - next]);
    setShowSuggest(false);
  }

  function onDownArrow() {
    if (cmdLogIndex <= 0) {
      setCmdLogIndex(-1);
      setInput('');
      return;
    }

    const next = cmdLogIndex - 1;
    setCmdLogIndex(next);
    setInput(cmdLog[cmdLog.length - 1 - next]);
    setShowSuggest(false);
  }

  const context = {
    config,
    repo,
    push,
    setMode,
    setActiveForm,
      clearHistory,
      exit,
      refreshContext,
      setConfig,
      setRepo,
      setInputPaused,
      pushCommand,
      runCommand: (command, providedContext) => executeCommand(command, providedContext || context)
  };
  contextRef.current = context;

  return React.createElement(
    Box,
    { flexDirection: 'column', height: process.stdout.rows || 40 },
    React.createElement(TopBar, { repo }),
    React.createElement(
      Box,
      { flexGrow: 1, flexDirection: 'column', overflowY: 'hidden' },
      React.createElement(ContentArea, { history, activeForm })
    ),
    React.createElement(AutoSuggest, {
      visible: showSuggest,
      query: input,
      selectedIndex: suggestIndex,
      onMoveUp: (count) => setSuggestIndex((index) => (index <= 0 ? count - 1 : index - 1)),
      onMoveDown: (count) => setSuggestIndex((index) => (index >= count - 1 ? 0 : index + 1)),
      onSelect: (command) => {
        setInput(`${command} `);
        setShowSuggest(false);
        setSuggestIndex(0);
      },
      onClose: () => {
        setShowSuggest(false);
        setSuggestIndex(0);
      }
    }),
    React.createElement(InputBar, {
      value: input,
      onChange,
      onSubmit: handleSubmit,
      onUpArrow,
      onDownArrow,
      showSuggest,
      mode,
      isPaused: inputPaused
    })
  );
}

function createInitialHistory(showWelcome) {
  if (!showWelcome) {
    return [];
  }

  return [React.createElement(
    Box,
    { key: 'welcome', flexDirection: 'column', marginBottom: 1 },
    React.createElement(Text, { color: theme.PRIMARY, bold: true }, '╔══════════════════════════════════╗'),
    React.createElement(Text, { color: theme.PRIMARY, bold: true }, '║   GPR — Pull Request Shell      ║'),
    React.createElement(Text, { color: theme.PRIMARY, bold: true }, '╚══════════════════════════════════╝'),
    React.createElement(
      Text,
      { color: theme.TEXT_MUTED },
      'Type ',
      React.createElement(Text, { color: theme.SECONDARY }, '/help'),
      ' to see commands  ',
      React.createElement(Text, { color: theme.SECONDARY }, '/'),
      ' for autocomplete  ',
      React.createElement(Text, { color: theme.WARNING }, 'Ctrl+C'),
      ' to quit'
    )
  )];
}

async function runCommand(rawInput, context) {
  const parts = rawInput.slice(1).trim().split(/\s+/).filter(Boolean);
  const cmd = (parts[0] || '').toLowerCase();
  const args = parts.slice(1);
  const handler = COMMAND_MAP[cmd];
  const requirements = REQUIREMENTS[cmd];

  if (cmd === 'clear') {
    context.clearHistory();
    return;
  }

  if (cmd === 'exit') {
    context.exit();
    return;
  }

  if (!handler) {
    context.push(React.createElement(
      Text,
      { color: theme.ERROR },
      `✖ Unknown command: /${cmd}  `,
      React.createElement(Text, { color: theme.TEXT_MUTED }, 'Type /help')
    ));
    return;
  }

  if (requirements && requirements.config && !context.config) {
    context.push(React.createElement(Text, { color: theme.ERROR }, '✖ Config not found. Run /config first.'));
    return;
  }

  if (requirements && requirements.repo && !context.repo) {
    context.push(React.createElement(Text, { color: theme.ERROR }, '✖ Not a git repository'));
    return;
  }

  try {
    await handler(args, context);
    const latest = await context.refreshContext().catch(() => null);
    if (latest) {
      context.setConfig(latest.config);
      context.setRepo(latest.repo);
    }
  } catch (error) {
    context.setMode('idle');
    context.setActiveForm(null);
    context.push(React.createElement(Text, { color: theme.ERROR }, `✖ ${error.message || 'Unexpected error'}`));
  }
}

module.exports = App;

function shouldRunSuggestion(value, visible, suggestion) {
  if (!visible || !suggestion) {
    return false;
  }

  if (!value.startsWith('/')) {
    return false;
  }

  return !value.slice(1).includes(' ');
}
