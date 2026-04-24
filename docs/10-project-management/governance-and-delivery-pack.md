# Governance And Delivery Pack

## Mục đích

Tài liệu này tạo một artifact quản trị riêng trong `docs/10-project-management/` để cover sâu hơn các nhóm user yêu cầu:

- Project Plan
- Timeline / Roadmap
- Product Roadmap
- Meeting Minutes
- Risk Log
- Change Request
- Runbook
- Monitoring Document
- Maintenance Guide
- User Manual
- Admin Guide
- FAQ
- Training Material

Nếu bạn chỉ cần biết “hệ thống hiện có gì thật về governance”, hãy đọc:

1. `Những gì hệ thống có thật`
2. `Những gì hệ thống chưa có artifact độc lập`
3. `Đọc theo mục đích`

## Nếu Dùng File Này Để Viết Report Bên Ngoài Repo

Bạn có thể dùng file này để viết:

- phần governance và delivery readiness
- phần project-management artifact inventory
- phần nhận xét hệ thống hiện có và chưa có gì về PM/governance

Đây là file phù hợp để trả lời:

- bộ docs hiện hỗ trợ được tới đâu về governance/delivery
- runtime có admin/support/operations surfaces nào hỗ trợ governance thật
- artifact PM nào còn thiếu ở mức standalone

Bạn không nên dùng riêng file này để kết luận:

- dự án đã có đầy đủ PM handbook formal
- meeting minutes, change process, roadmap governance đều hoàn chỉnh như enterprise pack

Nếu cần operational proof hoặc evidence gap chi tiết hơn, đọc thêm:

- `../09-operations/runbook-monitoring-maintenance.md`
- `../12-evidence/workstream-status-audit.md`

## Safe External Summary

Nếu cần một câu tóm tắt an toàn cho report, có thể dùng:

`Ở lớp governance và delivery, Suar hiện có nhiều runtime và documentation signals thật cho admin surfaces, support flows, risk/change context, và operational guidance; tuy vậy bộ docs cũng ghi rõ các PM artifacts formal còn thiếu thay vì giả vờ chúng đã tồn tại đầy đủ.`

## Nếu Bạn Chỉ Có 3 Phút

Chỉ cần nhớ bốn ý:

1. Hệ thống hiện có governance signal thật ở `admin surfaces`, `operations docs`, `support surfaces`, `risk/change/roadmap context`.
2. Bộ tài liệu hiện chưa có nhiều standalone PM artifact kiểu formal board, minutes pack, hay legal policy riêng.
3. Vì vậy docs có thể nói phần runtime/context nào là thật, nhưng không được giả vờ PM governance đã hoàn chỉnh như một enterprise handbook đầy đủ.
4. Nếu production có vấn đề, pack này giúp biết docs cứu được tới đâu về delivery/governance, chứ không thay runbook incident.

## Nguồn kiểm chứng

- `docs/01-business/capability-model-and-product-positioning.md`
- `docs/10-project-management/project-plan-roadmap-risk-change-minutes.md`
- `docs/09-operations/runbook-monitoring-maintenance.md`
- `docs/09-operations/user-manual-admin-guide-faq-training.md`
- `docs/07-security/access-control-security-privacy-audit.md`
- `docs/12-evidence/source-register.md`
- `start/routes/admin.ts`
- `start/routes/reviews.ts`
- `start/routes/settings.ts`
- `start/routes/notifications.ts`
- `app/modules/admin/controllers/dashboard_controller.ts`
- `app/modules/admin/controllers/disputes/admin_disputes_controller.ts`
- `app/modules/settings/controllers/update_notification_settings_controller.ts`
- `app/modules/notifications/infra/repositories/notification_repository_provider.ts`

## Artifact Map

### Project Governance

- project plan / roadmap / risk / change / minutes:
  - `./project-plan-roadmap-risk-change-minutes.md`

Tài liệu này hiện là nơi cover context cho:

- planning baseline
- phased delivery
- risk register
- change intake
- governance note cho meeting/minutes

### Operations Governance

- runbook / monitoring / maintenance:
  - `../09-operations/runbook-monitoring-maintenance.md`
- user/admin/faq/training:
  - `../09-operations/user-manual-admin-guide-faq-training.md`

### Security And Audit Support

- access control / security / privacy / audit:
  - `../07-security/access-control-security-privacy-audit.md`

