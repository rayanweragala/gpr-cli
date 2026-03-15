const React = require('react');
const { Box } = require('ink');

function ContentArea(props) {
  const history = Array.isArray(props.history) ? props.history : [];

  return React.createElement(
    Box,
    { flexDirection: 'column', flexGrow: 1 },
    ...history.map((entry, index) => React.createElement(
      Box,
      { key: entry.key || index, flexDirection: 'column', marginBottom: 1 },
      entry
    )),
    props.activeForm
      ? React.createElement(
          Box,
          { flexDirection: 'column', marginBottom: 1 },
          props.activeForm
        )
      : null
  );
}

module.exports = ContentArea;
