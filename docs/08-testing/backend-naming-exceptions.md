# Backend Naming Exceptions

This file documents backend names that may look generic in isolation, but are intentional when scoped by module path, route layer, or framework convention.

## Module-Local Architecture Primitives

Allowed names:

- `BaseCommand`
- `BaseQuery`
- `Command`
- `Query`
- `Result`

Reason: these names are architecture primitives repeated inside bounded contexts. The surrounding module path owns the business meaning, while the suffix communicates command/query/result role.

Rules:

- Keep these names module-local.
- Do not export a new cross-module primitive with one of these names unless it lives in an explicit public contract.
- Prefer specific names for business behavior, for example `ReplaceTaskWorkflowTransitionsCommand`.

## Versioned Wrapper Controllers

Allowed names:

- `CreateTaskStatusController`
- `ShowSettingsController`
- `ReplaceTaskWorkflowTransitionsV1Controller`

Reason: route namespace and folder path provide version or current-surface context. These wrappers may intentionally share domain action names across current and v1 surfaces when behavior remains aligned.

Rules:

- If v1 behavior diverges materially from the current controller, add a version suffix or behavior-specific name.
- If a stack trace becomes ambiguous, prefer a suffixed class name such as `ReplaceTaskWorkflowTransitionsV1Controller`.

## Framework-Mandated Filenames

Allowed names:

- `index.ts`
- `routes.ts`
- `middleware.ts`
- `handler.ts`

Reason: AdonisJS, route manifests, and framework loaders sometimes require conventional filenames. These files are allowed when their directory path names the domain.

Rules:

- Do not use `shared.ts` for production helpers unless a guard allowlist entry and this document both explain the exception.
- Prefer intent-named helper files such as `project_request_parsers.ts`, `task_read_query_helpers.ts`, and `model_response_serialization.ts`.

## Module-Local Request Parsers And Query Builders

Allowed local helper names:

- `toOptionalString`
- `toPositiveNumber`
- `baseQuery`

Reason: these names still exist in isolated request mapper or repository files where the file path and local-only scope provide enough context. Shared production helpers should use intent-bearing names.

Rules:

- Exported parser helpers must name the input domain, for example `parseOptionalRequestString`.
- Exported repository helpers must name the read model intent, for example `makeTaskReadQuery`.
- Local `baseQuery` is acceptable only when it is private to one repository/query module.

## Explicit Non-Exceptions

These names must not be allowlisted:

- `CreateProjectSprintCommand`
- `UpdateProjectSprintCommand`
- `ListProjectSprintsQuery`
- `GetProjectSprintQuery`
- `CreateProjectSprintController`
- `UpdateProjectSprintController`

Reason: sprint CRUD business symbols have one canonical owner in `app/modules/sprints`. Duplicate exports in `app/modules/reviews` are misleading and guarded.
