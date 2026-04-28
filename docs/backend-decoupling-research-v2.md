# Nghiên Cứu Giảm Coupling Backend V2

Ngày: 2026-07-17

Phạm vi: nghiên cứu sâu hơn về coupling giữa các module backend, dựa trên worktree bẩn hiện tại, GitNexus CLI, và phân tích deterministic của Understand-Anything.

## Bằng Chứng Đã Dùng

GitNexus:

- `gitnexus status`
- `gitnexus detect-changes .`
- `gitnexus query "public contracts"`
- `gitnexus query "api module boundary"`
- `gitnexus query "boundary guards"`
- `gitnexus impact ...` cho các symbol/file rủi ro cao

Understand-Anything:

- `scan-project.mjs` -> `.codex-logs/backend-coupling/ua/scan-v2.json`
- `extract-import-map.mjs` -> `.codex-logs/backend-coupling/ua/import-map-v2.json`
- Quét thêm TypeScript alias import trong `analyze-coupling-v2.cjs` vì UA cảnh báo `tsconfig.json` có comment nên parse JSON thất bại.

Output đã sinh:

- Deep report: `.codex-logs/backend-coupling/backend-coupling-deep-report.md`
- Full JSON: `.codex-logs/backend-coupling/backend-coupling-deep-report.json`
- Edge CSV: `.codex-logs/backend-coupling/backend-cross-module-edges.csv`
- Mermaid module graph: `.codex-logs/backend-coupling/backend-module-graph.mmd`
- GitNexus impacts: `.codex-logs/backend-coupling/gitnexus-impact/*.txt`

## Lưu Ý Về Trạng Thái Hiện Tại

Worktree không sạch. GitNexus index:

- indexed files: `4825`
- symbols: `8395`
- changed: `610`
- new: `44`
- deleted: `23`

Ý nghĩa:

- GitNexus vẫn hữu ích để xem blast radius và ngữ cảnh kiến trúc đã biết.
- Understand-Anything v2 scan đáng tin hơn cho import graph cấp file trong trạng thái hiện tại.
- Trước khi refactor thật và commit, nếu được phép thì chạy lại `gitnexus analyze`, rồi chạy lại script nghiên cứu này.

## Chỉ Số Chính

Production graph backend hiện tại:

| Metric | Value |
| --- | ---: |
| Modules | 24 |
| Backend prod files | 1,419 |
| Cross-module imports | 1,666 |
| Boundary imports | 1,069 |
| Internal imports | 597 |
| Critical internal imports | 477 |
| Severe internal imports | 531 |
| Internal import ratio | 35.8% |
| Critical internal ratio | 28.6% |
| Strongly connected components | 1 large SCC |
| Direct mutual module pairs | 37 |

Backend không chỉ "hơi coupling"; phần lớn business modules quan trọng đang nằm trong một vòng phụ thuộc lớn:

`audit`, `authorization`, `cache`, `errors`, `http`, `logger`, `notifications`, `observability`, `organizations`, `projects`, `reviews`, `search`, `settings`, `skills`, `tasks`, `users`

## Nhóm Mức Độ Nghiêm Trọng

| Bucket | Count | Meaning |
| --- | ---: | --- |
| `http-exception-leak` | 418 | Business modules import implementation HTTP exception |
| `foreign-lucid-model` | 54 | Lucid model của module khác bị import xuyên boundary |
| `http-boundary-leak` | 25 | Feature modules import implementation HTTP boundary |
| `observability-contract-not-public` | 24 | File dạng contract của observability nằm ngoài `public_contracts` |
| `http-response-leak` | 21 | Feature controllers import mapper `http/api_v1` |
| `non-public-types` | 17 | Type được import từ module khác nhưng không qua `public_contracts` |
| `non-public-events` | 13 | Event được import ngoài stable event contracts |
| `observability-service-leak` | 8 | Modules import implementation observability service |
| `non-public-constants` | 7 | Constant được import ngoài stable contracts |
| `foreign-infra/services/domain` | 5 | Import trực tiếp implementation của module khác |

Điểm lớn: nếu sửa exception leakage, internal imports giảm từ `597` xuống khoảng `179`. Đây là bước ROI cao nhất.

