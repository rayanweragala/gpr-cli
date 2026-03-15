const React = require('react');
const { Box, Text, useApp, useInput } = require('ink');
const { readConfig } = require('../lib/conf');
const { getRepositoryContext } = require('../lib/git');
const TopBar = require('./TopBar');
const ContentArea = require('./ContentArea');
const InputBar = require('./InputBar');
const AutoSuggest = require('./AutoSuggest');

const COMMAND_MAP = {
  list: require('./commands/list'),
  open: require('./commands/open'),
  status: require('./commands/status'),
  diff: require('./commands/diff'),
  review: require('./commands/review'),
  checkout: require('./commands/checkout'),
  merge: require('./commands/merge'),
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
  const [history, setHistory] = React.useState(createInitialHistory(props.showWelcome !== false));
  const [input, setInput] = React.useState('');
  const [mode, setMode] = React.useState('idle');
  const [activeForm, setActiveForm] = React.useState(null);
  const [cmdLog, setCmdLog] = React.useState([]);
  const [cmdLogIndex, setCmdLogIndex] = React.useState(-1);
  const [showSuggest, setShowSuggest] = React.useState(false);
  const [suggestIndex, setSuggestIndex] = React.useState(0);
  const [config, setConfig] = React.useState(props.config || null);
  const [repo, setRepo] = React.useState(props.repo || null);
  const [initialDone, setInitialDone] = React.useState(false);

  const suggestions = React.useMemo(() => AutoSuggest.filterCommands(input).slice(0, 6), [input]);

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
      return;
    }

    if (mode === 'form' && key.escape && activeForm && activeForm.props && typeof activeForm.props.onCancel === 'function') {
      activeForm.props.onCancel();
    }
  });

  function pushCommand(command) {
    push(React.createElement(Text, { color: '#7C3AED' }, `❯ ${command}`));
    setCmdLog((items) => [...items.slice(-49), command]);
    setCmdLogIndex(-1);
  }

  async function handleSubmit(value) {
    if (mode !== 'idle') {
      return;
    }

    const trimmed = String(value || '').trim();

    if (!trimmed) {
      return;
    }

    setInput('');
    setShowSuggest(false);
    setSuggestIndex(0);

    if (!trimmed.startsWith('/')) {
      push(React.createElement(Text, { color: '#EF4444' }, '✖ Commands start with /  Try /help'));
      return;
    }

    pushCommand(trimmed);

    await runCommand(trimmed, {
      config,
      repo,
      push,
      setMode,
      setActiveForm,
      clearHistory,
      exit,
      refreshContext,
      setConfig,
      setRepo
    });
  }

  function onChange(value) {
    setInput(value);
    setShowSuggest(mode === 'idle' && value.startsWith('/'));
    setSuggestIndex(0);
  }

  function fillSuggestion() {
    if (!showSuggest || !suggestions.length) {
      return;
    }

    const selected = suggestions[Math.max(0, Math.min(suggestIndex, suggestions.length - 1))];
    setInput(`${selected.cmd} `);
    setShowSuggest(false);
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

  return React.createElement(
    Box,
    { flexDirection: 'column', height: process.stdout.rows || 40 },
    React.createElement(TopBar, { repo }),
    React.createElement(
      Box,
      { flexGrow: 1, flexDirection: 'column', overflowY: 'hidden' },
      React.createElement(ContentArea, { history, activeForm })
    ),
    showSuggest ? React.createElement(AutoSuggest, { query: input, selectedIndex: suggestIndex }) : null,
    React.createElement(InputBar, {
      value: input,
      onChange,
      onSubmit: handleSubmit,
      onUpArrow,
      onDownArrow,
      onSuggestUp: () => setSuggestIndex((index) => Math.max(0, index - 1)),
      onSuggestDown: () => setSuggestIndex((index) => Math.min(Math.max(0, suggestions.length - 1), index + 1)),
      onTab: fillSuggestion,
      showSuggest,
      mode
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
    React.createElement(Text, { color: '#7C3AED', bold: true }, '╔══════════════════════════════════╗'),
    React.createElement(Text, { color: '#7C3AED', bold: true }, '║   GPR — Pull Request Shell      ║'),
    React.createElement(Text, { color: '#7C3AED', bold: true }, '╚══════════════════════════════════╝'),
    React.createElement(
      Text,
      { color: '#6B7280' },
      'Type ',
      React.createElement(Text, { color: '#F9FAFB' }, '/help'),
      ' to see commands  ',
      React.createElement(Text, { color: '#F9FAFB' }, '/'),
      ' for autocomplete  ',
      React.createElement(Text, { color: '#F9FAFB' }, 'Ctrl+C'),
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
      { color: '#EF4444' },
      `✖ Unknown command: /${cmd}  `,
      React.createElement(Text, { color: '#6B7280' }, 'Type /help')
    ));
    return;
  }

  if (requirements && requirements.config && !context.config) {
    context.push(React.createElement(Text, { color: '#EF4444' }, '✖ Config not found. Run /config first.'));
    return;
  }

  if (requirements && requirements.repo && !context.repo) {
    context.push(React.createElement(Text, { color: '#EF4444' }, '✖ Not a git repository'));
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
    context.push(React.createElement(Text, { color: '#EF4444' }, `✖ ${error.message || 'Unexpected error'}`));
  }
}

module.exports = App;
