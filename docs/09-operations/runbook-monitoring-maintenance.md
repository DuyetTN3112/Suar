# Runbook, Monitoring, Maintenance

| Field | Value |
|---|---|
| Status | Active |
| Audience | DevOps, on-call, backend dev, QA, tech lead |
| Purpose | Tập hợp operational truth đang có thật trong hệ thống: kiểm tra sống/chết, monitoring surface, maintenance surface, và khoảng trống hiện tại |
| Source of Truth | `start/health.ts`, `start/routes/*`, `config/*`, `package.json`, `database/schema.ts`, `schema/migration evidence` |
| Last Reviewed | 2026-07-10 |
| Review Cycle | Khi health checks, runtime config, test scripts, hoặc support modules đổi |
| Owner | Engineering / platform |
| Stale Risk | Rất cao |

## What This File Guarantees

File này chỉ nói về những gì có evidence trực tiếp trong hệ thống hiện tại.

Nó giúp người đọc:

- biết production nên kiểm tra gì trước
- biết monitoring surface nào đang tồn tại
- biết maintenance surface nào thực sự có
- biết rõ bộ tài liệu còn thiếu playbook nào

Nó không bịa quy trình ngoài repo chỉ để tài liệu trông đầy đủ hơn.

File này phải tự đủ cho các câu hỏi kiểu:

- production đang có những bề mặt kiểm tra nào thật
- nên dùng monitoring signal nào trước khi đào sâu
- repo hiện có những lệnh verify nào để xác minh giả thuyết
- chỗ nào docs đang thành thật thừa nhận là còn thiếu

Nếu bạn đang gấp, đọc theo thứ tự này:

1. `Recommended Triage Sequence`
2. `Monitoring Truth`
3. `Known Missing Operational Artifacts`

## Nếu Dùng File Này Để Viết Report Bên Ngoài Repo

Bạn có thể dùng file này để viết:

- chương monitoring và maintenance
- phần operational truth hiện có trong hệ thống
- phần giới hạn vận hành hoặc artifact còn thiếu

Đây là file phù hợp để trả lời:

- hệ thống hiện có những monitoring/maintenance surface nào thật
- triage production nên bắt đầu ra sao
- operational artifact nào còn thiếu nên chưa được nói quá tay

Bạn không nên dùng riêng file này để kết luận:

- hệ thống đã có full enterprise operations pack
- backup/restore, rollback, escalation policy đều hoàn chỉnh chỉ vì runbook này tồn tại

Chỉ đọc thêm khi bạn cần đổi sang mục tiêu khác:

- `./production-incident-first-response.md`
  khi đang ở phút đầu incident và cần khoanh vùng cực nhanh theo symptom
- `../12-evidence/workstream-status-audit.md`
  khi cần audit gap, regression, hoặc bằng chứng test/runtime còn đỏ

## Safe External Summary

Nếu cần một câu tóm tắt an toàn cho report, có thể dùng:

`Về vận hành, Suar hiện có lớp health verification, runtime dependency checks, test/tooling surfaces, và các tín hiệu monitoring ở mức ứng dụng; tuy vậy docs cũng ghi rõ những operational artifacts còn thiếu thay vì giả vờ bộ runbook đã hoàn chỉnh tuyệt đối.`

## Operational Truth In One Page

Suar hiện cho thấy các runtime concern chính:

- health endpoint có bảo vệ
- PostgreSQL là primary relational store
- Redis phục vụ cache và session-related runtime
- search runtime có health check riêng và có thể bị disable theo config
- logger, audit, error, notifications, user activity tạo ra monitoring signals
- test/tooling surface đủ để xác minh phần mềm theo vùng bị ảnh hưởng

## Runbook Core

### Health Verification

Health checks hiện có:

- disk space
- memory heap
- memory RSS
- database connectivity
- database connection count
- Redis connectivity
- Redis memory usage
- custom application check
- search reachability và index readiness

Nguồn: `start/health.ts`

### Health Endpoint Access

Evidence hiện có:

- route: `/health`
- bảo vệ bằng credential middleware
- `health-check credential` là gate quan trọng
- nếu env này chưa được cấu hình, middleware chặn luôn theo kiểu `secure by default`

Nguồn: `start/routes/index.ts`, `start/env.ts`

### Recommended Triage Sequence

Chuỗi này phản ánh đúng những bề mặt hệ thống đang xác nhận:

