const React = require('react');
const { Box, Text } = require('ink');
const { COMMANDS } = require('../AutoSuggest');
const theme = require('../theme');

async function helpCommand(_args, context) {
  const commandLookup = new Map(COMMANDS.map((item) => [item.cmd, item.desc]));
  const sections = [
    {
      title: 'Core',
      commands: ['/list', '/open', '/status', '/dashboard', '/diff', '/review', '/review-conflicts', '/checkout']
    },
    {
      title: 'PR Lifecycle',
      commands: ['/resolve', '/merge', '/close', '/reopen', '/sync']
    },
    {
      title: 'Collaboration',
      commands: ['/assign', '/waiting', '/teammates', '/conflicts', '/remind']
    },
    {
      title: 'Insights',
      commands: ['/mine', '/watch', '/stale', '/stats']
    },
    {
      title: 'Shell',
      commands: ['/config', '/clear', '/help', '/exit']
    }
  ];

  context.push(React.createElement(
    Box,
    { flexDirection: 'column' },
    ...sections.flatMap((section) => {
      const rows = [
        React.createElement(Text, {
          key: `${section.title}-title`,
          color: theme.SECONDARY,
          bold: true
        }, section.title)
      ];

      section.commands.forEach((cmd) => {
        rows.push(React.createElement(
          Box,
          { key: cmd },
          React.createElement(
            Box,
            { width: 18 },
            React.createElement(Text, { color: theme.PRIMARY, bold: true }, cmd)
          ),
          React.createElement(Text, { color: theme.TEXT_MUTED }, commandLookup.get(cmd) || '')
        ));
      });

      return rows;
    })
  ));
}

module.exports = helpCommand;
