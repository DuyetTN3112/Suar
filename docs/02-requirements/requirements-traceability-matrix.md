# Requirements Traceability Pack

| Field | Value |
|---|---|
| Status | Active |
| Audience | Product, BA, developer, tester, reviewer |
| Purpose | Gom artifact yêu cầu thành một đầu mối traceability rõ ràng theo taxonomy hiện tại |
| Source of Truth | `docs/01-business/*`, `docs/02-requirements/*`, cited runtime evidence |
| Last Reviewed | 2026-07-10 |
| Review Cycle | Khi requirement family, route surface, hoặc test/design trace đổi |
| Owner | Product + engineering |
| Stale Risk | Cao |

## Mục đích

Tài liệu này gom lại toàn bộ nhóm artifact yêu cầu của Suar dưới một đầu mối riêng trong `docs/02-requirements/`, để người đọc không phải tự lần từng file rời rạc.

Mục tiêu không phải là biến file này thành bảng kiểm khô cứng.

Mục tiêu là để người đọc trả lời nhanh:

- muốn hiểu requirement thì mở file nào trước
- requirement đó đang neo vào behavior runtime nào
- nếu test hoặc docs mâu thuẫn, nên quay về evidence nào

File này phải tự đủ để người đọc ngoài repo trả lời thêm:

- requirement pack của Suar được tổ chức theo lộ trình nào
- file nào là file gốc cho từng loại câu hỏi
- khi claim bị mâu thuẫn, thứ tự ưu tiên nguồn nào an toàn hơn

## Nếu Bạn Chỉ Có 5 Phút

Chỉ cần nhớ ba ý:

1. File này giúp đi từ business intent sang runtime evidence mà không phải tự lần từng thư mục.
2. Nó không chứng minh mọi requirement đã full green; nó chỉ chỉ đường tới file đúng và boundary đúng.
3. Khi artifact mâu thuẫn nhau, ưu tiên requirement file chính rồi quay về runtime evidence và testing/evidence docs.

## Nếu Dùng File Này Để Viết Report Bên Ngoài Repo

Bạn có thể dùng file này để viết:

- phần traceability giữa business docs, requirements, runtime evidence, và testing
- phần giải thích cấu trúc tài liệu yêu cầu của dự án
- phần methodology cho việc nối requirement với implementation evidence

Đây là file phù hợp để trả lời:

- bộ requirement của Suar đang được tổ chức ra sao
- muốn đi từ business intent sang runtime evidence thì mở file nào
- khi artifact mâu thuẫn nhau thì nên tin nguồn nào trước

Bạn không nên dùng riêng file này để kết luận:

- mọi requirement đã được chứng minh đầy đủ end-to-end
- mọi tài liệu con đều có cùng độ mạnh bằng chứng

Nếu cần độ chắc chắn cao hơn, đọc thêm:

- `./srs.md`
- `../08-testing/test-case-matrix.md`
- `../12-evidence/workstream-status-audit.md`

Nhưng đừng hiểu nhầm điều này thành:

- muốn hiểu requirement là phải đọc hết mọi file con
- file này chỉ có ích khi dùng cùng source code

Mục tiêu đúng là:

- file này chỉ đường để bạn mở ít file hơn
- và biết file nào có authority cao hơn cho từng loại câu hỏi

## What Not To Do

- không dùng file này như bằng chứng duy nhất rằng mọi requirement đã được chứng minh end-to-end
- không bỏ qua file con rồi chỉ đọc bảng traceability nếu đang cần hiểu behavior thật
- không dùng handoff/spec cũ để thắng requirement file chính khi current evidence đang nói khác

## Safe External Summary

Nếu cần một câu tóm tắt an toàn cho report, có thể dùng:

`Bộ requirement của Suar được tổ chức theo hướng traceability, trong đó business scope, feature specification, SRS, user-story/use-case/business-rule, testing, và evidence docs liên kết với nhau thay vì tồn tại như các file rời rạc độc lập.`

Phạm vi ở đây gồm:

