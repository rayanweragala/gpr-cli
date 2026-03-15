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

async function reviewCommand(args, context) {
  const number = args[0] ? Number(args[0]) : undefined;

  if (args[0] && Number.isNaN(number)) {
    context.push(React.createElement(Text, { color: '#EF4444' }, '✖ Usage: /review [pr-number]'));
    return;
  }

  if (!number) {
    context.setMode('loading');

    try {
      const api = buildApi(context.config);
      const pullRequests = await listOpenPullRequests(api, context.repo.owner, context.repo.repo);

      if (!pullRequests.length) {
        context.push(React.createElement(Text, { color: '#F59E0B' }, 'No open pull requests found.'));
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
      context.push(React.createElement(Text, { color: '#EF4444' }, `✖ ${formatApiError(error).message}`));
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
    React.createElement(Text, { color: '#F9FAFB', bold: true }, 'Select a pull request to review'),
    React.createElement(SelectInput, {
      items: props.pullRequests.map((pullRequest) => ({
        label: `#${pullRequest.number} ${pullRequest.title} (${pullRequest.head.ref} → ${pullRequest.base.ref})`,
        value: pullRequest.number
      })),
      onSelect: async (item) => {
        props.setActiveForm(null);
        props.setMode('idle');
        await loadReview(item.value, props);
      }
    })
  );
}

async function loadReview(number, context) {
  const { config, repo, push, setMode, setActiveForm } = context;
  setActiveForm(null);
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
      React.createElement(Text, { color: '#7C3AED', bold: true }, `PR #${pullRequest.number} — ${pullRequest.title}`),
      React.createElement(Text, { color: '#F9FAFB' }, `Author   : ${pullRequest.user ? pullRequest.user.login : 'unknown'}`),
      React.createElement(
        Text,
        null,
        React.createElement(Text, { color: '#6B7280' }, 'Branch   : '),
        React.createElement(Text, { color: '#3B82F6' }, pullRequest.head.ref),
        React.createElement(Text, { color: '#F9FAFB' }, ' → '),
        React.createElement(Text, { color: '#10B981' }, pullRequest.base.ref)
      ),
      React.createElement(
        Box,
        null,
        React.createElement(Text, { color: '#6B7280' }, 'Status   : '),
        React.createElement(StatusBadge, { state: pullRequest.merged_at ? 'merged' : pullRequest.state === 'closed' ? 'closed' : 'open' })
      ),
      React.createElement(Text, { color: '#F9FAFB' }, `Created  : ${format(pullRequest.created_at)}`),
      React.createElement(Text, { color: '#F9FAFB' }, `Updated  : ${format(pullRequest.updated_at)}`),
      React.createElement(Text, { color: '#6B7280' }, 'Description:'),
      React.createElement(Text, { color: '#F9FAFB' }, pullRequest.body && pullRequest.body.trim() ? pullRequest.body : '(No description)'),
      React.createElement(Text, { color: '#F9FAFB' }, `Files Changed : ${pullRequest.changed_files || 0}`),
      React.createElement(Text, { color: '#10B981' }, `Additions     : +${pullRequest.additions || 0}`),
      React.createElement(Text, { color: '#EF4444' }, `Deletions     : -${pullRequest.deletions || 0}`),
      React.createElement(Text, { color: '#F9FAFB' }, `Comments      : ${comments.length}`),
      React.createElement(Text, { color: '#F9FAFB' }, `Reviewers     : ${reviewerText(pullRequest, reviews)}`)
    ));
  } catch (error) {
    push(React.createElement(Text, { color: '#EF4444' }, `✖ ${formatApiError(error).message}`));
  } finally {
    setMode('idle');
  }
}

function cancel(context) {
  context.setActiveForm(null);
  context.setMode('idle');
  context.push(React.createElement(Text, { color: '#6B7280' }, 'Review cancelled.'));
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

function reviewerText(pullRequest, reviews) {
  const latest = new Map();
  reviews.forEach((review) => {
    if (review.user && review.user.login) {
      latest.set(review.user.login, String(review.state || '').toLowerCase());
    }
  });

  const requested = (pullRequest.requested_reviewers || []).map((reviewer) => reviewer.login);
  const parts = [];

  latest.forEach((state, login) => {
    parts.push(`${login} (${state})`);
  });

  requested.forEach((login) => {
    if (!latest.has(login)) {
      parts.push(`${login} (pending)`);
    }
  });

  return parts.length ? parts.join(', ') : 'None';
}

module.exports = reviewCommand;
