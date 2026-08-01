# Notification Center — Remaining Work and Production Qualification

> Trạng thái tại ngày 2026-07-26: có thể xem phần implementation của core đã hoàn thiện khoảng
> 90%. Con số này không phải mức production readiness. Hệ thống chỉ được tuyên bố production-ready
> sau khi toàn bộ gate trong tài liệu này có bằng chứng đạt yêu cầu.

`90%` là nhãn planning để mô tả rằng các khối kiến trúc chính đã được implement; đây không phải
phần trăm được suy ra từ story point, coverage hoặc production SLO và không được dùng làm acceptance
evidence.

Snapshot metadata:

- Last verified: `2026-07-26`, Asia/Ho_Chi_Minh.
- Reference `HEAD`: `cbf08b6cf352281d7e32f29da6d9af297859ca11`.
- Các kết quả bên dưới được chạy trên working tree còn thay đổi chưa commit, không phải chứng nhận
  cho riêng reference commit.
- Khi mở lại công việc, phải cập nhật metadata và chạy lại gate; không tái sử dụng kết quả cũ.

## 1. Mục đích

Tài liệu này lưu lại 10% công việc còn lại để một phiên làm việc sau có thể tiếp tục mà không cần
đánh giá lại toàn bộ Notification Center từ đầu.

Các tài liệu nguồn vẫn giữ vai trò riêng:

- [Enterprise reliability design](../superpowers/specs/2026-07-23-notification-center-reliability-design.md):
  các guarantee và quyết định kiến trúc.
- [Implementation plan and evidence gates](../superpowers/plans/2026-07-23-notification-center-reliability.md):
  kế hoạch triển khai và evidence gate.
- [Operations runbook](notification-center-operations-runbook.md): quy trình vận hành authoritative.
- [Producer inventory](notification-producer-inventory.md): ma trận producer và migration runtime.

## 2. Baseline đã hoàn thành

Core hiện tại đã có các khối chính sau:

- PostgreSQL là canonical source of truth.
- Transactional acceptance, idempotency ledger, recipient revision và durable outbox.
- Fan-out bền vững với frozen audience, lease fencing, heartbeat, retry và dead-letter.
- Elasticsearch là projection có thể rebuild; có strict mapping, external revision, versioned
  physical index, read/write aliases và tombstone.
- Có workflow rebuild, reconcile, explicit promotion, rollback và retirement.
- Feed cursor được ký, ràng buộc recipient/query context, có expiry và key rotation.
- Elasticsearch read path có shadow comparison, circuit breaker và PostgreSQL fallback.
- PostgreSQL fallback được giới hạn theo instance và toàn cluster bằng Redis admission lease.
- Unread count dùng revisioned Redis cache nhưng luôn có canonical fallback.
- Realtime invalidation và session revocation hoạt động qua Redis cho nhiều web instance.
- Có retention, health check, metrics, administrative CLI, audit evidence và operations runbook.
- API contract, backend unit/integration và Notification UI đã có test chuyên biệt.

Các nguyên tắc không được thay đổi khi tiếp tục:

1. Không chuyển source of truth sang Elasticsearch.
2. Không dùng Elasticsearch để hoàn tất canonical write transaction.
3. Không promote read path chỉ vì index đã có dữ liệu.
4. Không bỏ PostgreSQL fallback trước khi có bằng chứng vận hành dài hạn.
5. Không tăng threshold để che incident khi chưa có capacity evidence.

## 3. Snapshot kiểm thử hiện tại

Kết quả kiểm tra gần nhất:

| Gate                              | Kết quả                                                                  |
| --------------------------------- | ------------------------------------------------------------------------ |
| TypeScript `tsc --noEmit`         | Pass trên local working tree ngày 2026-07-26                             |
| Notification backend unit         | 82/82 pass                                                               |
| Notification API contract         | 4/4 pass                                                                 |
| Notification UI                   | 15/15 pass                                                               |
| Redis global fallback admission   | 3/3 pass với Redis thật                                                  |
| Notification integration tổng hợp | Từ nhiều lượt xác minh: 64 pass-equivalent, 1 deterministic fail còn lại |

Các số liệu trên là diagnostic snapshot, chưa phải release evidence vì chưa chạy trên một clean
source state với artifact/log bundle bất biến. Nếu tài liệu implementation plan cũ chứa kết quả
khác, snapshot có ngày và source state mới hơn được ưu tiên, nhưng release vẫn phải chạy lại toàn bộ.

