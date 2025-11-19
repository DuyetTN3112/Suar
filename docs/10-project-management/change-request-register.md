# Change Request Register

## Mục đích

Tài liệu này tách riêng concern `Change Request` thành artifact độc lập.

Bộ tài liệu hiện chưa có mẫu CR chính thức. Vì vậy register này chỉ liệt kê những vùng thay đổi kỹ thuật có evidence rõ trong hệ thống và bộ docs đã được đối chiếu.

## Change Candidates Observed

| CR ID | Change theme | Evidence | Affected areas |
|---|---|---|---|
| CR-01 | Competency evidence repositioning | `docs/01-business/capability-model-and-product-positioning.md` | product framing, docs, review/profile model |
| CR-02 | Task workflow normalization | task model, workflow routes, schema evidence | task statuses, transitions, board behavior |
| CR-03 | Marketplace ranking and application processing | `start/routes/tasks.ts`, task queries, tests | talent matching, application triage |
| CR-04 | Review dispute AI callback integration | `start/routes/reviews.ts`, reviews README | dispute case handling, callback security |
| CR-05 | Profile snapshot and talent bookmark expansion | `start/routes/users.ts`, users README | profile sharing, talent sourcing |
| CR-06 | Notifications and settings persistence hardening | `start/routes/notifications.ts`, `start/routes/settings.ts`, settings README | support surfaces, user preference storage |
| CR-07 | Admin dashboards and moderation surfaces | `start/routes/admin.ts`, reviews/admin README | governance, visibility, moderation |

## Boundary

- Đây không phải CR workflow chuẩn có submitter/approver/status riêng.
- Đây là register kỹ thuật giúp người đọc thấy các vùng thay đổi có thật trong hệ thống.

## Khi Nào Dừng Ở File Này

Dừng ở file này khi bạn đã biết:

1. change concern của mình đang rơi vào theme nào
2. vùng hệ thống nào bị ảnh hưởng theo evidence hiện có
3. lúc nào cần sang governance pack, risk log, hay workstream audit để đọc thêm context
