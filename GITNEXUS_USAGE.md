# GitNexus Usage For Suar

## Scope

This file documents how to use GitNexus for this repository with multiple
fallback paths.

The goal is to avoid depending on only one invocation path.

## Current Repo Identity

From [AGENTS.md](/home/tranngocduyet/Projects/Suar/AGENTS.md:4):

```text
Repo name: Suar
```

Core GitNexus resources referenced by this repo:

```text
gitnexus://repo/Suar/context
gitnexus://repo/Suar/clusters
gitnexus://repo/Suar/processes
gitnexus://repo/Suar/process/{name}
```

## Recommended Order

Use GitNexus in this order:

1. MCP tools and resources, when the session can access them
2. Local GitNexus CLI from the checked-out GitNexus repo
3. Installed `gitnexus` binary on `PATH`
4. `npm exec --yes --package gitnexus@latest -- gitnexus ...`
5. Source scan only as the last fallback when GitNexus is unavailable

## Method 1: MCP Tools

Use this when MCP is available in the current agent/editor session.

Typical operations:

```text
gitnexus_query({query: "concept"})
gitnexus_context({name: "symbolName"})
gitnexus_impact({target: "symbolName", direction: "upstream"})
gitnexus_detect_changes({scope: "all"})
```

Typical resource reads:

```text
gitnexus://repo/Suar/context
gitnexus://repo/Suar/clusters
gitnexus://repo/Suar/processes
gitnexus://repo/Suar/process/{name}
```

When to use:

- architecture exploration
- symbol context
- blast-radius checks before edits
- changed-scope verification before commit

Fallback if MCP is not working:

- switch to Method 2 immediately

## Method 2: Local GitNexus CLI From Checked-Out Repo

This is the most reliable fallback in the current environment.

Local CLI path:

```bash
/home/tranngocduyet/Projects/GitNexus/gitnexus/dist/cli/index.js
```

Basic commands for `Suar`:

```bash
cd /home/tranngocduyet/Projects/Suar
/home/tranngocduyet/Projects/GitNexus/gitnexus/dist/cli/index.js status
/home/tranngocduyet/Projects/GitNexus/gitnexus/dist/cli/index.js analyze . --force
/home/tranngocduyet/Projects/GitNexus/gitnexus/dist/cli/index.js query "task workflow" -r Suar -l 8
/home/tranngocduyet/Projects/GitNexus/gitnexus/dist/cli/index.js context User -r Suar -f app/models/user.ts
/home/tranngocduyet/Projects/GitNexus/gitnexus/dist/cli/index.js impact createTaskRequestValidator -r Suar
/home/tranngocduyet/Projects/GitNexus/gitnexus/dist/cli/index.js detect-changes -r Suar -s unstaged
```

Validated in this environment:

```text
status: pass
analyze . --force: pass
analyze /home/tranngocduyet/Projects/Suar --force from /home/tranngocduyet/Projects/GitNexus: pass
query "task workflow" -r Suar -l 3: pass
context User -r Suar -f app/models/user.ts: pass
impact createTaskRequestValidator -r Suar: pass
detect-changes -r Suar -s unstaged: pass
```

Observed results:

```text
analyze . --force
-> Repository indexed successfully (49.4s)
-> 14,742 nodes | 33,460 edges | 803 clusters | 300 flows
```

```text
analyze /home/tranngocduyet/Projects/Suar --force
-> Repository indexed successfully (48.1s)
-> 14,744 nodes | 33,460 edges | 805 clusters | 300 flows
```

```text
impact createTaskRequestValidator -r Suar
-> impactedCount: 0
-> risk: LOW
```

Fallback if this path fails:

- rebuild GitNexus locally:

```bash
cd /home/tranngocduyet/Projects/GitNexus/gitnexus
npm exec -- tsc --noEmit
npm exec -- node scripts/build.js
```

- then rerun the same local CLI commands

## Method 3: Installed `gitnexus` Binary

Use this when `gitnexus` is already installed on `PATH`.

Commands:

```bash
cd /home/tranngocduyet/Projects/Suar
gitnexus status
gitnexus analyze . --force
gitnexus query "task workflow" -r Suar -l 8
gitnexus context User -r Suar -f app/models/user.ts
gitnexus impact createTaskRequestValidator -r Suar
gitnexus detect-changes -r Suar -s unstaged
```

Check whether the binary exists:

```bash
which gitnexus
```

Fallback if not installed:

- switch to Method 2 or Method 4

## Method 4: Package Invocation Without Global Install

Use this when you do not have `gitnexus` installed globally.

Preferred package-based form:

```bash
npm exec --yes --package gitnexus@latest -- gitnexus status
npm exec --yes --package gitnexus@latest -- gitnexus analyze . --force
npm exec --yes --package gitnexus@latest -- gitnexus context User -r Suar -f app/models/user.ts
```

For MCP server startup:

```bash
npm exec --yes --package gitnexus@latest -- gitnexus mcp
```

Why this exists:

- this repo no longer needs to depend only on `npx -y gitnexus@latest ...`
- local GitNexus setup code was updated to prefer this package form over the
  older `npx` fallback

Fallback if package invocation fails:

- switch to Method 2

## Method 5: Older `npx` Form

This method exists only for compatibility or comparison.

Examples:

```bash
npx gitnexus analyze . --force
npx gitnexus status
```

Current caveat in this environment:

```text
npx -y gitnexus@latest --help
-> npm error Cannot destructure property 'package' of 'node.target' as it is null.
```

Use this method only if it is already known to work on the current machine.

Fallback if it fails:

- switch to Method 2 or Method 4

## Index Refresh Rules

Refresh the index before deep exploration when:

- `status` says stale
- the working tree changed materially
- you need up-to-date docs or impact analysis

Preferred refresh:

```bash
cd /home/tranngocduyet/Projects/Suar
/home/tranngocduyet/Projects/GitNexus/gitnexus/dist/cli/index.js analyze . --force
```

Quick status check:

```bash
/home/tranngocduyet/Projects/GitNexus/gitnexus/dist/cli/index.js status
```

## Common Tasks

### Explore a symbol

```bash
/home/tranngocduyet/Projects/GitNexus/gitnexus/dist/cli/index.js context User -r Suar -f app/models/user.ts
```

### Find execution-flow matches for a concept

```bash
/home/tranngocduyet/Projects/GitNexus/gitnexus/dist/cli/index.js query "organization permissions" -r Suar -l 8
```

### Check blast radius before editing

```bash
/home/tranngocduyet/Projects/GitNexus/gitnexus/dist/cli/index.js impact canManageProjectMembers -r Suar
```

### Verify current diff before commit

```bash
/home/tranngocduyet/Projects/GitNexus/gitnexus/dist/cli/index.js detect-changes -r Suar -s all
```

## Known Failure Modes

### MCP not available in the current agent session

Symptom:

```text
MCP resource listing unavailable or empty
```

Fallback:

- use Method 2

### GitNexus needs to write outside the sandbox

Symptom:

```text
EROFS: read-only file system, open '/home/tranngocduyet/.gitnexus/registry.json'
```

Fallback:

- rerun `analyze` outside the sandbox

### `detect-changes` fails in a restricted sandbox

Observed symptom in this environment:

```text
Error: Git diff failed: spawnSync git EPERM
```

Fallback:

- rerun the same command outside the sandbox
- or use plain `git diff` plus `context` and `impact` manually

### Package-resolution failure through old `npx` path

Observed symptom:

```text
npm error Cannot destructure property 'package' of 'node.target' as it is null.
```

Fallback:

- use Method 2
- or use Method 4

### Analyze fails on `Property` CSV column mismatch

Observed symptom before the local GitNexus fix:

```text
Analysis failed: COPY failed for Property: Binder exception: Number of columns mismatch. Expected 7 but got 8.
```

Cause:

```text
Property CSV and schema included declaredType, but GitNexus getCopyQuery()
used the generic multi-language COPY column list without declaredType.
```

Fixed locally in:

```text
/home/tranngocduyet/Projects/GitNexus/gitnexus/src/core/lbug/lbug-adapter.ts
```

Verification after rebuild:

```text
cd /home/tranngocduyet/Projects/Suar
/home/tranngocduyet/Projects/GitNexus/gitnexus/dist/cli/index.js analyze . --force -> pass

cd /home/tranngocduyet/Projects/GitNexus
/home/tranngocduyet/Projects/GitNexus/gitnexus/dist/cli/index.js analyze /home/tranngocduyet/Projects/Suar --force -> pass
```

## Minimum Safe Workflow For This Repo

Before important edits:

```bash
cd /home/tranngocduyet/Projects/Suar
/home/tranngocduyet/Projects/GitNexus/gitnexus/dist/cli/index.js analyze . --force
/home/tranngocduyet/Projects/GitNexus/gitnexus/dist/cli/index.js impact <symbol> -r Suar
```

Before commit:

```bash
/home/tranngocduyet/Projects/GitNexus/gitnexus/dist/cli/index.js detect-changes -r Suar -s all
```

If any step fails:

- fall back to another method in this file instead of abandoning GitNexus use
