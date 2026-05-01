# Suar Layer-Feature Folder Taxonomy Design

| Field | Value |
|---|---|
| Status | Proposed |
| Date | 2026-08-09 |
| Scope | Backend module layers under `app/modules/*` and composition under `app/composition` |
| Architecture style | Existing layer-first modular monolith with feature grouping inside each layer |
| Owners | Engineering, module owners |
| Related architecture | `docs/03-architecture/suar-module-layer-contract.md` |
| Related evidence | Repository module and Composition inventories reviewed 2026-08-09 |

## 1. Decision summary

Suar will preserve its existing architectural layers across every bounded module and add
feature-oriented subdirectories inside those layers.

The canonical shape is:

```text
layer -> feature/flow -> files
```

It is explicitly not:

```text
feature -> layer -> files
```

Examples of preserved layer boundaries are:

```text
app/modules/tasks/controllers/task-authoring/
app/modules/tasks/actions/commands/task-authoring/
app/modules/tasks/domain/task-authoring/
app/modules/tasks/infra/adapters/task-authoring/
app/modules/tasks/public_contracts/task-authoring/
app/composition/task-authoring/
```

The change is a discoverability and locality improvement. It does not introduce a new runtime
layer, change dependency direction, rename business symbols, merge modules, or require a one-shot
repository-wide relocation.

## 2. Problem statement

The current structure correctly communicates technical ownership, but many folders are flat. A
single business flow such as Task creation is distributed across controllers, request mappers,
commands, internal command collaborators, DTOs, domain rules, infrastructure adapters, composition
factories, and tests. A developer can find the files by reading names, but must search across many
large directories before understanding the flow.

The current Tasks module is a visible example of a repository-wide problem:

- `controllers/` contains authoring, status, listing, assignment, submission, comment, attachment,
  audit, and workflow endpoints together;
- `controllers/mappers/request/` contains unrelated request families in one directory;
- `actions/commands/`, `actions/queries/`, `domain/`, and `infra/` have the same flat-directory
  pressure;
- `app/composition/` contains module adapters and factory/wiring files for many capabilities in a
  single namespace.

The same discovery problem applies to every module under `app/modules`, including platform modules
such as `errors`, `http`, `events`, and `pagination`; identity/access modules such as `auth`,
`authorization`, and `users`; workspace modules such as `organizations`, `projects`, `sprints`, and
`tasks`; work/review modules such as `reviews` and `accomplishments`; discovery/catalog modules such
as `search`, `skills`, `taxonomy`, `filtering`, and `marketplace`; and operational modules such as
`admin`, `notifications`, `observability`, `cache`, `contracts`, `logger`, and `testing`.

The module list is an inventory boundary, not a prescribed feature taxonomy. Each module defines its
own capability names from its business vocabulary.

The intended improvement is to make the same business vocabulary visible inside every existing
layer, so a developer can search for one feature name instead of scanning an entire technical
directory.

## 3. Goals

- Preserve the existing layer-first architecture and dependency rules.
- Add stable feature/flow grouping inside `controllers`, `actions`, `domain`, `infra`,
  `public_contracts`, tests, and `app/composition` where useful.
- Make related files discoverable through a consistent feature vocabulary.
- Support incremental migration when a feature is already being changed.
- Keep valid runtime behavior, public contracts, symbol names, and module boundaries unchanged.
- Make new files follow the taxonomy without requiring every existing file to move immediately.
- Establish a repeatable review and verification process for future relocations.

## 4. Non-goals

- Rewriting the module architecture into feature-first vertical slices.
- Creating a top-level `features/` directory under every module.
- Moving all repository files in one release.
- Renaming classes, commands, queries, ports, adapters, or public contract types solely for folder
  placement.
- Creating generic `utils`, `services`, `helpers`, or `common` buckets to avoid making a feature
  decision.
- Changing import direction, runtime composition, route behavior, database schema, or API shape.
- Forcing every layer to contain every feature folder.
- Moving genuinely cross-feature primitives into an arbitrary feature folder.

