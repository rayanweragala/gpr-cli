const React = require('react');
const { Box, Text, useInput } = require('ink');
const TextInput = require('ink-text-input').default || require('ink-text-input');

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
    ? '#6B7280'
    : props.mode === 'form' || props.isPaused
      ? '#F59E0B'
      : '#7C3AED';

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
      : React.createElement(Text, { color: '#6B7280' }, hint),
    props.mode === 'loading'
      ? React.createElement(Text, { color: '#F59E0B' }, ' ⠋')
      : null
  );
}

module.exports = InputBar;
