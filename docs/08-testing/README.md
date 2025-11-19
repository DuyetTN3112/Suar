# Testing Folder Guide

| Field | Value |
|---|---|
| Status | Active |
| Audience | QA, tester, developer, reviewer, maintainer, new joiner cần biết test evidence đang nằm ở đâu |
| Purpose | Tạo điểm vào rõ ràng cho nhóm testing để người đọc biết nên mở gì trước thay vì lao ngay vào ma trận test dài hoặc đi mò thư mục `tests/` |
| Source of Truth | `docs/08-testing/*`, `tests/*`, `package.json`, cited runtime docs |
| Last Reviewed | 2026-07-17 |
| Review Cycle | Khi test families, command matrix, hoặc traceability coverage đổi |
| Owner | Engineering + QA |
| Stale Risk | Cao |

## Mở File Nào Khi Nào

Nếu bạn đang:

- muốn biết domain nào đã có automation gì: mở `test-case-matrix.md`
- muốn xem tổng số atomic row theo cây L0-L5 và gap theo từng layer: mở `../test/generated/hierarchical_matrix_summary.md`
- muốn biết vì sao test nhiều nhưng vẫn lọt lỗi, hoặc cần matrix behavior đúng: mở `test-quality-audit.md`
- muốn viết ma trận test case đúng theo cây `domain -> flow -> subflow -> scenario -> case -> data`: mở `hierarchical-test-case-decomposition.md`
- muốn phân biệt unit/integration/contract/component/E2E và không suy luận sai từ một layer sang layer khác: mở `hierarchical-test-case-decomposition.md`
- muốn kiểm tra test DB, `schema/migration evidence`, generated schema, và drift risk: mở `db-docs-ai-schema-audit.md`
- muốn biết cách connect DB hoặc chạy integration/E2E trên test DB an toàn: mở `docs_AI/integration_test_db_connect.md`
- muốn kiểm tra API alias/envelope/pagination/mapper contract: mở `technical-contract-matrices/api-contracts.md`
- muốn kiểm tra test DB, generated inventory, false-pass policy, CI gates: mở `control-audits/testing-controls.md`
- muốn xem matrix đúng theo behavior cụ thể: mở `behavior-matrices/`
- muốn tìm command test phù hợp để verify giả thuyết: nhìn `package.json` và phần command trong ma trận
- muốn map feature sang test evidence cụ thể: mở `test-case-matrix.md`

## Layer Rule Quan Trọng

Không suy luận coverage xuyên layer:

- `unit pass` không chứng minh integration pass.
- `integration pass` không chứng minh E2E pass.
- `contract pass` không chứng minh UI render đúng.
- `component pass` không chứng minh browser journey, routing, auth bootstrap, seeded data, hoặc DB side effect đúng.
- một E2E happy path không thay toàn bộ decision table integration/contract/component coverage.

Vì vậy mỗi row trong matrix phải ghi layer riêng. Nếu một flow cần cả backend state transition và UI journey, phải có evidence cho từng layer hoặc đánh dấu gap rõ ràng.

Hierarchical matrices dùng cột status tách lớp: `Backend | Contract | Component | E2E | Test Strength | Overall`. Không gộp status kiểu một phrase chung; ghi `Backend=covered; E2E=covered` hoặc tách thành ô riêng. Backend pass và E2E pass phải có bằng chứng riêng.

Generated summary `../test/generated/hierarchical_matrix_summary.md` đếm atomic rows và status từng layer. Nó là bản đồ gap, không phải coverage percentage; số `Backend=covered` không được cộng chung với `E2E=covered`.

## Command Semantics

| Command | Layer/Scope | Điều không được suy luận |
|---|---|---|
| `pnpm run test:unit` | Unit only | Không chứng minh DB/route/browser behavior |
| `pnpm run test:integration` | Backend integration | Không chứng minh browser journey hoặc UI render |
| `pnpm run test:integration:safe` | Backend integration với test DB guard/migration | Không chứng minh E2E pass |
| `pnpm run test:all:safe` | `unit + integration:safe` | Không bao gồm E2E |
| `pnpm run test:contract` | API/contract layer | Không chứng minh business journey hoặc UI |
| `pnpm run test:ui:runnable` | Component/UI runnable suite | Không chứng minh real backend/route journey |
| `pnpm run test:e2e` | Playwright browser journeys | Không thay thế unit/integration/contract decision tables |
| `pnpm run test:quality:critical` | Inventory + false-pass policy + critical contracts/UI/E2E | Không phải full E2E suite |
| `pnpm run test:full-confidence` | Backend-safe aggregate + quality-critical | Có E2E-critical evidence, nhưng vẫn không phải mọi browser scenario |

Khi report trạng thái, ghi rõ command đã chạy và layer tương ứng. Không viết `all tests pass` nếu chỉ chạy `test:all:safe`.

## Current Test Topology

Sau split multi-app hiện tại, test roots chính là:

