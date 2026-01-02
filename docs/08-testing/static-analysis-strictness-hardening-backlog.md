# Static Analysis Strictness Hardening Backlog

Status: Phases 1-6 implemented on 2026-07-17. The listed strictness rollout is
complete; future hardening should start from fresh research and measurement.

Last research date: 2026-07-16.
Last implementation date: 2026-07-17.

## Purpose

This note preserves the static-analysis hardening research so the future rollout can
raise ESLint, TypeScript, and Svelte checks for correctness rather than just making
the toolchain louder.

Current conclusion: the planned hardening is complete. Future strictness should
remain selective; do not enable broad presets or compiler flags without a
rollout plan and cleanup budget.

## Current State

- Backend `tsconfig.json` already enables the important strict baseline:
  `strict`, `noImplicitAny`, `strictNullChecks`, `noUnusedLocals`,
  `noUnusedParameters`, `noImplicitReturns`, `noFallthroughCasesInSwitch`,
  `noImplicitOverride`, `allowUnreachableCode: false`,
  `allowUnusedLabels: false`, `noUncheckedIndexedAccess`,
  `noPropertyAccessFromIndexSignature`, and `exactOptionalPropertyTypes`.
- Backend `strictPropertyInitialization` is intentionally disabled because Lucid
  ORM decorators do not fit the rule cleanly.
- Frontend `inertia/tsconfig.json` is strict and now enables
  `noUncheckedIndexedAccess`.
- ESLint already enforces many high-signal rules: no explicit `any`, no unsafe
  operations, no floating promises, no non-null assertions, restricted template
  expressions, type-only imports, import order, unbound methods, unnecessary
  condition checks, unnecessary type assertions, and switch exhaustiveness.
- `check:svelte:strict` exists and uses `--fail-on-warnings`. `svelte.config.js`
  no longer globally suppresses `a11y-*`, `state_referenced_locally`, or
  `unused-export-let`.

## Rollout Status

At original research time, the repo had unrelated lint/typecheck debt and active
feature work. Phases 1-6 are now green. Phase 6 cleaned dynamic/index-signature
accesses across route params, environment variables, raw query rows, and generic
metadata records.

Known baseline at research time:

- `pnpm run typecheck` failed because `svelte-check` reported 7 errors.
- `pnpm run check:svelte:strict` failed with the same Svelte diagnostics.
- `pnpm run lint` failed with existing backend/frontend lint errors.

Future hardening should fix strictness debt rather than weaken rules to pass.

## Recommended Rollout Order

### 1. Make Existing Gates Green

First restore the current gates without changing strictness:

```bash
pnpm run typecheck
pnpm run check:svelte:strict
pnpm run lint
```

This makes later hardening attributable to the new rules instead of mixed with
pre-existing failures.

Implemented on 2026-07-17 before hardening. Baseline `typecheck`,
`check:svelte:strict`, and `lint` were green.

### 2. Harden Svelte Warnings

Remove broad warning suppression from `svelte.config.js`:

- Stop suppressing all `a11y-*` warnings globally.
- Stop suppressing `state_referenced_locally` globally.
- Revisit `unused-export-let`; model intentionally bindable props explicitly and
  fix false positives at their typed component boundary without local suppressions.

Why this is correct:

- Accessibility warnings catch user-facing defects, not style preferences.
- `state_referenced_locally` can indicate stale Svelte 5 state references after
  reassignment.
- Typed component contracts document intent without hiding local regressions.

Suggested future command:

```bash
pnpm exec svelte-check --tsconfig ./inertia/tsconfig.json --fail-on-warnings
```

If specific compiler warnings need staged rollout, use `--compiler-warnings`
explicitly rather than suppressing warning families in `svelte.config.js`.

Implemented on 2026-07-17 by removing the global `onwarn` suppression and fixing
the `noUncheckedIndexedAccess` diagnostics that surfaced in Svelte files.

### 3. Enable Frontend `noUncheckedIndexedAccess`

Added `noUncheckedIndexedAccess: true` to `inertia/tsconfig.json`.

Why this is correct:

- Backend already uses it.
- Frontend has list, table, filter, pagination, and route-data access patterns
  where unchecked indexing can become runtime `undefined`.

Implementation also resolved the frontend `tsc -p inertia/tsconfig.json` config
issue observed during research by removing `baseUrl` and adding a fallback
`paths` entry:

