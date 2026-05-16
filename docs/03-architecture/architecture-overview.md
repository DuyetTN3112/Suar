# Architecture Overview

| Field           | Value                                                                                                                                |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Status          | Active                                                                                                                               |
| Audience        | Developer, tester, DevOps, architect, tech lead, manager cần bức tranh kỹ thuật đủ rõ                                                |
| Purpose         | Giải thích Suar được chia khối ra sao, request chạy như thế nào, và phần nào là runtime core cần tin khi debug hoặc mở rộng hệ thống |
| Source of Truth | `start/routes/*`, `app/modules/*`, `config/*`, `database/schema.ts`, verified docs                                                   |
| Review Cycle    | Khi module boundary, runtime dependency, hoặc core workflow đổi                                                                      |
| Owner           | Engineering                                                                                                                          |
| Stale Risk      | Cao                                                                                                                                  |

## Executive Summary

Suar hiện được thể hiện như một `modular monolith` trên AdonisJS.

Điều này nghĩa là:

- hệ thống chạy như một ứng dụng chính
- business logic được chia theo module
- mỗi module có boundary tương đối rõ
- cross-module access nên đi qua public contract hoặc adapter, không gọi xuyên tùy tiện

Nếu bạn chỉ cần nhớ một điều:

`Suar không phải microservices. Nó là một monolith được tổ chức theo module và theo layer.`

Nếu bạn đang:

- mới vào dự án: chỉ cần nắm `mental model` và `core modules`
- debug bug production: ưu tiên `Architecture Mental Model` rồi `Runtime Dependencies That Matter In Production`
- chuẩn bị sửa code: đọc thêm `Verified Runtime Layers`

File này phải tự đủ để người đọc ngoài repo hiểu:

- Suar là modular monolith hay microservices
- request đi qua những tầng nào
- dependency runtime nào đáng nghi đầu tiên khi production lỗi
- boundary kỹ thuật nào dễ nhìn nhầm nếu chỉ nhìn URL hoặc tên module

Chỉ đọc thêm file khác khi bạn thật sự cần chuyển level:

- `../01-business/feature-specification.md`
  khi cần đổi từ kiến trúc sang feature/business behavior
- `../05-api/api-landscape-and-governance.md`
  khi cần route/auth/transport boundary sâu hơn
- `../09-operations/production-incident-first-response.md`
  khi đang xử lý sự cố và cần thứ tự khoanh vùng nhanh hơn

## Nếu Dùng File Này Để Viết Report Bên Ngoài Repo

Bạn có thể dùng file này để viết:

- chương kiến trúc hệ thống
- phần mô tả style kiến trúc
- phần giải thích các lớp xử lý request
- phần runtime dependencies và production boundaries

Đây là file phù hợp nhất để người ngoài repo hiểu:

- Suar là monolith hay microservices
- các module chính là gì
- request đi qua những tầng nào
- production thường nhạy ở những dependency nào

Bạn không nên dùng riêng file này để kết luận:

- exact behavior của từng feature nhỏ
- mọi business rule chi tiết
- toàn bộ data contract của từng response

Nếu cần các phần đó, đọc thêm:

- `../01-business/feature-specification.md`
- `../05-api/api-landscape-and-governance.md`
- `../06-data/database-design-erd-data-dictionary.md`
- `../09-operations/runbook-monitoring-maintenance.md`

## What The System Looks Like At High Level

Ở mức cao, hệ thống có các khối chính:

1. HTTP and presentation surface
2. Business modules trong `app/modules/*`
3. PostgreSQL cho dữ liệu quan hệ
4. Redis cho cache, session, locking-related runtime use
5. External providers như OAuth
6. Search runtime cho discovery và search-driven flows
7. Platform capabilities như health, Audit, notifications, logging, observability

## Safe External Summary

Nếu cần mô tả ngắn gọn kiến trúc cho report, có thể dùng framing này:

`Suar hiện được tổ chức như một modular monolith trên AdonisJS. Mỗi HTTP/event intent đi vào một Command hoặc Query sở hữu workflow; domain giữ rule; outbound port mô tả capability cần dùng; outer composition nối port với adapter PostgreSQL, Redis, Elasticsearch, OAuth hoặc module khác.`

Đây là câu tóm tắt đủ đúng để người ngoài hiểu bức tranh kiến trúc mà không cần nhìn code.

## Architecture Mental Model

Khi một request đi vào hệ thống, đường đi chuẩn là:

