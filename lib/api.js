const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');

async function withRetry(fn, retries) {
  const total = retries || 3;
  const delays = [0, 1000, 2000];

  for (let index = 0; index < total; index += 1) {
    try {
      return await fn();
    } catch (err) {
      const isLast = index === total - 1;
      const isRetryable = !err.response || [500, 502, 503, 504].includes(err.response.status);

      if (isLast || !isRetryable) {
        throw err;
      }

      await new Promise((resolve) => setTimeout(resolve, delays[index] || 0));
    }
  }
}

function buildApi(config) {
  const baseUrl = String(config.baseUrl || '').replace(/\/+$/, '');
  const options = {
    baseURL: `${baseUrl}/api/v3`,
    timeout: 10000,
    headers: {
      Accept: 'application/json',
      Authorization: `token ${config.token}`
    },
    proxy: false
  };

  if (config.proxyUrl) {
    const proxyAgent = new HttpsProxyAgent(config.proxyUrl);
    options.httpAgent = proxyAgent;
    options.httpsAgent = proxyAgent;
  }

  return axios.create(options);
}

async function findPullRequestByBranch(api, owner, repo, branch) {
  return findPullRequestByBranchWithState(api, owner, repo, branch, 'open');
}

async function findPullRequestByBranchWithState(api, owner, repo, branch, state) {
  const response = await withRetry(() => api.get(`/repos/${owner}/${repo}/pulls`, {
    params: {
      state,
      head: branch
    }
  }));

  return response.data[0] || null;
}

async function createPullRequest(api, owner, repo, payload) {
  const response = await withRetry(() => api.post(`/repos/${owner}/${repo}/pulls`, payload));
  return response.data;
}

async function listOpenPullRequests(api, owner, repo) {
  return listPullRequests(api, owner, repo, 'open');
}

async function listPullRequests(api, owner, repo, state) {
  if (state === 'all') {
    const [open, closed] = await Promise.all([
      withRetry(() => api.get(`/repos/${owner}/${repo}/pulls`, { params: { state: 'open' } })),
      withRetry(() => api.get(`/repos/${owner}/${repo}/pulls`, { params: { state: 'closed' } }))
    ]);

    return [...open.data, ...closed.data];
  }

  const response = await withRetry(() => api.get(`/repos/${owner}/${repo}/pulls`, {
    params: {
      state: state || 'open'
    }
  }));

  return response.data;
}

async function listBranches(api, owner, repo) {
  const response = await withRetry(() => api.get(`/repos/${owner}/${repo}/branches`));
  return response.data;
}

async function getAuthenticatedUser(api) {
  const response = await withRetry(() => api.get('/user'));
  return response.data;
}

async function getPullRequest(api, owner, repo, number) {
  const response = await withRetry(() => api.get(`/repos/${owner}/${repo}/pulls/${number}`));
  return response.data;
}

async function getPullRequestReviews(api, owner, repo, number) {
  const response = await withRetry(() => api.get(`/repos/${owner}/${repo}/pulls/${number}/reviews`));
  return response.data;
}

async function getPullRequestComments(api, owner, repo, number) {
  try {
    const response = await withRetry(() => api.get(`/repos/${owner}/${repo}/pulls/${number}/comments`));
    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 404) {
      const fallback = await withRetry(() => api.get(`/repos/${owner}/${repo}/issues/${number}/comments`));
      return fallback.data;
    }

    throw error;
  }
}

async function mergePullRequest(api, owner, repo, number, payload) {
  const response = await withRetry(() => api.put(`/repos/${owner}/${repo}/pulls/${number}/merge`, payload));
  return response.data;
}

async function listUserOrgs(api) {
  const response = await withRetry(() => api.get('/user/orgs'));
  return response.data;
}

async function listOrgRepos(api, org) {
  const response = await withRetry(() => api.get(`/orgs/${org}/repos`));
  return response.data;
}

async function getRepoCollaborators(api, owner, repo) {
  try {
    const response = await withRetry(() => api.get(`/repos/${owner}/${repo}/collaborators`));
    return response.data;
  } catch (_err) {
    return [];
  }
}

async function getOrgMembers(api, org) {
  try {
    const response = await withRetry(() => api.get(`/orgs/${org}/members`));
    return response.data;
  } catch (_err) {
    return [];
  }
}

async function requestReviewers(api, owner, repo, number, reviewers) {
  try {
    const response = await withRetry(() => api.post(
      `/repos/${owner}/${repo}/pulls/${number}/requested_reviewers`,
      { reviewers }
    ));
    return response.data;
  } catch (_err) {
    return null;
  }
}

async function addAssignees(api, owner, repo, number, assignees) {
  try {
    const response = await withRetry(() => api.post(
      `/repos/${owner}/${repo}/issues/${number}/assignees`,
      { assignees }
    ));
    return response.data;
  } catch (_err) {
    return null;
  }
}

function formatApiError(error) {
  if (error.handled) {
    return error;
  }

  const wrapped = new Error(mapApiError(error));
  wrapped.handled = true;
  return wrapped;
}

function mapApiError(error) {
  if (error.code === 'ECONNABORTED') {
    return 'Request timed out. Check your connection.';
  }

  if (isProxyError(error)) {
    return 'Proxy connection failed. Check your network/VPN.';
  }

  const status = error.response ? error.response.status : null;

  if (status === 401 || status === 403) {
    return 'Invalid token. Run: gpr config to update.';
  }

  if (status === 404) {
    return 'Repository or endpoint not found. Check the GitBucket base URL and repository remote.';
  }

  const message =
    error.response &&
    error.response.data &&
    (error.response.data.message || error.response.data.error);

  if (message) {
    return message;
  }

  return 'Request failed. Please try again.';
}

function isProxyError(error) {
  const proxyCodes = ['ECONNREFUSED', 'ENOTFOUND', 'EHOSTUNREACH', 'ECONNRESET', 'EPROTO'];
  return proxyCodes.includes(error.code) && Boolean(error.config && (error.config.httpAgent || error.config.httpsAgent));
}

module.exports = {
  buildApi,
  findPullRequestByBranch,
  findPullRequestByBranchWithState,
  createPullRequest,
  listPullRequests,
  listOpenPullRequests,
  listBranches,
  getAuthenticatedUser,
  getPullRequest,
  getPullRequestReviews,
  getPullRequestComments,
  mergePullRequest,
  listUserOrgs,
  listOrgRepos,
  getRepoCollaborators,
  getOrgMembers,
  requestReviewers,
  addAssignees,
  formatApiError,
  withRetry
};