## Những gì hệ thống hiện có thật

### 1. System-admin operations surface

Từ `start/routes/admin.ts`, `start/routes/reviews.ts`, và admin controllers, runtime hiện có:

- dashboard
- user moderation
- organization inspection
- audit logs
- permission matrix
- flagged review queue
- dispute queue
- package/subscription management

Code audit nuance rất quan trọng:

- moderation/review governance hiện không nằm trong đúng một family web route duy nhất
- đang có ít nhất ba lớp surface song song:
  - `/admin/reviews/*` cho flagged-review family chính trong admin shell
  - `/admin/flagged-reviews/*` như một family moderation shell bổ sung
  - `/api/admin/reviews/*` cho admin JSON surfaces như dispute APIs và reverse-review read
- vì vậy nếu người đọc chỉ thấy chữ `admin review` rồi tưởng đây là một console đơn khối, họ sẽ rất dễ mô tả sai governance surface của runtime hiện tại

Điều này là evidence trực tiếp cho:

- admin guide
- monitoring/operations surface
- governance escalation path

Nói ngắn:

- governance có dấu vết trực tiếp ở runtime surface
- không chỉ có narrative docs nói suông

Một nuance khác đáng nhớ cho audit/report:

- `admin/disputes/ai-operator` không chỉ là page xem list
- controller hiện còn tự tổng hợp AI metrics theo provider
- bucket `failed` hiện đang gom cả evaluation `failed` lẫn `cancelled`

### 2. User-support surface

Từ `start/routes/settings.ts`, `start/routes/notifications.ts`, `start/routes/users.ts`, runtime hiện có:

- settings pages
- notification center
- profile workspace
- public profile snapshot
- bookmarks workspace

Đây là evidence trực tiếp cho:

- user manual
- FAQ
- training material

### 3. Incident and recovery context

Từ docs operations hiện có, hệ thống đang cho thấy:

- troubleshooting flow
- monitoring signals
- maintenance boundaries
- dependencies như PostgreSQL, Redis, session, OAuth

Điều này hữu ích đặc biệt cho manager hoặc lead muốn biết “nếu production có vấn đề thì docs hiện cứu được tới đâu”.

## Những gì hiện chưa có artifact độc lập

Working tree hiện chưa cho thấy các artifact riêng biệt kiểu:

- file meeting minutes theo từng cuộc họp
- change request form riêng theo từng yêu cầu
- product roadmap board export riêng
- privacy/legal standalone public policy document
- training deck hoặc slide deck riêng

Tài liệu này không bịa thêm nội dung như thể các file đó đã tồn tại. Nó chỉ ghi rõ:

- concern đã được cover ở mức context
- chưa thấy standalone artifact nguồn độc lập trong bộ tài liệu hiện có

Đây là ranh giới rất quan trọng.

- có context doc không có nghĩa đã có hồ sơ PM chuẩn chỉnh
- nhưng cũng không có nghĩa hệ thống hoàn toàn thiếu governance signal

## Đọc theo mục đích

### Nếu cần quản trị delivery

Đọc:

1. `./project-plan-roadmap-risk-change-minutes.md`
2. `../12-evidence/document-coverage-matrix.md`

### Nếu cần vận hành/support

Đọc:

1. `../09-operations/runbook-monitoring-maintenance.md`
2. `../09-operations/user-manual-admin-guide-faq-training.md`
3. `../07-security/access-control-security-privacy-audit.md`

### Nếu cần audit hệ thống quản trị

Đọc:

1. `../07-security/access-control-security-privacy-audit.md`
2. `../09-operations/runbook-monitoring-maintenance.md`
3. `../03-architecture/architecture-overview.md`

## Kết luận

`docs/10-project-management/` giờ có artifact nội dung thật để người đọc hiểu:

- artifact quản trị nào đang có
- artifact nào mới chỉ được cover dạng context
- runtime feature nào đang chứng minh được năng lực quản trị và vận hành của hệ thống

## Khi Nào Dừng Ở File Này

Dừng ở file này khi bạn đã biết:

1. concern của mình là `delivery planning`, `operations governance`, hay `support/admin governance`
2. hệ thống đang có artifact thật nào cho concern đó
3. chỗ nào mới chỉ là context chứ chưa phải standalone PM artifact
