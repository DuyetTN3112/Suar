# Projects Module Boundary

This module owns project orchestration: project lifecycle, project membership, and project query workflows.

## Public API

Other modules may import project commands and queries when they need project behavior instead of reaching into project repositories.

### Commands

- `commands/add_project_member_command.ts`
- `commands/create_project_command.ts`
- `commands/delete_project_command.ts`
- `commands/remove_project_member_command.ts`
- `commands/transfer_project_ownership_command.ts`
- `commands/update_project_command.ts`

### Queries

- `queries/get_project_detail_query.ts`
- `queries/get_project_members_query.ts`
- `queries/get_projects_list_query.ts`

### DTO Contracts

- `dtos/request/**`
- `dtos/response/project_response_dtos.ts`

DTO imports should stay attached to public project command/query contracts.

## Internal

Do not import these from outside `app/actions/projects/**`:

- `mapper/**`
- implementation-only helper types inside command/query files

## Boundary Rules

- Project commands/queries are the public project application API.
- Other modules should not import project infra repositories directly to reproduce project application behavior.
- Cross-module permission checks should go through the permission service or a public module API.
