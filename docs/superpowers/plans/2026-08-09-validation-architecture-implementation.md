# Suar Validation Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Establish and incrementally enforce one validation architecture across Suar without introducing a global validator service or changing valid business behavior.

**Architecture:** Keep validation module-owned. Request mappers use VineJS or explicit runtime guards to produce canonical action inputs; Commands/Queries own contextual checks; domain policies own pure invariants; persistence remains the integrity safety net; Result and the HTTP exception boundary serialize expected failures without coupling domain code to transport.

**Tech Stack:** AdonisJS, TypeScript, VineJS, Japa, Vitest/Playwright where applicable, PostgreSQL/Lucid, existing `Result`, GitNexus CLI, existing architecture guard scripts.

## Implementation snapshot — 2026-08-09

The first implementation train is now merged into the working tree (without a commit):

- canonical validation issues and HTTP mapping are in place;
- sprint, review observation, task assignment, organization/settings, filtering, cache, project,
  skills, admin, testing, deprecated compatibility, auth-token, AI-callback, task-comment,
  task-attachment, review workflow, search, marketplace, task evidence, search-projection,
  query/read boundaries, filter-context, testing-auth, and testing-cleanup slices have focused
  request mappers and negative tests;
- the architecture guard checks 93 migrated controllers;
- the route inventory discovers 285 mutation declarations, with 0 application rows needing
  follow-up, 8 total rows needing review, and 26 test-only inline rows kept in a separate scope;
- focused validation tests for the migrated boundary slices pass. A full TypeScript check is
  currently red on unrelated dirty-worktree changes in task search and session cleanup; the
  validation files themselves pass targeted lint and focused tests.
- test-only route safety now includes a runtime malformed-body sweep across all mutation handlers;
  audit-seed fields and scope arrays also have explicit size bounds.
- The exact seed ownership follow-up is specified in
  `docs/03-architecture/testing-seed-ownership-ledger.md`; it is intentionally not implemented
  partially because current seed flows do not share a transaction boundary.

The application-boundary migration is complete for the current matrix. The remaining evidence work
is intentionally separate: 26 test-only inline handlers, one deprecated compatibility redirect,
and nested route prefixes are not yet resolved to effective URLs. Those scopes need their own
review before being treated as production API coverage.

## Global constraints

- Do not create a global `ValidationService`, validator registry, or cross-module `services` folder.
- Keep ownership in the feature module that owns the input or rule.
- Keep `Result` as an application failure container; it must not serialize HTTP responses.
- Keep unexpected exceptions throwable and preserve the existing HTTP exception handler.
- Do not merge module-local BaseCommand/BaseQuery classes.
- Do not remove database integrity protections.
- Do not alter valid public behavior without an explicit contract decision and regression test.
- Before editing any function, class, or method, run `gitnexus impact <symbol>` and review the blast radius.
- Before committing code, run `gitnexus detect-changes`.
- Preserve unrelated dirty-worktree changes.

## File map

### Create

- `docs/03-architecture/validation-architecture-contract.md` — promoted canonical architecture contract after this design is accepted.
- `app/modules/errors/public_contracts/validation_issue.ts` — shared issue type and validation details contract.
- `app/modules/http/boundary/validation_error_mapper.ts` — Vine/custom validation normalization at the HTTP boundary.
- `scripts/check_validation_architecture.mjs` — ratcheting architecture check.
- `app/modules/http/tests/backend/unit/validation_error_mapper.spec.ts` — canonical error mapping tests.
- `tests/unit/validation_architecture_guard.spec.ts` — guard behavior tests if the guard is exposed as importable helpers.

### Modify by vertical slice

