# Dissolve Central Contracts Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove `app/modules/contracts` as a cross-domain bucket and place each contract at the owning feature module's `public_contracts` boundary without changing runtime behavior.

**Architecture:** Projects owns project context contracts, Tasks owns task specification/assignment/completion contracts, Reviews owns review observation/governance contracts, and Accomplishments owns accomplishment-specific contracts. Composition may consume these pure public contracts only to wire runtime dependencies. The generic `omitUndefined` helper is removed from the central bucket and replaced with native/local serialization at its call sites.

**Tech Stack:** TypeScript, AdonisJS, Japa, ESLint, GitNexus CLI.

## Global Constraints

- Do not create `shared`, `support`, or another generic cross-domain bucket.
- Preserve schema strings, runtime validator behavior, serialized field names, and public API behavior.
- Run `gitnexus impact` before editing exported symbols and `gitnexus detect-changes` after edits.
- Do not revert or absorb unrelated dirty-worktree changes.

### Task 1: Establish the ownership map

**Files:**
- Inspect: `app/modules/contracts/public_contracts/task_to_accomplishment/*.ts`
- Inspect: `app/modules/*/public_contracts/**`
- Inspect: `app/composition/**`

- [ ] Record each contract's owner from its producer/lifecycle and list all importers with `rg`.
- [ ] Run targeted baseline tests for the three existing contracts test files.
- [ ] Confirm no destination filename collides with existing public contract files.

### Task 2: Relocate project and task contracts

**Files:**
- Move: central project contract files into `app/modules/projects/public_contracts/project-context/`.
- Move: central task contract files into `app/modules/tasks/public_contracts/task-authoring/` and `task-assignment/`.
- Modify: all importers and composition adapters using the moved symbols.
- Test: existing Tasks and Projects contract/integration tests.

- [ ] Move files without changing declarations.
- [ ] Replace only import specifiers and preserve `.js` relative imports.
- [ ] Run the affected unit tests and `check:arch:backend:public-contract-surface`.

### Task 3: Relocate completion and review contracts

**Files:**
- Move: completion claim contracts into the owning Tasks/Accomplishments public contract boundary.
- Move: review observation and review governance contracts into `app/modules/reviews/public_contracts/`.
- Modify: Reviews and Accomplishments callers, repositories, models, composition readers, and tests.

- [ ] Preserve schema versions and validator behavior.
- [ ] Update imports in dependency order: contracts, implementations, callers, tests.
- [ ] Run review and accomplishment unit/integration tests that consume these contracts.

### Task 4: Remove the central optional payload helper

**Files:**
- Modify: all 79 `omitUndefined` consumers found by `gitnexus impact omitUndefined`.
- Delete: `app/modules/contracts/public_contracts/optional_payload.ts`.
- Test: `app/modules/testing/tests/backend/unit/omit_undefined.spec.ts` and affected mapper/query tests.

- [ ] Replace each use with the smallest native/local equivalent.
- [ ] Preserve shallow omission semantics and type inference at every call site.
- [ ] Remove the obsolete central helper test or relocate it beside the owning consumer behavior.

### Task 5: Relocate fixtures and remove the central module

**Files:**
- Move: golden fixtures to the owning module test/support directories.
- Move: compatibility fixtures/tests beside Tasks/Users/Accomplishments compatibility tests.
- Delete: `app/modules/contracts/` after `rg` confirms no imports remain.

- [ ] Verify no `#modules/contracts/` import remains in production, tests, composition, docs, or generated configuration.
- [ ] Run all focused contract tests through their new paths.

### Task 6: Verify the refactor

**Files:**
- Inspect: all changed files and GitNexus change report.

- [ ] Run targeted unit/integration tests.
- [ ] Run ESLint for changed modules.
- [ ] Run public contract and validation architecture checks.
- [ ] Run `gitnexus detect-changes` and inspect unexpected symbols/flows.
- [ ] Run typecheck and separate pre-existing failures from refactor regressions.
