# Inertia Critical Path Performance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce first-response latency and unnecessary Inertia reload work without changing page behavior.

**Architecture:** Keep the existing Inertia shared-props contract, but mark the large translation tree as a deferred prop so the first response contains only locale metadata. Preserve page data and authorization semantics. Optimize reload calls only after inspecting each controller's actual prop names.

**Tech Stack:** AdonisJS 7, `@adonisjs/inertia` 4.2, Svelte 5, Inertia Svelte, Japa.

## Global Constraints

- Do not modify unrelated dirty-worktree changes.
- Do not change authorization or data visibility semantics.
- Do not replace full reloads with incomplete `only` lists.
- Run GitNexus impact analysis before editing every production symbol.
- Run `gitnexus detect-changes` before any commit.

### Task 1: Defer locale translations

**Files:**
- Modify: `app/modules/http/middleware/detect_user_locale_middleware.ts:44-78,118-128`
- Test: `app/modules/http/tests/backend/unit/detect_user_locale_middleware.spec.ts`

**Interfaces:**
- Consumes: the existing locale resolver and translation file loader.
- Produces: the same `locale`, `supportedLocales`, and `translations` props, with `translations` represented as an Inertia deferred prop.

- [ ] Write a failing test proving `handle` does not load translation files before `next()` and shares a deferred translation prop.
- [ ] Run the focused unit test and verify it fails for the expected eager-loading assertion.
- [ ] Wrap the existing translation loader in `ctx.inertia.defer(() => this.loadTranslations(locale))` while keeping cache and error behavior unchanged.
- [ ] Run the focused unit test and verify it passes.
- [ ] Run the existing HTTP middleware unit suite.

### Task 2: Optimize verified full reloads

**Files:**
- Modify only the affected Svelte pages under `inertia/apps/user`, `inertia/apps/org`, and `inertia/apps/admin`.
- Test: the existing page/component tests covering each mutation.

**Interfaces:**
- Consumes: prop names returned by the corresponding controller.
- Produces: partial reloads that refresh every UI-visible value changed by the mutation.

- [ ] Inventory each bare `router.reload()` with its controller response props.
- [ ] Add or update a focused test for each changed reload contract.
- [ ] Replace only reloads whose prop set is proven from controller code.
- [ ] Run each focused frontend test.

### Task 3: Verify build and runtime contracts

**Files:**
- No production changes unless verification exposes a direct regression.

- [ ] Run frontend typecheck and focused tests.
- [ ] Run the production build and inspect the generated Inertia manifest.
- [ ] Measure the initial response payload and confirm translations are absent from the first page response.
- [ ] Run `gitnexus detect-changes` and review the affected scope.