- `app/modules/sprints/controllers/mappers/request/*` — sprint transport schemas and canonical inputs.
- `app/modules/sprints/controllers/create_project_sprint_controller.ts`
- `app/modules/sprints/controllers/update_project_sprint_controller.ts`
- `app/modules/sprints/controllers/move_task_to_sprint_controller.ts`
- `app/modules/sprints/controllers/reorder_project_backlog_controller.ts`
- `app/modules/sprints/controllers/end_project_sprint_delivery_controller.ts`
- `app/modules/sprints/actions/commands/*` — one-command Sprint delivery/review orchestration.
- `app/modules/sprints/tests/backend/unit/*`
- `app/modules/sprints/tests/backend/integration/*`
- `app/modules/sprints/tests/backend/contract/*`
- `app/modules/reviews/controllers/mappers/request/create_review_observation_request_mapper.ts`
- `app/modules/reviews/tests/backend/unit/create_review_observation_request_mapper.spec.ts`
- `app/modules/reviews/tests/backend/unit/review_observation_rules.spec.ts`
- `app/modules/tasks/controllers/mappers/request/task_request_mapper.ts`
- `app/modules/tasks/validators/task.ts`
- `app/modules/tasks/tests/backend/unit/task_input_validators.spec.ts`
- `app/modules/tasks/tests/backend/contract/task_authoring_api.contract.spec.ts`
- `app/modules/errors/public_contracts/validation_exception.ts`
- `app/modules/http/boundary/http_api_error_emitter.ts`
- `app/modules/http/exceptions/handler.ts`

## Phase 0: Freeze the contract and inventory the baseline

### Task 0.1: Review and promote the design contract

**Files:**
- Create: `docs/03-architecture/validation-architecture-contract.md`
- Reference: `docs/superpowers/specs/2026-08-09-validation-architecture-design.md`
- Reference: `docs/03-architecture/suar-module-layer-contract.md`

**Interfaces produced:**
- Five validation layers and their owners.
- Canonical `ValidationIssue` fields: `code`, `path`, `message`, optional `rule`.
- One-intent controller rule.
- Expected versus unexpected failure taxonomy.

- [ ] Copy the accepted decisions from the design into a normative architecture contract.
- [ ] Add explicit examples for request mapper, Command/Query, domain policy, and persistence ownership.
- [ ] Add an exceptions section for telemetry/event ingestion and dynamic versioned contracts.
- [ ] Cross-link the contract from `docs/03-architecture/application-boundary.md` and `docs/03-architecture/README.md`.
- [ ] Search the document for `TBD`, `TODO`, `later`, `appropriate`, and unresolved alternatives; remove each occurrence.
- [ ] Record the contract as proposed until the user approves it; do not silently mark it implemented.

### Task 0.2: Build a read-only validation inventory

**Files:**
- Create: `docs/12-evidence/validation-surface-inventory-2026-08-09.md`
- Inspect: `start/routes/*.ts`, `app/modules/*/controllers`, `app/modules/*/validators`, `app/modules/*/actions/dtos`

**Inventory columns:**

```text
route | method | transport | module | request mapper | schema | command/query | domain policy |
auth/context | result/error path | negative tests | current risk | migration phase
```

- [ ] Enumerate every mutation route from `start/routes` and `start/routes/deprecated`.
- [ ] Mark page-only, canonical API, compatibility API, admin, testing, callback, and telemetry surfaces.
- [ ] Identify routes reading `request.body()`, `request.all()`, `request.qs()`, or `request.params()` without a dedicated mapper.
- [ ] Identify controller methods invoking more than one Command/Query.
- [ ] Count and classify existing Vine, manual, DTO, domain, and contract validators.
- [ ] Link each inventory row to its current test files.
- [ ] Treat the inventory as evidence, not as a new runtime dependency.

### Task 0.3: Add baseline verification commands

**Files:**
- Modify: `package.json`
- Create: `scripts/check_validation_architecture.mjs`

- [ ] Add `check:arch:backend:validation` to `package.json`.
- [ ] Make the first run print findings and a stable violation key without failing on all existing debt.
- [ ] Store the reviewed baseline in `scripts/validation_architecture_baseline.json`.
- [ ] Fail only on new violations after the baseline is reviewed.
- [ ] Add a command-level test or fixture suite for one accepted and one rejected finding.
- [ ] Run `pnpm run check:arch:backend:validation` and record the baseline count in the evidence document.

## Phase 1: Canonical error contract

### Task 1.1: Add validation issue types

**Files:**
- Create: `app/modules/errors/public_contracts/validation_issue.ts`
- Modify: `app/modules/errors/public_contracts/validation_exception.ts`
- Test: `app/modules/http/tests/backend/unit/validation_error_mapper.spec.ts`

**Interfaces:**

