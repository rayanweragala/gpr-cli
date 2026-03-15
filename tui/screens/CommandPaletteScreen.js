const React = require('react');
const { Box, Text } = require('ink');
const TextInput = require('ink-text-input').default || require('ink-text-input');
const Header = require('../components/Header');

function CommandPaletteScreen(props) {
  const suggestions = Array.isArray(props.suggestions) ? props.suggestions : [];

  return React.createElement(
    Box,
    { flexDirection: 'column' },
    React.createElement(Header, {
      title: 'Command Palette',
      repo: props.repoLabel || '-',
      branch: props.branchLabel || '-'
    }),
    React.createElement(
      Box,
      { flexDirection: 'column', marginTop: 1 },
      React.createElement(Text, { color: '#F9FAFB', bold: true }, 'Slash Commands'),
      ...suggestions.map((command) => React.createElement(
        Box,
        { key: command.name },
        React.createElement(Text, { color: '#7C3AED' }, command.usage.padEnd(20, ' ')),
        React.createElement(Text, { color: '#6B7280' }, command.description)
      ))
    ),
    props.error ? React.createElement(
      Box,
      { marginTop: 1 },
      React.createElement(Text, { color: '#EF4444' }, `✖ ${props.error}`)
    ) : null,
    props.notice ? React.createElement(
      Box,
      { marginTop: 1 },
      React.createElement(Text, { color: '#F59E0B' }, props.notice)
    ) : null,
    React.createElement(
      Box,
      { flexDirection: 'column', marginTop: 1, borderStyle: 'round', borderColor: '#7C3AED', paddingX: 1 },
      React.createElement(Text, { color: '#6B7280' }, 'Type a slash command and press Enter'),
      React.createElement(
        Box,
        null,
        React.createElement(Text, { color: '#7C3AED' }, '> '),
        React.createElement(TextInput, {
          value: props.input,
          onChange: props.onInputChange,
          onSubmit: props.onSubmit
        })
      )
    ),
    React.createElement(Text, { color: '#6B7280' }, 'Examples: /list  /open  /review 25  /stale 14  /config')
  );
}

module.exports = CommandPaletteScreen;
