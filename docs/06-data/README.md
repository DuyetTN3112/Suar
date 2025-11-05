# Data Folder Guide

| Field | Value |
|---|---|
| Status | Active |
| Audience | Dev, QA, reviewer, data-minded reader, on-call |
| Purpose | Làm điểm vào rõ ràng cho tài liệu data để người đọc biết mở file nào trước thay vì đi mò schema, schema evidence, model, và diagram cùng lúc |
| Source of Truth | `docs/06-data/*`, schema/model/SQL evidence hiện tại |
| Last Reviewed | 2026-07-19 |
| Review Cycle | Khi schema, migration, model data shape, metric container, hoặc ERD đổi |
| Owner | Engineering |
| Stale Risk | Cao |

## Mở File Nào Khi Nào

Nếu bạn đang gấp:

- muốn biết API/data surface nào là thật: mở `api-specification.md`
- muốn biết bảng nào, entity nào, ERD nào cần tin: mở `database-design-erd-data-dictionary.md`
- muốn biết metric/dashboard/report hiện có gì thật: mở `metric-dashboard-report-analysis.md`

Runtime note mới:

- skill category canonical hiện là `technology`, `engineering`, `soft_skill`, `delivery`
- audit storage mới có enterprise metadata, scope projection, redaction flag, và hash fields
- với các phần này, ưu tiên migration/helper runtime mới hơn generated schema nếu hai nguồn chưa sync

## Fast Start By Situation

### Nếu bạn đang debug data/API issue

Đọc:

1. `api-specification.md`
2. `database-design-erd-data-dictionary.md`
3. `../05-api/api-landscape-and-governance.md`

### Nếu bạn đang viết chapter database/report

Đọc:

1. `database-design-erd-data-dictionary.md`
2. `metric-dashboard-report-analysis.md`
3. `../11-diagrams/README.md`

### Nếu bạn là on-call và page đang rỗng hoặc aggregate sai

Đọc:

1. `metric-dashboard-report-analysis.md`
2. `database-design-erd-data-dictionary.md`
3. `../09-operations/runbook-monitoring-maintenance.md`

## Nếu Bạn Chỉ Có 3 Phút

Chỉ cần nhớ ba ý:

1. `api-specification.md` để biết data/API surface nào hiện có thật.
2. `database-design-erd-data-dictionary.md` để biết entity, bảng, và ERD slice nào cần tin.
3. `metric-dashboard-report-analysis.md` để biết dashboard, metric, report-like output nào là runtime truth và chỗ nào chưa nên nói quá tay.

### Cần biết route/API nào tồn tại thật

Mở:

- `./api-specification.md`

### Cần hiểu database, entity groups, ERD slice, data dictionary

Mở:

- `./database-design-erd-data-dictionary.md`

### Cần hiểu metric, dashboard, report-like output, analysis pipeline

Mở:

- `./metric-dashboard-report-analysis.md`

## Người Đọc Nên Kỳ Vọng Gì

Folder này không phải nơi để kể mọi chi tiết implementation.

Nó phải giúp người đọc:

- hiểu dữ liệu chính của hệ thống nằm ở đâu
- biết nhóm entity nào quan trọng
- biết metric/report nào là thật, metric/report nào mới chỉ là ý tưởng
- mở đúng file đúng lúc thay vì lao thẳng vào code hay schema evidence

Một câu nhớ ngắn:

`Folder này không bắt bạn học thuộc schema. Nó giúp bạn biết phải nhìn đúng lát dữ liệu nào.`

## Điều Không Được Hiểu Sai

- có model hoặc schema field không có nghĩa business meaning đã được chuẩn hóa hoàn chỉnh
- có dashboard page không có nghĩa KPI owner, threshold, SLA đã được định nghĩa đầy đủ
- có schema evidence không có nghĩa mọi field trong schema evidence đều còn đang được runtime dùng y nguyên

## What Not To Do

- không mở schema evidence làm điểm vào đầu tiên nếu chưa biết domain slice đang quan tâm
- không dùng một ERD slice để kể toàn bộ data model của hệ thống
- không thấy field tồn tại rồi tự động gán business meaning nếu docs đã ghi caveat khác

## Nếu Bạn Đến Từ Role Khác Nhau

- manager hoặc reviewer: thường chỉ cần biết domain data nào tồn tại và boundary nào quan trọng
- dev hoặc QA: cần thêm ERD slice, runtime shape, và caveat data drift
- on-call: ưu tiên biết data concern nào có thể gây rỗng page, lệch workflow, hoặc aggregate sai

## Nếu Bạn Đang Viết Report Mà Không Có Code

Hãy đọc theo thứ tự:

1. `database-design-erd-data-dictionary.md`
2. `api-specification.md`
3. `metric-dashboard-report-analysis.md`
4. `../11-diagrams/README.md` rồi chọn đúng ERD/DFD slice khi cần minh họa

Mục tiêu là mô tả đúng:

- dữ liệu lõi nào đang tồn tại
- API/data surface nào có thật
- dashboard/metric/report nào đang là runtime truth

## Điểm Đọc Tiếp Theo

- `docs/05-api/api-landscape-and-governance.md`
- `docs/11-diagrams/README.md`
- `docs/12-evidence/source-register.md`

## Khi Nào Dừng Ở Folder Này

Dừng ở đây khi bạn đã biết:

1. concern của mình nằm ở API surface, schema/ERD, hay metric/dashboard
2. file nào trong `06-data` đang giữ phần giải thích chính
3. lúc nào cần xuống schema/model/SQL để verify sâu hơn