```ts
export interface ValidationIssue {
  readonly code: string
  readonly path: string
  readonly message: string
  readonly rule?: string
}

export interface ValidationFailureDetails {
  readonly issues: readonly ValidationIssue[]
}
```

- [ ] Write tests for one issue, multiple issues, nested indexed paths, duplicate paths, and empty issue rejection.
- [ ] Implement immutable issue normalization without importing HTTP framework types.
- [ ] Keep `ValidationException.field()` and `.fields()` behavior compatible for existing callers.
- [ ] Add a conversion from legacy `Record<string, string>` to canonical issues.
- [ ] Verify existing exception tests remain green.

### Task 1.2: Normalize Vine and custom validation at the HTTP boundary

**Files:**
- Create: `app/modules/http/boundary/validation_error_mapper.ts`
- Modify: `app/modules/http/boundary/http_boundary_errors.ts`
- Modify: `app/modules/http/exceptions/handler.ts`
- Test: `app/modules/http/tests/backend/unit/validation_error_mapper.spec.ts`

- [ ] Write tests for Vine messages, `ValidationException`, object-level errors, malformed error objects, and safe message handling.
- [ ] Implement one mapper that preserves canonical paths before creating legacy flattened errors.
- [ ] Ensure raw database diagnostics and exception causes never enter client issues.
- [ ] Keep compatibility envelopes unchanged unless the route explicitly opts into the additive canonical issue field.
- [ ] Run the exception contract suite and the new mapper suite.

## Phase 2: Sprint vertical slice

### Task 2.1: Add Sprint request schemas and canonical inputs

**Files:**
- Create: `app/modules/sprints/controllers/mappers/request/create_project_sprint_request.ts`
- Create: `app/modules/sprints/controllers/mappers/request/update_project_sprint_request.ts`
- Create: `app/modules/sprints/controllers/mappers/request/move_task_to_sprint_request.ts`
- Create: `app/modules/sprints/controllers/mappers/request/reorder_project_backlog_request.ts`
- Create: `app/modules/sprints/controllers/mappers/request/end_project_sprint_delivery_request.ts`
- Test: `app/modules/sprints/tests/backend/unit/project_sprint_request_mapper.spec.ts`

**Required behavior:**

- body must be a non-array object;
- missing, null, empty, and wrong type remain distinguishable;
- camelCase/snake_case aliases are normalized once;
- UUIDs, dates, enums, arrays, and nested destination objects are validated;
- malformed `incompleteTasks` entries return indexed validation paths instead of `TypeError`;
- both alias keys present must follow one documented precedence rule and have a negative test if conflicting.

- [ ] Write failing tests for each required behavior before changing controllers.
- [ ] Implement Vine schemas or explicit guards with canonical `ValidationIssue` output.
- [ ] Return exact inputs consumed by the Sprint Commands; do not return raw records.
- [ ] Run the focused mapper suite.

### Task 2.2: Move Sprint controllers to mapper-only adaptation

**Files:**
- Modify: `app/modules/sprints/controllers/create_project_sprint_controller.ts`
- Modify: `app/modules/sprints/controllers/update_project_sprint_controller.ts`
- Modify: `app/modules/sprints/controllers/move_task_to_sprint_controller.ts`
- Modify: `app/modules/sprints/controllers/reorder_project_backlog_controller.ts`
- Modify: `app/modules/sprints/controllers/end_project_sprint_delivery_controller.ts`
- Test: corresponding controller unit tests

- [ ] Run `gitnexus impact` for each controller method before editing.
- [ ] Replace direct body parsing and `as Record<string, unknown>` with request mapper calls.
- [ ] Keep each controller endpoint to one Command/Query invocation.
- [ ] Add malformed payload tests proving 422 validation responses rather than 500/type errors.
- [ ] Run Sprint unit, contract, and integration tests.

### Task 2.3: Move delivery/review handoff into one application intent

**Files:**
- Create or modify: `app/modules/sprints/actions/commands/end_project_sprint_delivery_command.ts`
- Modify: Sprint inbound factory and composition files
- Modify: `app/modules/sprints/controllers/end_project_sprint_delivery_controller.ts`
- Test: `app/modules/sprints/tests/backend/unit/end_project_sprint_delivery_controller.spec.ts`
- Test: `app/modules/sprints/tests/backend/integration/end_project_sprint_delivery_command.spec.ts`

