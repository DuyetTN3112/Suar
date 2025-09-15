# audit Backend Module

## Runtime Storage

Audit runtime ghi/đọc từ PostgreSQL. Module không tải MongoDB provider, không import `mongoose`, không dùng repository MongoDB.

Storage tables:

- `audit_events`
- `error_events`

Runtime files:

- [postgres_audit_log_repository.ts](/home/tranngocduyet/Projects/Suar/app/modules/audit/infra/repositories/postgres_audit_log_repository.ts)
- [audit_repository_provider.ts](/home/tranngocduyet/Projects/Suar/app/modules/audit/infra/repositories/audit_repository_provider.ts)
- [audit_log_read_repository.ts](/home/tranngocduyet/Projects/Suar/app/modules/audit/infra/repositories/read/audit_log_read_repository.ts)
- [audit_log.ts](/home/tranngocduyet/Projects/Suar/app/modules/audit/infra/models/audit_log.ts)

## Compatibility

`infra/models/audit_log.ts` is a PostgreSQL-backed compatibility wrapper for legacy static calls such as `AuditLog.create()` and `AuditLog.query().where(...)`. It does not use MongoDB.

## Boundaries

Authorization role logic stays in authorization module. Audit module only records events and exposes read/write APIs.
