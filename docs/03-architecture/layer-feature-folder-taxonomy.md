# Layer-Feature Folder Taxonomy Contract

| Field | Value |
|---|---|
| Status | Normative target |
| Scope | Backend modules under `app/modules/*` and dependency wiring under `app/composition/*` |
| Architecture style | Existing layer-first modular monolith with feature grouping inside layers |
| Canonical shape | `layer -> feature -> files` |
| Owner | Engineering |
| Related contract | [Suar Module And Layer Architecture Contract](./suar-module-layer-contract.md) |
| Evidence | [Layer-feature inventory](../12-evidence/layer-feature-folder-inventory-2026-08-09.md) |

## 1. Decision

Suar keeps its technical layers and groups files by business capability inside each layer. This is
an incremental discoverability improvement, not a feature-first architecture rewrite.

```text
app/modules/tasks/controllers/task-authoring/
app/modules/tasks/actions/commands/task-authoring/
app/modules/tasks/domain/task-authoring/
app/modules/tasks/infra/adapters/task-authoring/
app/modules/tasks/public_contracts/task-authoring/
app/modules/tasks/tests/backend/unit/task-authoring/
app/composition/tasks/task-authoring/
```

There is no top-level `features/` directory, and a feature folder is created only when it contains
files. A layer does not need an empty mirror of every feature.

## 2. Layer ownership

| Layer | Responsibility |
|---|---|
| `controllers` | HTTP/transport entry points and orchestration |
| `controllers/mappers` | Request and response conversion |
| `actions` | Commands, queries, DTOs, ports, and application orchestration |
| `domain` | Business rules, policies, invariants, and value behavior |
| `infra` | Persistence, adapters, models, repositories, and technology conversion |
| `public_contracts` | Stable module-facing contracts and schemas |
| `tests` | Tests grouped by test type and capability |
| `app/composition` | Dependency wiring and cross-module adapter composition |

The feature folder must not change a file's layer ownership or dependency direction.

## 3. Naming and ownership rules

- Feature directory names are lowercase kebab-case and use the module's business vocabulary.
- The same capability uses the same feature name across layers, such as `task-authoring`,
  `publication`, `observation`, or `profile-skills`.
- A feature is assigned from execution-flow and ownership evidence, not filename similarity alone.
- Shared files remain at the broadest accurate owner; they are not forced into an arbitrary feature.
- Internal command/query collaborators remain under their command/query feature subtree.
- Capability-only composition wiring may move under a module-qualified composition feature folder;
  cross-feature factories and shared adapters remain broader.
- Moving a file must not rename symbols, alter runtime behavior, change routes, change contracts, or
  change database behavior.

## 4. Examples outside Tasks

```text
app/modules/reviews/controllers/observation/
app/modules/reviews/actions/commands/observation/
app/modules/reviews/domain/observation/
app/modules/reviews/infra/repositories/observation/

app/modules/accomplishments/controllers/publication/
app/modules/accomplishments/actions/commands/publication/
app/modules/accomplishments/domain/publication/
app/modules/accomplishments/infra/adapters/publication/

app/modules/users/controllers/profile-skills/
app/modules/users/actions/queries/profile-skills/
app/modules/users/infra/repositories/profile-skills/
app/composition/users/profile-skills/
```

These examples do not require every layer to contain every feature. They show how the business name
remains searchable while the technical layer remains visible.

## 5. Migration and verification

Migration is incremental and should follow a coherent capability or an actively changed flow:

1. inventory the flow and identify shared files;
2. run GitNexus query/context/impact for the affected symbols;
3. move files and update imports without behavior changes;
4. run focused tests, typecheck, architecture checks, and stale-path searches;
5. run `gitnexus detect-changes` and record the evidence in the inventory.

The initial guard is `pnpm run check:arch:backend:feature-folders`. It ratchets naming and feature
directory conventions while legacy root-level files are classified incrementally.
