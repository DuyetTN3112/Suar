# RTK Usage For Suar

## Scope

This file documents how to use RTK for this repository.

RTK is a shell-command output optimizer. It reduces long terminal output before
it reaches the assistant context.

RTK does not replace GitNexus:

- use GitNexus for code navigation, symbol context, impact analysis, and change
  detection
- use RTK for shell commands that may produce long output

## Current Local Setup

Installed RTK binary:

```bash
~/.local/bin/rtk
```

Validated version:

```text
rtk 0.34.3
```

Codex global instruction files:

```text
~/.codex/AGENTS.md
~/.codex/RTK.md
```

Important Codex caveat:

```text
Codex uses RTK through instructions/prompt guidance.
Do not assume shell commands are automatically rewritten.
Prefix long-output commands with `rtk` explicitly.
```

## Recommended Order

Use RTK in this order:

1. Use direct `rtk ...` commands in this repository
2. Use `rtk test ...` for noisy test commands
3. Use raw shell commands only when RTK passthrough or formatting gets in the way
4. Use GitNexus separately for code lookup and impact analysis

## Basic Verification

Run:

```bash
cd /home/tranngocduyet/Projects/Suar
which rtk
rtk --version
rtk gain
```

Expected binary path:

```text
/home/tranngocduyet/.local/bin/rtk
```

If `rtk gain` says there is no tracking data yet, RTK is still usable. Tracking
data appears after RTK commands run in an environment where RTK can write its
tracking database.

## Common Suar Commands

### Git

Use RTK for status and diff because this repo often has large working-tree
changes.

```bash
cd /home/tranngocduyet/Projects/Suar
rtk git status
rtk git diff
rtk git diff --stat
rtk git log -n 10
```

If the compact diff hides needed context:

```bash
rtk git diff --no-compact
```

Or use raw git:

```bash
git diff
```

### Typecheck

Preferred:

```bash
rtk npm run typecheck
```

Alternative direct TypeScript filter:

```bash
rtk tsc --noEmit
```

### Lint

Project script:

```bash
rtk npm run lint
```

More focused scripts:

```bash
rtk npm run lint:backend
rtk npm run lint:backend:app
rtk npm run lint:backend:rest
rtk npm run lint:frontend
```

Direct ESLint filter when investigating lint failures:

```bash
rtk lint app
rtk lint inertia
```

### Unit Tests

Preferred compact form:

```bash
rtk test npm run test:unit
```

This is usually better than `rtk npm run test:unit` because `rtk test` keeps
successful test output compact and focuses on failures.

Raw project-script form:

```bash
rtk npm run test:unit
```

### Integration Tests

Use RTK for the wrapper, but keep environment variables explicit.

```bash
PG_TEST_DATABASE=suar_test \
MONGODB_TEST_URL='mongodb://root:root@127.0.0.1:27017/suar_test?authSource=admin' \
rtk test npm run test:integration:safe
```

If the command requires a custom script:

```bash
PG_TEST_DATABASE=suar_test \
MONGODB_TEST_URL='mongodb://root:root@127.0.0.1:27017/suar_test?authSource=admin' \
rtk test sh scripts/test_integration_safe.sh
```

### Full Confidence Test

```bash
PG_TEST_DATABASE=suar_test \
MONGODB_TEST_URL='mongodb://root:root@127.0.0.1:27017/suar_test?authSource=admin' \
rtk test npm run test:full-confidence
```

### Files And Search

Prefer regular `rg` for quick targeted lookup. Use RTK when output may be large.

```bash
rtk grep "pattern" app
rtk find "*.ts" app
rtk read app/modules/tasks/actions/commands/create_task_command.ts
rtk read app/modules/tasks/actions/commands/create_task_command.ts --max-lines 120
```

Use raw commands when exact formatting matters:

```bash
rg "pattern" app
sed -n '1,160p' path/to/file.ts
```

### Dependencies

```bash
rtk deps
rtk pnpm list
rtk pnpm outdated
```

## Validated In This Environment

Validated from `/home/tranngocduyet/Projects/Suar`:

```text
rtk --version: pass, rtk 0.34.3
rtk git status: pass
rtk git diff: pass
rtk npm run typecheck: pass
rtk npm run lint: pass
rtk npm run test:unit: pass, 150 tests passed
rtk test npm run test:unit: pass, compact output
rtk gain: pass
```

Observed best test command:

```bash
rtk test npm run test:unit
```

Observed result:

```text
Tests   : 150 passed (150)
```

## Codex Usage Rules

For Codex sessions in this repository:

- use GitNexus first for codebase navigation and impact checks
- use RTK for shell commands likely to produce long output
- explicitly prefix commands with `rtk`
- prefer `rtk test ...` for test commands
- do not paste full logs unless specifically needed
- when RTK gives a full-log path or tee hint, report the short failure excerpt
  first and keep the full log path as supporting detail

Good defaults:

```bash
rtk git status
rtk git diff
rtk npm run typecheck
rtk npm run lint
rtk test npm run test:unit
```

## Troubleshooting

### `rtk` not found

Load the shell profile or export PATH manually:

```bash
source "$HOME/.cargo/env"
export PATH="$HOME/.local/bin:$PATH"
which rtk
```

If VS Code or Codex still cannot find RTK, restart VS Code/Codex so the new PATH
is loaded.

### `rtk gain` has no data

This is not a usage failure. Run a few RTK commands first:

```bash
rtk git status
rtk test npm run test:unit
rtk gain
```

### Compact output hides details

Use the raw command or RTK passthrough:

```bash
rtk proxy npm run test:unit
git diff
```

For compact git diff with full details:

```bash
rtk git diff --no-compact
```

### Test output is still too verbose

Prefer:

```bash
rtk test npm run test:unit
```

instead of:

```bash
rtk npm run test:unit
```

### Codex does not auto-prefix commands

This is expected. Codex RTK support is instruction-based in this setup. Use RTK
explicitly:

```bash
rtk git diff
rtk npm run typecheck
rtk test npm run test:unit
```