## Blast Radius Từ GitNexus

GitNexus Rust impact hiện báo caller theo file-match, chưa phải full process flow. Dù vậy, số lượng caller vẫn rất hữu ích để đo blast radius.

| Target | GitNexus risk | Direct callers | Interpretation |
| --- | --- | ---: | --- |
| `UnauthorizedException` | MEDIUM | 151 | Rủi ro kiến trúc cao; 12 modules import |
| `BusinessLogicException` | MEDIUM | 137 | Rủi ro kiến trúc cao |
| `NotFoundException` | MEDIUM | 106 | Rủi ro kiến trúc cao |
| `ForbiddenException` | MEDIUM | 80 | Rủi ro kiến trúc cao |
| `ValidationException` | MEDIUM | 67 | Rủi ro kiến trúc cao |
| `ConflictException` | MEDIUM | 26 | Medium, nhưng cùng pattern xấu |
| `wrapApiV1Data` | MEDIUM | 31 | HTTP response mapper đang coupling với feature controllers |
| `mapApiV1Pagination` | MEDIUM | 6 | Surface helper response nhỏ hơn |
| `buildPlatformTraceContext` | MEDIUM | 16 | Observability service bị import trực tiếp |
| `PLATFORM_EVENT_NAMES` | MEDIUM | 31 | Constant dạng contract nằm ngoài public contract |
| `app/modules/users/infra/models/user.ts` | MEDIUM | 7 | GitNexus đếm thiếu relative/ORM model edges; UA thấy 21 imports |
| `app/modules/tasks/infra/models/task.ts` | MEDIUM | 13 | Hotspot persistence graph |
| `app/modules/organizations/infra/models/organization.ts` | MEDIUM | 5 | Hotspot persistence graph |

GitNexus vẫn gắn nhãn MEDIUM vì tool ghi chú: "Rust impact uses indexed file matches until call graph extraction is migrated." Với việc làm kiến trúc, direct caller trên 50 nên xem là blast radius cao.

## Module Rủi Ro Cao Nhất

| Module | Outgoing | Internal outgoing | Critical outgoing | Boundary health | Read |
| --- | ---: | ---: | ---: | ---: | --- |
| `reviews` | 327 | 156 | 142 | 0.523 | Nặng nhất; chủ yếu HTTP exceptions và model links |
| `tasks` | 314 | 129 | 114 | 0.589 | Module orchestration lớn; model links tới users/skills/org/projects |
| `organizations` | 315 | 103 | 81 | 0.673 | Nhiều admin/workflow/context edges |
| `users` | 173 | 57 | 48 | 0.671 | Import HTTP cộng với foreign types/settings/tasks formulas |
| `projects` | 116 | 39 | 28 | 0.664 | Model cycle với org/tasks/users |
| `settings` | 25 | 16 | 12 | 0.360 | Module nhỏ, boundary health kém |
| `sprints` | 24 | 15 | 10 | 0.375 | Nhỏ nhưng phụ thuộc nhiều vào HTTP/actions |

`http` có incoming internal imports rất lớn: `465`. Đây là lực hút kiến trúc. Nó nên là transport boundary, không phải shared kernel.

## Phát Hiện Theo Layer

Top layer edges:

- `actions -> public_contracts`: 489. Hướng tốt, nhưng phụ thuộc chất lượng contract.
- `controllers -> public_contracts`: 394. Tốt cho orchestration ở controller.
- `actions -> exceptions`: 315. Xấu: application layer biết module HTTP exception.
- `controllers -> exceptions`: 80. Chỉ chấp nhận được nếu exceptions chuyển sang shared error kernel.
- `infra -> infra`: 56. Chủ yếu là Lucid model relationships xuyên modules.
- `controllers -> api_v1`: 21. Presenters leak từ HTTP module sang feature controllers.
- `actions -> contracts`: 13. Observability contracts nên public.
- `observability -> services`: 8. Factories import trực tiếp service functions.

Kiến trúc hiện tại muốn boundary theo hướng port-first, nhưng implementation vẫn lẫn ba layer:

1. shared kernel ẩn trong `http`
2. persistence graph ẩn trong feature modules
3. runtime facades ẩn trong `public_contracts`

## Thực Tế Của Public Contract

Public contracts không sạch như nhau.

| Metric | Value |
| --- | ---: |
| `public_contracts/*.ts` files | 86 |
| Heavy public contracts importing actions/infra/services/bootstrap/domain | 51 |
| Heavy ratio | 59.3% |

Modules có facade debt nặng nhất:

| Module | Heavy files | Internal imports inside public contracts |
| --- | ---: | ---: |
| `tasks` | 7 | 18 |
| `users` | 6 | 10 |
| `reviews` | 5 | 10 |
| `organizations` | 5 | 7 |
| `skills` | 4 | 8 |
| `authorization` | 4 | 6 |
| `projects` | 4 | 5 |
| `search` | 3 | 18 |

Diễn giải:

- Public contracts đã giảm coupling phía consumer.
- Nhưng nhiều file là service locator facade, không phải thin contracts.
- Điều đó ổn trong giai đoạn chuyển tiếp, nhưng không phải kiến trúc low-coupling cuối cùng.

Policy cần có:

- `public_contracts/types|events|constants`: chỉ pure exports.
- `public_contracts/facades`: được phép tạm thời, debt phải rõ ràng.
- `bootstrap/adapters`: nơi wiring provider.
- Consumer-owned `application/ports`: hướng ưu tiên cho capability xuyên feature.

## Phát Hiện Về Guardrail

Kết quả guard hiện tại:

- `node scripts/check_module_domain_boundary.mjs`: FAIL
  - `start/routes/index.ts -> #modules/testing/domain/test_database_safety`
  - `start/routes/auth.ts -> #modules/testing/domain/test_database_safety`
- `node scripts/check_public_contract_surface.mjs`: PASS

Khoảng trống của guard:

- `check_public_contract_surface.mjs` chỉ bắt `export ... from`; bỏ sót facade dạng import-rồi-export.
- module boundary guard chỉ match `from '#modules/...'`, chưa robust cho mọi dạng TS import.
- relative foreign imports như `../../../users/infra/models/user.js` chưa bị guard hiện tại bắt.
- chưa có SCC/cycle budget.
- chưa có rule cấm "business module import `#modules/http/exceptions`".
- chưa có rule "public contracts phải pure trừ khi nằm trong facade allowlist".

Architecture tests hiện có hữu ích, nhưng còn cục bộ theo family:

- marketplace -> tasks guard
- reviews -> org/projects/tasks/users guard
- users -> organizations guard
- organizations -> tasks guard
- http -> search guard
- pagination public API guard
- generic boundary baseline guard

Broad tests còn thiếu:

- all modules -> HTTP exception leak
- all modules -> foreign Lucid models qua relative imports
- all public contracts -> facade debt inventory
- all modules -> SCC/new-cycle regression

## Chiến Lược Refactor Cụ Thể

### Phase 0: Ổn Định Đo Lường

Mục tiêu: làm coupling hiện tại nhìn thấy được và chặn drift xấu hơn.

Actions:

1. Sửa guard failure hiện tại:
   - tạo `testing/public_contracts/test_database_safety.ts`, hoặc
   - phân loại `start/routes/testing` là composition exception và giữ import test safety thật rõ.
2. Thêm command sinh coupling report làm non-blocking CI artifact.
3. Thêm budgets:
   - internal import ratio không được tăng quá mức hiện tại `35.8%`
   - critical internal imports không được tăng quá `477`
   - direct mutual pairs không được tăng quá `37`
4. Cải thiện public-contract guard để bắt facade dạng import-rồi-export.

### Phase 1: Tách Error Kernel

Mục tiêu: loại bỏ bucket `http-exception-leak`.

Target files:

- `app/modules/http/exceptions/app_exception.ts`
- `app/modules/http/exceptions/unauthorized_exception.ts`
- `app/modules/http/exceptions/business_logic_exception.ts`
- `app/modules/http/exceptions/not_found_exception.ts`
- `app/modules/http/exceptions/validation_exception.ts`
- `app/modules/http/exceptions/forbidden_exception.ts`
- `app/modules/http/exceptions/conflict_exception.ts`
- `app/modules/http/exceptions/rate_limit_exception.ts`