### 3.1 Blocker integration còn lại

Test `prepares a reconciled target and requires explicit promotion before alias cutover` trong
`app/modules/notifications/tests/backend/integration/notification_projection_rebuild.spec.ts`
đang cố định application clock ở `2026-07-23`, trong khi repository chủ ý kiểm tra thời hạn
rollback bằng PostgreSQL `clock_timestamp()`. Tại ngày 2026-07-26, rollback window do test tạo ra
đã hết hạn và production code từ chối với:

```text
notification_projection_rollback_state_changed
```

Đây là test không độc lập với thời gian, không phải bằng chứng cho phép nới lỏng kiểm tra expiry
trong production repository.

Acceptance criteria:

- Test lấy reference time từ PostgreSQL và tạo `required_until` tương đối từ chính database time
  đó; không tính deadline từ frozen application clock độc lập.
- Nếu test cần application clock cố định, application clock phải được đồng bộ với database
  reference time trước khi tạo target.
- Vẫn giữ kiểm tra lại database clock bên trong exclusive cutover fence.
- Có test riêng chứng minh rollback hết hạn bị từ chối.
- File integration chạy pass vào bất kỳ ngày thực tế nào.

### 3.2 Test isolation cần gia cố

Lần chạy tổng hợp đầu tiên của `accept_notification.spec.ts` thấy một acceptance-ledger row tồn dư
từ phiên test trước. Chạy lại riêng file sau teardown thì 6/6 test pass.

Acceptance criteria:

- Nhóm test dọn dữ liệu liên quan ở `group.setup` hoặc dùng transaction/database isolation bảo đảm
  precondition sạch trước test đầu tiên.
- Cleanup không phụ thuộc việc phiên test trước đã kết thúc thành công.
- Chạy lặp lại suite ít nhất ba lần trên cùng test database vẫn cho cùng kết quả.

### 3.3 Redis integration phải trở thành gate rõ ràng

Ba test global fallback admission chỉ chạy khi có `CACHE_INTEGRATION_DRIVER=redis`. Chúng đã pass
với Redis thật, nhưng một invocation integration thông thường có thể skip chúng.

Acceptance criteria:

- CI production-qualification có job Redis integration bắt buộc.
- Job fail nếu Redis test bị skip.
- Redis endpoint của test độc lập và được test-datastore guard xác nhận an toàn.

## 4. Backlog còn lại

Thứ tự bắt buộc là `P0 → P1 → P2`. Không bắt đầu staging promotion khi P0 chưa xanh; không bật
shadow khi P1 chưa có target-environment evidence; không bật Elasticsearch canary khi toàn bộ
shadow gate chưa đạt. Một mục có checkbox hoàn thành nhưng không có dated evidence và owner vẫn
được xem là chưa hoàn thành.

### P0 — Đóng codebase acceptance gate

- [ ] Sửa test rollback phụ thuộc ngày thực tế mà không làm yếu database-clock fencing.
- [ ] Gia cố pre-test cleanup cho acceptance ledger và các bảng Notification liên quan.
- [ ] Chạy Notification unit, integration, contract và UI từ datastore sạch.
- [ ] Chạy toàn bộ TypeScript, lint và architecture boundary gates.
- [ ] Kiểm tra `git diff --check` và GitNexus `detect-changes`.
- [ ] Tách hoặc review các thay đổi Notification trong worktree lớn hiện tại; không mặc định mọi
      thay đổi đang có đều thuộc Notification. Dùng producer inventory, GitNexus change detection và
      review theo path để xác nhận scope.
- [ ] Ghi lại exact commands, commit SHA và kết quả gate làm evidence.

P0 hoàn thành khi không còn test fail/skip không chủ ý và thay đổi có thể review trên một source
state xác định.

Evidence pack nên được lưu dưới một đường dẫn có ngày, environment và commit SHA, ví dụ
`docs/notifications/evidence/<date>-<environment>-<short-sha>/`, hoặc trong CI artifact store với
permanent link từ change record. Tối thiểu phải có command, exit code, datastore target đã được
redact, cấu hình feature mode, timestamp, owner và log tóm tắt.

### P1 — Staging qualification

#### Database và migration

- [ ] Rehearse toàn bộ migration Notification trên bản sao staging có volume gần production.
- [ ] Đo lock time, migration duration, WAL growth và ảnh hưởng đến request latency.
- [ ] Kiểm tra index size, query plan và autovacuum cho outbox, fan-out, ledger, recipient state và
      projection operation tables.
