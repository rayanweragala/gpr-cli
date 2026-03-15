const React = require('react');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const { Box, Text, useInput } = require('ink');
const TextInput = require('ink-text-input').default || require('ink-text-input');
const { buildApi, getAuthenticatedUser, formatApiError } = require('../../lib/api');

const CONFIG_PATH = path.join(os.homedir(), '.gpr-config.json');

async function configCommand(_args, context) {
  context.setMode('form');
  context.setActiveForm(React.createElement(ConfigForm, {
    existing: context.config || {},
    onCancel: () => {
      context.setActiveForm(null);
      context.setMode('idle');
      context.push(React.createElement(Text, { color: '#6B7280' }, 'Config update cancelled.'));
    },
    onSubmit: async (formData) => {
      context.setActiveForm(null);
      context.setMode('loading');

      try {
        const nextConfig = {
          baseUrl: String(formData.baseUrl || '').replace(/\/+$/, ''),
          token: String(formData.token || '').trim(),
          proxyUrl: String(formData.proxyUrl || '').trim()
        };
        await fs.writeFile(CONFIG_PATH, `${JSON.stringify(nextConfig, null, 2)}\n`, 'utf8');
        await fs.chmod(CONFIG_PATH, 0o600);
        const api = buildApi(nextConfig);
        await getAuthenticatedUser(api);
        context.setConfig(nextConfig);
        context.push(React.createElement(
          Box,
          { flexDirection: 'column' },
          React.createElement(Text, { color: '#10B981', bold: true }, '✔ Connection successful'),
          React.createElement(Text, { color: '#6B7280' }, CONFIG_PATH)
        ));
      } catch (error) {
        context.push(React.createElement(Text, { color: '#EF4444' }, `✖ ${formatApiError(error).message}`));
      } finally {
        context.setMode('idle');
      }
    }
  }));
}

function ConfigForm(props) {
  const [step, setStep] = React.useState('base');
  const [baseUrl, setBaseUrl] = React.useState(props.existing.baseUrl || 'https://repository-3.dxesk.cloud');
  const [token, setToken] = React.useState(props.existing.token || '');
  const [proxyUrl, setProxyUrl] = React.useState(props.existing.proxyUrl || '');

  useInput((input, key) => {
    if (key.escape && typeof props.onCancel === 'function') {
      props.onCancel();
    }
  });

  if (step === 'token') {
    return renderField('API token', token, setToken, () => setStep('proxy'), true);
  }

  if (step === 'proxy') {
    return renderField('Proxy URL (optional)', proxyUrl, setProxyUrl, () => props.onSubmit({ baseUrl, token, proxyUrl }));
  }

  return renderField('GitBucket base URL', baseUrl, setBaseUrl, () => setStep('token'));
}

function renderField(label, value, onChange, onSubmit, masked) {
  return React.createElement(
    Box,
    { flexDirection: 'column' },
    React.createElement(Text, { color: '#F9FAFB', bold: true }, label),
    React.createElement(TextInput, {
      value,
      onChange,
      onSubmit,
      mask: masked ? '*' : undefined
    })
  );
}

module.exports = configCommand;
