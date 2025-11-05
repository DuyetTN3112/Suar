# Business Folder Guide

| Field | Value |
|---|---|
| Status | Active |
| Audience | New joiner, manager, product, developer, tester, reviewer |
| Purpose | Tạo điểm vào rõ ràng cho nhóm business/product docs để người đọc biết nên mở gì trước thay vì nhảy ngẫu nhiên giữa scope, capability model, feature spec |
| Source of Truth | `docs/01-business/*`, linked requirement/runtime docs khi được trích |
| Last Reviewed | 2026-07-19 |
| Review Cycle | Khi product positioning, scope, feature landscape, hoặc capability model đổi |
| Owner | Product + engineering |
| Stale Risk | Cao |

## Mở File Nào Khi Nào

Nếu bạn đang:

- muốn hiểu Suar thực chất là loại hệ thống gì: mở `capability-model-and-product-positioning.md`
- muốn hiểu bài toán kinh doanh, scope, và ba workspace chính: mở `brd-prd-scope.md`
- muốn hiểu feature nào đang có thật trong hệ thống: mở `feature-specification.md`
- muốn hiểu nền tảng organization context, org admin shell, project workspace, và switch/join/membership truth: mở `features/organization_and_project_workspace.md`
- muốn đào sâu profile pipeline, talent sourcing, matching: mở `features/profile_pipeline_and_marketplace.md`
- muốn hiểu skill taxonomy runtime mới: bắt đầu ở `capability-model-and-product-positioning.md`, sau đó mở `features/profile_pipeline_and_marketplace.md`
- muốn đào sâu review, dispute, escalation, AI callback, reverse-review status: mở `features/review_dispute_and_governance.md`
- muốn đào sâu task workflow, submission, audit, và status truth: mở `features/task_workflow_and_submission.md`
- muốn đào sâu search runtime, talent discovery, org talents, và talent bookmarks: mở `features/search_talent_discovery_and_bookmarks.md`

## Fast Start By Situation

### Nếu bạn là người mới hoặc người từ role khác

Đọc:

1. `capability-model-and-product-positioning.md`
2. `brd-prd-scope.md`
3. `feature-specification.md`

### Nếu bạn đang viết report hoặc đồ án

Đọc:

1. `brd-prd-scope.md`
2. `capability-model-and-product-positioning.md`
3. `feature-specification.md`
4. feature deep-dive đúng chapter

### Nếu bạn đang debug production nhưng cần business context rất nhanh

Đọc:

1. `feature-specification.md`
2. feature deep-dive đúng domain sự cố
3. `../09-operations/production-incident-first-response.md`

## Folder Này Dùng Để Làm Gì

Đây là nơi người đọc nên vào khi cần hiểu:

- Suar đang giải bài toán gì
- tại sao task, review, dispute, profile, marketplace lại đi cùng nhau
- sản phẩm hiện đã đi tới đâu
- feature nào đang là runtime truth, feature nào chưa nên nói quá tay

Một câu nhớ ngắn:

`Folder này trả lời Suar là gì, đang làm gì, và vì sao nó không chỉ là task board.`

## Cách Đọc Theo Vai Trò

- người mới hoặc cross-role reader: `capability-model-and-product-positioning.md` rồi `brd-prd-scope.md`
- manager/product: `brd-prd-scope.md` rồi `feature-specification.md`
- dev/test/QA: `feature-specification.md` rồi `docs/02-requirements/*`

## Nếu Bạn Đang Viết Report Mà Không Có Code

Hãy đọc theo thứ tự:

1. `capability-model-and-product-positioning.md`
2. `brd-prd-scope.md`
3. `feature-specification.md`
4. `features/organization_and_project_workspace.md` nếu chương của bạn chạm tới organization context, project context, role boundary, membership, hoặc workspace structure
5. `features/profile_pipeline_and_marketplace.md` nếu chương của bạn chạm tới profile, talent sourcing, matching
6. `features/review_dispute_and_governance.md` nếu chương của bạn chạm tới review, dispute, moderation, governance
7. `features/task_workflow_and_submission.md` nếu chương của bạn chạm tới delivery workflow, submission package, hoặc task incident
8. `features/search_talent_discovery_and_bookmarks.md` nếu chương của bạn chạm tới search, org talents, bookmark, hoặc talent incident

Mục tiêu là chốt:

- Suar là loại hệ thống gì
- sản phẩm đang giải bài toán gì
- capability nào là cốt lõi
- feature nào đã có bằng chứng triển khai đủ mạnh để mô tả trong report

## Điều Không Được Hiểu Sai

- business docs không được bịa vision như thể đã thành runtime truth
- capability model giúp hiểu mental model, không tự động chứng minh mọi flow đã triển khai đầy đủ
- feature spec chỉ nên nói mạnh ở chỗ có route/model/test/evidence tương ứng

## What Not To Do

- không mở một feature deep-dive ngẫu nhiên khi còn chưa hiểu Suar là loại hệ thống gì
- không dùng capability model để khẳng định runtime detail nếu chưa có feature/runtime evidence tương ứng
- không kể roadmap/ý tưởng như thể đã là current product truth

## Điểm Đọc Tiếp Theo

- `../02-requirements/README.md`
- `../03-architecture/architecture-overview.md`
- `../11-diagrams/README.md`

## Khi Nào Dừng Ở Folder Này

Dừng ở folder này khi bạn đã biết:

1. Suar là gì và không phải là gì
2. concern của bạn nằm ở capability model, scope, hay feature runtime
3. lúc nào cần sang requirements, architecture, hay diagrams để đọc sâu hơn
