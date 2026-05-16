# Source Code Guideline, Environment Information

## Source Code Guideline

### Repository Shape

- Backend dùng `app/modules/*`
- Hạ tầng công nghệ dùng chung toàn ứng dụng dùng `app/infra/*`
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

- Mỗi HTTP/event/CLI business intent đi vào đúng một Command, Query hoặc explicit inbound
  capability. Controller/listener không ghép workflow từ service và outbound port.
- Command/Query là application orchestration owner; domain giữ business rule; adapter giữ I/O;
  composition chỉ dựng object graph.
- Module consumer sở hữu port cho hành vi hoặc projection mà nó cần.
- Module provider chỉ xuất stable fact, event, DTO, constant hoặc capability đã được chủ ý hỗ
  trợ qua `public_contracts/*`.
- `public_contracts/*` không phải barrel để re-export `actions`, `infra`, `services` hoặc ORM.
- Không tạo folder `services` hoặc một generic collaborator folder thay thế. Collaborator thật sự
  dùng chung giữa Command và Query là file có tên/vai trò chính xác đặt thẳng tại `actions/`;
  sub-operation chỉ phục vụ command/query đặt ở `actions/commands/internal` hoặc
  `actions/queries/internal`; các collaborator này không sở hữu complete intent, không execute
  Command/Query và không được inject vào controller.
- `support`, `utils`, `builders`, `serializers` không phải layer. Ưu tiên role chính xác:
  request/response mapper, validator, domain policy, Command/Query, port, repository hoặc adapter.
- `actions/ports/inbound/*Factory` chỉ là driving contract; implementation ở
  `app/composition/factories` chỉ construct đồng bộ và không gọi `.handle()`/`.execute()`.
- `bootstrap/*` và `app/composition/*` dựng object graph; action/domain không import ngược
  bootstrap/composition.
- `app/infra/*` chỉ dành cho client công nghệ dùng chung toàn ứng dụng, ví dụ Elasticsearch SDK
  client. Nó không chứa business policy, feature document mapping, repository hay module facade.
- Cấu trúc hiện tại không có top-level generic `app/actions/shared` hoặc `app/services`; không tạo
  các bucket này để né ownership.

Một câu kiểm tra placement: nếu bỏ tên folder đi, artifact đó đang nhận intent, quyết định
nghiệp vụ, điều phối workflow, mô tả dependency, thực hiện I/O, hay chỉ dựng dependency graph?
Đưa nó về đúng owner tương ứng.

Nguồn: `docs/superpowers/specs/2026-07-07-api-and-module-boundary-design.md`,
`docs/03-architecture/module-layer-boundary-audit-2026-07-23.md`,
`docs/03-architecture/application-boundary.md`,
`app/infra/search/elasticsearch_client.ts`, và architecture guards.

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

Nguồn: `docs/11-diagrams/Architecture/01-system-architecture/overview/arch_01_system.mmd`, `docs/11-diagrams/Package/01-overview/overview/pkg_01_overview.mmd`, `docs/11-diagrams/Action/02-marketplace/README.md`, `docs/11-diagrams/ERD/01-user-auth-skills/overview/logical_erd_01_user_auth_skills.mmd`

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
