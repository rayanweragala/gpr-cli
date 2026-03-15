const React = require('react');
const { Box, Text, useInput } = require('ink');
const TextInput = require('ink-text-input').default || require('ink-text-input');
const theme = require('./theme');

function InputBar(props) {
  useInput((input, key) => {
    if (props.mode === 'loading') {
      return;
    }

    if (key.upArrow) {
      if (props.showSuggest) {
        return;
      }

      if (typeof props.onUpArrow === 'function') {
        props.onUpArrow();
      }
      return;
    }

    if (key.downArrow) {
      if (props.showSuggest) {
        return;
      }

      if (typeof props.onDownArrow === 'function') {
        props.onDownArrow();
      }
    }
  });

  const borderColor = props.mode === 'loading'
    ? theme.TEXT_MUTED
    : props.mode === 'form' || props.isPaused
      ? theme.WARNING
      : theme.PRIMARY;

  const hint = props.mode === 'loading'
    ? 'loading...'
    : props.mode === 'form'
      ? 'form active — Esc cancel'
      : props.isPaused
        ? 'list active — Tab return to input'
      : '';

  return React.createElement(
    Box,
    { borderStyle: 'round', borderColor, paddingX: 1 },
    React.createElement(Text, { color: borderColor, bold: true }, '❯ '),
    props.mode === 'idle' && !props.isPaused
      ? React.createElement(TextInput, {
          value: props.value,
          onChange: props.onChange,
          onSubmit: props.onSubmit,
          focus: true,
          placeholder: 'Type /command  or  /help for list...'
        })
      : React.createElement(Text, { color: theme.TEXT_MUTED }, hint),
    props.mode === 'loading'
      ? React.createElement(Text, { color: theme.WARNING }, ' ⠋')
      : null
  );
}

module.exports = InputBar;
