# Result Contract Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the duplicated unsafe Result implementation with one tested application Result contract without removing module-local BaseCommand/BaseQuery ownership.

**Architecture:** The errors module owns the generic Result container and error contracts. Each feature module keeps its own base command/query and imports the shared contract. HTTP continues to translate thrown application exceptions and does not depend on Result serialization.

**Tech Stack:** TypeScript, AdonisJS, Japa tests, pnpm, GitNexus CLI.

## Global Constraints

- Preserve all unrelated dirty-worktree changes.
- Do not merge feature-local BaseCommand/BaseQuery classes.
- Do not alter Adonis health-check Result.
- Unexpected exceptions must remain throwable.
- Run tests before claiming completion.

### Task 1: Add canonical Result contract and regression tests

**Files:**
- Create: `app/modules/errors/public_contracts/result.ts`
- Create: `app/modules/errors/tests/backend/unit/result.spec.ts`

**Interfaces:**
- Produces `Result<TData = void, TError = unknown>` with `ok`, `fail`, `isSuccess`, `isFailure`, `data`, `error`, `getValue`, and `getError`.

- [x] Write tests for undefined success, typed object failure, and Error failure.
- [x] Run the Result test and observe the expected failure against the missing canonical module.
- [x] Implement the minimal contract with discriminated state and no null coercion.
- [x] Run the Result test and verify it passes.

### Task 2: Migrate local base actions

**Files:**
- Modify: all 26 `app/modules/**/actions/result.ts` consumers in local base command/query files.
- Modify: `app/modules/tasks/tests/backend/unit/base_command_transaction.spec.ts`.

**Interfaces:**
- Every local base imports the canonical Result from `#modules/errors/public_contracts/result`.
- `executeAndWrap(input)` remains `Promise<Result<TOutput, unknown>>` for compatibility.

- [x] Update the base-command test to verify application failure preservation and unexpected-error propagation.
- [x] Run the targeted base-command test and observe the old implementation failure where applicable.
- [x] Replace local Result imports with the canonical contract and remove duplicate local implementations only after all imports are migrated.
- [x] Run targeted base tests and verify they pass.

### Task 3: Verify architecture and repository state

**Files:**
- Modify: none unless a focused test or import correction is required.

- [x] Run GitNexus detect-changes.
- [x] Run typecheck, targeted Result/base tests, exception-boundary, and public-contract checks.
- [x] Report unrelated pre-existing dirty-worktree failures separately.
- [x] Replace remaining raw production errors in filtering, search, and taxonomy with typed errors-module exceptions.
- [x] Remove the search public-contract dependency on filtering domain internals with a search-owned filter-expression contract.
- [x] Re-run exception-boundary, public-contract-surface, typecheck, and focused unit/integration verification.
- [x] Remove search generation application-to-infra imports and make taxonomy filter coordination use a filtering-owned port.
- [x] Refactor remaining legacy composition/domain placement violations separately after impact review; preserve SHA-256 semantics through module-owned ports/adapters and remove the remaining cross-module testing-route model import.

### Task 4: Adopt Result at proven cross-module/HTTP boundaries

