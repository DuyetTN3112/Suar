# Suar Layer-Feature Folder Taxonomy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduce stable feature-oriented subdirectories inside every applicable Suar module and `app/composition` without changing runtime behavior or converting the repository to feature-first architecture.

**Architecture:** Preserve `layer -> feature -> files` for every module. Feature names are owned by each bounded context and shared across that module's layers where the feature exists, while `app/composition` groups dependency wiring by the capability it composes. Migration is incremental; Tasks are an example/pilot candidate, not the repository scope.

**Tech Stack:** TypeScript, AdonisJS, Japa/Vitest test suites, existing path aliases, GitNexus CLI, repository architecture checks.

## Global Constraints

- Preserve existing layer ownership and dependency direction.
- Do not introduce a top-level `features/` directory as part of this migration.
- Do not change symbols, business logic, route behavior, public contracts, or database behavior for a file move.
- Use lowercase kebab-case for feature directories.
- Use the same feature vocabulary across layers; do not create aliases for the same capability.
- Migrate existing files incrementally; new files follow the taxonomy immediately.
- Preserve unrelated dirty-worktree changes.
- Before editing any function, class, or method, run `gitnexus impact <symbol>` and review the blast radius.
- Before committing, run `gitnexus detect-changes` and verify the changed scope.

---

## File map

### Create

- `docs/03-architecture/layer-feature-folder-taxonomy.md` — normative architecture contract after the design is accepted.
- `docs/12-evidence/layer-feature-folder-inventory-2026-08-09.md` — baseline mapping of feature names to layers and candidate files.
- `scripts/check_layer_feature_folder_taxonomy.mjs` — non-blocking or ratcheting check for naming and placement conventions, after the pilot proves the rules.

### Modify during the first bounded pilot (module-agnostic)

- `app/modules/*/controllers/*` — entry points for the selected bounded capability.
- `app/modules/*/controllers/mappers/*` — transport mappers for the selected capability.
- `app/modules/*/actions/*` — commands, queries, DTOs, and ports owned by the capability.
- `app/modules/*/domain/*` — domain rules owned by the capability.
- `app/modules/*/infra/*` — adapters, repositories, models, and mappers owned by the capability.
- `app/modules/*/public_contracts/*` — contracts owned by the capability.
- `app/modules/*/tests/*` — tests moved only when feature ownership is unambiguous.
- `app/composition/*` — wiring files for the selected capability, only after dependency scope is confirmed.

### Do not modify outside the selected pilot unless directly required by an import update

- Other features in the selected module.
- Other modules such as `auth`, `organizations`, `reviews`, `search`, or `accomplishments`.
- Cross-feature composition providers.
- Shared module roots and generic architecture folders.

## Phase 0: Freeze repository-wide vocabulary rules and capture the baseline

### Task 0.1: Review and promote the design contract

**Files:**
- Create: `docs/03-architecture/layer-feature-folder-taxonomy.md`
- Reference: `docs/superpowers/specs/2026-08-09-layer-feature-folder-taxonomy-design.md`
- Reference: `docs/03-architecture/suar-module-layer-contract.md`

- [ ] Copy the accepted `layer -> feature -> files` decision into a normative architecture contract.
- [ ] Document layer responsibilities, feature naming, composition placement, test placement, and migration rules.
- [ ] Add examples for Tasks plus at least two non-Task modules, such as Reviews and Accomplishments.
- [ ] State that the contract does not require every layer to contain every feature folder.
- [ ] Search the contract for unfinished placeholder markers and unresolved alternatives; remove each occurrence.
- [ ] Keep the status proposed until the user accepts the written design.

### Task 0.2: Build the initial inventory

**Files:**
- Create: `docs/12-evidence/layer-feature-folder-inventory-2026-08-09.md`
- Inspect: every directory under `app/modules/*`, `app/composition/**`, and existing architecture documents.

**Inventory columns:**

```text
current path | proposed feature | layer | flow evidence | shared? | pilot? | references | migration batch
```

- [ ] Inventory the top-level module list and each module's existing layer directories.
- [ ] Select one bounded pilot module and inventory its controller, mapper, action, domain, infra, contract, test, and composition files.
- [ ] Record representative candidate capabilities for the remaining modules without presuming their final taxonomy.
- [ ] Group only by observable capability or execution flow, not by filename similarity alone.
- [ ] Mark shared files that must remain at the layer root or a broader module/composition folder.
- [ ] Record the selected pilot set. Task authoring may be used as the example, but is not mandatory.
- [ ] Record ambiguous files in an explicit review list instead of assigning them speculatively.
- [ ] Include the current dirty-worktree warning in the evidence document: the inventory must not be interpreted as ownership of unrelated uncommitted files.