1. route nhận request
2. middleware áp policy hoặc context
3. request mapper tạo action input
4. controller gọi đúng một Command, Query hoặc inbound capability
5. Command/Query sở hữu authorization, ordering, transaction intent và kết quả
6. domain policy áp rule nghiệp vụ
7. outbound port mô tả dữ liệu/side effect mà use case cần
8. adapter đọc/ghi DB, cache, search hoặc provider
9. response mapper trả dữ liệu về UI hoặc API

Mental model này rất quan trọng vì nó giúp người đọc:

- debug đúng tầng
- biết logic nào nên nằm ở đâu
- biết khi nào một bug là do policy, domain rule, query, hay transport

Một cách nhớ ngắn:

`Controller không làm workflow. Command/Query điều phối. Domain quyết định. Port mô tả nhu cầu. Adapter chạm công nghệ. Composition chỉ nối graph.`

Nếu bạn bị lạc khi debug, quay lại câu trên trước.

Event listener, CLI driver và callback controller cũng tuân theo cùng một nguyên tắc: mỗi inbound
adapter chuyển một intent vào local Command/Query/inbound port. Chúng không gọi repository,
outbound port hoặc application service như một use-case entry point.

## Application Boundary

Repository dùng một mental model duy nhất cho application boundary:

| Concern                         | Canonical owner                                                                       |
| ------------------------------- | ------------------------------------------------------------------------------------- |
| Complete business intent        | Một Command hoặc Query                                                                |
| HTTP, event hoặc CLI adaptation | Controller, listener hoặc command driver gọi đúng một inbound capability              |
| Business decision               | Domain policy, invariant, formula hoặc state rule                                     |
| Cross-module dependency         | Consumer-owned outbound port và outer composition adapter                             |
| Object graph                    | Composition factory chỉ dựng và bind dependency đồng bộ                               |
| Mapping và validation           | Mapper hoặc validator có tên và owner rõ                                              |
| Durable accountability          | Audit canonical evidence; personal activity là projection có policy khi được cung cấp |

Guarded inventory:

- `0` production `services` folders/files; guard từ chối generic bucket thay vì duy trì allowlist;
- `3` shared action-root collaborators được đóng băng theo exact path; file thứ tư bị gate từ chối;
- `0` production `support`, `serializers`, `builders`, `utils`, hoặc `actions/factories` files;
- `35` composition factories được guard không cho `.handle()`, `.execute()`, async workflow hoặc I/O;
- `30` Ace command files, không còn `commands/support`;
- `0` runtime `user_activity` writers hoặc bounded-context module.

Các reference slice quan trọng:

- `GetUserProjectAccessQuery` sở hữu complete Project access read;
- `CompleteTaskAssignmentsCommand` sở hữu ordered DONE transition sub-workflow;
- `ProcessAuthSessionObservedCommand` sở hữu receipt + canonical Audit transaction;
- `ComposedReviewActionFactory` được chia theo năm bounded use-case family nhưng không chạy workflow;
- `ListMyWorkController` dùng constructor injection đúng metadata và chỉ gọi `GetUserTasksQuery`.

Canonical decision: [Application Boundary](./application-boundary.md).

Visual reading set:

- [layer ownership](../11-diagrams/Architecture/01-system-architecture/high-level/arch_02_layer.mmd);
- [one HTTP intent](../11-diagrams/Architecture/01-system-architecture/low-level/arch_02a_request_flow.mmd);
- [composition boundary](../11-diagrams/Architecture/01-system-architecture/low-level/arch_02b_composition_boundary.mmd);
- [Auth → Audit evidence](../11-diagrams/Architecture/01-system-architecture/low-level/arch_04c_auth_audit_evidence.mmd);
- [Task DONE orchestration](../11-diagrams/Sequence/02-task-management/low-level/seq_02b1_done_completion_orchestration.mmd);
- [personal `/work` queue](../11-diagrams/UserFlow/04-task-delivery/low-level/uf_04b_my_work_queue.mmd).

Code audit note:

- với nhiều flow có organization context, middleware không chỉ “check có org hay chưa”
- hành vi organization context đi qua ít nhất ba lớp:
  - `AuthMiddleware`
  - `OrganizationResolverMiddleware`
  - `RequireOrganizationMiddleware`
- nghĩa là auth, context resolution, và enforcement đang tách lớp chứ không dồn vào một middleware duy nhất

## Verified Runtime Layers

### 1. Presentation And HTTP Layer

Layer này bao gồm:

- route registration
- middleware
- controllers
- API response mapping
- UI transport boundary

UI architecture note:

- frontend hiện là multi-app Inertia/Svelte setup với entrypoints:
  - `inertia/apps/user/app.ts`
  - `inertia/apps/org/app.ts`
  - `inertia/apps/admin/app.ts`
- root views tương ứng:
  - `resources/views/inertia_user.edge`
  - `resources/views/inertia_org.edge`
  - `resources/views/inertia_admin.edge`
- `config/inertia.ts` và `InertiaMiddleware` chọn root view theo URL prefix: `/admin`, `/org`, còn lại là user shell.
- route page names phải resolve trong đúng app tree. Guard `inertia/apps/org/tests/shared/inertia_page_resolution.test.ts` bảo vệ các edge page names tĩnh dễ bị bỏ sót sau split.

Evidence tiêu biểu:

- `start/routes/index.ts`
- `start/routes/auth.ts`
- `start/routes/tasks.ts`
- `start/routes/projects.ts`
- `start/routes/reviews.ts`
- `start/routes/organizations.ts`
- `start/routes/users.ts`
- `start/routes/api_v1.ts`

Code audit note:

- `OrganizationResolverMiddleware` hiện có thể:
  - tự đồng bộ `current_organization_id` giữa session và DB
  - tự fallback sang approved membership đầu tiên
  - tự clear org invalid và thử chọn org hợp lệ khác
  - bỏ qua một số path exempt như `/admin`, `/api/admin`, `/organizations`, `/auth`, `/health`
- `RequireOrganizationMiddleware` chỉ là thin guard chạy sau bước resolver đó
- `start/routes/auth.ts` hiện không chỉ chứa OAuth + logout production surfaces
- file này còn chứa token issue/refresh JSON surfaces và một nhóm `/api/testing/*` support routes chỉ mount ở `development|test`, nên khi đọc route tree phải tách rõ production contract với test tooling

### 2. Application Layer

Đây là nơi use case được điều phối:

- `actions/commands/*`: complete mutation intent;
- `actions/queries/*`: complete read intent;
- `actions/dtos/*`: application input/output shapes;
- `actions/ports/inbound/*`: stable driving contracts, gồm context-bound factory contract khi cần;
- `actions/ports/outbound/*`: consumer-owned capabilities;
- precise `actions/*.ts`: narrow collaborator thật sự dùng chung giữa Command và Query, không có
  generic subfolder;
- `actions/commands/internal/*` và `actions/queries/internal/*`: subordinate operation thuộc rõ
  use-case family.

Command/Query sở hữu authentication requirement, authorization/policy input, ordering,
transaction intent, event/side-effect decision và final result. Internal collaborator không được
construct, execute hoặc return Command/Query; controller/listener/job không được gọi nó làm entry
point.

### 3. Composition And Adapter Layer

`app/composition/*` và module bootstrap hợp lệ sở hữu object graph:

- bind inbound token/factory contract với implementation;
- construct Command/Query và inject outbound capabilities;
- bridge consumer-owned port sang provider public contract;
- register listeners và runtime adapters.

Composition không được execute use case, mở transaction, quyết định business ordering hoặc
transform business result. Module A không đọc internals của module B; consumer port và outer
adapter giữ dependency direction.

### 4. Domain Layer

Domain là nơi chứa:

- policy
- rules
- formulas
- business entities
- type contracts

Domain layer đang hiện rõ ở các module như:

- `app/modules/tasks/domain/*`
- `app/modules/reviews/domain/*`
- `app/modules/sprints/domain/*`
- `app/modules/projects/domain/*`
- `app/modules/organizations/domain/*`
- `app/modules/users/domain/*`

### 5. Infrastructure Layer

Infra là nơi chạm ra thế giới thực:

- Lucid models
- repositories
- persistence adapters
- cache support
- event publishing

Application/domain không import ngược `infra`. Adapter implement outbound port; outer composition
inject adapter vào use case.

Ví dụ:

- `app/modules/tasks/infra/models/task.ts`
- `app/modules/reviews/infra/models/review_session.ts`
- `app/modules/projects/infra/repositories/*`
- `app/modules/notifications/infra/repositories/postgres_notification_repository.ts`

## Core Modules

Các module gốc hiện thấy trực tiếp dưới `app/modules`:

- admin
- audit
- auth
- authorization
- cache
- contracts
- errors
- events
- http
- logger
- marketplace
- notifications
- observability
- organizations
- pagination
- projects
- reviews
- search
- settings
- skills
- sprints
- tasks
- testing
- users