```text
Option 'baseUrl' has been removed. Please remove it from your configuration.
Use '"paths": {"*": ["./*"]}' instead.
```

Then measure:

```bash
pnpm exec tsc --noEmit -p inertia/tsconfig.json --pretty false --noUncheckedIndexedAccess
```

Implemented on 2026-07-17. Final command passed.

### 4. Enable `exactOptionalPropertyTypes`

Enable `exactOptionalPropertyTypes: true` after DTO and API boundary cleanup.

Why this is correct:

- It distinguishes omitted optional fields from fields explicitly set to
  `undefined`.
- That matters for DTOs, partial updates, request mappers, response mappers,
  persistence payloads, and event metadata.

Measured impact at research time:

```text
pnpm exec tsc --noEmit --pretty false --exactOptionalPropertyTypes
=> about 463 TypeScript errors
```

Remeasured on 2026-07-17 after current branch changes:

```text
pnpm exec tsc --noEmit --pretty false --exactOptionalPropertyTypes
=> 1640 log lines across DTO/API boundary and optional payload assignment errors
```

Implemented on 2026-07-17:

```text
pnpm exec tsc --noEmit --pretty false
=> 0 log lines with exactOptionalPropertyTypes enabled in tsconfig.json
```

Completed cleanup slices:

- Admin users, organizations, packages, audit logs, and flagged reviews now omit
  absent optional filter/update keys instead of passing `undefined`.
- Audit, auth, authorization, HTTP exceptions, notifications, observability,
  organizations, pagination, projects, reviews, search, settings, skills,
  sprints, tasks, users, seed data, route, and test slices were cleaned to
  preserve omitted/null/undefined semantics at DTO/API/repository boundaries.
- HTTP exception option constructors no longer pass `details`, `errors`, or
  `retryAfter` as explicitly `undefined`.
- Added `omitUndefined` optional-payload contract for boundary payloads that must drop absent
  optional keys without dropping `null`.
- Patched `@vinejs/vine@4.4.0` declarations through
  `patches/@vinejs__vine@4.4.0.patch` so optional validator config types accept
  the library's explicit `undefined` values under exact optional semantics.

Final Phase 4 evidence:

```text
pnpm run typecheck
=> tsc passed; svelte-check found 0 errors and 0 warnings

pnpm run check:svelte:strict
=> svelte-check found 0 errors and 0 warnings

pnpm run lint
=> backend app, backend rest, frontend, and config lint passed
```

Expected fix pattern:

- Omit optional keys instead of setting them to `undefined`.
- Use `null` only when the domain/API contract explicitly means "clear value" or
  "known empty value".
- Add `| undefined` to a type only when `undefined` is a real accepted value,
  not as a shortcut.

### 5. Add Selected ESLint Rules

Do not enable `typescript-eslint` `all`. Do not blindly extend
`strict-type-checked` if the project needs stable, explicit rule ownership.

Add rules one at a time, with fixes grouped by rule:

- `@typescript-eslint/no-unnecessary-condition`
- `@typescript-eslint/unbound-method`
- `@typescript-eslint/no-unnecessary-type-assertion`

Measured impact at research time:

```text
no-unnecessary-condition: about 92 findings
unbound-method: about 60 findings
no-unnecessary-type-assertion: about 244 findings
```

Remeasured on 2026-07-17 after current branch changes:

```text
no-unnecessary-condition: 92 findings
unbound-method: 60 findings
no-unnecessary-type-assertion: 261 findings
```

Implemented Phase 5 on 2026-07-17:

```text
pnpm exec eslint ./app ./bin ./start ./config ./types ./tests ./server.ts "inertia/**/*.ts" \
  --rule "@typescript-eslint/unbound-method:error"
=> 0 findings after enabling @typescript-eslint/unbound-method in eslint.config.js

pnpm exec eslint ./app ./bin ./start ./config ./types ./tests ./server.ts "inertia/**/*.ts" \
  --rule "@typescript-eslint/no-unnecessary-condition:error"
=> 0 findings after enabling @typescript-eslint/no-unnecessary-condition in eslint.config.js

pnpm exec eslint ./app ./bin ./start ./config ./types ./tests ./server.ts "inertia/**/*.ts" \
  --rule "@typescript-eslint/no-unnecessary-type-assertion:error"
=> 0 findings after enabling @typescript-eslint/no-unnecessary-type-assertion in eslint.config.js

pnpm run lint
=> backend app, backend rest, frontend, and config lint passed

pnpm run typecheck
=> tsc passed; svelte-check found 0 errors and 0 warnings

pnpm run check:svelte:strict
=> svelte-check found 0 errors and 0 warnings
```

