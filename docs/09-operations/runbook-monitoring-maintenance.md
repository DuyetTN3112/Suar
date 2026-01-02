# Runbook, Monitoring, Maintenance

| Field           | Value                                                                                                                                        |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Status          | Active                                                                                                                                       |
| Audience        | DevOps, on-call, backend dev, QA, tech lead                                                                                                  |
| Purpose         | Tập hợp operational truth đang có thật trong hệ thống: kiểm tra sống/chết, monitoring surface, maintenance surface, và khoảng trống hiện tại |
| Source of Truth | `start/health.ts`, `start/routes/*`, `config/*`, `package.json`, `database/schema.ts`, `schema/migration evidence`                           |
| Last Reviewed   | 2026-07-23                                                                                                                                   |
| Review Cycle    | Khi health checks, runtime config, test scripts, hoặc support modules đổi                                                                    |
| Owner           | Engineering / platform                                                                                                                       |
| Stale Risk      | Rất cao                                                                                                                                      |

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

Nếu incident hoặc release review liên quan trực tiếp cache/Redis, dùng thêm:

- `./cache-redis-enterprise-readiness.md`
  cho topology, keyspace, failure modes, SLO, capacity, security, test pyramid, và
  production release gates.

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
- logger, Audit, error, notifications tạo ra monitoring signals
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
- cache invalidation outbox backlog, lease age, và dead-letter state
- custom application check
- search reachability và index readiness

Nguồn: `start/health.ts`

### Health Endpoint Access

Evidence hiện có:

- route liveness tối giản: `/live` (HTTP `204`, không công bố dependency state)
- route: `/health`
- bảo vệ bằng credential middleware
- `health-check credential` là gate quan trọng
- nếu env này chưa được cấu hình, middleware chặn luôn theo kiểu `secure by default`

Nguồn: `start/routes/index.ts`, `start/env.ts`

Không dùng `/health` làm liveness restart probe. Redis outage, search outage, hoặc
outbox backlog là readiness/operational failure; restart app không giải quyết các
nguyên nhân đó. External orchestrator/process manager nên dùng `/live`, còn load
balancer/deployment gate dùng protected `/health`.

### Recommended Triage Sequence

Chuỗi này phản ánh đúng những bề mặt hệ thống đang xác nhận:

1. Gọi `GET /live`; `204` chỉ chứng minh process có thể phục vụ HTTP.
2. Gọi `GET /health` với credential hợp lệ.
3. Nếu fail, khoanh vùng giữa app, DB, Redis, outbox, search, hoặc config gate.
4. Nếu nhận `503` rất sớm, kiểm tra trước xem `health-check credential` đã cấu hình chưa; đừng vội kết luận app hoặc DB đã chết.
5. Nếu health trả warning, đọc từng check name thay vì chỉ nhìn status tổng:
   - `application`: memory pressure hoặc host-level command issue
   - `search`: Elasticsearch unreachable, search disabled, hoặc ensure index fail
   - `db` / `db_connection_count`: DB sống nhưng đang nghẽn
   - `redis` / `redis_memory_usage`: cache, session, hoặc lock runtime đang bất ổn
   - `cache_invalidation_outbox`: worker chậm, lease kẹt, migration thiếu, hoặc có
     dead letter cần operator review
6. Nếu health pass nhưng feature lỗi, xác định module bị ảnh hưởng:
   - auth
   - tasks
   - reviews
   - notifications
   - settings
   - admin/org dashboards
   - search / talent discovery
7. Chạy check kỹ thuật tối thiểu:
   - `pnpm run typecheck`
   - `pnpm run lint`
8. Chạy targeted test suite gần nhất với vùng nghi lỗi:
   - `pnpm run test:unit`
   - `pnpm run test:integration`
   - `pnpm run test:contract`
   - `pnpm run test:e2e`
   - `pnpm run test:ui`
9. Nếu nghi ngờ persistence hoặc support runtime, đối chiếu:
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
- legacy `/org/tasks*` không resolve được Project board đích
- client cũ gọi retired status-board/board-state surface và nhận 404
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
- platform observability events cho search runtime

Nguồn: `start/health.ts`, `config/logger.ts`, `app/modules/audit/infra/repositories/audit_repository_provider.ts`, `app/modules/notifications/infra/repositories/notification_repository_provider.ts`, `app/modules/http/health_checks/search_health_check.ts`

