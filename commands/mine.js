const ora = require('ora');
const { ensureConfig } = require('../lib/conf');
const {
  buildApi,
  getAuthenticatedUser,
  listUserOrgs,
  listOrgRepos,
  listOpenPullRequests,
  formatApiError
} = require('../lib/api');
const { printBox, renderPullRequestTable } = require('../lib/ui');

async function mineCommand() {
  const config = await ensureConfig();
  const api = buildApi(config);
  const spinner = ora('Fetching your PRs across all repos...').start();

  try {
    const user = await getAuthenticatedUser(api);
    const orgs = await listUserOrgs(api);
    const reposByOrg = await Promise.all(orgs.map(async (org) => {
      try {
        const repos = await listOrgRepos(api, org.login);
        return repos.map((repo) => ({ owner: org.login, repo: repo.name }));
      } catch (_error) {
        return [];
      }
    }));

    const repos = reposByOrg.flat();
    const prGroups = await Promise.all(repos.map(async (target) => {
      try {
        const pullRequests = await listOpenPullRequests(api, target.owner, target.repo);
        const mine = pullRequests.filter((pullRequest) => pullRequest.user && pullRequest.user.login === user.login);

        return mine.length ? { ...target, pullRequests: mine } : null;
      } catch (_error) {
        return null;
      }
    }));

    spinner.stop();

    const groups = prGroups.filter(Boolean);
    const total = groups.reduce((sum, group) => sum + group.pullRequests.length, 0);

    printBox('Your Open Pull Requests (across all repos)', Math.min((process.stdout.columns || 120) - 2, 92));

    if (!groups.length) {
      console.log('No open pull requests found for your account.');
      return;
    }

    groups.forEach((group) => {
      console.log('');
      console.log(`  ${group.owner}/${group.repo}  (${group.pullRequests.length} PRs)`);
      console.log(renderPullRequestTable(group.pullRequests, {
        owner: group.owner,
        repo: group.repo,
        showAuthor: false,
        showUrl: false
      }));
    });

    console.log('');
    console.log(`Total: ${total} open pull requests across ${groups.length} repos`);
  } catch (error) {
    spinner.stop();
    throw formatApiError(error);
  }
}

module.exports = mineCommand;