Phase 5a cleanup also fixed the user Inertia resolver's `index` fallback to
match the existing `modules/dashboard/index.svelte` entry.

Phase 5b broad auto-fix preflight on 2026-07-17:

```text
pnpm exec eslint <type-assertion finding files> \
  --rule "@typescript-eslint/no-unnecessary-type-assertion:error" \
  --fix-dry-run
=> ESLint/TypeScript service crash while applying fixes
```

The crash reproduces even with an isolated config that only enables
`@typescript-eslint/no-unnecessary-type-assertion`. Manual multiagent cleanup
was used instead, and the explicit full-scope rule command passed afterward.

Why these are correct:

- `no-unnecessary-condition` catches stale checks, impossible comparisons, and
  dead fallback branches.
- `unbound-method` catches methods passed around without preserving `this`.
- `no-unnecessary-type-assertion` removes casts that hide whether types are
  actually doing useful work.

### 6. Enable `noPropertyAccessFromIndexSignature` Last

Enable `noPropertyAccessFromIndexSignature: true` only after dynamic-access
seams have been cleaned or intentionally kept as bracket access.

Why this is correct:

- It makes call-site syntax reflect certainty: known properties use dot access;
  dynamic/index-signature properties use bracket access.

Why it should be last:

- It creates broad churn around `process.env`, route params, query rows, and
  generic metadata.

Measured impact at research time:

```text
pnpm exec tsc --noEmit --pretty false --noPropertyAccessFromIndexSignature
=> about 1196 TypeScript errors
```

Remeasured on 2026-07-17 after current branch changes:

```text
pnpm exec tsc --noEmit --pretty false --noPropertyAccessFromIndexSignature
=> 1174 diagnostics across 266 files
```

Implemented on 2026-07-17:

```text
pnpm exec tsc --noEmit --pretty false --noPropertyAccessFromIndexSignature
=> 0 diagnostics

pnpm run typecheck
=> tsc passed; svelte-check found 0 errors and 0 warnings

pnpm run check:svelte:strict
=> svelte-check found 0 errors and 0 warnings

pnpm run lint
=> backend app, backend rest, frontend, and config lint passed
```

Implementation pattern:

- Use bracket access for dynamic/index-signature data:
  `ctx.params['taskId']`, `process.env['NODE_ENV']`, `$extras['total']`, and
  row/metadata record keys.
- Keep dot access for statically declared object properties.
- Avoid new broad helper abstractions where bracket access makes the dynamic
  seam explicit enough.

## Non-Goals

- Do not re-enable backend `strictPropertyInitialization` while Lucid decorators
  remain the dominant model pattern.
- Do not disable `skipLibCheck` as part of this rollout; that mostly imports
  vendor/library noise into app work.
- Do not add formatting rules to ESLint. Keep formatting under Prettier.
- Do not weaken existing strict rules to make the migration easier.

## Done Criteria For Future Rollout

- Current gates are green before each new strictness step.
- Each new rule/flag is introduced in its own change or clearly separated batch.
- Fixes preserve domain/API meaning, especially around omitted vs null vs
  undefined.
- Any ignore is local, documented, and tied to a concrete false positive.
- Final gates pass:

```bash
pnpm run typecheck
pnpm run check:svelte:strict
pnpm run lint
```

## References

- TypeScript `exactOptionalPropertyTypes`:
  https://www.typescriptlang.org/tsconfig/exactOptionalPropertyTypes.html
- TypeScript `noUncheckedIndexedAccess`:
  https://www.typescriptlang.org/tsconfig/noUncheckedIndexedAccess.html
- TypeScript `noPropertyAccessFromIndexSignature`:
  https://www.typescriptlang.org/tsconfig/noPropertyAccessFromIndexSignature.html
- typescript-eslint shared configs:
  https://typescript-eslint.io/users/configs/
- Svelte check CLI:
  https://svelte.dev/docs/cli/sv-check
- Svelte compiler warnings:
  https://svelte.dev/docs/svelte/compiler-warnings