### Task 0.3: Establish baseline verification

**Files:**
- Modify: `package.json` only if an existing architecture-check command needs a stable alias.
- Reference: existing typecheck, test, lint, and architecture commands from `package.json`.

- [ ] Run the existing focused tests for the selected pilot capability before any move and record the commands/results.
- [ ] Run the repository typecheck command and record the baseline result.
- [ ] Run `git status --short` and save the pre-migration changed-path list outside the implementation diff.
- [ ] Do not reset, clean, stash, or overwrite existing user changes.

## Phase 1: Pilot one bounded capability inside existing layers

### Task 1.1: Create the feature directory skeleton

**Files:**
- Create directories only when they receive a file in the same batch:
  - `app/modules/*/controllers/feature-name/`
  - `app/modules/*/controllers/mappers/request/feature-name/`
  - `app/modules/*/controllers/mappers/response/feature-name/`
  - `app/modules/*/actions/commands/feature-name/`
  - `app/modules/*/actions/queries/feature-name/`
  - `app/modules/*/domain/feature-name/`
  - `app/modules/*/infra/adapters/feature-name/`
  - `app/modules/*/public_contracts/feature-name/`
  - `app/modules/*/tests/backend/unit/feature-name/`
  - `app/composition/module-name/feature-name/` when composition is module-specific

- [ ] Use one module-owned canonical feature name in every applicable layer.
- [ ] Do not create empty feature directories.
- [ ] Do not move a file solely because its filename contains `task`.
- [ ] Keep `actions/commands/internal` and `actions/queries/internal` semantics explicit if internal files are nested below the feature folder.

### Task 1.2: Move controller and request mapper files

**Files to classify before moving:**
- `app/modules/*/controllers/**`
- `app/modules/*/controllers/mappers/**`

- [ ] Run `gitnexus query "selected capability controller request mapper"` and inspect the returned paths.
- [ ] For each symbol being edited rather than moved, run `gitnexus impact <symbol>` before changing it.
- [ ] Move only files confirmed by the inventory; use `git mv` or an equivalent recoverable rename operation.
- [ ] Update all imports and route/controller references to the new paths.
- [ ] Keep controller method bodies and mapper behavior byte-for-byte equivalent where practical.
- [ ] Search for stale imports using `rg "controllers/(create_task_controller|edit_task_controller)|mappers/request/task_request_mapper" app start tests`.
- [ ] Run the focused mapper and controller tests.

### Task 1.3: Move action command, DTO, and capability-only ports

**Files to classify before moving:**
- `app/modules/*/actions/commands/**`
- `app/modules/*/actions/queries/**`
- `app/modules/*/actions/dtos/**`
- `app/modules/*/actions/ports/**`

- [ ] Run `gitnexus context` for the selected entry-point symbol and inspect every relevant consumer before moving the symbol.
- [ ] Run impact analysis for the selected entry-point symbol and any edited factory symbol.
- [ ] Keep command-only internals under the command subtree; do not flatten them into a generic feature helper folder.
- [ ] Separate capability-only DTOs and ports from shared DTOs/ports; leave shared files at their current location.
- [ ] Update composition imports and test imports without changing constructor signatures.
- [ ] Run command, pipeline, DTO, and factory tests for the selected capability.

### Task 1.4: Move domain, infrastructure, contract, and test files

**Files to classify before moving:**
- `app/modules/*/domain/**`
- `app/modules/*/infra/**`
- `app/modules/*/public_contracts/**`
- `app/modules/*/tests/backend/**`

- [ ] Run impact analysis before editing any symbol body; a pure move does not justify unrelated refactoring.
- [ ] Move domain files only when their rules are owned by the selected capability rather than shared module invariants.
- [ ] Move infrastructure files without changing adapter interfaces, database queries, or transaction behavior.
- [ ] Move tests after source paths are stable and preserve their test type directory.
- [ ] Update test imports and any documentation/source inventory references.
- [ ] Run focused unit, integration, and contract tests for the selected capability.

### Task 1.5: Move capability composition wiring

**Files to classify before moving:**
- `app/composition/**` files consumed by the selected pilot capability.