- [x] Migrate application match score through Tasks → Marketplace → HTTP.
- [x] Migrate Projects detail and member-candidates HTTP boundaries.
- [x] Migrate task applications list through Tasks → Marketplace → HTTP.
- [x] Migrate task application commands (submit/decide/withdraw) through Tasks → Marketplace → HTTP.
- [x] Add success/failure propagation tests for each migrated boundary.
- [x] Migrate current-applicant, organization-inbox, and ranking flows after defining their expected-failure contracts.
- [x] Adopt Result at the Projects role staffing candidates HTTP boundary.
- [x] Adopt Result at Users profile snapshot HTTP boundaries (current/history/public).
- [x] Adopt Result at the Projects add-member HTTP mutation boundary.
- [x] Adopt Result at the Projects remove-member HTTP mutation boundary.
- [x] Adopt Result at the Projects update-member HTTP mutation boundary.
- [x] Adopt Result at the Projects delete HTTP boundaries (web/API).
- [x] Adopt Result at the Projects update API HTTP boundary.
- [x] Adopt Result at the Users rotate snapshot share-link HTTP boundary.
- [x] Adopt Result at the Users update snapshot access HTTP boundary.
- [x] Adopt Result at the Users publish snapshot HTTP boundary.
- [x] Adopt Result at Users profile skill add/remove/update HTTP boundaries.
- [x] Adopt Result at Users profile details/discoverability HTTP boundaries.
- [x] Adopt Result at Users recruiter bookmark HTTP boundaries.
- [x] Adopt Result at Users system-users HTTP boundary.
- [x] Adopt Result at Admin Users list/show/suspend/role HTTP boundaries.
- [x] Adopt Result at Organizations access configuration/custom-role HTTP boundaries.
- [x] Adopt Result at Organizations settings show/update HTTP boundaries.
- [x] Adopt Result at Organizations member-candidates/join-request-list HTTP boundaries.
- [x] Normalize Organizations remove-member command and adopt its HTTP Result boundary.
- [x] Normalize Organizations update-member-role command and adopt its request-aware HTTP Result boundary.
- [x] Normalize Organizations invite-member command and adopt its request-aware HTTP Result boundary.
- [x] Normalize Organizations process join-request command and adopt its HTTP Result boundary.
- [x] Adopt Result at the Organizations pending-member approval HTTP boundary without adding a synthetic transaction base.
- [x] Adopt Result at the Organizations bulk-member-add HTTP boundary while preserving partial-success data.
- [x] Adopt Result at Organizations accept/reject invitation HTTP boundaries.
- [x] Adopt Result at the Organizations switch-organization HTTP boundary.
- [x] Adopt Result at Organizations directory update/delete HTTP boundaries.
- [x] Adopt Result at Organizations project and workflow-status creation HTTP boundaries.
- [x] Adopt Result at the Organizations task-detail HTTP boundary before redirect.
- [x] Adopt Result at Organizations organization-detail and project-detail query boundaries.
- [x] Adopt Result at the Organizations join-organization HTTP boundary while preserving JSON/HTML behavior.
- [x] Adopt the shared Result boundary at Organizations switch-and-redirect legacy/API entrypoints.
- [x] Adopt Result at Organizations invitation/member index page boundaries.
- [x] Adopt Result at the Organizations creation HTTP boundary.
- [x] Adopt Result at Organizations show-page and index composite query boundaries.
- [x] Adopt Result across Tasks submission show, save-draft, submit, and lock HTTP boundaries.
- [x] Adopt Result across Tasks submission evidence index/store/delete HTTP boundaries.
- [x] Adopt Result across Tasks comment list/create/update/delete HTTP boundaries.
- [x] Adopt Result across Tasks attachment list/upload/create/delete HTTP boundaries.
- [x] Adopt Result across Tasks lifecycle create/delete and detail API/page boundaries.
- [x] Adopt Result across Tasks status CRUD, status-definition update, workflow list/replace, and batch status update boundaries (canonical and v1).
- [x] Adopt Result at the Tasks sort-order mutation boundary.
- [x] Adopt Result at the Tasks audit-log query boundary.
- [x] Adopt Result at Tasks grouped-board and timeline API boundaries.
- [x] Adopt Result at the Tasks index-page query boundary.
- [x] Adopt Result at the Tasks time-tracking mutation boundary.
- [x] Adopt Result at the Tasks edit-page composite query boundary.
- [x] Adopt Result at the Tasks update mutation boundary through the local BaseCommand.
- [x] Adopt Result at the Tasks create-permission query boundary while preserving PolicyResult data.
- [x] Adopt Result at the Tasks requirement creation boundary after request validation.
- [x] Adopt Result across remaining Tasks requirement update, version list, role prefill, and remove boundaries.
- [x] Adopt Result across Skills project skills/roles and rubric list/show read boundaries.
- [x] Adopt Result across Skills proficiency-scale and role-template read boundaries.
- [x] Adopt Result across Skills project-skill add/update/deactivate mutation boundaries.
- [x] Adopt Result across Skills role create/deactivate and role-skill upsert mutation boundaries.
- [x] Adopt Result at the Projects create-page composite query boundary.
- [x] Adopt Result at Notifications feed, mark-read, and delete HTTP boundaries (legacy and v1).
- [x] Adopt Result at Reviews dispute comments/evidences and admin case-file boundaries.
- [x] Adopt Result at Reviews dispute report/respond/resolve mutation boundaries.
- [x] Adopt Result at Reviews classic dispute create and admin/org list/detail boundaries.
- [x] Adopt Result at Reviews sprint reverse-review and task-review workflow mutation boundaries.
- [x] Adopt Result at Reviews AI dispute evaluation list/start and callback boundaries.
- [x] Adopt Result at Reviews sprint review package lifecycle and sprint-review dispute create/report boundaries.
- [x] Adopt Result at Reviews task-review submit/accept and sprint-review dispute comment boundaries.
- [x] Adopt Result at Reviews task/sprint boards, evidences, self-assessment and observation boundaries.
- [x] Adopt Result at HTTP Redis cache set/clear/flush/get/list boundaries.
- [x] Adopt Result at HTTP identity, organization-members and users-in-organization read boundaries.
- [x] Adopt Result at HTTP global search and search-discovery read boundaries.
- [x] Adopt Result at Auth landing, logout, session issue/refresh and social callback boundaries.
- [x] Adopt Result at Users profile edit/show/view and invitations page boundaries.
- [x] Adopt Result at Filtering criteria, saved-view and alert read boundaries.
- [x] Adopt Result at Sprint create/update/start/end, move-task and backlog-reorder boundaries.
- [x] Adopt Result at Tasks assignment acknowledgement and clarification HTTP boundaries; keep direct
  `.execute()` limited to the documented HTTP operational controllers.
- [x] Adopt Result at Testing auth, authorization access and required-organization error page boundaries;
  document health/dev operational exceptions.