- [ ] Run `gitnexus impact EndProjectSprintDeliveryController` and the affected command symbols.
- [ ] Define one command output containing delivery result and review handoff result.
- [ ] Preserve transaction ownership and downstream review boundary through a consumer-owned port.
- [ ] Make the controller invoke exactly one command and only map its result.
- [ ] Add tests for delivery failure not opening review, successful delivery opening review once, and review handoff failure preserving the documented recovery semantics.
- [ ] Run focused Sprint tests and architecture validation.

## Phase 3: Review observation vertical slice

### Task 3.1: Replace unsafe Review Observation assertions

**Files:**
- Modify: `app/modules/reviews/controllers/mappers/request/create_review_observation_request_mapper.ts`
- Test: `app/modules/reviews/tests/backend/unit/create_review_observation_request_mapper.spec.ts`

- [ ] Run `gitnexus impact buildCreateReviewObservationDTO` before editing.
- [ ] Validate the observation versioned contract at runtime using the existing public contract validator.
- [ ] Validate UUID fields instead of checking only `typeof string`.
- [ ] Validate `supports | contradicts | context` instead of casting the relation.
- [ ] Validate evidence sufficiency and rationale classification enums.
- [ ] Validate duplicate/missing relation IDs and preserve indexed paths.
- [ ] Add tests for null, wrong type, invalid enum, invalid UUID, malformed nested item, and valid complete payload.

### Task 3.2: Keep domain governance separate from transport validation

**Files:**
- Inspect/modify: `app/modules/reviews/domain/review_observation_rules.ts`
- Modify: `app/modules/reviews/actions/commands/create_review_observation_command.ts` only if mapping is required
- Test: `app/modules/reviews/tests/backend/unit/review_observation_rules.spec.ts`

- [ ] Run `gitnexus impact validateReviewObservation` before editing.
- [ ] Keep reviewer eligibility, snapshot consistency, evidence access, and governance state in the domain/application layer.
- [ ] Do not move database/context checks into the request mapper.
- [ ] Return stable domain blocker codes and map them to the existing typed application failure contract.
- [ ] Verify no valid review observation behavior changes.

## Phase 4: Task and contract slices

### Task 4.1: Consolidate Task input result semantics

**Files:**
- Modify: `app/modules/tasks/validators/field_validation_result.ts`
- Modify: `app/modules/tasks/validators/task_create_validator.ts`
- Modify: `app/modules/tasks/validators/task_assignment_validator.ts`
- Modify: `app/modules/tasks/validators/task.ts`
- Test: `app/modules/tasks/tests/backend/unit/task_input_validators.spec.ts`

- [ ] Run `gitnexus impact validateCreateTaskInput` and `validateTaskAssignment` before editing.
- [ ] Preserve existing valid payloads and legacy messages during the first migration.
- [ ] Add stable issue codes and paths while retaining the current compatibility result fields.
- [ ] Ensure create/update semantics distinguish missing fields from wrong-type fields.
- [ ] Ensure nested required skills cannot bypass runtime validation through mapper assertions.
- [ ] Run focused Task unit and contract tests.

### Task 4.2: Verify versioned public contract validators

**Files:**
- Inspect: `app/modules/contracts/public_contracts/task_to_accomplishment/validators.ts`
- Test: `app/modules/contracts/tests/backend/unit/task_to_accomplishment/schema_validation.spec.ts`
- Test: golden fixture and compatibility validator suites

- [ ] Confirm public contract validators remain pure and do not import HTTP, database, or feature internals.
- [ ] Add negative fixtures for unknown breaking schema version, missing provenance, private payload, and requirement/result confusion.
- [ ] Keep business authorization and lifecycle rules outside shared contract validators.
- [ ] Run contract suites and public-contract architecture checks.

## Phase 5: Domain/application exception boundary

### Task 5.1: Introduce domain violation mapping for one pilot module

**Files:**
- Pilot: `app/modules/sprints/domain/project_sprint_policy.ts`
- Create: module-local domain violation contract under `app/modules/sprints/domain/`
- Modify: `app/modules/sprints/actions/commands/*`
- Test: Sprint domain and command tests

