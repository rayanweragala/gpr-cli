const React = require('react');
const { Box, Text, useInput } = require('ink');
const SelectInput = require('ink-select-input').default || require('ink-select-input');
const { format } = require('timeago.js');
const {
  buildApi,
  listOpenPullRequests,
  getPullRequest,
  getPullRequestReviews,
  getPullRequestComments,
  formatApiError
} = require('../../lib/api');
const StatusBadge = require('../components/StatusBadge');
const theme = require('../theme');

async function reviewCommand(args, context) {
  const number = args[0] ? Number(args[0]) : undefined;

  if (args[0] && Number.isNaN(number)) {
    context.push(React.createElement(Text, { color: theme.ERROR }, '✖ Usage: /review [pr-number]'));
    return;
  }

  if (!number) {
    context.setMode('loading');

    try {
      const api = buildApi(context.config);
      const pullRequests = await listOpenPullRequests(api, context.repo.owner, context.repo.repo);

      if (!pullRequests.length) {
        context.push(React.createElement(Text, { color: theme.WARNING }, 'No open pull requests found.'));
        context.setMode('idle');
        return;
      }

      context.setMode('form');
      context.setActiveForm(React.createElement(ReviewPicker, {
        pullRequests,
        ...context,
        onCancel: () => cancel(context)
      }));
    } catch (error) {
      context.push(React.createElement(Text, { color: theme.ERROR }, `✖ ${formatApiError(error).message}`));
      context.setMode('idle');
    }

    return;
  }

  await loadReview(number, context);
}

function ReviewPicker(props) {
  useInput((input, key) => {
    if (key.escape && typeof props.onCancel === 'function') {
      props.onCancel();
    }
  });

  return React.createElement(
    Box,
    { flexDirection: 'column' },
    React.createElement(Text, { color: theme.TEXT_PRIMARY, bold: true }, 'Select a pull request to review'),
    React.createElement(SelectInput, {
      items: props.pullRequests.map((pullRequest) => ({
        label: `#${pullRequest.number} ${pullRequest.title} (${pullRequest.head.ref} → ${pullRequest.base.ref})`,
        value: pullRequest.number
      })),
      onSelect: async (item) => {
        props.dismissForm();
        await loadReview(item.value, props);
      }
    })
  );
}

async function loadReview(number, context) {
  const { config, repo, push, setMode, dismissForm } = context;
  dismissForm();
  setMode('loading');

  try {
    const api = buildApi(config);
    const pullRequest = await getPullRequest(api, repo.owner, repo.repo, number);
    const [reviews, comments] = await Promise.all([
      safeLoad(() => getPullRequestReviews(api, repo.owner, repo.repo, number)),
      safeLoad(() => getPullRequestComments(api, repo.owner, repo.repo, number))
    ]);

    push(React.createElement(
      Box,
      { flexDirection: 'column' },
      React.createElement(Text, { color: theme.SECONDARY, bold: true }, `PR #${pullRequest.number} — ${pullRequest.title}`),
      detailLine('Author', React.createElement(
        Text,
        { color: theme.TEXT_PRIMARY },
        truncate(pullRequest.user ? pullRequest.user.login : 'unknown', 40)
      )),
      React.createElement(
        Box,
        null,
        labelCell('Branch'),
        separatorCell(),
        React.createElement(
          Box,
          { flexGrow: 1, overflow: 'hidden' },
          React.createElement(Text, { color: theme.INFO }, truncate(pullRequest.head.ref, 24)),
          React.createElement(Text, { color: theme.TEXT_MUTED }, ' → '),
          React.createElement(Text, { color: theme.SUCCESS }, truncate(pullRequest.base.ref, 24))
        )
      ),
      detailLine(
        'Status',
        React.createElement(StatusBadge, { state: pullRequest.merged_at ? 'merged' : pullRequest.state === 'closed' ? 'closed' : 'open' })
      ),
      detailLine('Updated', React.createElement(Text, { color: theme.TEXT_PRIMARY }, format(pullRequest.updated_at))),
      detailLine('Files Changed', React.createElement(Text, { color: theme.TEXT_PRIMARY }, String(pullRequest.changed_files || 0))),
      detailLine('Additions', React.createElement(Text, { color: theme.SUCCESS }, `+${pullRequest.additions || 0}`)),
      detailLine('Deletions', React.createElement(Text, { color: theme.ERROR }, `-${pullRequest.deletions || 0}`)),
      detailLine('Comments', React.createElement(Text, { color: theme.TEXT_PRIMARY }, String(comments.length))),
      React.createElement(
        Box,
        { marginTop: 1, flexDirection: 'column' },
        React.createElement(Text, { color: theme.TEXT_MUTED }, 'Description:'),
        React.createElement(
          Box,
          { marginTop: 0, paddingLeft: 2, overflow: 'hidden' },
          React.createElement(
            Text,
            { color: theme.TEXT_PRIMARY },
            pullRequest.body && pullRequest.body.trim()
              ? pullRequest.body.trim()
              : '(No description)'
          )
        )
      ),
      React.createElement(
        Box,
        { flexDirection: 'column', marginTop: 1 },
        React.createElement(Text, { color: theme.PRIMARY, bold: true }, 'Reviewers:'),
        renderReviewers(pullRequest, reviews)
      ),
      React.createElement(
        Box,
        { flexDirection: 'column', marginTop: 1 },
        React.createElement(Text, { color: theme.PRIMARY, bold: true }, 'Assignees:'),
        renderAssignees(pullRequest)
      )
    ));
  } catch (error) {
    push(React.createElement(Text, { color: theme.ERROR }, `✖ ${formatApiError(error).message}`));
  } finally {
    setMode('idle');
  }
}

