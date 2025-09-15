# user_activity Backend Module

## Runtime Storage

User activity runtime ghi/đọc từ PostgreSQL table `user_activity_events`. Module không tải MongoDB provider, không import `mongoose`, không dùng repository MongoDB.

Runtime files:

- [postgres_user_activity_log_repository.ts](/home/tranngocduyet/Projects/Suar/app/modules/user_activity/infra/repositories/postgres_user_activity_log_repository.ts)
- [user_activity_repository_provider.ts](/home/tranngocduyet/Projects/Suar/app/modules/user_activity/infra/repositories/user_activity_repository_provider.ts)

Supported operations:

- append activity event
- paginate by `user_id`
- optional filter by `action_type`

## Boundaries

User activity records operational events only. Business decisions stay in application services.
