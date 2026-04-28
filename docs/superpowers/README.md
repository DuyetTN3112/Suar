# Superpowers Folder Guide

| Field | Value |
|---|---|
| Status | Active |
| Audience | Dev, tech lead, reviewer, doc maintainer |
| Purpose | Giải thích cách dùng đúng `docs/superpowers/` mà không nhầm plan/spec thành trạng thái runtime |
| Last Reviewed | 2026-07-16 |
| Owner | Engineering |

## Folder Này Chứa Gì

`docs/superpowers/` là workspace thiết kế và triển khai.

Nó có bốn nhóm chính:

- `handoffs/`: snapshot bàn giao theo session
- `plans/`: kế hoạch triển khai từng đợt
- `specs/`: thiết kế và target architecture
- `mockups/`: artifact UI để hình dung hướng đi

## Giá Trị Thật Của Folder Này

Folder này rất mạnh ở ba việc:

- nói rõ team đã định làm gì
- chỉ ra blast radius của một đợt refactor
- giúp audit lại feature nhanh hơn vì đã gom concern theo workstream

## Nguy Cơ Lớn Nhất

Người đọc rất dễ nhầm:

- `spec` thành “runtime đã đúng như vậy”
- `plan` thành “đã triển khai xong”
- `handoff` thành “trạng thái mới nhất”

Đó là cách docs chết dần.

## Quy Tắc Đọc

1. Dùng `spec` để hiểu target state.
2. Dùng `plan` để biết rollout dự tính và file chịu tác động.
3. Dùng `handoff` để biết trạng thái tạm thời và điểm cần audit lại.
4. Dùng code, route, schema, test để xác nhận trạng thái thật hiện tại.

## Khi Nào Được Trích Dẫn Vào Docs Chính

Chỉ khi claim đã được xác nhận lại bằng:

- route hiện tại
- controller hoặc mapper hiện tại
- schema/model hiện tại
- test hiện tại

Nếu chưa qua bước này, chỉ được ghi là:

- `planned`
- `target state`
- `historical context`

Rule đầy đủ nằm ở:

- `docs/12-evidence/working-document-promotion-policy.md`
- `docs/12-evidence/workstream-status-audit.md`

Nói ngắn:

- `plans/` không chứng minh đã làm xong
- `specs/` không chứng minh runtime đã khớp target
- `handoffs/` không chứng minh trạng thái mới nhất
- `mockups/` không chứng minh UI đã ship
- phần nào đã đúng thì phải được promote vào docs chính rồi mới dẫn người đọc tới đó

## Điểm Đọc Tiếp Theo

- `docs/12-evidence/workstream-status-audit.md`
- `docs/12-evidence/source-register.md`

## Bản Đồ Chủ Đề Sang Docs Chính

Nếu bạn mở `docs/superpowers/` vì đang cần hiểu hệ thống hiện tại, đi theo map này trước:

| Chủ đề trong `superpowers` | Nơi nên đọc trước trong docs chính |
|---|---|
| Search rollout, search health, search consumers | `docs/03-architecture/architecture-overview.md`, `docs/09-operations/runbook-monitoring-maintenance.md`, `docs/09-operations/production-incident-first-response.md` |
| Review/dispute/reverse review | `docs/01-business/feature-specification.md`, `docs/05-api/api-landscape-and-governance.md`, `docs/08-testing/test-case-matrix.md` |
| Capability model / profile / marketplace framing | `docs/01-business/capability-model-and-product-positioning.md`, `docs/01-business/features/profile_pipeline_and_marketplace.md` |
| API boundary / governance | `docs/05-api/api-landscape-and-governance.md`, `docs/06-data/api-specification.md` |
| Pagination surface / rollout | `docs/05-api/api-landscape-and-governance.md`, `docs/09-operations/user-manual-admin-guide-faq-training.md`, `docs/12-evidence/workstream-status-audit.md` |
| Diagram reading / level rules | `docs/11-diagrams/README.md`, `docs/DOCUMENTATION_WRITING_STANDARD_FOR_AI.md` |

Ý nghĩa:

- `superpowers` rất tốt để hiểu target state, blast radius, và lịch sử ra quyết định
- docs chính mới là nơi phải đủ rõ để người khác đọc phát hiểu ngay trạng thái hiện tại

## Rule Cho Người Mới Và Người Trực Incident

Nếu bạn là:

- người mới
- PM/manager cần nắm nhanh
- dev/test/devops đang xử lý production

thì không nên bắt đầu từ `plans/` hoặc `specs/`.

Hãy:

1. mở docs chính trong taxonomy `00-12`
2. xác định runtime hiện tại
3. chỉ quay lại `superpowers` khi cần hiểu design intent, rollout order, hoặc lý do của một boundary/refactor
