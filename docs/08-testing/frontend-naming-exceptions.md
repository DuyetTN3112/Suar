# Frontend Naming Exceptions

This file documents frontend names that are intentionally generic because the route, component, or app shell already supplies the missing context.

## Route Basenames

Allowed filenames:

- `index.svelte`
- `show.svelte`
- `create.svelte`
- `edit.svelte`

Reason: Inertia route pages use conventional basenames. The route directory provides the domain context.

Rules:

- Keep these names only for route pages.
- Component files must use searchable snake_case names, for example `organization_card.svelte`.

## Component And Page Props

Allowed local interfaces:

- `Props`
- `PageProps`

Reason: Svelte components commonly keep a local props interface inside the same file. The component path and prop destructuring provide context.

Rules:

- Keep `Props` and `PageProps` local to one component/page file.
- Exported domain interfaces must use domain-specific names.

## App-Shell Exports

Allowed repeated app-shell names:

- `FRONTEND_ROUTES`
- `useTranslation`
- `buildOffsetPagination`
- `FilterConfig`
- `FilterValue`

Reason: admin, organization, and user shells intentionally expose the same shell-level concepts with app-specific implementations.

Rules:

- Keep these names inside shared app-shell modules.
- Domain modules should prefer more specific names when the app shell does not provide enough context.

## Retired Dashboard Proxy

`inertia/apps/user/modules/index/index.svelte` had no route or render usage outside its own dashboard import, so it was removed. User dashboard traffic should target the dashboard module directly.

## Explicit Non-Exceptions

These exported domain types remain banned:

- `User`
- `Task`

Reason: their shapes differ across projects, tasks, settings, and users modules. Use names such as `ProjectUserSummary`, `ProjectTaskSummary`, `TaskDetail`, `SettingsUser`, and `UserDirectoryRecord`.