Hình dạng nên có:

- stable surface mới: `app/modules/errors/public_contracts/exceptions.ts`
- `app/modules/http/exceptions/*` cũ trở thành compatibility shims trong một migration window
- business modules import từ `#modules/errors/public_contracts/exceptions`
- HTTP handler import cùng shared exceptions và map sang HTTP response

Lý do:

- `http` không còn đóng vai shared kernel.
- Xóa hoặc phân loại lại `418` internal edges.
- Cải thiện metric lớn nhất có thể.

Rủi ro:

- GitNexus direct callers: 151/137/106/80/67 cho các exception classes lớn nhất.
- Dùng shim-first migration, sau đó thay import cơ học.

Verification:

- `app/modules/http/tests/backend/unit/exceptions.spec.ts`
- contract suite chạm Problem Details
- architecture check cấm `#modules/http/exceptions` bên ngoài `http`

### Phase 2: HTTP Presenter Boundary

Mục tiêu: feature controllers ngừng import implementation files từ `http/api_v1` và `http/boundary`.

Targets:

- `app/modules/http/api_v1/response_mappers.ts`: 21 imports
- `app/modules/http/boundary/http_mutation_response.ts`: 16 imports
- `app/modules/http/boundary/http_transport.ts`: 4 imports
- `app/modules/http/boundary/http_api_error_emitter.ts`: 3 imports

Hình dạng nên có:

- `http/public_contracts/api_response.ts`
- `http/public_contracts/http_transport.ts`
- hoặc local feature presenters trả về framework-neutral response DTOs.

Rule:

- controllers có thể import HTTP public contracts
- actions/domain/infra không import `http` chút nào, trừ shared error kernel sau Phase 1 nếu nó nằm dưới `errors`

### Phase 3: Persistence Island Cho Lucid Models

Mục tiêu: chặn feature modules sở hữu một ORM graph dạng vòng.

Foreign Lucid model imports:

- tổng `54`
- lớn nhất: `tasks -> users` 10, `reviews -> users` 5, `reviews -> tasks` 4, `tasks -> skills` 4

Pattern hiện tại:

- Lucid decorators import concrete foreign model classes cho relationships.
- Ví dụ: `Task` import `User`, `Project`, `Organization`.
- Ví dụ: `User` import `Task`, `Project`, `Organization`.

Hai lựa chọn:

1. Thực dụng:
   - khai báo Lucid models là persistence island
   - chỉ cho phép cross-model imports bên trong `infra/models`
   - cấm foreign model imports ở mọi nơi khác
   - repositories expose projections/DTOs

2. Nghiêm ngặt:
   - bỏ cross-module relationship decorators
   - dùng FK columns + query builders/repositories
   - decoupling cao nhất, churn cao nhất

Khuyến nghị:

- Bắt đầu thực dụng. Cách này giảm áp lực false-positive kiến trúc mà chưa cần rewrite ORM ngay.
- Về sau, bỏ phần lớn relation decorators nếu migration NestJS cần aggregate isolation rõ hơn.

### Phase 4: Cleanup Public Contract Cho Observability

Mục tiêu: không module nào import implementation/contracts của observability bên ngoài public surface.

Targets:

- `observability/contracts/platform_event_names.ts`: 16 direct UA edges, GitNexus `PLATFORM_EVENT_NAMES` 31 callers
- `observability/contracts/platform_event.ts`: 8 edges
- `observability/services/platform_trace_context.ts`: 8 edges, GitNexus `buildPlatformTraceContext` 16 callers

Hình dạng nên có:

- move/export types/constants/trace builder qua `observability/public_contracts/platform_observability.ts`
- tách pure types khỏi runtime loggers
- tránh import logger singleton từ public contract trừ khi explicit `facades`

### Phase 5: Độ Thuần Của Public Contract

Mục tiêu: biến `public_contracts` từ "barrel bọc internals" thành stable surface.

Steps:

1. Thêm guard:
   - pure public contract files không được import `actions`, `infra`, `services`, `bootstrap`, `domain`
