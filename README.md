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

### Not inside a git repository

If you see:

```text
Not a git repository
```

Change into a valid git repository folder and rerun the command.
