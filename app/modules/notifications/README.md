# notifications Backend Module

## Runtime Storage

Notifications runtime ghi/đọc từ PostgreSQL table `notifications`. Module không tải MongoDB provider, không import `mongoose`, không dùng repository MongoDB.

Runtime files:

- [postgres_notification_repository.ts](/home/tranngocduyet/Projects/Suar/app/modules/notifications/infra/repositories/postgres_notification_repository.ts)
- [notification_repository_provider.ts](/home/tranngocduyet/Projects/Suar/app/modules/notifications/infra/repositories/notification_repository_provider.ts)

Application behavior:

- create notification
- list by user
- unread count
- mark one/all as read
- delete one/all read

Persistence notes:

- IDs are PostgreSQL UUIDs.
- Reads sort by `created_at desc`.
- Ownership checks run in application/repository query logic.

## Boundaries

Notification module stores delivery events and read state. Authorization decisions stay outside this module.
