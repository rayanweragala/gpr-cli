const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');

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
  const response = await api.get(`/repos/${owner}/${repo}/pulls`, {
    params: {
      state,
      head: branch
    }
  });

  return response.data[0] || null;
}

async function createPullRequest(api, owner, repo, payload) {
  const response = await api.post(`/repos/${owner}/${repo}/pulls`, payload);
  return response.data;
}

async function listOpenPullRequests(api, owner, repo) {
  return listPullRequests(api, owner, repo, 'open');
}

async function listPullRequests(api, owner, repo, state) {
  const response = await api.get(`/repos/${owner}/${repo}/pulls`, {
    params: {
      state: state || 'open'
    }
  });

  return response.data;
}

async function listBranches(api, owner, repo) {
  const response = await api.get(`/repos/${owner}/${repo}/branches`);
  return response.data;
}

async function getAuthenticatedUser(api) {
  const response = await api.get('/user');
  return response.data;
}

async function getPullRequest(api, owner, repo, number) {
  const response = await api.get(`/repos/${owner}/${repo}/pulls/${number}`);
  return response.data;
}

async function getPullRequestReviews(api, owner, repo, number) {
  const response = await api.get(`/repos/${owner}/${repo}/pulls/${number}/reviews`);
  return response.data;
}

async function getPullRequestComments(api, owner, repo, number) {
  try {
    const response = await api.get(`/repos/${owner}/${repo}/pulls/${number}/comments`);
    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 404) {
      const fallback = await api.get(`/repos/${owner}/${repo}/issues/${number}/comments`);
      return fallback.data;
    }

    throw error;
  }
}

async function mergePullRequest(api, owner, repo, number, payload) {
  const response = await api.put(`/repos/${owner}/${repo}/pulls/${number}/merge`, payload);
  return response.data;
}

async function listUserOrgs(api) {
  const response = await api.get('/user/orgs');
  return response.data;
}

async function listOrgRepos(api, org) {
  const response = await api.get(`/orgs/${org}/repos`);
  return response.data;
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
  formatApiError
};