1. Gọi `GET /health` với credential hợp lệ.
2. Nếu fail, khoanh vùng giữa app, DB, Redis, search, hoặc config gate.
3. Nếu nhận `503` rất sớm, kiểm tra trước xem `health-check credential` đã cấu hình chưa; đừng vội kết luận app hoặc DB đã chết.
4. Nếu health trả warning, đọc từng check name thay vì chỉ nhìn status tổng:
   - `application`: memory pressure hoặc host-level command issue
   - `search`: Elasticsearch unreachable, search disabled, hoặc ensure index fail
   - `db` / `db_connection_count`: DB sống nhưng đang nghẽn
   - `redis` / `redis_memory_usage`: cache, session, hoặc lock runtime đang bất ổn
5. Nếu health pass nhưng feature lỗi, xác định module bị ảnh hưởng:
   - auth
   - tasks
   - reviews
   - notifications
   - settings
   - admin/org dashboards
   - search / talent discovery
6. Chạy check kỹ thuật tối thiểu:
   - `pnpm run typecheck`
   - `pnpm run lint`
7. Chạy targeted test suite gần nhất với vùng nghi lỗi:
   - `pnpm run test:unit`
   - `pnpm run test:integration`
   - `pnpm run test:contract`
   - `pnpm run test:e2e`
   - `pnpm run test:ui`
8. Nếu nghi ngờ persistence hoặc support runtime, đối chiếu:
   - `config/database.ts`
   - `config/redis.ts`
   - `app/modules/http/health_checks/search_health_check.ts`
   - repository/provider của module tương ứng

Rule thực dụng:

- đừng chạy mọi test ngay từ phút đầu
- khoanh vùng trước, verify sau
- nếu chưa biết lỗi ở domain nào, quay lại `production-incident-first-response.md`

Một nuance rất thực dụng cho on-call:

- file `production-incident-first-response.md` phù hợp cho `minute 0 -> minute 15`
- file này phù hợp hơn cho `minute 15 -> minute 60`, khi bạn đã có giả thuyết và cần biết repo đang thật sự có monitoring/maintenance surface nào để kiểm chứng tiếp

Code audit note rất quan trọng:

- `SearchHealthCheck` có thể trả `ok` với message kiểu `Search engine disabled` khi search đang tắt hợp lệ theo config
- vì vậy `status = ok` không tự động đồng nghĩa search capability đang active
- phải đọc thêm metadata như `enabled: false`
- khi search đang enabled và ping pass, health check hiện còn gọi `ensureTalentIndex()`, nên đây không phải probe read-only tuyệt đối; nếu incident đụng search health nhiều lần, nên nhớ nó còn chạm concern index readiness

### Test And Verification Commands Present In Repo

- `pnpm run test:unit`
- `pnpm run test:integration`
- `pnpm run test:e2e`
- `pnpm run test:ui`
- `pnpm run test:contract`
- `pnpm run test:inventory`
- `pnpm run test:quality:critical`
- `pnpm run typecheck`
- `pnpm run lint`
- `pnpm run build`
- `pnpm run db:test:migrate`

Nguồn: `package.json`

### Incident Surfaces Explicitly Visible

Các nhóm sự cố có thể lần theo evidence nguồn hiện tại:

- OAuth login hoặc callback fail
- health endpoint không truy cập được
- search health warning hoặc search result rỗng bất thường
- talent search fallback về legacy path vì engine rỗng hoặc lỗi
- org talents hoặc talent bookmarks bị chặn bởi admin-shell permission
- task workflow lệch giữa `status` và `task_status_id`
- task không sang `DONE` vì thiếu submission hợp lệ
- task submission bị khóa nên contributor không sửa tiếp được
- `/org/tasks` nhìn thiếu data vì project context trong session đang lọc ngầm
- status board patch trả conflict ở nhánh POC
- notification inbox không cập nhật
- review dispute callback không xử lý
- admin/org dashboard không hiển thị số liệu
- Redis/session/cache issue
- PostgreSQL query/storage issue

Nguồn: `start/routes/auth.ts`, `start/routes/index.ts`, `start/routes/reviews.ts`, `start/routes/notifications.ts`, `start/routes/admin.ts`, `app/modules/tasks/infra/models/task.ts`, `app/modules/http/health_checks/search_health_check.ts`, `config/session.ts`, `config/database.ts`, `config/redis.ts`

Review/dispute callback note:

- `/api/public/ai-disputes/callback` và `/api/public/ai/dispute-evaluations/callback` là public integration surfaces
- nhưng callback command vẫn verify credential, request signature, và timestamp window
- nếu callback fail, đừng chỉ nghi route exposure; hãy kiểm tra credential config, signature generation, và clock skew

## Monitoring Truth

### Built-In Signals

Hệ thống hiện cho thấy các signal sau:

- health checks trong Adonis
- logger config có mode non-production và production target
- audit events
- error events
- notifications
- user activity events
- platform observability events cho search runtime

Nguồn: `start/health.ts`, `config/logger.ts`, `app/modules/audit/infra/repositories/audit_repository_provider.ts`, `app/modules/notifications/infra/repositories/notification_repository_provider.ts`, `app/modules/user_activity/infra/repositories/user_activity_repository_provider.ts`, `app/modules/http/health_checks/search_health_check.ts`

Nên hiểu các signal này như sau:

- `health`: hệ nền còn sống không
- `logger/error/audit`: chuyện gì đang xảy ra
- `search runtime event`: search stack đang disabled, unreachable, hay vừa ensure index xong
- `notifications/user activity/admin dashboards`: ứng dụng đang tự kể gì về trạng thái của nó

### Resource Thresholds

Theo `start/health.ts`:

- disk warning `75%`, fail `85%`
- heap warning `250 mb`, fail `300 mb`
- RSS warning `320 mb`, fail `350 mb`
- DB connections warning `10`, fail `15`
- Redis memory warning `100 mb`, fail `120 mb`

Search health hiện không dùng numeric threshold trong `start/health.ts`.
Nó dựa trên:

- `searchPublicApi.isEnabled()`
- `searchPublicApi.ping()`
- `searchPublicApi.ensureTalentIndex()`

Điều này quan trọng vì search incident sẽ không hiện kiểu `80%` hay `90%`. Nó hiện theo trạng thái enable/reachable/index-ready.

### UI And Route Surfaces Useful For Operational Observation

Các surface sau không thay thế observability stack, nhưng là application-visible signals:

- `/notifications`
- `/notifications/latest`
- `/org/bookmarks`
- `/org/talents`
- `/admin`
- `/admin/dashboards/users`
- `/admin/dashboards/operations`
- `/admin/dashboards/subscriptions`
- `/org`
- `/admin/flagged-reviews`
- `/api/admin/reviews/disputes`

Nguồn: `start/routes/notifications.ts`, `start/routes/admin.ts`, `start/routes/reviews.ts`, `start/routes/organizations_current.ts`

Điều rất nên nhớ khi dùng các surface này để triage:

- `/notifications/latest` là JSON quick surface có `api-compat` transport, không phải page render thường
- `/org/talents` là org-scoped discovery page trong `start/routes/users.ts`, không nằm trong org-admin shell file
- `/admin/*` và `/api/admin/*` là system-admin boundary, không phải extension của `/org/*`
- `/api/admin/reviews/disputes` hữu ích khi cần tách “UI page đang hỏng” khỏi “admin dispute data API đang hỏng”

Đây là các surface quan sát ứng dụng, không phải observability stack chuẩn kiểu metrics/log platform đầy đủ.

Nói ngắn:

- chúng giúp nhìn thấy `ứng dụng đang tự kể gì`
- nhưng không thay thế alerting, tracing, hay centralized metrics nếu team cần mức vận hành cao hơn

## Role Boundary Traps During Incidents

Đây là nhóm hiểu nhầm rất hay làm debug production đi sai hướng:

### 1. Thấy prefix `/org` rồi mặc định kết luận “phải là org-admin only”

Điều này sai trong current runtime.

Ví dụ:

- `/org/disputes` không đi qua `requireOrgAdmin()` ở middleware layer
- route chỉ đi qua `auth + requireOrg`
- quyền sâu hơn được enforce tiếp ở query/policy

Vì vậy:

- 403 ở `/org/disputes` chưa chắc do user không phải org admin
- access được vào `/org/disputes` cũng chưa chắc là lộ quyền

### 2. Thấy route không có `/api` rồi tưởng đó chắc chắn là page-only surface

Ví dụ:

- `/notifications/latest`

Runtime thật:

- path nhìn như web route
- nhưng transport lại là `api-compat`
- đây là JSON surface phục vụ quick refresh/latest state

Vì vậy:

- notification bug có thể nằm ở JSON contract surface dù URL không có `/api`