- BRD
- PRD
- SRS
- User Story
- Use Case
- Business Rule
- Scope Document
- Feature Specification

Mọi nội dung trong file này đều được rút trực tiếp từ:

- `docs/01-business/capability-model-and-product-positioning.md`
- `start/routes/*.ts`
- `schema/migration evidence`
- `database/schema.ts`
- command/query/listener/model files được trích trong từng tài liệu con
- bộ docs chi tiết đã có trong `docs/01-business/` và `docs/02-requirements/`

## Nếu Bạn Đang Ở Vai Trò Nào

### Product / BA

Đọc theo thứ tự:

1. `../01-business/brd-prd-scope.md`
2. `./srs.md`
3. `./user-story-use-case-business-rule.md`

Mục tiêu:

- chốt sản phẩm đang hứa điều gì
- chốt requirement hệ thống nào đã thành runtime truth
- chốt boundary nào chưa nên cam kết quá tay

### Developer

Đọc theo thứ tự:

1. `./srs.md`
2. `./user-story-use-case-business-rule.md`
3. bảng `Traceability theo artifact yêu cầu`

Mục tiêu:

- biết phần nào là requirement thật
- biết rule nào dễ làm hỏng behavior nếu sửa code
- biết cần verify bằng route/schema/command/query nào

### Tester / QA

Đọc theo thứ tự:

1. `./user-story-use-case-business-rule.md`
2. `./srs.md`
3. `../08-testing/test-case-matrix.md`

Mục tiêu:

- map actor và flow sang test idea
- tránh test nhầm intent tương lai thay vì runtime hiện tại
- biết chỗ nào hệ thống chưa có artifact đủ mạnh để assert quá tay

### External reader / report writer

Đọc theo thứ tự:

1. `../01-business/brd-prd-scope.md`
2. `./srs.md`
3. `./user-story-use-case-business-rule.md`
4. bảng `Traceability theo artifact yêu cầu`

Mục tiêu:

- hiểu business scope rồi mới xuống requirement
- hiểu requirement rồi mới xuống actor-flow-rule
- biết claim nào cần quay sang testing/evidence docs trước khi trích dẫn

## Bộ tài liệu yêu cầu hiện có

### BRD / PRD / Scope

- Tài liệu đang dùng theo taxonomy hiện tại: `../01-business/brd-prd-scope.md`

Nội dung concern đang được cover:

- định vị sản phẩm Suar là competency evidence infrastructure
- stakeholder chính: system admin, org owner/admin, project owner/manager, member, external contributor/applicant, reviewer
- phạm vi chức năng: organization, project, task, marketplace, review, dispute, profile, settings, notifications
- phạm vi loại trừ: các phần không có evidence runtime đầy đủ trong hệ thống hiện tại phải được ghi rõ là chưa có artifact độc lập

### SRS

- Tài liệu đang dùng theo taxonomy hiện tại: `./srs.md`

Concern đã cover:

- yêu cầu chức năng theo module
- yêu cầu phi chức năng
- ràng buộc integration
- boundary của realtime, admin mode, dispute AI callback, org-scoped access

### User Story / Use Case / Business Rule

- Tài liệu đang dùng theo taxonomy hiện tại: `./user-story-use-case-business-rule.md`

Concern đã cover:

- user goal theo actor
- tình huống sử dụng chính
- business rules cho task, review, org membership, profile, permissions

### Feature Specification

- Tài liệu đang dùng theo taxonomy hiện tại: `../01-business/feature-specification.md`

Concern đã cover:

- task completion package
- marketplace applications và ranking
- review disputes
- profile snapshots
- talent bookmarks
- settings persistence

## Traceability theo yêu cầu người dùng

### 1. Từ định vị sản phẩm tới feature runtime

Capability model hiện hành xác định Suar là:

- competency evidence engine
- work-to-credential system
- dispute-aware capability assessment platform

Trace xuống runtime hiện tại:

- competency model và reviewed skills:
  - `app/modules/reviews/actions/commands/recalculate_reviewee_skill_scores_command.ts`
  - `app/modules/users/actions/commands/refresh_user_profile_aggregates_command.ts`
- work evidence:
  - task submission, evidences, comments, attachments trong `app/modules/tasks/*`
- dispute governance:
  - `start/routes/reviews.ts`
  - `app/modules/reviews/controllers/*dispute*`
- verified public profile:
  - `start/routes/users.ts`
  - `app/modules/users/actions/commands/publish_user_profile_snapshot_command.ts`

### 2. Từ user role tới route surface

Phần này không có nghĩa mọi route dưới đây đã được chứng minh end-to-end ngang nhau.

Nó chỉ có nghĩa:

- route family đó đang tồn tại
- requirement family đó có bề mặt runtime thật để bám
- khi cần chắc hơn, phải quay về file con hoặc test evidence tương ứng

#### Registered user / org member

- `/tasks`
- `/projects`
- `/organizations`
- `/profile`
- `/settings`
- `/notifications`

#### External contributor / talent side

- `/marketplace/tasks`
- `/my-applications`
- `/org/talents`
- `/users/:id/profile`
- `/profiles/:slug`

#### Reviewer / reviewee

- `/reviews/pending`
- `/reviews/:id`
- `/reviews/disputes/:id`
- `/my-reviews`

Runtime note rất quan trọng:

- `/reviews/disputes/:id` không chỉ nên bị kể như page của đúng reviewee và reviewer
- current access context còn có thể công nhận org-side role hoặc system admin là participant hợp lệ theo case
- nhưng quyền `participant` và quyền `respond` không trùng nhau hoàn toàn

#### System admin

- `/admin`
- `/admin/users/*`
- `/admin/reviews/*`
- `/admin/disputes/*`
- `/admin/audit-logs`
- `/admin/permissions`

## Traceability theo artifact yêu cầu

| Artifact | File hiện hành | Evidence nền |
|---|---|---|
| BRD | `../01-business/brd-prd-scope.md` | capability model + route families + schema/runtime boundaries |
| PRD | `../01-business/brd-prd-scope.md` | capability model + runtime feature evidence |
| Scope Document | `../01-business/brd-prd-scope.md` | route scope + module boundaries |
| SRS | `./srs.md` | route, schema, command/query/listener flow |
| User Story | `./user-story-use-case-business-rule.md` | actor surfaces trong routes + Inertia pages |
| Use Case | `./user-story-use-case-business-rule.md` + `docs/11-diagrams/Usecase/*` | route + diagram evidence |
| Business Rule | `./user-story-use-case-business-rule.md` | domain rules + command guards |
| Feature Specification | `../01-business/feature-specification.md` | module-level implementation evidence |

## Yêu cầu còn thiếu artifact độc lập

Trong bộ tài liệu hiện tại, chưa có artifact quản trị độc lập cho từng mục nhỏ như:

- một file BRD tách riêng hoàn toàn khỏi PRD và Scope
- một file Use Case narrative tách riêng khỏi User Story và Business Rule
- một thư mục requirements với một file riêng cho từng requirement family

Tài liệu này không bịa thêm artifact gốc không tồn tại. Nó chỉ làm rõ:

- artifact nào đang được gộp
- artifact nào đã có coverage
- evidence nào đang đỡ phần coverage đó

## Thứ tự đọc khuyến nghị

1. `../01-business/brd-prd-scope.md`
2. `./srs.md`
3. `./user-story-use-case-business-rule.md`
4. `../01-business/feature-specification.md`
5. `../12-evidence/document-coverage-matrix.md`

## Khi Nào Dừng Ở File Này

Dừng ở file này khi bạn đã biết:

1. file nào đang giữ requirement chính của concern bạn đang hỏi
2. requirement đó đang bám vào runtime family nào
3. lúc nào cần sang test/evidence để verify sâu hơn

Nếu tới đây mà bạn vẫn chưa biết nên đọc tiếp file nào, thì traceability của bộ docs vẫn chưa đạt.
