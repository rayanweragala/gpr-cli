const React = require('react');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const { Box, Text, useApp, useInput } = require('ink');
const TextInput = require('ink-text-input').default || require('ink-text-input');
const { buildApi, getAuthenticatedUser, formatApiError } = require('../../lib/api');
const Header = require('../components/Header');
const Spinner = require('../components/Spinner');
const ErrorBox = require('../components/ErrorBox');
const SuccessBox = require('../components/SuccessBox');

function ConfigScreen(props) {
  const { exit } = useApp();
  const existing = props.existing || {};
  const [baseUrl, setBaseUrl] = React.useState(existing.baseUrl || 'https://repository-3.dxesk.cloud');
  const [token, setToken] = React.useState(existing.token || '');
  const [proxyUrl, setProxyUrl] = React.useState(existing.proxyUrl || '');
  const [step, setStep] = React.useState('base');
  const [error, setError] = React.useState(null);
  const [saved, setSaved] = React.useState(false);
  const configPath = path.join(os.homedir(), '.gpr-config.json');

  useInput((input, key) => {
    if (key.escape) {
      exit();
    }
  });

  async function submit() {
    setStep('saving');
    setError(null);
    const config = {
      baseUrl: String(baseUrl || '').replace(/\/+$/, ''),
      token: String(token || '').trim(),
      proxyUrl: String(proxyUrl || '').trim()
    };

    try {
      await fs.writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
      await fs.chmod(configPath, 0o600);
      const api = buildApi(config);
      await getAuthenticatedUser(api);
      setSaved(true);
      setStep('done');
    } catch (issue) {
      setError(formatApiError(issue).message);
      setStep('error');
    }
  }

  return React.createElement(
    Box,
    { flexDirection: 'column' },
    React.createElement(Header, { title: 'Configuration', repo: '-', branch: '-' }),
    step === 'base' ? React.createElement(Field, { label: 'GitBucket base URL', value: baseUrl, onChange: setBaseUrl, onSubmit: () => setStep('token') }) : null,
    step === 'token' ? React.createElement(Field, { label: 'API Token', value: token, masked: true, onChange: setToken, onSubmit: () => setStep('proxy') }) : null,
    step === 'proxy' ? React.createElement(Field, { label: 'Proxy URL (optional)', value: proxyUrl, onChange: setProxyUrl, onSubmit: submit }) : null,
    step === 'saving' ? React.createElement(Spinner, { text: 'Saving config and testing connection...' }) : null,
    step === 'error' ? React.createElement(ErrorBox, { message: error }) : null,
    saved ? React.createElement(SuccessBox, { title: 'Connection successful', lines: [{ label: 'Config', value: configPath }] }) : null,
    React.createElement(Text, { color: '#6B7280' }, 'Tab/Enter next | Escape cancel')
  );
}

function Field(props) {
  return React.createElement(
    Box,
    { flexDirection: 'column' },
    React.createElement(Text, { color: '#F9FAFB' }, props.label),
    React.createElement(TextInput, {
      value: props.value,
      onChange: props.onChange,
      onSubmit: props.onSubmit,
      mask: props.masked ? '*' : undefined
    }),
    props.masked ? React.createElement(Text, { color: '#6B7280' }, 'Masked input is shown as * characters') : null
  );
}

module.exports = ConfigScreen;