Nên hiểu các signal này như sau:

- `health`: hệ nền còn sống không
- `logger/error/audit`: chuyện gì đang xảy ra
- `search runtime event`: search stack đang disabled, unreachable, hay vừa ensure index xong
- `notifications/Audit/admin dashboards`: ứng dụng đang tự kể gì về trạng thái của nó

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

### 1. Trộn Organization Management với Project Workspace

Current runtime tách:

- `/org/*`: governance, people/access, settings, audit, project portfolio;
- `/projects/:projectId/*`: bốn Project board;
- `/admin/*`: System realm riêng.

Vì vậy:

- không triage `/org/disputes`, vì page đó đã bị gỡ;
- 403 ở Project board phải kiểm tra project access, không chỉ Organization role;
- 403 ở `/admin/*` phải kiểm tra System principal, không cộng dồn User/Organization role.

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

### Cache Invalidation Outbox Operations

Outbox là durability boundary giữa PostgreSQL mutation và Redis cache deletion.
Không được thay nó bằng process-local retry.

Lệnh quan sát an toàn:

```bash
node ace cache:invalidation-status
```

Output là JSON low-cardinality gồm:

- `configured`
- `pending`
- `leased`
- `retryPending`
- `deadLetter`
- `processed`
- `oldestPendingAgeMs`

Exit code `2` nếu schema chưa được cài hoặc có dead letter.

Worker:

```bash
node ace cache:invalidation-worker
node ace cache:invalidation-worker --once
```

Không tăng concurrency tùy tiện. Mặc định là `1`, giới hạn `4`, vì mỗi pattern có
thể chạy `SCAN` trên keyspace. Scale worker phải dựa trên key cardinality, scan
latency, PostgreSQL backlog age, và Redis CPU thay vì chỉ nhìn số pending.

Replay DLQ bắt buộc:

- actor active có `can_manage_system_settings`;
- reason 10–500 ký tự;
- 1–100 outbox UUID hoặc cả hai sequence boundary với cửa sổ tối đa 100;
- root cause đã được khắc phục;
- theo dõi worker xử lý lại và audit event
  `cache.invalidation_outbox.replayed`.

Ví dụ:

```bash
node ace cache:invalidation-replay \
  --actor-id=<system-operator-uuid> \
  --reason="Redis recovered; reviewed cache invalidation is safe to retry." \
  --ids=<outbox-uuid>
```

Không:

- replay chỉ bằng `errorClass` vì selector đó không đủ chặt;
- sửa trực tiếp status/attempt trong PostgreSQL;
- xóa DLQ để làm health xanh;
- replay khi Redis/root cause vẫn đang lỗi;
- đưa cache pattern, user data, hay credential vào incident chat.

Readiness mặc định:

- warning khi pending `>= 1,000` hoặc oldest age `>= 30s`;
- failed khi pending `>= 10,000`, oldest age `>= 300s`, hoặc có bất kỳ DLQ;
- age threshold cấu hình bằng
  `CACHE_INVALIDATION_OUTBOX_WARN_AGE_SECONDS` và
  `CACHE_INVALIDATION_OUTBOX_FAIL_AGE_SECONDS`.

External deployment ordering:

1. provision/restore validated PostgreSQL baseline;
2. chạy migration một lần bằng pipeline/process quản trị bên ngoài;
3. chỉ start app và worker sau khi migration thành công;
4. verify `/live`, protected `/health`, và `cache:invalidation-status`.

Docker Compose trong repo không phải topology PostgreSQL/Redis hoặc deployment
source of truth của hệ thống này. Repo hiện không giữ toàn bộ historical base
migrations, nên database rỗng vẫn cần một versioned baseline schema artifact đã
restore-test. Incremental migration gate không được hiểu nhầm là full
clean-database bootstrap.

Trên workstation đã audit, nguồn local thực tế là một Compose stack độc lập tên
`laragon-linux`. Sau hardening ngày 2026-07-23, main Redis chạy riêng ở loopback
`6379` với RDB+AOF/noeviction; cache Redis chạy riêng ở loopback `6380` với
allkeys-lfu và không persistence. Redis Commander chỉ publish loopback `8082`;
Prometheus chỉ publish loopback `9090`; hai Redis exporter không publish host
port. Không chạy lệnh thay đổi stack này nếu chưa có maintenance window; đặc biệt
không dùng `docker compose down -v` vì named volume chứa dữ liệu.

