const { ensureConfig } = require('../lib/conf');
const { buildApi, listOpenPullRequests, formatApiError } = require('../lib/api');
const { getRepositoryContext } = require('../lib/git');
const { printBox, renderPullRequestTable } = require('../lib/ui');

async function listCommand() {
  const config = await ensureConfig();
  const repo = await getRepositoryContext();
  const api = buildApi(config);

  printBox('Open Pull Requests', Math.min((process.stdout.columns || 120) - 2, 92));
  console.log(`Repo    : ${repo.owner}/${repo.repo}`);

  let pullRequests;

  try {
    pullRequests = await listOpenPullRequests(api, repo.owner, repo.repo);
  } catch (error) {
    throw formatApiError(error);
  }

  if (!pullRequests.length) {
    console.log('No open pull requests found.');
    return;
  }

  console.log(renderPullRequestTable(pullRequests, {
    owner: repo.owner,
    repo: repo.repo
  }));
  console.log(`Total: ${pullRequests.length} open pull requests`);
}

module.exports = listCommand;