### 3. Thấy health báo `ok` rồi kết luận search đang active bình thường

Điều này cũng có thể sai.

`SearchHealthCheck` hiện có thể trả:

- `ok`
- message `Search engine disabled`
- metadata `enabled: false`

Vì vậy:

- phải đọc metadata, không chỉ nhìn overall status
- search discovery rỗng trong lúc health `ok` có thể vẫn là behavior hợp lệ nếu search runtime đang disable theo config

### 4. Thấy `/admin` và `/org` cùng là “admin” rồi trộn chúng làm một

Điều này rất nguy hiểm khi phân công xử lý sự cố.

Current runtime:

- `/org/*` trong `start/routes/organizations_current.ts` là organization-admin boundary
- `/admin/*` trong `start/routes/admin.ts` là system-admin boundary
- `/api/admin/*` còn là JSON admin-internal surface riêng

Vì vậy:

- lỗi system admin dashboard và lỗi org workspace không nên giao cùng một checklist điều tra
- docs và incident note phải gọi đúng boundary

### Monitoring Data Stores

schema evidence xác nhận sự tồn tại của:

- `audit_events`
- `error_events`
- `notifications`

với index phục vụ truy vấn theo user, entity, status, time, correlation, unread state.

Nguồn: `schema/migration evidence`

## Maintenance Truth

### Configuration Surfaces

- runtime config schema: `start/env.ts`
- DB config: `config/database.ts`
- Redis config: `config/redis.ts`
- session: `config/session.ts`
- shield: `config/shield.ts`
- limiter: `start/limiter.ts`

### Schema Maintenance

Evidence hiện có:

- `database/schema.ts` là generated file
- comment trong file yêu cầu regenerate qua migration flow

Điều cần nhớ:

schema truth không chỉ nằm ở migration mới nhất. Khi đổi data model, cần giữ đồng bộ:

- migration
- generated schema snapshot
- Lucid models
- data docs
- ERD docs

Nếu thiếu một trong các mắt xích trên, docs và code sẽ bắt đầu lệch nhau rất nhanh.

### Diagram Maintenance

Diagram hiện dùng Mermaid `.mmd`.

Rule cần giữ:

- mỗi file một sơ đồ
- overview và detail phải tách scope
- người đọc phải thấy trọn ý trong một khung nhìn

Đây không phải yêu cầu thẩm mỹ. Nó là yêu cầu vận hành.

Lúc production có sự cố, diagram khó đọc gần như vô dụng.

Nguồn: `docs/11-diagrams/Architecture/arch_01_system.mmd`, `docs/11-diagrams/Package/pkg_01_overview.mmd`, `docs/11-diagrams/Action/act_01_task_management_overview.mmd`, `docs/11-diagrams/ERD/logical_erd_03_task_marketplace.mmd`

### GitNexus Maintenance

Hệ thống hiện cho thấy GitNexus CLI có các command:

- `analyze`
- `query`
- `status`
- `detect-changes`
- `context`
- `impact`

Nguồn: `.gitnexus/meta.json`, local CLI help

### Frontend And Runtime Surfaces Worth Remembering

Các bề mặt sau có ảnh hưởng lớn tới cảm nhận “hệ thống đang khỏe hay đang hỏng”:

- dashboard pages
- notification dropdown và notifications index
- tasks create/show/applications pages
- disputes admin/user pages
- profile snapshot related pages
- talent directory và search-driven profile discovery pages
- talent bookmarks workspace
- org talent discovery pages

Nguồn: `inertia/apps/{user,org,admin}/**`, `inertia/bones/**`, shared notification/layout components hiện hành

## Known Missing Operational Artifacts

Bộ tài liệu hiện chưa xác nhận artifact riêng cho:

- on-call escalation document
- backup and restore checklist
- disaster recovery playbook
- deploy rollback checklist

Đây là gap thật, không phải chỗ để phỏng đoán thay thế.

Nói ngắn:

- hệ thống hiện có đủ để triage và verify nhiều lỗi
- hệ thống chưa đủ để tự nhận là đã có full operations handbook hoàn chỉnh

## Khi Nào Dừng Ở File Này

Dừng ở file này khi bạn đã biết:

1. production concern của mình nằm ở health, monitoring, maintenance, hay runtime dependency nào
2. check kỹ thuật tiếp theo nên là gì
3. lúc nào cần sang incident-first-response, architecture, security, hay testing docs để đào sâu hơn