- backend: `app/modules/*/tests/backend/{unit,integration,contract,architecture}`
- frontend component/shared/storybook tests: `inertia/apps/{user,org,admin}/tests/{modules,shared,storybook}`
- frontend browser journeys: `inertia/apps/{user,org,admin}/tests/e2e`
- root test support: `tests/helpers`, `tests/frontend`, `tests/shared`

Legacy roots như `inertia/tests`, `tests/unit`, `tests/integration`, `tests/contract`, và `tests/e2e` không còn là topology chính. Nếu gặp chúng trong plan/handoff cũ, verify lại bằng source hiện tại trước khi cite.

## Fast Start By Situation

### Nếu bạn là QA/tester

Đọc:

1. `test-case-matrix.md`
2. `test-quality-audit.md`
3. `hierarchical-test-case-decomposition.md`
4. `../02-requirements/requirements-traceability-matrix.md`
5. `../01-business/feature-specification.md`

### Nếu bạn là dev đang sửa một domain

Đọc:

1. `test-case-matrix.md`
2. `test-quality-audit.md`
3. `hierarchical-test-case-decomposition.md`
4. file feature hoặc requirement gần domain đó
5. rồi mới mở test file cụ thể

### Nếu bạn đang viết report/audit mà không chạy code

Đọc:

1. `test-case-matrix.md`
2. `test-quality-audit.md`
3. `hierarchical-test-case-decomposition.md`
4. `../02-requirements/requirements-traceability-matrix.md`
5. `../09-operations/runbook-monitoring-maintenance.md`

## Folder Này Dùng Để Làm Gì

Folder này không thay thế source of truth là thư mục `tests/`.

Nó dùng để:

- chỉ đường tới test evidence đúng domain
- giảm thời gian tìm file test phù hợp
- giúp người đọc biết coverage nào đã rõ và coverage nào chỉ mới ở mức một vài proof points

Một câu nhớ ngắn:

`Docs testing không thay test. Nó giúp bạn biết nên đọc test nào trước.`

## Nếu Bạn Đang Viết Report Hoặc Audit Mà Không Chạy Code

File này phải giúp bạn trả lời nhanh:

1. Suar đang có những lớp kiểm thử nào
2. domain nào đã có automation evidence rõ
3. chỗ nào mới chỉ có proof point, chưa đủ để nói coverage toàn diện

Nếu người ngoài không có môi trường chạy test, folder này vẫn phải đủ để họ hiểu chiến lược kiểm thử và biết nên tin bằng chứng nào trước.

## Người Đọc Nên Kỳ Vọng Gì

- QA/tester: tìm được test evidence theo capability
- dev: tìm được file test gần vùng code đang sửa
- reviewer/manager: biết domain nào có automation rõ, domain nào cần kiểm tra sâu thêm

## Điều Không Được Hiểu Sai

- có test file không tự động nghĩa là coverage đã đủ sâu
- integration test pass không có nghĩa là E2E pass
- một capability có thể cần nhiều loại test cùng lúc: unit, integration, contract, component, E2E, control audit
- một E2E proof không thay cho toàn bộ unit/integration/contract coverage
- ma trận test là bản đồ điều hướng, không phải log lịch sử chạy test

## What Not To Do

- không coi một test pass ở một thời điểm như bằng chứng chất lượng vĩnh viễn
- không dùng một file E2E đơn lẻ để kết luận toàn domain đã được chứng minh đầy đủ
- không mở cả thư mục `tests/` trước khi dùng matrix để khoanh đúng vùng cần đọc

## Điểm Đọc Tiếp Theo

- `./test-case-matrix.md`
- `../test/generated/hierarchical_matrix_summary.md`
- `./test-quality-audit.md`
- `./hierarchical-test-case-decomposition.md`
- `./db-docs-ai-schema-audit.md`
- `./technical-contract-matrices/api-contracts.md`
- `./control-audits/testing-controls.md`
- `./behavior-matrices/auth-login-session.md`
- `./behavior-matrices/auth/index.md`
- `./behavior-matrices/marketplace-application-flow.md`
- `./behavior-matrices/marketplace/index.md`
- `./behavior-matrices/task-lifecycle-status-submission.md`
- `./behavior-matrices/tasks/index.md`
- `./behavior-matrices/organization-membership-invitation.md`
- `./behavior-matrices/organizations/index.md`
- `./behavior-matrices/review-dispute-governance.md`
- `./behavior-matrices/reviews/index.md`
- `./behavior-matrices/admin-audit-moderation.md`
- `./behavior-matrices/admin/index.md`
- `./behavior-matrices/projects/index.md`
- `./behavior-matrices/users/index.md`
- `./behavior-matrices/search/index.md`
- `./behavior-matrices/notifications/index.md`
- `./behavior-matrices/skills/index.md`
- `../02-requirements/requirements-traceability-matrix.md`
- `../01-business/feature-specification.md`

## Khi Nào Dừng Ở Folder Này

Dừng ở folder này khi bạn đã biết:

1. domain nào đã có automation evidence gần concern của mình nhất
2. nên đọc file test nào trước thay vì quét cả thư mục test
3. lúc nào cần sang requirements, feature docs, hay operations để xác nhận thêm context
