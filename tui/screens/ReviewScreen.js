const React = require('react');
const { Box, Text, useApp, useInput } = require('ink');
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
const Header = require('../components/Header');
const Spinner = require('../components/Spinner');
const ErrorBox = require('../components/ErrorBox');
const StatusBadge = require('../components/StatusBadge');

function ReviewScreen(props) {
  const { exit } = useApp();
  const [selectedNumber, setSelectedNumber] = React.useState(props.prNumber || null);
  const [pickerItems, setPickerItems] = React.useState([]);
  const [state, setState] = React.useState({ loading: true, error: null, pullRequest: null, reviews: [], comments: [] });
  const [scrollIndex, setScrollIndex] = React.useState(0);

  useInput((input, key) => {
    if (input === 'q' || key.escape) {
      if (typeof props.onBack === 'function') {
        props.onBack();
      } else {
        exit();
      }
    }

    if (selectedNumber && state.pullRequest && key.upArrow) {
      setScrollIndex((value) => Math.max(0, value - 1));
    }

    if (selectedNumber && state.pullRequest && key.downArrow) {
      const lines = descriptionLines(state.pullRequest);
      setScrollIndex((value) => Math.min(Math.max(0, lines.length - 4), value + 1));
    }
  }, { isActive: true });

  React.useEffect(() => {
    const api = buildApi(props.config);

    (async () => {
      if (!selectedNumber) {
        try {
          const pullRequests = await listOpenPullRequests(api, props.repo.owner, props.repo.repo);
          setPickerItems(pullRequests.map((pullRequest) => ({
            label: `#${pullRequest.number} ${pullRequest.title} (${pullRequest.head.ref} → ${pullRequest.base.ref})`,
            value: pullRequest.number
          })));
          setState({ loading: false, error: null, pullRequest: null, reviews: [], comments: [] });
        } catch (error) {
          setState({ loading: false, error: formatApiError(error).message, pullRequest: null, reviews: [], comments: [] });
        }

        return;
      }

      setState({ loading: true, error: null, pullRequest: null, reviews: [], comments: [] });

      try {
        const pullRequest = await getPullRequest(api, props.repo.owner, props.repo.repo, selectedNumber);
        const [reviews, comments] = await Promise.all([
          safeLoad(() => getPullRequestReviews(api, props.repo.owner, props.repo.repo, selectedNumber)),
          safeLoad(() => getPullRequestComments(api, props.repo.owner, props.repo.repo, selectedNumber))
        ]);

        setState({ loading: false, error: null, pullRequest, reviews, comments });
      } catch (error) {
        setState({ loading: false, error: formatApiError(error).message, pullRequest: null, reviews: [], comments: [] });
      }
    })();
  }, [props.config, props.repo.owner, props.repo.repo, selectedNumber]);

  if (!selectedNumber && !state.loading && !state.error) {
    return React.createElement(
      Box,
      { flexDirection: 'column' },
      React.createElement(Header, { title: 'Review Pull Request', repo: `${props.repo.owner}/${props.repo.repo}`, branch: props.repo.branch }),
      pickerItems.length ? React.createElement(SelectInput, {
        items: pickerItems,
        onSelect: (item) => setSelectedNumber(item.value)
      }) : React.createElement(Text, { color: '#F9FAFB' }, 'No open pull requests found.'),
      React.createElement(Text, { color: '#6B7280' }, 'q quit')
    );
  }

  return React.createElement(
    Box,
    { flexDirection: 'column' },
    React.createElement(Header, {
      title: state.pullRequest ? `PR #${state.pullRequest.number} — ${state.pullRequest.title}` : 'Review Pull Request',
      repo: `${props.repo.owner}/${props.repo.repo}`,
      branch: props.repo.branch
    }),
    state.loading ? React.createElement(Spinner, { text: 'Loading pull request details...' }) : null,
    !state.loading && state.error ? React.createElement(ErrorBox, { message: state.error }) : null,
    !state.loading && !state.error && state.pullRequest ? React.createElement(ReviewBody, {
      pullRequest: state.pullRequest,
      reviews: state.reviews,
      comments: state.comments,
      scrollIndex
    }) : null,
    React.createElement(Text, { color: '#6B7280' }, selectedNumber ? '↑↓ scroll description | q back' : 'q quit')
  );
}

function ReviewBody(props) {
  const lines = descriptionLines(props.pullRequest);
  const visible = lines.slice(props.scrollIndex, props.scrollIndex + 4);

  return React.createElement(
    Box,
    { flexDirection: 'column' },
    React.createElement(Text, { color: '#F9FAFB' }, `Author   : ${props.pullRequest.user ? props.pullRequest.user.login : 'unknown'}`),
    React.createElement(
      Box,
      null,
      React.createElement(Text, { color: '#F9FAFB' }, 'Branch   : '),
      React.createElement(Text, { color: '#3B82F6' }, props.pullRequest.head.ref),
      React.createElement(Text, { color: '#F9FAFB' }, ' → '),
      React.createElement(Text, { color: '#10B981' }, props.pullRequest.base.ref)
    ),
    React.createElement(
      Box,
      null,
      React.createElement(Text, { color: '#F9FAFB' }, 'Status   : '),
      React.createElement(StatusBadge, { state: props.pullRequest.merged_at ? 'merged' : props.pullRequest.state === 'closed' ? 'closed' : 'open' })
    ),
    React.createElement(Text, { color: '#F9FAFB' }, `Created  : ${format(props.pullRequest.created_at)}`),
    React.createElement(Text, { color: '#F9FAFB' }, `Updated  : ${format(props.pullRequest.updated_at)}`),
    React.createElement(
      Box,
      { borderStyle: 'round', borderColor: '#7C3AED', flexDirection: 'column', paddingX: 1, marginY: 1 },
      React.createElement(Text, { color: '#6B7280' }, 'Description'),
      ...visible.map((line, index) => React.createElement(Text, { key: `${index}-${line}`, color: '#F9FAFB' }, line))
    ),
    React.createElement(Text, { color: '#F9FAFB' }, `Files Changed : ${props.pullRequest.changed_files || 0}`),
    React.createElement(Text, { color: '#10B981' }, `Additions     : +${props.pullRequest.additions || 0}`),
    React.createElement(Text, { color: '#EF4444' }, `Deletions     : -${props.pullRequest.deletions || 0}`),
    React.createElement(Text, { color: '#F9FAFB' }, `Comments      : ${props.comments.length}`),
    React.createElement(Text, { color: '#F9FAFB' }, `Reviewers     : ${reviewerText(props.pullRequest, props.reviews)}`)
  );
}

function descriptionLines(pullRequest) {
  const body = pullRequest.body && pullRequest.body.trim() ? pullRequest.body.trim() : '(No description)';
  return body.split('\n');
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
  const latestByReviewer = new Map();
  reviews.forEach((review) => {
    if (review.user && review.user.login) {
      latestByReviewer.set(review.user.login, review.state);
    }
  });

  const requested = (pullRequest.requested_reviewers || []).map((reviewer) => reviewer.login);
  const parts = [];

  latestByReviewer.forEach((state, login) => {
    parts.push(`${login} (${String(state || '').toLowerCase()})`);
  });

  requested.forEach((login) => {
    if (!latestByReviewer.has(login)) {
      parts.push(`${login} (pending)`);
    }
  });

  return parts.length ? parts.join(', ') : 'None';
}

module.exports = ReviewScreen;