Không phải module nào cũng có trọng số business như nhau. Nếu cần hiểu nhanh hệ thống theo giá trị nghiệp vụ, nên ưu tiên:

1. `tasks`
2. `reviews`
3. `sprints`
4. `organizations`
5. `projects`
6. `users`
7. `notifications`
8. `admin`

Nếu chỉ có 10 phút để hiểu repo, đọc theo thứ tự:

1. `tasks`
2. `reviews`
3. `sprints`
4. `users`
5. `organizations`
6. `projects`

Sáu module này giải thích phần lớn giá trị cốt lõi của Suar.

## Runtime Dependencies That Matter In Production

### PostgreSQL

Evidence hiện tại xác nhận:

- primary relational connection: `pg`
- search path: `public`, `suar`
- pool: min `2`, max `20`

Nguồn: `config/database.ts`

### Redis

Evidence hiện tại xác nhận:

- connection `main`, DB `0`, prefix `suar:`
- connection `cache`, DB `1`, prefix `suar:cache:`
- `main` dùng cho sessions, locks, general-purpose runtime
- `cache` tách riêng để có thể flush cache mà không đụng session

Nguồn: `config/redis.ts`

### Session

Evidence hiện tại xác nhận:

- cookie name: `adonis-session`
- default store lấy từ `SESSION_DRIVER`, fallback `redis`
- age: `30d`

Nguồn: `config/session.ts`

### Health

Evidence hiện tại xác nhận health checks cho:

- disk
- heap
- RSS
- DB
- DB connection count
- Redis
- Redis memory
- application custom check
- search reachability và index readiness

Nguồn: `start/health.ts`

Điều practical cần nhớ:

- app sống nhưng DB chết: nhiều page sẽ lỗi hoặc rỗng
- app sống nhưng Redis/session lỗi: login, notification, cache-like behavior dễ bất thường
- app sống nhưng search lỗi: talent discovery, search result, hoặc search-backed listing có thể rỗng hoặc degrade
- `/health` fail: ưu tiên coi là runtime foundation issue trước khi đổ cho business module

### Search

Evidence hiện tại xác nhận:

- search health check có thật trong runtime
- search có thể disabled theo config nhưng vẫn được ghi nhận rõ trong health result
- khi enabled, runtime sẽ ping search engine và ensure talent index

Nguồn: `start/health.ts`, `app/modules/http/health_checks/search_health_check.ts`

Điểm rất dễ hiểu sai:

- `health` có thể trả `ok` cho search với message kiểu `Search engine disabled`
- điều đó không có nghĩa search capability đang active
- muốn kết luận đúng phải đọc thêm metadata như `enabled: false`
- ngoài ra health check search hiện không chỉ đo “sống/chết”; khi runtime đang enabled và reachable, nó còn đụng concern index readiness qua `ensureTalentIndex()`

## Boundary Examples That Save Incident Time

Đây là vài ví dụ runtime thật rất đáng nhớ vì nhìn URL bằng mắt rất dễ đoán sai:

### 1. Organization Management và Project Workspace là hai shell khác nhau

- `/org/*` giữ Organization Management: governance, people/access, settings, audit và project portfolio.
- `/projects/:projectId/*` giữ Project Workspace và bốn delivery/review board.
- `/org/disputes` không còn được đăng ký; User-side dispute exchange nằm trong card room của Project review board.
- `/org/tasks*` chỉ là compatibility redirect vào Project Task Board, ngoại trừ workflow configuration/application surfaces được gọi đúng tên.

Ý nghĩa vận hành:

- đừng debug một Project board như thể nó thuộc Organization shell;
- đừng khôi phục Org task/dispute page chỉ vì API vẫn có organization-scoped read/respond contract.

### 2. `/admin/*` và `/api/admin/*` là System realm, không phải role nâng cao của User

- page routes `/admin/*` đi qua `requireSystemAdmin()`
- JSON routes `/api/admin/*` dùng `api-admin-internal` + `session-or-bearer`
- System principal/session không dùng Organization/Project switcher và không bật admin mode từ User session
- cùng concern “admin” nhưng page và JSON không nhất thiết cùng controller stack

Implementation status là **Partial ở physical identity boundary**. Route/UI/policy context đã tách, nhưng middleware hiện vẫn nhận `auth.user` từ shared authentication transport rồi đọc `users.system_role` để classify System access. `AuthLandingResolver` cũng còn nhận `systemRole`. Đây là compatibility adapter cần được thay bằng System-principal identity/session độc lập; không được biến chi tiết lưu trữ tạm thời này thành mô hình “User có System + Organization + Project role”.

