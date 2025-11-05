# Requirements Pack

| Field | Value |
|---|---|
| Status | Active |
| Audience | Product, BA, developer, tester, reviewer, manager |
| Purpose | Điểm vào cho requirement-level truth: scope, SRS, use case, business rule, traceability |
| Source of Truth | `docs/01-business/*`, `docs/02-requirements/*`, verified code/tests when cited |
| Last Reviewed | 2026-07-10 |
| Review Cycle | Khi feature scope, rule nghiệp vụ, hoặc test traceability đổi |
| Owner | Product + engineering |
| Stale Risk | Cao |

## Read In This Order

1. [BRD / PRD / Scope](../01-business/brd-prd-scope.md)
2. [SRS](./srs.md)
3. [User Story, Use Case, Business Rule](./user-story-use-case-business-rule.md)
4. [Feature Specification](../01-business/feature-specification.md)
5. [Requirements Traceability Matrix](./requirements-traceability-matrix.md)

Nếu bạn không muốn đọc cả pack:

- muốn hiểu sản phẩm đang hứa làm gì: mở `BRD / PRD / Scope`
- muốn biết system bắt buộc phải support gì: mở `SRS`
- muốn biết rule nghiệp vụ và tình huống sử dụng: mở `User Story, Use Case, Business Rule`
- muốn map requirement sang test/evidence: mở `Requirements Traceability Matrix`

## Fast Start By Situation

### Nếu bạn là BA / product / reviewer

Đọc:

1. `../01-business/brd-prd-scope.md`
2. `./srs.md`
3. `./user-story-use-case-business-rule.md`

### Nếu bạn là QA hoặc dev cần verify requirement

Đọc:

1. `./srs.md`
2. `./requirements-traceability-matrix.md`
3. `../08-testing/test-case-matrix.md`

### Nếu bạn đang viết report

Đọc:

1. `../01-business/brd-prd-scope.md`
2. `./srs.md`
3. `./user-story-use-case-business-rule.md`
4. `./requirements-traceability-matrix.md`

## What This Pack Must Answer

- hệ thống phải làm gì
- cho ai
- theo business rule nào
- test nào đang chứng minh requirement nào
- requirement nào đã có design/test/evidence, requirement nào chưa

## Nếu Bạn Đang Viết Report Mà Không Có Code

Hãy coi pack này là nơi chốt ngôn ngữ requirement chính thức của Suar.

Người đọc bên ngoài nên lấy từ đây:

- sản phẩm phải làm gì
- actor nào liên quan
- rule nào là behavior thật
- phần nào đã có traceability sang testing và evidence

Không nên bắt đầu từ code, diagram detail, hay handoff cũ rồi tự suy requirement ngược lên.

## Requirement Pack Nằm Ở Đâu

Nhóm requirement chính hiện nằm ở:

- `docs/01-business/*`
- `docs/02-requirements/*`

Nói ngắn:

- `01-business` giữ framing sản phẩm và feature narrative
- `02-requirements` giữ requirement-level truth, rule, và traceability

## What This Pack Is Not

Pack này không cố thay business docs, feature docs, hay test docs.

Nó chỉ làm một việc:

- gom requirement-level truth về một chỗ
- để người đọc biết hệ thống phải làm gì trước khi đi xuống design, diagram, hoặc test

## What Not To Do

- không suy requirement ngược từ code hoặc diagram detail khi pack này đã có wording rõ hơn
- không dùng traceability matrix như thể nó tự thay SRS hoặc business rule narrative
- không lấy handoff/plan cũ làm requirement truth nếu pack này đã có file chính thức tương ứng

## Khi Nào Dừng Ở Pack Này

Dừng ở pack này khi bạn đã biết:

1. requirement concern của mình nằm ở scope, SRS, use case/business rule, hay traceability
2. file nào đang giữ phần requirement chính cần tin trước
3. có cần sang testing, architecture, data, hay evidence để verify sâu hơn hay không