- [ ] Xác nhận backup, PITR, restore drill và topology PostgreSQL thực tế.
- [ ] Không tuyên bố RPO 0 nếu môi trường không có synchronous standby phù hợp.

#### Elasticsearch projection

- [ ] Tạo physical index mới bằng command rebuild, không gắn live alias sớm.
- [ ] Backfill theo bounded batch và lưu duration/throughput/error evidence.
- [ ] Reconcile missing, stale, extra và ahead revisions về zero blocking mismatch.
- [ ] Xác nhận read/write alias cùng trỏ tới đúng một primary target.
- [ ] Diễn tập interrupted rebuild, resume, failed reconciliation và physical-index cleanup.
- [ ] Xác nhận snapshot/restore, disk watermark và capacity cho thời gian tồn tại đồng thời hai
      physical index trong rollback window.

#### Capacity và soak

- [ ] Xác định tải mục tiêu: acceptance rate, fan-out size, feed read QPS, unread QPS và SSE
      connections.
- [ ] Chạy sustained load và burst load với dữ liệu có phân phối gần production.
- [ ] Đo PostgreSQL CPU/IO/connections, outbox age, ES indexing latency, Redis memory và event-loop
      lag.
- [ ] Chứng minh backlog sau một giờ dependency outage có thể drain trong mục tiêu đã phê duyệt.
- [ ] Chọn worker count, concurrency và batch size dựa trên số đo, không dựa vào phỏng đoán.

#### Failure drills

- [ ] Elasticsearch unavailable/slow/partial bulk failure.
- [ ] Redis main unavailable, cache Redis unavailable và Redis lease timeout.
- [ ] Worker chết trước/sau heartbeat và stale lease holder cố ACK.
- [ ] PostgreSQL connection pressure và fallback admission budget bị đầy.
- [ ] Web instance restart trong khi có SSE connections.
- [ ] Poison outbox/fan-out item, DLQ replay và terminal discard có audit.
- [ ] Alias swap thành công nhưng application mất kết nối trước khi nhận response.

Mỗi drill phải ghi expected behavior, actual behavior, metrics, recovery time và follow-up.

### P1 — Security và operability

- [ ] Tạo `NOTIFICATION_FEED_CURSOR_SECRET` riêng, tối thiểu 32 byte; không tái sử dụng `APP_KEY`
      trong production.
- [ ] Chuẩn bị key-rotation procedure và bounded previous-key ring.
- [ ] Bật TLS, named ACL users và least-privilege permissions cho hai Redis data plane.
- [ ] Dùng Elasticsearch credentials chỉ có quyền trên notification indices/aliases cần thiết.
- [ ] Tách `METRICS_API_KEY`, health key và administrative operator authorization.
- [ ] Xác nhận logs/metrics không chứa recipient ID raw, notification content hoặc secret.
- [ ] Định nghĩa alert cho outbox/fan-out age, DLQ, projection lag, shadow mismatch, circuit state,
      fallback rejection, SSE readiness và Redis memory.
- [ ] Gắn dashboard, alert owner, escalation path và runbook link.

### P2 — Controlled read-path rollout

Không nhảy trực tiếp từ PostgreSQL sang Elasticsearch.

#### Phase 0 — PostgreSQL

```text
NOTIFICATION_FEED_READ_MODE=postgres
```

Gate:

- Canonical feed nằm trong error budget.
- Outbox và projection pipeline ổn định.
- Rebuild/reconcile và rollback drill đã pass.

#### Phase 1 — Shadow

```text
NOTIFICATION_FEED_READ_MODE=shadow
```

Gate:

- Response vẫn lấy từ PostgreSQL.
- Đã quan sát đủ traffic đại diện.
- Không có ahead revision.
- Missing/stale/ordering mismatch và projection lag nằm trong ngưỡng được phê duyệt.
- Shadow comparison không làm vượt latency/capacity budget.

Ngưỡng production tối thiểu authoritative từ Operations Runbook §14:

- ít nhất 10.000 shadow samples trong ít nhất 24 giờ;
- zero unexplained ID/order/state mismatch cũ hơn 5 giây;
- projection p99 lag không quá 5 giây;
- Elasticsearch timeout/error rate dưới 0,1%;
- stale revision resurrection và tenant leakage bằng zero;
- forced PostgreSQL fallback drill thành công;
- sustained worker throughput ít nhất 2 lần measured peak acceptance;
- backlog của một giờ dependency outage drain trong 15 phút;
- không có database connection starvation hoặc Elasticsearch rejection storm;
- có measured storage-growth/retention evidence và PostgreSQL failover verification.