Finding P0 ban đầu là wildcard IPv4/IPv6 kết hợp default ACL
`nopass +@all ~*`; đường truy cập từ host khác đã được chặn bằng loopback binding.
Residual risk local là cả hai Redis vẫn dùng default `nopass`, Commander chưa có
HTTP credential, chưa có HA, và chưa có production-scale/off-host restore drill.
Không mở lại port ra LAN trước khi có named ACL, secret delivery, management-UI
authentication và negative test.

`.env` ứng dụng đã được cập nhật có chủ đích trong cùng maintenance window để cache
dùng port `6380`; đây là thay đổi trực tiếp, tách biệt với `.env.example`. Về sau,
khi đổi ACL/password/TLS ở stack ngoài, `.env` hoặc secret manager vẫn phải được
cập nhật thủ công — sửa `.env.example` không bao giờ tự sửa `.env`.

### Main Redis RDB backup/restore drill

Chỉ chạy trên stack local đã audit:

```bash
REDIS_BACKUP_DRILL_CONFIRM=local-only pnpm run test:redis:backup-restore
```

Runner tạo một sentinel ngẫu nhiên TTL năm phút, yêu cầu `BGSAVE` thành công, copy
file RDB hoàn chỉnh ra thư mục tạm, chạy `redis-check-rdb`, rồi boot cùng Redis
image trong container `--network none`. Nó chỉ pass khi restore đọc đúng sentinel.
Cleanup luôn xóa sentinel trên main, tạo lại RDB sạch, dừng container tạm, và xác
nhận container ID của main/cache Redis, PostgreSQL, Elasticsearch không đổi.

Nếu runner bị ngắt hoặc fail, trước khi chạy lại phải kiểm tra:

1. main Redis `healthy`;
2. `DBSIZE`/namespace operations không còn sentinel drill;
3. `rdb_bgsave_in_progress=0` và `rdb_last_bgsave_status=ok`;
4. không còn container tên prefix `suar-redis-restore-drill-`;
5. AOF vẫn enabled, rewrite status `ok`.

Drill local này không thay thế backup production. Production cần phối hợp
multipart AOF rewrite, encrypted off-host copies, retention/immutability, freshness
alert, restore bằng dataset đại diện, và RPO/RTO được phê duyệt.

### Redis memory-pressure policy drill

Chỉ chạy semantics drill cô lập trên workstation/stack local đã audit:

```bash
REDIS_MEMORY_DRILL_CONFIRM=local-only pnpm run test:redis:memory-pressure
```

Runner đọc configuration của hai Redis thật và lưu container ID của main/cache,
PostgreSQL, Elasticsearch. Sau đó nó boot hai container tạm từ đúng Redis image
đang chạy, dùng `--network none`, non-root, read-only, drop capability, 96 MiB
container limit và Redis `maxmemory=16 MiB`. Nó không ghi hoặc tạo memory pressure
trên hai Redis thật.

Drill chỉ pass khi:

1. runtime thật vẫn là hai container riêng, main dùng `noeviction`, cache dùng
   `allkeys-lfu`, và container ceiling lớn hơn Redis `maxmemory`;
2. cache tạm có eviction, không có command error, rồi vẫn ghi/đọc được probe;
3. main tạm không eviction, giữ nguyên sentinel cũ, có command-error reply và từ
   chối một key probe mới tại memory boundary;
4. hai container tạm bị xóa và ID của cả bốn protected service không đổi.

Mốc ngày 2026-07-23 ghi nhận cache tạm có 29.394 eviction/0 error; main tạm có
0 eviction/639 error, vẫn đọc được sentinel và từ chối probe mới. Không dùng các
con số này làm capacity target vì chúng phụ thuộc allocator và workload.

Sau drill, xác nhận không còn container prefix
`suar-redis-cache-pressure-`/`suar-redis-main-pressure-`, hai Redis thật vẫn
`healthy`, và `DBSIZE` không đổi. Drill này chỉ chứng minh policy semantics; sizing
512 MiB/256 MiB, alert delivery, database fallback, session failure behavior và
recovery vẫn phải test dưới tải đại diện ở target environment.