2. Thêm folder rõ ràng hoặc allowlist cho transitional runtime facades.
3. Chuyển service wiring sang bootstrap/composition root.
4. Ưu tiên consumer ports cho capabilities:
   - `tasks/application/ports/task_user_reader.ts`
   - `reviews/application/ports/review_task_assignment_reader.ts`
   - `projects/application/ports/project_organization_access.ts`

## Backlog Theo Module

### Reviews

Metrics:

- outgoing imports: 327
- internal outgoing: 156
- critical outgoing: 142

Việc đầu tiên:

1. migrate exceptions sang error kernel
2. route observability qua public contract
3. thay `tasks` model imports trong review infra bằng repository/projection
4. expose `tasks/events` qua `tasks/public_contracts/task_events_v1`
5. chuyển `users/types/*` imports sang `users/public_contracts`

### Tasks

Metrics:

- outgoing imports: 314
- internal outgoing: 129
- critical outgoing: 114

Việc đầu tiên:

1. migrate exceptions
2. quarantine relation imports tới `users/infra/models/user.ts`
3. thay skills model imports bằng skills projections/contracts
4. audit task public contracts: 7 heavy files, 18 internal imports

### Organizations

Metrics:

- outgoing imports: 315
- internal outgoing: 103
- critical outgoing: 81

Việc đầu tiên:

1. migrate exceptions
2. expose task workflow records qua task public contracts
3. quarantine org/project/task/user model relations
4. chuyển observability names/types qua public contract

### Users

Metrics:

- outgoing imports: 173
- internal outgoing: 57
- critical outgoing: 48

Việc đầu tiên:

1. migrate exceptions
2. chuyển `settings/types/user_setting.ts` sang settings public contract
3. xóa `users/public_contracts/user_model.ts` hoặc đánh dấu là persistence-only debt
4. thay `tasks/domain/match_formulas.ts` bằng task public contract hoặc công thức copy do users sở hữu nếu thật sự là shared

### Projects

Metrics:

- outgoing imports: 116
- internal outgoing: 39
- critical outgoing: 28

Việc đầu tiên:

1. migrate exceptions
2. persistence island cho project/org/task/user relations
3. route observability qua public contract
4. tách facade debt của `project_public_api` khỏi pure contracts

### Settings / Sprints

Modules nhỏ, boundary health kém:

- `settings` boundary health: 0.360
- `sprints` boundary health: 0.375

Việc đầu tiên:

1. migration exception có thể sửa phần lớn bad edges
2. sprints chỉ nên phụ thuộc `projects` qua `SprintExternalDependencies`
3. settings user-setting types nên thành public contract nếu users/http đang consume

## Success Gates Đề Xuất

Near-term gates:

- `http-exception-leak = 0`
- `criticalInternalImports <= 100`
- `internalImportRatio <= 15%`
- debt heavy facade trong `public_contracts` được track rõ
- module boundary guard pass

Medium-term gates:

- `foreign-lucid-model` bên ngoài `infra/models` hoặc persistence island: 0
- direct mutual pairs: `37 -> < 10`
- largest SCC: `16 modules -> <= 4 modules`
- không có internal pair mới vượt count 3 nếu chưa có architecture note được duyệt

Strict final gates:

- feature `actions/domain/controllers` không import foreign `actions/controllers/infra/domain/support/services/bootstrap`
- feature modules không import implementation paths của `http`
- public contracts pure, trừ explicit `facades`
- runtime capabilities xuyên feature dùng consumer-owned ports

## Thứ Tự Triển Khai Tốt Nhất

1. Sửa guard failure `testing/domain/test_database_safety`.
2. Thêm strict measurement scripts/CI artifact từ nghiên cứu này.
3. Tách error kernel.
4. Cleanup HTTP presenter boundary.
5. Cleanup observability public contract.
6. Quyết định persistence island và thêm guard.
7. Tách public contract purity.

Thứ tự này tối đa hóa mức giảm coupling trên mỗi dòng thay đổi, và để phần redesign ORM rủi ro cao sau khi các gravity well dễ xử lý đã được gỡ.