function cancel(context) {
  context.dismissForm();
  context.push(React.createElement(Text, { color: theme.TEXT_MUTED }, 'Review cancelled.'));
}

function detailLine(label, content) {
  return React.createElement(
    Box,
    null,
    labelCell(label),
    separatorCell(),
    React.createElement(
      Box,
      { flexGrow: 1, overflow: 'hidden' },
      content
    )
  );
}

function labelCell(label) {
  return React.createElement(
    Box,
    { width: 14 },
    React.createElement(Text, { color: theme.TEXT_MUTED }, label)
  );
}

function separatorCell() {
  return React.createElement(Text, { color: theme.TEXT_MUTED }, ' : ');
}

async function safeLoad(work) {
  try {
    return await work();
  } catch (error) {
    if (error.response && error.response.status === 404) {
      return [];
    }

    throw error;
  }
}

function truncate(value, maxLength) {
  const text = String(value || '');
  return text.length <= maxLength ? text : `${text.slice(0, maxLength - 1)}…`;
}

function renderReviewers(pullRequest, reviews) {
  const requestedReviewers = pullRequest.requested_reviewers || [];

  if (!reviews.length && !requestedReviewers.length) {
    return React.createElement(Text, { color: theme.TEXT_MUTED }, '  No reviewers assigned');
  }

  return React.createElement(
    Box,
    { flexDirection: 'column' },
    ...requestedReviewers.map((reviewer) => React.createElement(
      Box,
      { key: `requested-${reviewer.login}` },
      React.createElement(Text, { color: theme.WARNING }, '  ◌ '),
      React.createElement(Text, { color: theme.TEXT_PRIMARY }, reviewer.login),
      React.createElement(Text, { color: theme.TEXT_MUTED }, ' (pending review)')
    )),
    ...reviews.map((review) => React.createElement(
      Box,
      { key: `review-${review.user.login}-${review.id || review.submitted_at || review.state}` },
      review.state === 'APPROVED'
        ? React.createElement(
            React.Fragment,
            null,
            React.createElement(Text, { color: theme.SUCCESS }, '  ✔ '),
            React.createElement(Text, { color: theme.TEXT_PRIMARY }, review.user.login),
            React.createElement(Text, { color: theme.SUCCESS }, ' approved')
          )
        : review.state === 'CHANGES_REQUESTED'
          ? React.createElement(
              React.Fragment,
              null,
              React.createElement(Text, { color: theme.ERROR }, '  ✖ '),
              React.createElement(Text, { color: theme.TEXT_PRIMARY }, review.user.login),
              React.createElement(Text, { color: theme.ERROR }, ' changes requested')
            )
          : React.createElement(
              React.Fragment,
              null,
              React.createElement(Text, { color: theme.WARNING }, '  ◎ '),
              React.createElement(Text, { color: theme.TEXT_PRIMARY }, review.user.login),
              React.createElement(Text, { color: theme.TEXT_MUTED }, ' commented')
            )
    ))
  );
}

function renderAssignees(pullRequest) {
  const assignees = pullRequest.assignees || [];

  if (!assignees.length) {
    return React.createElement(Text, { color: theme.TEXT_MUTED }, '  No assignees');
  }

  return React.createElement(
    Box,
    { flexDirection: 'column' },
    ...assignees.map((assignee) => React.createElement(
      Box,
      { key: assignee.login },
      React.createElement(Text, { color: theme.INFO }, '  → '),
      React.createElement(Text, { color: theme.TEXT_PRIMARY }, assignee.login)
    ))
  );
}

module.exports = reviewCommand;