Business latency/error budgets, traffic model, environment và người phê duyệt phải được ghi trong
change record của lần rollout; tài liệu này không tự đặt các giá trị business chưa được thống nhất.

#### Phase 2 — Elasticsearch canary

```text
NOTIFICATION_FEED_READ_MODE=elasticsearch
```

Chỉ áp dụng cho canary deployment/traffic slice trước.

Gate:

- Search error, circuit-open và fallback rate nằm trong error budget.
- Global PostgreSQL fallback budget không bị bão hòa.
- Cursor pagination, recipient isolation và unread semantics được xác nhận bằng production-like
  traffic.
- Có người chịu trách nhiệm và rollback command/config đã chuẩn bị sẵn.

#### Phase 3 — Mở rộng dần

- [ ] Tăng traffic theo các bước nhỏ có observation window rõ ràng.
- [ ] Dừng promotion nếu SLO, capacity hoặc consistency gate bị vi phạm.
- [ ] Giữ `NOTIFICATION_FEED_READ_MODE=postgres` là rollback đầu tiên.
- [ ] Chỉ dùng alias rollback khi target cũ còn rollback-eligible, reconciled và chưa hết
      `required_until`.

## 5. Definition of Done

Notification Center chỉ được đánh dấu hoàn tất production core khi tất cả điều kiện sau đúng:

- [ ] P0 không còn mục mở.
- [ ] Migrations và restore drill có evidence trên target environment.
- [ ] Load/soak và failure drills đạt SLO đã phê duyệt.
- [ ] Rebuild, reconcile, promote và rollback đều được diễn tập.
- [ ] Security controls được triển khai bằng secret/config thực, không phải placeholder.
- [ ] Dashboard và paging alerts đã hoạt động, có owner và runbook.
- [ ] Shadow qualification đủ dài và không còn blocking mismatch.
- [ ] Elasticsearch canary đạt error budget, fallback không gây PostgreSQL overload.
- [ ] Có change approval và rollback evidence cho lần production promotion.
- [ ] Full test/build/architecture gate pass trên đúng commit được deploy.

## 6. Lệnh khởi động lại công việc

Các lệnh dưới đây là điểm bắt đầu, không thay thế target-environment evidence:

```bash
pnpm exec tsc --noEmit
pnpm run lint

pnpm run test:unit
pnpm run test:integration:safe
pnpm run test:contract

node --import=@poppinss/ts-exec bin/test.ts integration \
  --files app/modules/notifications/tests/backend/integration/notification_projection_rebuild.spec.ts

CACHE_INTEGRATION_DRIVER=redis \
  node --import=@poppinss/ts-exec bin/test.ts integration \
  --files app/modules/notifications/tests/backend/integration/notification_feed_fallback_admission_redis.spec.ts

node --import=@poppinss/ts-exec bin/test.ts contract \
  --files app/modules/notifications/tests/backend/contract/notification_api_standardization.contract.spec.ts

pnpm exec vitest run \
  inertia/apps/user/tests/modules/notifications/notification_center_store.test.ts \
  inertia/apps/user/tests/modules/notifications/notifications_page.test.ts

pnpm run check:arch:backend:side-effects
pnpm run check:arch:backend:module-domain-boundary
pnpm run check:arch:backend:public-contract-surface
pnpm run check:arch:backend:exceptions
git diff --check
gitnexus detect-changes
```

Sau khi P0 xanh, tiếp tục bằng các command và evidence procedure trong
[operations runbook](notification-center-operations-runbook.md), không tự suy diễn quy trình
promotion từ checklist rút gọn này.

## 7. Quyết định tạm thời

Cho tới khi backlog này được mở lại:

- Giữ `NOTIFICATION_FEED_READ_MODE=postgres`.
- Chỉ chạy projection workers trong non-serving environment đã được phê duyệt để tích lũy và kiểm
  tra projection. Production workers chỉ được chạy khi các P1 gate liên quan đến credentials,
  storage headroom, dependency capacity và observability đã đạt.
- Không coi lượng dữ liệu runtime hiện tại là bằng chứng capacity.
- Không promote Elasticsearch chỉ để “giảm tải PostgreSQL” khi chưa chứng minh fallback và
  projection pipeline không tạo failure amplification.
- Khi tiếp tục, bắt đầu từ P0 và snapshot lại trạng thái test trước khi sửa code.
