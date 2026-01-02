# Production Incident First Response

| Field | Value |
|---|---|
| Status | Active |
| Audience | On-call responder, DevOps, backend dev, tech lead |
| Purpose | File đầu tiên cần mở khi production có vấn đề và đội cần hướng xử lý nhanh, đáng tin, không vòng vo |
| Source of Truth | `start/health.ts`, `start/routes/index.ts`, `config/database.ts`, `config/redis.ts`, `config/session.ts`, `package.json`, verified operation docs |
| Last Reviewed | 2026-07-10 |
| Review Cycle | Khi health endpoint, runtime dependency, config gate, hoặc incident workflow đổi |
| Owner | Engineering / platform |
| Stale Risk | Rất cao |

## What This File Is For

File này không cố thay thế toàn bộ runbook. Nó có một việc:

Khi hệ thống lỗi, giúp người xử lý biết:

- kiểm tra gì trước
- đọc tín hiệu nào trước
- khi nào khoanh vùng được vào app, database, Redis, auth, tasks, reviews, hay dashboard

## Nếu Dùng File Này Để Viết Report Bên Ngoài Repo

Bạn có thể dùng file này để viết:

- phần incident-first response
- phần operational readiness ở mức ứng dụng
- phần production triage logic mức cao

Đây là file phù hợp để chứng minh rằng bộ docs không chỉ mô tả feature mà còn mô tả cách xử lý sự cố theo runtime thật.

Bạn không nên dùng riêng file này để kết luận:

- toàn bộ vận hành production đã đầy đủ như một enterprise runbook pack
- mọi playbook backup/restore/rollback đã tồn tại độc lập

File này tự đủ cho bước khoanh vùng ban đầu khi production vừa lỗi.

Chỉ đọc thêm khi bạn đã có giả thuyết cụ thể và cần đào sâu:

- `./runbook-monitoring-maintenance.md`
  khi cần monitoring/routine maintenance và check runtime sâu hơn
- `../07-security/access-control-security-privacy-audit.md`
  khi incident nghi dính access-control, credential, callback, privacy
- `../12-evidence/workstream-status-audit.md`
  khi cần xem regression/gap audit đã được ghi nhận trước đó

## Safe External Summary

Nếu cần một câu tóm tắt an toàn cho report, có thể dùng:

`Bộ docs của Suar có phân tách rõ lớp xử lý sự cố production ban đầu, trong đó health endpoint, runtime dependencies, và việc khoanh vùng theo triệu chứng được xem là điểm vào chính trước khi đào sâu vào business modules.`

## 3-Minute Orientation

Suar hiện được ghi nhận là một modular monolith trên AdonisJS, với các runtime dependency chính:

- application server
- PostgreSQL
- Redis
- session storage
- OAuth provider
- search engine integration
- health checks

Điều này có nghĩa phần lớn production issue sẽ thường rơi vào sáu nhóm:

1. app không phản hồi hoặc route bị lỗi
2. PostgreSQL lỗi hoặc truy vấn có vấn đề
3. Redis/session/cache lỗi
4. auth/OAuth callback lỗi
5. search bị disable, unreachable, hoặc index không sẵn sàng
6. business workflow lỗi ở tasks, reviews, notifications, organizations, admin dashboards

Nếu bạn chỉ làm đúng một việc đầu tiên, hãy làm việc này:

- kiểm tra `/health` bằng credential hợp lệ

Nó không giải thích mọi lỗi, nhưng giúp tách rất nhanh lỗi nền runtime với lỗi business flow.

## First Response Checklist

### Step 1: Xác nhận hệ thống còn sống không

Kiểm tra `GET /health` với credential hợp lệ.

Theo evidence hiện có, health surface kiểm tra:

- disk
- heap
- RSS
- database connectivity
- database connection count
- Redis connectivity
- Redis memory
- application custom check
- search availability và talent index readiness

Nếu `GET /health` không truy cập được, cần coi đây là dấu hiệu lớn:

- app route layer lỗi
- credential/config gate lỗi
- app process chết
- runtime dependency chết sớm

Nếu `GET /health` trả về warning thay vì fail hoàn toàn, đừng bỏ qua phần `search`.

Trong hệ thống hiện tại, `SearchHealthCheck` có thể:

- báo `ok` khi search engine disabled hợp lệ theo runtime config
- báo `warning` khi Elasticsearch unreachable
- báo `warning` khi health check search fail trong lúc ping hoặc ensure index

