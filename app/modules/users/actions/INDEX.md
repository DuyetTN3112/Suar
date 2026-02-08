# Users Module Boundary

This module owns user orchestration: user administration, user profile data, skills, profile snapshots, and user analytics commands.

## Public API

Other modules may import user commands and queries when they need user behavior instead of reaching into user repositories.

### Commands

- `commands/add_user_skill_command.ts`
- `commands/approve_user_command.ts`
- `commands/build_user_work_history_command.ts`
- `commands/change_user_role_command.ts`
- `commands/deactivate_user_command.ts`
- `commands/publish_user_profile_snapshot_command.ts`
- `commands/refresh_user_profile_aggregates_command.ts`
- `commands/register_user_command.ts`
- `commands/remove_user_skill_command.ts`
- `commands/rotate_profile_snapshot_share_link_command.ts`
- `commands/update_profile_snapshot_access_command.ts`
- `commands/update_user_details_command.ts`
- `commands/update_user_profile_command.ts`
- `commands/update_user_skill_command.ts`
- `commands/upsert_user_domain_expertise_command.ts`
- `commands/upsert_user_performance_stats_command.ts`
- `delete_user.ts`

### Queries

- `get_user_metadata.ts`
- `queries/check_super_admin_permission_query.ts`
- `queries/get_current_profile_snapshot_query.ts`
- `queries/get_featured_reviews_query.ts`
- `queries/get_pending_approval_users_query.ts`
- `queries/get_profile_edit_page_query.ts`
- `queries/get_profile_show_page_query.ts`
- `queries/get_profile_snapshot_history_query.ts`
- `queries/get_profile_view_page_query.ts`
- `queries/get_public_profile_snapshot_query.ts`
- `queries/get_spider_chart_data_query.ts`
- `queries/get_user_delivery_metrics_query.ts`
- `queries/get_user_detail_query.ts`
- `queries/get_user_profile_query.ts`
- `queries/get_user_skills_query.ts`
- `queries/get_users_list_query.ts`

### DTO Contracts

- `dtos/request/**`
- `dtos/response/user_response_dtos.ts`

DTO imports should stay attached to public user command/query contracts.

## Internal

Do not import these from outside `app/actions/users/**`:

- `mapper/**`
- `support/**`
- `utils/**`

## Boundary Rules

- User commands/queries are the public user application API.
- Other modules should not import user infra repositories directly to reproduce user application behavior.
- Shared user-derived permission data should come from the permission service or a public user query.