- [ ] Run GitNexus impact for every policy function changed.
- [ ] Replace one direct HTTP validation exception path with a pure domain decision.
- [ ] Map the decision at the Command boundary to the canonical typed application error.
- [ ] Preserve field path and stable code in the mapped error.
- [ ] Compare before/after API contract output.
- [ ] Do not migrate all modules in this task; use the Sprint slice as the reference pattern.

### Task 5.2: Record migration rules for remaining direct domain exceptions

**Files:**
- Modify: `docs/03-architecture/validation-architecture-contract.md`
- Create/update: `docs/12-evidence/validation-surface-inventory-2026-08-09.md`

- [ ] Classify each direct domain `ValidationException` as safe transitional debt, application-owned validation, or required migration.
- [ ] Assign migration order by public API risk and rule reuse, not by file count.
- [ ] Do not create a broad refactor task without a vertical-slice test contract.

## Phase 6: Architecture enforcement

### Task 6.1: Implement the validation architecture guard

**Files:**
- Modify: `scripts/check_validation_architecture.mjs`
- Create/modify: `scripts/validation_architecture_baseline.json`
- Test: `tests/unit/validation_architecture_guard.spec.ts`
- Modify: `package.json`

- [ ] Detect controller request assertions and direct body parsing outside approved mappers.
- [ ] Detect mutation controller methods that invoke multiple Commands/Queries.
- [ ] Detect domain imports of VineJS, `HttpContext`, or transport mappers.
- [ ] Detect request mappers with outbound/database imports.
- [ ] Detect new ad-hoc validation result shapes outside approved contracts.
- [ ] Emit stable violation keys containing rule, file, and line.
- [ ] Fail only on new violations after baseline generation.
- [ ] Add a CI/package script and document the expected command.

### Task 6.2: Add endpoint validation matrix checks

**Files:**
- Modify: `scripts/tests/collect_module_suite_matrix.mjs` only if a non-mutating extension is needed
- Create: `scripts/tests/collect_validation_matrix.mjs`
- Create: `docs/test/generated/validation_matrix.md` through the documented generator

- [ ] Inventory mutation routes and match each to request mapper, schema, Command, and negative test suite.
- [ ] Report missing matrix cells without claiming behavioral coverage from file presence alone.
- [ ] Add a false-pass rule: a test that only asserts no throw is not sufficient for malformed input.
- [ ] Keep generated output deterministic and reviewable.

## Phase 7: Full verification and handoff

### Task 7.1: Run focused verification

- [ ] Run Sprint mapper/controller/domain/command tests.
- [ ] Run Review Observation mapper/domain/command tests.
- [ ] Run Task validator and Task API contract tests.
- [ ] Run HTTP exception and canonical error tests.
- [ ] Run module/domain/public-contract/exception architecture checks.
- [ ] Run `pnpm run check:arch:backend:validation`.

### Task 7.2: Run broad verification

- [ ] Run `pnpm run typecheck` in a clean, isolated verification environment.
- [ ] Run relevant unit, integration, contract, component, and E2E suites.
- [ ] Run `pnpm run test:inventory` and `pnpm run test:inventory:modules` without overwriting unrelated evidence.
- [ ] Run `gitnexus detect-changes` and verify only expected symbols/flows changed.
- [ ] Review dirty-worktree files before staging; do not stage unrelated user changes.
- [ ] Record command output and known environmental failures in the evidence document.

### Task 7.3: Update documentation

- [ ] Link the validation architecture contract from `docs/03-architecture/README.md`.
- [ ] Add validation ownership to the API governance document.
- [ ] Add malformed-input and validation-boundary rows to the relevant behavior matrices.
- [ ] Update `validate.md` to point to the canonical architecture contract instead of presenting generic patterns as the primary design.
- [ ] Add a short contributor checklist for new endpoints.

## Contributor checklist after implementation

For every new external endpoint:

1. Identify the transport and auth contract.
2. Create a module-owned request mapper/schema.
3. Define a canonical action input.
4. Invoke exactly one Command/Query from the controller.
5. Keep authorization/context checks in the application layer.
6. Keep business invariants in domain policy.
7. Preserve transaction/database integrity protections.
8. Use canonical validation issue codes and paths.
9. Add malformed-input, authorization, domain, dependency, and rollback tests as applicable.
10. Run architecture checks and `gitnexus detect-changes` before commit.