Ý nghĩa vận hành:

- đừng đưa System Admin vào bảng quyền User/Organization/Project
- incident ở `/admin/dashboards/*` và incident ở `/org/*` thường đi vào hai boundary khác nhau ngay từ route layer
- nếu audit câu hỏi “đã tách principal vật lý chưa”, kiểm tra `RequireSystemAdminMiddleware`, `AuthLandingResolver`, `User.system_role` và session store; không chỉ nhìn sidebar/route

### 3. Một số path nhìn như page URL nhưng thực chất là JSON surface

Ví dụ:

- `/notifications/latest`

Runtime thật:

- route path không có prefix `/api`
- nhưng route được bind `api-compat`
- nghĩa là đây là JSON quick surface chạy trên web-looking path, không phải page render thông thường

Ý nghĩa vận hành:

- khi debug notification dropdown, đừng chỉ nhìn `/notifications` page
- phải nhìn thêm quick JSON surface `/notifications/latest`

### 4. Users/profile surfaces đang là mixed compat + canonical reality

Ví dụ:

- profile snapshots vẫn có cả:
  - `/api/me/profile-snapshots/*`
  - `/api/v1/me/profile-snapshots/*`
- org talent discovery canonical hiện đi theo:
  - `/api/v1/me/organizations/current/talents/search`
  - `/api/v1/me/organizations/current/talents/:userId`
  - `/api/v1/me/organizations/current/talents/:userId/bookmarks`

Ý nghĩa vận hành:

- cùng một capability “profile” hoặc “talent discovery” có thể đang có cả page surface, compat JSON, và canonical JSON cùng sống thật
- nếu docs bỏ mất một nhánh, người đọc rất dễ kết luận sai source of truth khi production lỗi

## Business Capability Map

### Auth

Auth hiện nổi bật ở:

- social auth callback pipeline
- provider-user mapping
- session interaction

Nguồn: `start/routes/auth.ts`, `app/modules/auth/controllers/social_auth_controller.ts`, `app/modules/auth/infra/models/user_oauth_provider.ts`

### Organizations

Organizations hiện bao phủ:

- discovery
- active organization context
- invitations
- membership
- projects
- tasks
- workflow

Nguồn: `start/routes/organizations.ts`, `start/routes/organizations_current.ts`, `app/modules/organizations/directory/actions/command/create_organization_command.ts`

### Projects

Projects hiện bao phủ:

- project detail
- member staffing
- project-level views cho user và org shell
- project detail tab chứa sprint workspace

Nguồn: `start/routes/projects.ts`, `app/modules/projects/controllers/show_project_controller.ts`, `app/modules/projects/actions/commands/add_project_member_command.ts`

### Sprints

Sprints hiện bao phủ:

- Sprint Goal
- project sprint lifecycle
- Product Backlog vs selected sprint tasks
- move task vào/ra sprint
- bridge từ active sprint sang review-open governance

Nguồn: `start/routes/projects.ts`, `app/modules/sprints/actions/commands/create_project_sprint_command.ts`, `app/modules/sprints/actions/commands/move_task_to_sprint_command.ts`, `app/modules/sprints/actions/queries/get_sprint_board_query.ts`

### Tasks

Tasks là business core lớn:

- task authoring
- workflow
- applications
- assignment
- requirement versioning
- submission package
- side effects như cache invalidation, audit, events

Nguồn: `start/routes/tasks.ts`, `app/modules/tasks/actions/commands/create_task_command.ts`, `app/modules/tasks/actions/commands/submit_task_submission_command.ts`, `app/modules/tasks/actions/queries/get_task_applications_ranking_query.ts`

### Reviews

Reviews hiện bao phủ:

- review session
- evidence
- self-assessment
- reverse review
- disputes
- moderation
- AI dispute evaluation

Nguồn: `start/routes/reviews.ts`, `app/modules/reviews/actions/commands/submit_reverse_review_command.ts`, `app/modules/reviews/actions/commands/resolve_review_dispute_command.ts`, `app/modules/reviews/actions/commands/resolve_flagged_review_command.ts`, `app/modules/reviews/actions/commands/start_ai_dispute_evaluation_command.ts`

Code audit note:

- task-level reverse review submit hiện bị product-deprecate và command đang chặn thật
- review session hiện có 2 creation paths trong runtime: đường ưu tiên lúc assignee submit completion package để đưa task sang `in_review`, và đường backstop sau khi task đi vào category `done`
- User-side dispute exchange nằm trong Project review card room; Org dispute page đã bị gỡ
- reported case được chiếu sang `/admin/disputes`, nhưng System Admin vẫn là principal/realm riêng
- AI dispute callback là public integration route nhưng vẫn có credential/signature/timestamp gate

