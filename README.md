# gpr-cli

> A CLI tool to open and manage pull requests from your terminal.

## Prerequisites

- Node.js 18+
- npm
- git

## Install

```bash
git clone https://github.com/rayanweragala/gpr-cli.git
cd gpr-cli
./install.sh
```

After install:

```bash
gpr config
```

## Commands

### `gpr config`

Configure or update:

- GitBucket base URL
- API token
- Proxy URL

Example:

```bash
gpr config
```

### `gpr open`

Creates a pull request for the current branch in the current repository.

Example:

```bash
cd ~/projects/airwatch-dwesk-web
gpr open
```

Flow:

- detects the current repository from `git remote -v`
- parses `OWNER/REPO` from `https://repository-3.dxesk.cloud/git/OWNER/REPO.git`
- checks the current branch
- checks whether a PR already exists for that branch
- prompts for title, description, and base branch
- creates the PR through GitBucket `/api/v3`

### `gpr list`

Lists all open pull requests for the current repository.

Example:

```bash
cd ~/projects/airwatch-dwesk-web
gpr list
```

Output includes:

- colored table rows
- branch, base, and author columns truncated for readability
- short PR URL path column
- total open PR count

### `gpr status`

Shows the pull request status for the current branch.

Example:

```bash
cd ~/projects/airwatch-dwesk-web
gpr status
```

Status checks:

- open pull request for the current branch
- closed pull request for the current branch if no open PR exists
- no PR state if neither exists

### `gpr diff`

Shows a human-readable diff summary for the current branch against its PR base branch.

Example:

```bash
cd ~/Documents/Synapse/Projects/dwesk-frontend
gpr diff
```

### `gpr review [pr-number]`

Shows full PR details including description, file counts, comments, and reviewer states.

Examples:

```bash
gpr review
gpr review 24
```

### `gpr checkout`

Lets you pick an open PR and checks out its branch locally.

Example:

```bash
gpr checkout
```

### `gpr merge [pr-number]`

Merges an open PR from the terminal after confirmation.

Examples:

```bash
gpr merge
gpr merge 24
```

### `gpr conflicts`

Scans open pull requests for merge conflicts in the current repository.

Example:

```bash
gpr conflicts
```

### `gpr resolve <pr-number>`

Attempts to resolve a conflicted PR by fetching, checking out the PR head branch, rebasing onto the base branch, and pushing the result.

Example:

```bash
gpr resolve 24
```

Behavior:

- uses non-interactive git auth derived from your configured API identity
- respects the configured proxy URL for git network operations
- temporarily stashes local changes before switching branches
- restores your local changes after success or abort
- prints conflicted files if manual resolution is still required

### `gpr review-conflicts [pr-number] [file]`

Inspects rebase conflicts in a temporary git worktree so your current checkout stays untouched.

Examples:

```bash
gpr review-conflicts 24
gpr review-conflicts 24 pom.xml
```

Behavior:

- simulates rebasing the PR head onto the base branch in a temp worktree
- shows a summary for large conflict sets
- supports focused preview for a specific file

### `gpr close [pr-number]`

Closes a pull request without merging.

Examples:

```bash
gpr close
gpr close 24
```

### `gpr reopen <pr-number>`

Reopens a closed pull request.

Example:

```bash
gpr reopen 24
```

### `gpr sync`

Rebases the current branch onto its PR base branch, or a detected default branch, and pushes the updated branch.

Example:

```bash
gpr sync
```

### `gpr mine`

Shows your open pull requests across all org repos available to your account.

Example:

```bash
gpr mine
```

### `gpr watch`

Shows a live pull request dashboard for the current repository and refreshes every 30 seconds.

Example:

```bash
gpr watch
```

### `gpr stale --days <n>`

Shows open pull requests with no activity for more than `n` days.

Examples:

```bash
gpr stale
gpr stale --days 14
```

### `gpr stats`

Shows your pull request statistics for the current repository.

Example:

```bash
gpr stats
```

## Configuration File

The CLI stores configuration in:

```bash
~/.gpr-config.json
```

The file permissions are set to `600`.

Example structure:

```json
{
  "baseUrl": "https://repository-3.dxesk.cloud",
  "token": "your-token",
  "proxyUrl": "http://user%40domain:password@host:port"
}
```

## Updating Proxy or Token

Run:

```bash
gpr config
```

This overwrites the saved configuration.

## Troubleshooting

### Invalid or expired token

If you see:

```text
Invalid token. Run: gpr config to update.
```

Re-run:

```bash
gpr config
```

### Proxy connection failed

If you see:

```text
Proxy connection failed. Check your network/VPN.
```

Verify:

- your proxy URL is correct
- VPN access is active if required
- the proxy is reachable from your terminal

### Branch not pushed

If you see:

```text
Push your branch first: git push origin BRANCH
```

Push the branch, then retry:

```bash
git push origin <branch-name>
gpr open
```

### Invalid remote URL format

If you see:

```text
Unable to parse remote URL. Expected /git/OWNER/REPO.git
```

Your current repository remote is not using the required GitBucket format. Run `gpr` inside a repository whose `origin` looks like:

```bash
https://repository-3.dxesk.cloud/git/OWNER/REPO.git
```

### Proxy or VPN issues

If API commands fail until you re-run config, verify the proxy host is reachable from your machine:

```bash
getent hosts vpn.dwesk.cloud
```

Then update the saved configuration:

```bash
gpr config
```

### Not inside a git repository

If you see:

```text
Not a git repository
```

Change into a valid git repository folder and rerun the command.
