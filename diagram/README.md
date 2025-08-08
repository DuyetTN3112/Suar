## Diagram Conventions

This repository keeps diagrams in Mermaid-compatible `.mmd` files.

### Current Backend Context

- High-level architecture diagrams were refreshed on `2026-05-12`.
- `app/actions/shared` and `app/services` are drained legacy boundaries; neither has active TypeScript files in the current backend layout.
- Cross-module backend access should be shown through `app/actions/*/public_api.ts`.
- Realtime diagrams should keep Transmit/WebSocket/SSE marked inactive while transport remains `null`.
- Do not show the physical `app/modules/*` move as completed; that step is still future work.

### ERD Policy

- ERD files in this repo document tables and columns first.
- Do not draw relationship edges by default.
- Do not mark columns as `FK` unless the physical database constraint is part of the point of that file.
- If a cross-table reference exists only by app convention or runtime enforcement, keep it as a plain column plus an optional note.

### Use Case Diagrams

- Mermaid does not support native UML use case notation.
- Use case files in `diagram/Usecase/` therefore use a Mermaid `flowchart` approximation.
- The approximation keeps the important UML semantics:
  - actor
  - system boundary
  - association
  - include / extend
  - actor generalization

### Scope Rules

- Overview diagrams:
  - show `3-5` capability groups
  - avoid routes, repositories, SQL, validators
- Detail diagrams:
  - show exactly `1` flow or `1` concern
  - split to a new file instead of adding another major branch

### By Diagram Type

- Use Case:
  - actors and user goals only
  - no DB schema, no controller chain
- Class:
  - keep one abstraction level per file
  - domain classes, ORM classes, and DTO/mapping classes should be separated unless the file is specifically about mapping
- Sequence:
  - one interaction scenario per file
  - alternate branches are acceptable, but unrelated scenarios must move to another file
- State:
  - states, transitions, events, guards
  - side effects should stay short and secondary
- DFD:
  - external entity, process, data store, data flow
  - do not mix in controller or repository internals
- ERD:
  - prefer one domain slice per file
  - document actual stored columns, not inferred relations
  - split a file when it starts mixing current runtime tables with legacy/supporting tables

### Naming

- Overview files keep the original index number.
- Detail files append a suffix such as `a`, `b`, `c`.
- File names should answer: "this file explains which exact concern?"

### Recommended Reading Order

- Architecture first:
  - `Architecture/arch_01_system.mmd`
  - `Architecture/arch_02_layer.mmd`
  - `Architecture/arch_02a_request_flow.mmd`
  - `Architecture/arch_02b_runtime_support.mmd`
- Package then implementation slices:
  - `Package/pkg_01_overview.mmd`
  - `Package/pkg_02_application_layer.mmd`
  - `Package/pkg_02a_application_task_project.mmd`
  - `Package/pkg_02b_application_org_admin.mmd`
  - `Package/pkg_02c_application_review_user.mmd`
  - `Package/pkg_02d_application_platform_support.mmd`
  - `Package/pkg_03_business_rules.mmd`
  - `Package/pkg_04_domain_infra.mmd`
  - `Package/pkg_05_crosscutting.mmd`
- Action groups by index:
  - `Action/act_01_task_management_overview.mmd`
  - `Action/act_02_marketplace_overview.mmd`
  - `Action/act_03_review_overview.mmd`
  - `Action/act_04_communication_overview.mmd`
  - `Action/act_05_org_management.mmd`
  - `Action/act_06_user_lifecycle_overview.mmd`
  - `Action/act_07_profile_skills_overview.mmd`
  - `Action/act_08_platform_support_overview.mmd`
- Sequence groups by index:
  - `Sequence/seq_02_task_crud.mmd`
  - `Sequence/seq_03_marketplace_apply.mmd`
  - `Sequence/seq_04_review.mmd`
  - `Sequence/seq_05_org_membership_overview.mmd`
  - `Sequence/seq_08_project_management.mmd`
  - `Sequence/seq_09_skill_profile.mmd`
  - `Sequence/seq_11_platform_support_overview.mmd`
- Data and state layers:
  - `DFD/dfd_01_main.mmd` -> `DFD/dfd_02..dfd_06*`
  - `ERD/erd_01..erd_04*`
  - `State/state_01..state_11*`