### Users

Users hiện bao phủ:

- profile aggregates
- profile snapshots
- talent directory
- talent bookmarks
- approval flows

Nguồn: `start/routes/users.ts`, `app/modules/users/actions/commands/publish_user_profile_snapshot_command.ts`, `app/modules/users/actions/commands/create_recruiter_bookmark_command.ts`, `app/modules/users/actions/queries/get_talent_directory_page_query.ts`

Code audit note:

- `org talents` page routes đã được xác nhận ở `/org/talents` và `/org/talents/:userId`
- talent bookmarks workspace page đã được xác nhận ở `/org/bookmarks`; `/marketplace/bookmarks` chỉ là legacy redirect
- profile snapshots hiện là capability điển hình cho mixed compat + canonical API coexistence

### Search

Search hiện là support capability nhưng ảnh hưởng trực tiếp đến trải nghiệm discovery:

- runtime health cho search
- global search center Query-owned application flow trong `app/modules/search`
- talent index lifecycle
- search-driven query path cho talent discovery
- observability event cho search runtime

Boundary quan trọng:

- `/search` page và `/api/search` transport controller vẫn nằm trong `app/modules/http`
- controller gọi `searchPublicApi`, còn `GlobalSearchQuery` và source fan-out nằm trong `app/modules/search/actions/queries/global_search*`
- `app/modules/http/health_checks/search_health_check.ts` là health/integration wrapper, không phải module owner của search domain

Nguồn: `start/routes/index.ts`, `start/routes/api.ts`, `app/modules/http/controllers/search_page_controller.ts`, `app/modules/http/controllers/search_api_controller.ts`, `app/modules/search/public_contracts/search_public_api.ts`, `app/modules/search/actions/queries/global_search_query.ts`, `app/modules/http/health_checks/search_health_check.ts`, `app/modules/users/actions/queries/get_talent_directory_page_query.ts`

## How To Debug With This Architecture

### If Route Exists But Behavior Is Wrong

Nghĩ theo tầng:

1. route binding
2. middleware/policy
3. request mapping
4. command/query orchestration
5. domain rule
6. repository or persistence

### If UI Data Looks Stale Or Inconsistent

Nghĩ theo khả năng:

1. query layer issue
2. cache issue
3. background side effect missing
4. legacy compatibility field mismatch

### If Production Is Unstable

Ưu tiên kiểm tra:

1. health
2. DB
3. Redis
4. search nếu lỗi tập trung ở discovery/profile/talent
5. auth/session
6. affected module boundary

## Which Diagram To Read Next

- muốn bức tranh tổng: đọc [Architecture Diagram Catalog](./architecture-diagram-catalog.md)
- muốn điều hướng diagram theo level: đọc [Diagram Guide](../11-diagrams/README.md)
- muốn runbook sự cố: đọc [Operations Pack](../09-operations/README.md)

## Known Gaps

Repository-defined Docker Compose reference topology, external dependencies, local file-storage caveat, and Redis separation now have dedicated diagrams. These diagrams do not claim an observed production deployment:

- [`arch_05_deployment_topology`](../11-diagrams/Architecture/01-system-architecture/high-level/arch_05_deployment_topology.mmd)
- [`deployment_01_reference_topology`](../11-diagrams/Deployment/01-reference-topology/overview/deployment_01_reference_topology.puml)
- [`arch_08_file_attachment_storage_runtime`](../11-diagrams/Architecture/01-system-architecture/low-level/arch_08_file_attachment_storage_runtime.mmd)
- [`arch_09_redis_runtime_separation`](../11-diagrams/Architecture/01-system-architecture/low-level/arch_09_redis_runtime_separation.mmd)

Hệ thống vẫn chưa cung cấp artifact độc lập, đủ mạnh cho:

- production multi-environment topology và infrastructure-as-code guide
- backup/restore run sequence riêng
- observability dashboard export

Tài liệu này không bịa thêm các phần chưa có evidence.

## Khi Nào Dừng Ở File Này

Dừng ở file này khi bạn đã biết:

1. hệ thống được chia thành những khối chính nào
2. concern của mình nằm ở request flow, module boundary, hay runtime dependency
3. có cần sang diagram catalog, development guidelines, data docs, hay operations docs để đào sâu hơn hay không