## 5. Architectural model

### 5.1 Existing layers remain authoritative

Folder placement continues to express technical ownership:

| Layer | Responsibility |
|---|---|
| `controllers` | Transport entry points and HTTP orchestration |
| `controllers/mappers` | Transport request/response conversion |
| `actions` | Commands, queries, DTOs, ports, and application orchestration |
| `domain` | Business rules, policies, invariants, and domain value behavior |
| `infra` | Persistence, external adapters, models, and technology conversion |
| `public_contracts` | Stable module-facing contracts and schemas |
| `tests` | Tests grouped to mirror the capability and test type |
| `app/composition` | Dependency wiring and cross-module adapter composition |

The feature folder adds a second index inside the owner layer; it does not replace the owner layer.

### 5.2 Feature means business capability or coherent flow

A feature folder represents a capability that a developer can describe without naming a technical
layer. Good examples include:

```text
task-authoring
task-status
task-assignment
task-application
task-submission
task-comment
task-attachment
task-audit
task-search
```

The name must be stable, lowercase, kebab-case, and shared across layers. A feature may be narrower
when its flow is independently substantial, for example `task-authoring/create` or
`task-status/workflow`.

### 5.3 Feature names are a taxonomy, not a required mirror

The same feature name should be used wherever that feature has files, but a layer does not need to
contain an empty folder. For example, `task-authoring` may exist under controllers, actions, domain,
infra, composition, and tests, while it may not need a public contract folder if it uses an existing
module contract.

Do not create a second name for the same flow in another layer. For example, do not use
`task-creation` under controllers and `task-authoring` under actions unless they are intentionally
different capabilities.

## 6. Canonical examples

### 6.1 Task module (example only)

```text
app/modules/tasks/
  controllers/
    task-authoring/
      create_task_controller.ts
      edit_task_controller.ts
    task-status/
      create_task_status_controller.ts
      update_task_status_controller.ts
    task-submission/
      task_submission_controller.ts
      task_submission_evidence_controller.ts

  controllers/mappers/request/
    task-authoring/
      task_request_mapper.ts
      task_attachment_request_mapper.ts
    task-assignment/
      task_assignment_interaction_request_mapper.ts
    task-submission/
      task_submission_request_mapper.ts
      task_submission_evidence_request_mapper.ts

  actions/commands/
    task-authoring/
      create_task_command.ts
      internal/
        create_task_authoring_pipeline.ts
        create_task_preconditions.ts
        create_task_transaction.ts
    task-status/
      create_task_status_command.ts
      update_task_status_command.ts

  actions/queries/
    task-authoring/
      get_task_create_page_query.ts
      get_task_edit_page_query.ts
    task-listing/
      get_tasks_list_query.ts
      get_tasks_grouped_query.ts

  domain/
    task-authoring/
      task_authoring_idempotency.ts
    task-assignment/
      task_assignment_snapshot_rules.ts
    task-status/
      task_state_machine.ts

  infra/
    adapters/
      task-authoring/
      task-search/
    repositories/
      task-authoring/
      task-status/

  public_contracts/
    task-authoring/
    task-status/
```

The exact feature assignment must be confirmed from ownership and execution flow before a file is
moved. A name containing `task` is not by itself enough evidence. This tree demonstrates the
convention; it does not make `tasks` the only migration target.

### 6.2 Other module examples

The same convention applies without forcing Task vocabulary onto other bounded contexts:

```text
app/modules/reviews/controllers/review-session/
app/modules/reviews/actions/commands/review-session/
app/modules/reviews/domain/review-session/
app/modules/reviews/infra/repositories/review-session/

app/modules/accomplishments/controllers/publication/
app/modules/accomplishments/actions/commands/publication/
app/modules/accomplishments/domain/publication/
app/modules/accomplishments/infra/adapters/publication/

app/modules/organizations/controllers/member-management/
app/modules/organizations/actions/queries/member-directory/
app/modules/organizations/domain/member-management/
app/modules/organizations/infra/repositories/member-management/

app/modules/search/actions/queries/discovery/
app/modules/search/infra/adapters/indexing/
app/modules/search/public_contracts/discovery/
```

