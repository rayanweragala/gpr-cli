const React = require('react');
const { Box, Text, useApp, useInput } = require('ink');
const TextInput = require('ink-text-input').default || require('ink-text-input');
const SelectInput = require('ink-select-input').default || require('ink-select-input');
const {
  buildApi,
  findPullRequestByBranch,
  createPullRequest,
  listBranches,
  formatApiError
} = require('../../lib/api');
const Header = require('../components/Header');
const Spinner = require('../components/Spinner');
const ErrorBox = require('../components/ErrorBox');
const SuccessBox = require('../components/SuccessBox');

function OpenScreen(props) {
  const { exit } = useApp();
  const [step, setStep] = React.useState('loading');
  const [title, setTitle] = React.useState(prettyBranch(props.repo.branch));
  const [body, setBody] = React.useState('');
  const [branches, setBranches] = React.useState([]);
  const [selectedBase, setSelectedBase] = React.useState(null);
  const [error, setError] = React.useState(null);
  const [success, setSuccess] = React.useState(null);

  useInput((input, key) => {
    if (key.escape) {
      exit();
    }
  });

  React.useEffect(() => {
    const api = buildApi(props.config);

    (async () => {
      try {
        const branchesData = await listBranches(api, props.repo.owner, props.repo.repo);
        const branchNames = branchesData.map((branch) => branch.name);

        if (!branchNames.includes(props.repo.branch)) {
          setError(`Push your branch first: git push origin ${props.repo.branch}`);
          setStep('error');
          return;
        }

        const existing = await findPullRequestByBranch(api, props.repo.owner, props.repo.repo, props.repo.branch);

        if (existing) {
          setSuccess({
            title: 'Pull Request Already Exists',
            lines: [
              { label: 'URL', value: existing.html_url }
            ]
          });
          setStep('success');
          return;
        }

        const defaultBase = branchNames.includes('main') ? 'main' : branchNames.includes('master') ? 'master' : branchNames[0];
        setBranches(branchNames.map((name) => ({ label: name, value: name })));
        setSelectedBase(defaultBase);
        setStep('title');
      } catch (issue) {
        setError(formatApiError(issue).message);
        setStep('error');
      }
    })();
  }, [props.config, props.repo.branch, props.repo.owner, props.repo.repo]);

  function submit() {
    const api = buildApi(props.config);
    setStep('submitting');
    setError(null);

    createPullRequest(api, props.repo.owner, props.repo.repo, {
      title: title.trim(),
      body: body.trim(),
      head: props.repo.branch,
      base: selectedBase
    }).then((pullRequest) => {
      setSuccess({
        title: 'Pull Request Created!',
        lines: [
          { label: 'Title', value: pullRequest.title },
          { label: 'From', value: `${props.repo.branch} → ${selectedBase}` },
          { label: 'URL', value: pullRequest.html_url }
        ]
      });
      setStep('success');
    }).catch((issue) => {
      setError(formatApiError(issue).message);
      setStep('error');
    });
  }

  return React.createElement(
    Box,
    { flexDirection: 'column' },
    React.createElement(Header, { title: 'Open Pull Request', repo: `${props.repo.owner}/${props.repo.repo}`, branch: props.repo.branch }),
    step === 'loading' ? React.createElement(Spinner, { text: 'Loading branch and PR data...' }) : null,
    step === 'title' ? React.createElement(Field, {
      label: 'Title',
      value: title,
      onChange: setTitle,
      onSubmit: () => setStep('body')
    }) : null,
    step === 'body' ? React.createElement(Field, {
      label: 'Description',
      value: body,
      onChange: setBody,
      onSubmit: () => setStep('base')
    }) : null,
    step === 'base' ? React.createElement(
      Box,
      { flexDirection: 'column' },
      React.createElement(Text, { color: '#F9FAFB' }, 'Base branch'),
      React.createElement(SelectInput, {
        items: branches,
        initialIndex: Math.max(0, branches.findIndex((item) => item.value === selectedBase)),
        onHighlight: (item) => setSelectedBase(item.value),
        onSelect: (item) => {
          setSelectedBase(item.value);
          submit();
        }
      })
    ) : null,
    step === 'submitting' ? React.createElement(Spinner, { text: 'Creating pull request...' }) : null,
    step === 'error' ? React.createElement(ErrorBox, { message: error }) : null,
    step === 'success' ? React.createElement(SuccessBox, success) : null,
    React.createElement(Text, { color: '#6B7280' }, 'Enter advance/select | Escape cancel')
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
      onSubmit: props.onSubmit
    })
  );
}

function prettyBranch(branch) {
  return branch.replace(/[/-]+/g, ' ').split(' ').filter(Boolean).map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

module.exports = OpenScreen;