- [ ] Inspect each composition file's consumers; classify it as capability-only, module-shared, or cross-module.
- [ ] Move capability-only wiring to the module-qualified composition feature folder.
- [ ] Keep cross-feature factories at `app/composition/` or under a broader module composition folder.
- [ ] Do not move a shared adapter into a feature folder merely because the pilot capability uses it.
- [ ] Run application factory and pilot capability integration tests.
- [ ] Verify dependency direction remains unchanged.

## Phase 2: Verification and guardrails

### Task 2.1: Verify the pilot's path and behavior surface

**Files:**
- Modify: `docs/12-evidence/layer-feature-folder-inventory-2026-08-09.md`
- Inspect: all files changed by Phase 1

- [ ] Run `rg --files app/modules app/composition | sort` and verify the new paths are coherent for the selected module.
- [ ] Search for the pilot feature name and old paths across the module, composition, tests, and docs.
- [ ] Confirm no old-path duplicate file remains.
- [ ] Run focused pilot-capability tests, module typecheck, and the existing architecture checks.
- [ ] Run `git diff --stat` and `git diff --name-status` to ensure the batch is relocation/import-focused.
- [ ] Run `gitnexus detect-changes` and record whether affected symbols/flows match the pilot.
- [ ] Update the evidence inventory with results and any taxonomy changes.

### Task 2.2: Add a ratcheting taxonomy check only after pilot acceptance

**Files:**
- Create: `scripts/check_layer_feature_folder_taxonomy.mjs`
- Modify: `package.json`
- Test: `scripts/tests/check_layer_feature_folder_taxonomy.spec.ts` if the repository's script-test pattern supports it

- [ ] Check only enforceable rules: kebab-case feature folders, no empty feature folders, and no known duplicate feature aliases.
- [ ] Start in report-only mode for existing debt.
- [ ] Add a reviewed baseline for existing root-level files; do not fail the entire repository on unclassified legacy files.
- [ ] Add a package script with a stable name such as `check:arch:backend:feature-folders`.
- [ ] Make new or modified files fail when they violate an accepted taxonomy rule.
- [ ] Run the checker against the pilot and record its output.

## Phase 3: Incremental expansion across all modules

### Task 3.1: Migrate the next capability in the pilot module

Choose exactly one capability from the selected pilot module after the first pilot review.

- [ ] Create a capability-specific inventory before moving files.
- [ ] Reuse the same layer-first path convention.
- [ ] Keep the batch limited to one capability and its imports/tests/composition wiring.
- [ ] Run symbol impact analysis before any body edit.
- [ ] Run focused tests and `gitnexus detect-changes` before commit.

### Task 3.2: Create a module taxonomy matrix

**Files:**
- Modify: `docs/12-evidence/layer-feature-folder-inventory-2026-08-09.md`
- Inspect: `app/modules/*`, `app/composition/*`

- [ ] Add one row for every module under `app/modules`.
- [ ] Record each module's existing layers and candidate capabilities based on current files and execution flows.
- [ ] Mark platform/shared modules separately from business modules.
- [ ] Mark candidate composition owners for cross-module capabilities.
- [ ] Leave uncertain assignments explicitly unclassified until module-level review.
- [ ] Do not require a feature folder in layers where the module has no files for that capability.

### Task 3.3: Expand to other modules only by touched feature

- [ ] Apply the taxonomy to each module when one of its features is being actively changed or an explicit migration batch is approved.
- [ ] Use each module's business vocabulary; do not force Task names or another module's feature names onto other bounded contexts.
- [ ] Keep shared composition providers and cross-module adapters at their broadest accurate owner.
- [ ] Record each accepted feature name in the architecture contract or evidence inventory.

## Verification checklist before declaring the migration batch complete

- [ ] Design spec and architecture contract agree on `layer -> feature -> files` for every module.
- [ ] No top-level `features/` rewrite was introduced.
- [ ] No runtime logic, public contract, route, database, or dependency direction changed.
- [ ] Focused tests and typecheck pass, or any pre-existing failure is recorded with evidence.
- [ ] No stale imports or duplicate old-path files remain.
- [ ] GitNexus impact was run for every edited symbol.
- [ ] `gitnexus detect-changes` was run before commit.
- [ ] Existing unrelated dirty-worktree changes were preserved.

## Commit sequence

Use small, reviewable commits:

```text
docs: define layer-feature folder taxonomy
docs: inventory module feature folder migration
refactor(module): group capability files by layer feature
chore(arch): add feature folder taxonomy check
```

Do not commit unrelated pre-existing changes with these commits.