These names are illustrative candidates only. Before migration, each module owner must establish
the module's own feature vocabulary and identify shared files.

### 6.3 Composition

`app/composition` is included in the taxonomy, but its folders describe the capability being wired,
not a new application layer:

```text
app/composition/
  task-authoring/
    task_action_factory.ts
    task_application_factories.ts
    task_external_dependencies_composition.ts
  task-status/
    tasks_organization_task_status_creator_adapter.ts
  task-search/
    search_tasks_candidate_adapter.ts
  shared/
    cache_store_provider.ts
    audit_log_writer_provider.ts
```

Composition files that wire several capabilities may remain at the existing composition root or
move to a broader module-level folder such as `tasks/`. They must not be forced into a feature merely
because one of their dependencies belongs to that feature.

## 7. Placement rules

1. Preserve the current layer path and add feature grouping below it.
2. Use one canonical feature name across all layers.
3. Create a feature folder when at least two files in that layer belong to the same coherent flow,
   or when a single file is a clear entry point for a planned feature slice.
4. Leave isolated files at the layer root until a real grouping exists.
5. Keep cross-feature primitives at the narrowest existing shared owner; do not hide them in a
   feature folder.
6. Keep `actions/commands/internal` and `actions/queries/internal` semantics intact. If an internal
   collaborator is grouped, the resulting path must still communicate whether it is command-only or
   query-only.
7. Keep tests grouped by test type (`unit`, `integration`, `contract`) before the feature name:

   ```text
   app/modules/tasks/tests/backend/unit/task-authoring/
   app/modules/tasks/tests/backend/integration/task-authoring/
   app/modules/tasks/tests/backend/contract/task-authoring/
   ```

8. Keep composition wiring technology-neutral at its boundary; folder movement must not pull
   infrastructure implementations into module code.
9. New files follow the taxonomy immediately. Existing files migrate opportunistically when touched
   or in an explicitly scoped batch.
10. Every relocation must update imports, path aliases, test references, documentation references,
    and any architecture inventory that names the old path.

## 8. Migration strategy

Migration is incremental and risk-controlled:

1. Establish the feature vocabulary for one bounded area.
2. Inventory files and execution flows before moving them.
3. Move one coherent feature slice within existing layers.
4. Update imports and path references without changing symbols or logic.
5. Run focused tests, TypeScript checks, and architecture checks.
6. Review the diff for accidental cross-layer or unrelated movement.
7. Add a guard or convention check only after the taxonomy has proven stable.

Any module with an active, well-understood flow may be the first pilot. Task authoring is one useful
example because its files are identifiable across controllers, request mapping, actions, domain,
infra, composition, and tests. The pilot choice must not narrow the target architecture to Tasks,
and a Task pilot must not move unrelated Task status, application, submission, or search files merely
to make the tree look uniform.

## 9. Verification and safety

Every migration batch must verify:

- no runtime logic diff beyond import path changes;
- no changed route or public contract behavior;
- no dependency direction violation;
- no stale imports or duplicate files at old and new paths;
- focused tests for the moved feature pass;
- module typecheck/build passes;
- `gitnexus detect-changes` reports only the intended files and symbols before commit.

Before editing any function, class, or method during migration, run `gitnexus impact <symbol>` and
review the blast radius. Pure file moves that do not edit symbol bodies still require import and test
verification, but do not require symbol-level edits.

## 10. Open decisions for implementation

- Whether feature folders use only broad capability names or allow a second flow level such as
  `task-authoring/create`.
- Whether tests mirror the feature folder in the first pilot or remain flat until test relocation is
  separately proven.
- Whether `app/composition` uses module prefixes such as `tasks/task-authoring` for capabilities
  shared by multiple modules.

The implementation plan uses broad capability names, permits a second level only when a folder would
otherwise remain too large, and keeps composition names module-qualified when a capability is shared.