### Redis monitoring baseline

Source of truth local nằm cùng stack ngoài:

- `monitoring/redis/prometheus.yml`;
- `monitoring/redis/rules/redis.rules.yml`;
- các service `redis-exporter-main`, `redis-exporter-cache`,
  `redis-prometheus`.

Exporter và Prometheus đều pin image bằng digest, chạy non-root/read-only, drop
toàn bộ capability. Exporter chỉ có port nội bộ; Prometheus UI/API chỉ mở tại
`http://127.0.0.1:9090`.

Validate trước khi apply:

```bash
docker compose config --quiet
docker run --rm --entrypoint /bin/promtool \
  -v "$PWD/monitoring/redis:/etc/prometheus:ro" \
  prom/prometheus@sha256:3c42b892cf723fa54d2f262c37a0e1f80aa8c8ddb1da7b9b0df9455a35a7f893 \
  check config /etc/prometheus/prometheus.yml
```

Sau khi start, kiểm tra `Targets`, `Rules`, và `Alerts` trên UI. Baseline hiện có
hai target `redis_up=1`, một recording rule hit-ratio và 15 alert rules. Drill thật
đã chứng minh khi dừng cache, metric cache đổi thành `0`, alert
`RedisCacheUnavailable` chuyển `pending`, và metric trở về `1` sau recovery.

Đây mới là local alert evaluation. Chưa có Alertmanager/receiver nên alert chưa
gửi page/email/chat; chưa có dashboard được review, centralized retention,
application cache scrape/discovery, hoặc production TLS/auth cho UI. Không được
dùng trạng thái `rule health=ok` để tuyên bố production monitoring hoàn tất.

### Application cache metrics

Ứng dụng expose Prometheus text tại `GET /metrics/cache`. Route dùng
`METRICS_API_KEY` riêng qua guard timing-safe, không dùng chung
`HEALTH_CHECK_API_KEY`; cả hai route đều secure-by-default khi thiếu key. Endpoint
chỉ export counters/histograms với label hữu hạn `operation`, `outcome`, `mode`,
`kind`; không export logical cache key, value, user hoặc organization.
Khai báo trong `.env.example` chỉ mô tả contract; runtime `.env` hoặc secret
manager phải được cấu hình riêng và không bao giờ tự đồng bộ từ file example.

Smoke-test một app instance:

```bash
curl --fail --silent \
  --header @/run/secrets/suar_metrics_curl_header \
  http://127.0.0.1:3333/metrics/cache |
  docker run --rm -i --entrypoint /bin/promtool \
    prom/prometheus@sha256:3c42b892cf723fa54d2f262c37a0e1f80aa8c8ddb1da7b9b0df9455a35a7f893 \
    check metrics
```

File `suar_metrics_curl_header` phải có đúng một dòng
`x-api-key: <secret>`, permission chỉ cho operator đọc. Không bật shell tracing,
không đưa secret lên command line, và không log header. Negative test không có
hoặc sai key phải trả `401` và không chứa tên metric.

Local Prometheus stack chưa tự scrape app vì app dev không phải service luôn chạy.
Khi target environment có service discovery ổn định, cấu hình mỗi instance với
`metrics_path: /metrics/cache`, TLS, sample/label limits, và custom header đọc từ
secret file; không ghi API key trực tiếp vào YAML:

```yaml
http_headers:
  x-api-key:
    files:
      - /run/secrets/suar_health_check_api_key
```

Sau khi reload, yêu cầu tất cả app target `up=1`, kiểm tra process-start series để
phát hiện counter reset, và alert trên read error, best-effort skip, invalidation
error, lock unavailable/wait timeout, lease error/loss/cap, cùng latency histogram.
Endpoint process-local nên một target duy nhất không đại diện cho toàn fleet;
collector phải giữ label instance ổn định và aggregate bằng PromQL.

Với namespace dùng distributed `remember`, mặc định waiter chờ tối đa 5 giây và
owner heartbeat lease 500 ms một lần. Chỉ tăng `waitTimeoutMs` sau khi có source
p99, request deadline và database concurrency budget; giá trị hợp lệ là
100–30.000 ms. Điều tra khi:

- `suar_cache_lock_wait_total{outcome="timeout"}` tăng: callback vượt waiter
  budget hoặc owner bị kẹt;
- `suar_cache_lock_lease_total{outcome="error"}` tăng: Redis/transport lỗi khi gia
  hạn;
- `outcome="lost"` tăng bất ngờ: ownership đổi, lease hết hoặc có contention
  anomaly;
- `outcome="capped"` tăng: callback vượt maximum lease lifetime và có thể được
  process khác takeover.

Không bật stale-while-revalidate chung cho permission-dependent cache. Mỗi
namespace phải có staleness/security contract riêng trước khi cho phép trả stale.

### Cache outage and recovery drill

Chỉ chạy drill này trên workstation/stack thử nghiệm dành riêng. Không dừng cache
trong môi trường dùng chung, và không dùng `docker compose down` hoặc xóa volume.
Wrapper điều phối phải đăng ký cleanup/trap để luôn chạy lại
`docker compose up -d redis-cache` rồi chờ health `healthy`, kể cả khi test fail
hoặc bị ngắt.

Runner chuẩn của repo đã thực hiện các guardrail trên:

```bash
CACHE_CHAOS_CONFIRM=local-only pnpm run test:redis:resilience
```

Có thể truyền `CACHE_REDIS_COMPOSE_FILE` nếu stack local nằm ở vị trí khác. Runner
từ chối chạy nếu cache/main không phải hai container riêng, cache không bind
loopback, service bắt buộc không chạy, hoặc port giả lập outage đang được sử dụng.

Ba regression test có mục đích khác nhau:

- `cache_service_unavailable.spec.ts`: trỏ `REDIS_CACHE_PORT` vào port local không
  sử dụng và bật `CACHE_UNAVAILABLE_INTEGRATION=1`; chứng minh API best-effort
  không chờ reconnect;
- `list_tasks_cache_outage.spec.ts`: dừng đúng service `redis-cache`, bật
  `CACHE_OUTAGE_FLOW=1` và `CACHE_CLEANUP_ALLOW_CACHE_OUTAGE=1`; chứng minh một
  flow có authorization vẫn trả dữ liệu PostgreSQL trong deadline, đồng thời
  operations collector vẫn đọc được Prometheus metrics bằng credential riêng;
- `cache_service_recovery.spec.ts`: bật `CACHE_RECOVERY_FLOW=1` và truyền hai
  gate-file path duy nhất; wrapper mở gate outage sau khi test báo ready, restart
  cache, đợi health, rồi mở gate restore. Test phải dùng cùng một process để chứng
  minh reconnect thật, không phải reconnect nhờ restart ứng dụng.

Tất cả test Redis thật phải đặt `CACHE_INTEGRATION_DRIVER=redis`. Sau drill, xác
nhận:

1. main Redis, cache Redis và Redis Commander đều `healthy`;
2. Prometheus vẫn `healthy`, exporter không restart, và cache alert chuyển
   `pending` rồi metric phục hồi về `1`;
3. port vẫn chỉ bind `127.0.0.1`;
4. main Redis vẫn có AOF/RDB và `noeviction`;
5. cache Redis vẫn `allkeys-lfu`, không persistence;
6. không còn key test trong cả hai data plane;
7. PostgreSQL và Elasticsearch không bị recreate/restart bởi drill.

Mốc local hiện tại là khoảng 20–30 ms với port không tồn tại, khoảng 120–140 ms
cho `List Tasks` khi container cache bị dừng, và cùng client đã reconnect thành
công trong drill stop/start khoảng sáu giây. Đây là regression evidence, không
phải production SLO hay load capacity evidence.

### Configuration Surfaces

- runtime config schema: `start/env.ts`
- DB config: `config/database.ts`
- Redis config: `config/redis.ts`
- session: `config/session.ts`
- distributed lock: `config/lock.ts`
- shield: `config/shield.ts`
- limiter: `config/limiter.ts`

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

Nguồn: `docs/11-diagrams/Architecture/01-system-architecture/overview/arch_01_system.mmd`, `docs/11-diagrams/Package/01-overview/overview/pkg_01_overview.mmd`, `docs/11-diagrams/Action/01-task-management/README.md`, `docs/11-diagrams/ERD/03-task-marketplace/overview/logical_erd_03_task_marketplace.mmd`

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
