# Source Code Guideline, Environment Information

## Source Code Guideline

### Repository Shape

- Backend dùng `app/modules/*`
- Frontend dùng `inertia/*`
- Route registration trong `start/routes*`
- Config trong `config/*`
- Generated DB schema trong `database/schema.ts`
- Tests tách theo loại trong `tests/*`

Ngoài ra repository còn có:

- `docs/11-diagrams/*` cho tài liệu sơ đồ Mermaid
- `docs/*` cho tài liệu narrative chính bằng tiếng Việt
- `.gitnexus/*` cho chỉ mục điều hướng mã nguồn
- `database/schema.ts` và `database/migrations/*` cho evidence schema công khai trong repo

### Architectural Guideline From Repository

- Cross-module backend access đi qua `app/modules/*/actions/public_api.ts`
- cấu trúc hiện tại không có top-level `app/actions/shared` hay `app/services`
- Bootstrap layer và `Monolith*` adapters dùng để nối module

Nguồn: rà trực tiếp `app/`, `app/modules/tasks/bootstrap/task_action_factory.ts`, `app/modules/projects/bootstrap/project_public_api_factory.ts`, `docs/03-architecture/architecture-overview.md`

### Module structure guideline visible in repository

Filesystem hiện tại cho thấy module backend có thể chứa:

- `actions/`
- `bootstrap/`
- `application/`
- `domain/`
- `infra/`
- `controllers/`
- `events/`
- `listeners/`
- `public_contracts/`
- `validators/`

Điều này phù hợp với modular monolith style mà `docs/03-architecture/architecture-overview.md` đã ghi nhận.

### Documentation Guideline For Diagrams

- mỗi file là một sơ đồ
- overview không nhồi route/repository/SQL
- detail diagram chỉ chứa một flow hoặc một concern
- ERD ưu tiên table/column first

Nguồn: `docs/11-diagrams/Architecture/arch_01_system.mmd`, `docs/11-diagrams/Package/pkg_01_overview.mmd`, `docs/11-diagrams/Action/act_02_marketplace_overview.mmd`, `docs/11-diagrams/ERD/logical_erd_01_user_auth_skills.mmd`

### Quality Gates Present

- `lint`
- `typecheck`
- `build`
- unit/integration/contract/e2e/ui tests
- architecture boundary test

Nguồn: `package.json`, `app/modules/http/tests/backend/architecture/boundary_guards.spec.ts`

### Runtime SQL guideline signals

Schema/migration evidence trong repo cho thấy logic hệ thống không chỉ tồn tại ở TypeScript mà còn tồn tại ở:

- SQL functions cho permission
- enum types
- indexes tối ưu cho audit/error/notification/task flows

Khi thay đổi business rule liên quan quyền hoặc lookup pattern, cần đối chiếu cả application layer và schema/migration evidence công khai trong repo.

## Environment Information

### Runtime Configuration Groups

Public docs không liệt kê tên biến môi trường hoặc credential cụ thể.

Theo `start/env.ts`, runtime config được chia theo nhóm:

- app identity and URL
- session
- PostgreSQL
- Redis
- mail
- OAuth providers
- lock store
- health-check credential
- optional persistence store selectors

Nhiều config được validate ở startup. Điều này có nghĩa environment information trong Suar không chỉ là checklist vận hành, mà là schema runtime bắt buộc/optional đã được mã hóa.

### Runtime Defaults And Notes

- Session store fallback: Redis
- Redis logical DB split:
  - `main` DB 0
  - `cache` DB 1
- Logger:
  - pretty target ngoài production
  - file target trong production

Nguồn: `config/session.ts`, `config/redis.ts`, `config/logger.ts`

### Runtime Transports

- Realtime transmit transport hiện `null`

Nguồn: `config/transmit.ts`

### Runtime store layout

- PostgreSQL connection name: `pg`
- PostgreSQL search path: `public`, `suar`
- PostgreSQL pool: min `2`, max `20`
- Redis `main`: DB `0`, prefix `suar:`
- Redis `cache`: DB `1`, prefix `suar:cache:`
- Session driver fallback: `redis`

Nguồn: `config/database.ts`, `config/redis.ts`, `config/session.ts`

## Khi Nào Dừng Ở File Này

Dừng ở file này khi bạn đã biết:

1. cấu trúc source code và module shape đang được tổ chức ra sao
2. guideline kiến trúc hoặc environment concern của mình nằm ở đâu
3. lúc nào cần quay lại architecture overview, data docs, hay operations docs để lấy thêm context
