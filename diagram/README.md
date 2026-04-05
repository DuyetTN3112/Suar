## Diagram Conventions

This repository keeps diagrams in Mermaid-compatible `.mmd` files.

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