Điểm phải đọc rất kỹ:

- `ok` ở đây có thể chỉ nghĩa là runtime chấp nhận trạng thái disabled
- nếu incident là “search không hoạt động”, phải nhìn thêm metadata `enabled` thay vì dừng ở status tổng

## Step 2: Khoanh vùng bằng triệu chứng

### Nếu login hoặc callback social auth lỗi

Đọc tiếp:

- [Architecture Overview](../03-architecture/architecture-overview.md)
- [Runbook, Monitoring, Maintenance](./runbook-monitoring-maintenance.md)

Triệu chứng thường map vào:

- OAuth provider callback
- user/provider mapping
- session persistence
- bearer token versus session contract mismatch
- current organization sync giữa session và DB

Đừng nhảy ngay vào business module khác nếu login chưa ổn. Khi auth chết, nhiều triệu chứng phía sau chỉ là hậu quả.

Code audit note:

- API auth hiện không phải một mode duy nhất
- một số route ưu tiên `session-or-bearer`, một số route ưu tiên `bearer-or-session`
- nếu browser flow ổn nhưng token client lỗi, hoặc token ổn nhưng browser flow lỗi, hãy kiểm tra auth contract trước khi nghi business logic

### Nếu task, review, notification, dashboard hiển thị sai hoặc treo

Triệu chứng thường map vào:

- business module logic
- query layer
- DB issue
- cache invalidation
- cross-module side effect

Điểm practical:

- một page rỗng chưa chắc là frontend bug
- rất nhiều trường hợp là query trả rỗng, permission block, hoặc aggregate chưa được cập nhật
- current-org resolver cũng là nghi phạm thật nếu data đột nhiên rỗng sau đổi org hoặc sau membership change

Đọc tiếp:

- [Architecture Overview](../03-architecture/architecture-overview.md)
- [Diagram Guide](../11-diagrams/README.md)

Nếu triệu chứng nằm ở review dispute callback:

- kiểm tra `/api/public/ai-disputes/callback` hoặc `/api/public/ai/dispute-evaluations/callback`
- kiểm tra `callback credential`
- kiểm tra timestamp lệch quá khoảng `5` phút
- kiểm tra signature được tạo đúng theo payload lõi `timestamp:evaluation_id:status`

Nếu triệu chứng là “đang login được nhưng nhiều API org-scoped trả 403 hoặc data trống”:

- kiểm tra session `current_organization_id`
- kiểm tra `users.current_organization_id`
- kiểm tra approved membership còn hợp lệ không
- kiểm tra resolver có vừa clear org invalid rồi fallback hay không

### Nếu toàn hệ thống chậm hoặc nhiều trang cùng lỗi

Ưu tiên nghi ngờ:

- DB connectivity
- DB connection saturation
- Redis issue
- memory pressure
- search degradation nếu lỗi tập trung ở talent/search/profile discovery
- application process degradation

Đây là lúc nên nghi hạ tầng hoặc runtime dependency trước, không nên debug từng feature lẻ.

## Step 3: Dùng đúng verification commands

Hệ thống hiện có các lệnh verification chính:

- `pnpm run typecheck`
- `pnpm run lint`
- `pnpm run build`
- `pnpm run test:unit`
- `pnpm run test:integration`
- `pnpm run test:e2e`
- `pnpm run test:ui`
- `pnpm run test:contract`
- `pnpm run test:inventory`
- `pnpm run test:quality:critical`

Không phải incident nào cũng cần chạy hết. Dùng chúng để xác minh giả thuyết sau khi đã khoanh vùng.

## Fast Triage Matrix

| Symptom | Check First | Most Likely Area |
|---|---|---|
| `/health` fail | app process, config gate, DB, Redis | runtime foundation |
| `/health` warning ở `search` | search config, Elasticsearch reachability, index readiness | search/runtime integration |
| login fail | auth callback, session, provider config | auth |
| search/talent discovery sai hoặc rỗng bất thường | search runtime, index sync, fallback query path, `is_searchable` filter | search/users |
| notifications stale | Redis, notification query, persistence | notifications/cache |
| dashboards empty | DB query, aggregation query, permission boundary | admin/org dashboards |
| task workflow inconsistent | `task_status_id`, workflow transitions, status mirror, DB writes | tasks |
| review dispute stuck | callback path, review workflow, persistence | reviews |

## Review Dispute Incident Notes

Nếu domain đáng nghi là `reviews/disputes`, hãy nhớ sáu điểm này trước:

1. Không có `/org/disputes`; User-side exchange nằm trong card room của Project review board.
2. Project Task/Assigner/Environment Review Board cần project access và current organization đúng.
3. `report to admin` chuyển case sang System realm nhưng không cấp quyền `/admin` cho User.
4. System Admin chỉ xử lý trên `/admin/disputes` và `/api/admin/reviews/disputes/*`.
5. AI callback chỉ xử lý tiếp evaluation còn ở `queued` hoặc `processing`.
6. Reverse review theo task có thể “fail đúng thiết kế” vì flow submit đã bị product-deprecate.

Nếu chỉ cần khoanh rất nhanh:

- Project review card/board bị 403/rỗng: kiểm tra current org, project access, project id và board filter
- card room thiếu context: kiểm tra comment/evidence loaders và task-related comments
- `/admin/disputes` bị chặn: xác nhận đây là System Admin principal/session, không phải User có Organization role
- report lên admin không thành công: kiểm tra preconditions exchange và dispute status active
- AI callback bị từ chối: kiểm tra credential, timestamp, signature, evaluation status hiện tại
- reverse review submit báo lỗi business: xác nhận trước xem đó có phải hành vi deprecate theo product direction không

## Task Incident Notes

Nếu domain đáng nghi là `tasks`, hãy nhớ bốn điểm này trước:

1. `task_status_id` mới là workflow truth; `status` chỉ là mirror compatibility.
2. Nhiều task không được sang `DONE` nếu chưa có submission hợp lệ.
3. Submission bị `locked` thì không còn là lỗi UI đơn thuần nếu người dùng không sửa được nữa.
4. `/tasks/status-board` và `PATCH .../board-state` đã retired; 404 ở client cũ là tín hiệu cần chuyển sang Project Task Board cùng status/sort-order/batch commands, không phải khôi phục POC.
5. `/org/tasks*` là compatibility redirect; task delivery truth phải kiểm tra tại `/projects/:projectId/tasks`.

Nếu chỉ cần khoanh rất nhanh:

- task nhìn sai cột hoặc move sai: kiểm tra `task_status_id` và workflow transitions
- move sang `DONE` fail: kiểm tra submission status trước
- submission không sửa được: kiểm tra `locked`
- board patch conflict: kiểm tra payload conflict path trước khi kết luận data race thật
- legacy `/org/tasks*` redirect sai/không có đích: kiểm tra `current_project_id` và project access, rồi mở canonical Project Task Board

## Search Incident Notes

Nếu domain đáng nghi là `search/users`, hãy nhớ bốn điểm này trước:

1. talent search chỉ thử engine khi có keyword và runtime search đang bật
2. engine rỗng hoặc lỗi có thể làm query fallback về legacy DB path
3. talent candidate còn bị lọc bởi `status = active` và `profile_settings.is_searchable`
4. org talents và talent bookmarks còn có admin-shell permission boundary riêng

Nếu chỉ cần khoanh rất nhanh:

- keyword search lệch: kiểm tra engine index và projection trước
- talent page rỗng: kiểm tra cả fallback path lẫn `is_searchable`
- bookmark lỗi 403/empty: kiểm tra current org và admin-shell access
- health warning ở `search`: kiểm tra enable-state, ping, và ensure index

## When To Stop Reading This File

Dừng ở file này khi bạn đã trả lời được hai câu:

1. lỗi nằm ở runtime foundation hay business domain
2. domain nào đáng nghi nhất

Sau đó chuyển sang:

- [Runbook, Monitoring, Maintenance](./runbook-monitoring-maintenance.md) nếu còn ở mức vận hành
- [Architecture Overview](../03-architecture/architecture-overview.md) nếu cần đào sâu kỹ thuật

## What This File Does Not Promise

Bộ tài liệu hiện chưa có đầy đủ artifact riêng cho:

- backup/restore checklist
- disaster recovery playbook
- rollback procedure riêng
- escalation tree riêng

Nếu cần các phần này, xem [Runbook, Monitoring, Maintenance](./runbook-monitoring-maintenance.md) để biết boundary hiện có và phần nào còn thiếu.

## If You Need More Detail Next

1. [Runbook, Monitoring, Maintenance](./runbook-monitoring-maintenance.md)
2. [Architecture Overview](../03-architecture/architecture-overview.md)
3. [Architecture Diagram Catalog](../03-architecture/architecture-diagram-catalog.md)
4. [Diagram Guide](../11-diagrams/README.md)
