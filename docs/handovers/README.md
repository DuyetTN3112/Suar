# Handovers Folder Guide

| Field | Value |
|---|---|
| Status | Active |
| Audience | Dev, reviewer, on-call doc editor |
| Purpose | Giải thích cách đọc đúng folder `docs/handovers/` |
| Last Reviewed | 2026-07-16 |
| Owner | Engineering |

## Folder Này Dùng Để Làm Gì

`docs/handovers/` là nơi lưu snapshot bàn giao theo session.

Nó hữu ích để biết:

- lúc đó team đang làm gì
- risk nào đã được nhìn thấy
- file nào từng bị nghi ngờ
- việc gì còn dang dở ở thời điểm bàn giao

## Folder Này Không Phải Là Gì

Không phải source of truth cuối cùng.

Lý do:

- có file ghi khi tính năng còn dang dở
- có file ghi trước khi code/tests được cập nhật tiếp
- có file đúng như checklist audit, nhưng không đủ để kết luận “đã xong”

Muốn đưa một ý từ handoff vào docs chính, phải promote qua:

- `docs/12-evidence/working-document-promotion-policy.md`
- `docs/12-evidence/workstream-status-audit.md`

## Quy Tắc Đọc

1. Dùng handoff để biết nơi cần kiểm tra.
2. Xác minh lại bằng route, controller, schema, test hiện tại.
3. Nếu handoff và code mâu thuẫn nhau, tin code trước.
4. Nếu chưa có bằng chứng code/test mới, xem handoff là lịch sử hoặc intent.
5. Không cite handoff như public docs nếu claim chưa được promote vào taxonomy chính.

## Trạng Thái Hiện Tại Của Folder

Các file trong folder này đã được đưa vào `docs/12-evidence/workstream-status-audit.md` để phân loại:

- `verified current`
- `partially stale`
- `stale`

Muốn biết file nào còn đáng tin ở mức nào, mở:

- `docs/12-evidence/workstream-status-audit.md`
- `docs/12-evidence/source-register.md`

## Bản Đồ Đọc Nhanh Theo File Hiện Có

### `2026-07-04-search-session-handoff.md`

Đọc file này khi bạn muốn hiểu:

- search rollout từng dừng ở đâu
- generic user-directory search từng là gap như thế nào
- vì sao search docs hiện tại nhấn mạnh runtime health và boundary

Đừng dùng file này để kết luận trạng thái search hiện tại.

Muốn biết trạng thái hiện tại, ưu tiên:

- `docs/03-architecture/architecture-overview.md`
- `docs/06-data/api-specification.md`
- `docs/09-operations/runbook-monitoring-maintenance.md`
- `docs/09-operations/production-incident-first-response.md`

### `2026-07-06-review-governance-session-handoff.md`

Đọc file này khi bạn muốn hiểu:

- review governance đã từng được chia thành những concern nào
- dispute, reverse review, task comment evidence từng được rollout ra sao
- test gap nào đã từng bị nhìn thấy

Đừng dùng file này để kết luận toàn bộ review governance đã hoàn tất.

Muốn biết trạng thái hiện tại, ưu tiên:

- `docs/01-business/feature-specification.md`
- `docs/05-api/api-landscape-and-governance.md`
- `docs/08-testing/test-case-matrix.md`
- `docs/09-operations/user-manual-admin-guide-faq-training.md`

## Rule Cho On-Call Và Incident

Nếu production đang lỗi, không bắt đầu từ handoff.

Thứ tự an toàn hơn:

1. mở docs chính trong taxonomy `00-12`
2. xác định route/runtime boundary hiện tại
3. chỉ quay lại handoff nếu cần hiểu vì sao code có shape như hôm nay
