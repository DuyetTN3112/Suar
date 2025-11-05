# BRD, PRD, Scope Document

| Field | Value |
|---|---|
| Status | Active |
| Audience | New joiner, manager, product, developer, tester, reviewer |
| Purpose | Giải thích Suar đang giải bài toán gì, sản phẩm đang có những capability nào thật, và scope hiện tại đi tới đâu |
| Source of Truth | business docs trong taxonomy hiện tại, routes, models, queries, tests, config/runtime evidence |
| Last Reviewed | 2026-07-10 |
| Review Cycle | Khi capability lớn, product direction, hoặc scope boundary đổi |
| Owner | Product + engineering |
| Stale Risk | Cao |

## File Này Dùng Để Làm Gì

Nếu ai đó hỏi:

- “Suar có phải chỉ là task management không?”
- “Suar thực ra là gì?”
- “Nó khác task board bình thường ở đâu?”
- “Scope hiện tại đã đi tới đâu rồi?”

thì file này phải trả lời được ngay, không bắt người đọc mở thêm 5 file nữa mới hiểu.

File này phải tự đủ để người đọc bên ngoài repo hiểu:

- Suar là loại sản phẩm gì
- đang giải bài toán gì
- hiện có các capability lớn nào là thật
- các boundary scope nào chưa nên nói quá tay

Chỉ đọc thêm khi bạn muốn đào sâu một lát cắt hẹp hơn:

- `./capability-model-and-product-positioning.md`
  khi cần language positioning/capability model sâu hơn
- `./feature-specification.md`
  khi cần đi xuống từng feature lớn và surface runtime tương ứng
- `../03-architecture/architecture-overview.md`
  khi cần chuyển từ language sản phẩm sang language kỹ thuật
- `../12-evidence/workstream-status-audit.md`
  khi cần biết chỗ nào còn gap hoặc đang có regression evidence

Nếu bạn đang:

- mới vào dự án: đọc `Bài Toán Kinh Doanh` rồi `Capability Groups Trong Scope Hiện Tại`
- là manager hoặc stakeholder: đọc `Mục Tiêu Kinh Doanh` và `Sản Phẩm Hiện Đang Có Ba Màn Chơi Lớn`
- là dev/test/QA: đọc thêm `Product Behaviors Đang Là Thật` và `Scope Constraints Đang Còn Tồn Tại`

## Nếu Dùng File Này Để Viết Report Bên Ngoài Repo

Bạn có thể dùng file này để viết:

- phần giới thiệu đề tài
- phần bài toán và mục tiêu sản phẩm
- phần phạm vi hệ thống
- phần actor/capability overview

Bạn nên coi file này là nguồn chính để trả lời:

- Suar là gì
- Suar khác task board thông thường ở đâu
- hệ thống hiện có những capability lớn nào
- đâu là các boundary sản phẩm quan trọng

Bạn không nên dùng riêng file này để kết luận:

- chi tiết implementation từng flow nhỏ
- mọi route/API exact contract
- mọi feature đã được chứng minh end-to-end hoàn chỉnh

Chỉ đọc thêm khi mục tiêu của bạn đổi sang level khác:

- `./feature-specification.md`
  khi cần đi từ capability lớn sang feature cụ thể
- `../03-architecture/architecture-overview.md`
  khi cần kiến trúc và runtime layers
- `../06-data/api-specification.md`
  khi cần inventory route/API chi tiết
- `../12-evidence/workstream-status-audit.md`
  khi cần kiểm tra audit/gap evidence

## Nếu Bạn Chỉ Có 3 Phút

Chỉ cần nhớ bốn ý này:

1. Suar không chỉ là task board. Nó là hệ thống biến công việc thật thành tín hiệu năng lực đáng tin hơn.
2. Ba không gian sản phẩm lớn hiện tại là `user workspace`, `organization admin workspace`, và `system admin workspace`.
3. Năm cụm behavior runtime quan trọng nhất hiện tại là `auth`, `task`, `marketplace`, `review`, `profile`.
4. Những thứ chưa nên nói quá tay gồm `email/password riêng`, `realtime active transport`, và `legal/privacy artifact độc lập`.

## Câu Khẳng Định An Toàn Có Thể Dùng Nguyên Văn

- `Suar không chỉ là task board; nó định vị như hệ thống biến công việc thật thành tín hiệu năng lực đáng tin hơn.`
- `Phạm vi sản phẩm hiện xoay quanh ba workspace lớn: user workspace, organization admin workspace, và system admin workspace.`
- `Những capability runtime nổi bật hiện tại gồm auth, task, marketplace, review/dispute, profile, notifications, và admin governance surfaces.`

Các câu trên an toàn hơn nhiều so với kiểu viết:

- `Suar đã hoàn thiện toàn bộ nền tảng năng lực`
- `mọi capability đã production-ready ở mọi khía cạnh`

## Business Requirement Document

### Bài Toán Kinh Doanh

Suar đang cố giải một khoảng trống rất cụ thể:

- hồ sơ năng lực tự khai báo thường không đáng tin đủ
- nhưng dữ liệu công việc thực tế lại đang nằm rời rạc, khó tái sử dụng

Hệ thống hiện cho thấy Suar cố nối hai thứ đó thành một vòng lặp:

`Làm việc -> Được đánh giá -> Hồ sơ mạnh hơn -> Được chọn nhiều hơn -> Làm thêm việc -> Được đánh giá tiếp`

Điểm quan trọng:

- đây không còn là task board thuần túy kiểu Jira/Trello
- task chỉ là một phần đầu vào của hệ thống năng lực có bằng chứng

Một cách nói ngắn để nhớ:

`Suar lấy công việc thật làm đầu vào, rồi biến nó thành tín hiệu năng lực đáng tin hơn.`

### Mục Tiêu Kinh Doanh Đang Có Dấu Vết Thật

Từ route, model, và query hiện tại, có thể nói hệ thống đang đi theo bốn mục tiêu lớn:

1. Chuẩn hóa giao việc trong cấu trúc `organization -> project -> task`.
2. Cho phép cả người nội bộ lẫn contributor bên ngoài đi vào task công khai qua marketplace.
3. Biến công việc đã hoàn thành thành review và evidence có thể kiểm chứng.
4. Dùng review đã xác thực để làm mạnh profile, snapshot, trust, match score, và talent sourcing.

### Actor Hiện Có Trong Sản Phẩm

Các vai trò hiện có dấu vết đủ mạnh trong hệ thống:

- user đăng nhập bằng OAuth
- organization owner/admin/member
- project owner/manager/member/viewer
- system admin
- recruiter hoặc talent sourcer qua talent directory và bookmarks

Điều này quan trọng vì nó cho thấy Suar không chỉ có một loại người dùng.

### Capability Groups Trong Scope Hiện Tại

Hệ thống hiện đang cover khá rõ các nhóm capability sau:

1. Authentication và account bootstrap
2. Organization membership và current organization context
3. Project lifecycle và project membership
4. Task authoring, workflow, assignment, submission package
5. Marketplace browse, apply, ranking, triage, withdraw
6. Review session, reverse-review reading surfaces, dispute, AI callback
7. Profile, verified skill signal, trust metrics, public snapshot
8. Notification, audit, user activity, admin surfaces

### Những Thứ Chưa Nên Nói Quá Tay

Các điểm sau hiện chưa có bằng chứng runtime đủ mạnh để coi là capability chính thức hoàn chỉnh:

- email/password authentication riêng ngoài OAuth
- realtime active transport
- legal/privacy artifact độc lập theo chuẩn pháp lý

## Product Requirement Document

### Sản Phẩm Hiện Đang Có Ba Màn Chơi Lớn

Nếu người đọc bị lẫn giữa các route, hãy nhớ theo ba không gian này trước:

- user làm việc và xây hồ sơ
- tổ chức vận hành delivery
- system admin giữ governance toàn hệ thống

### 1. User Workspace

Người dùng làm việc qua các surface như:

- `/tasks`
- `/projects`
- `/profile`
- `/marketplace/*`
- `/reviews/*`

### 2. Organization Workspace

Tổ chức quản lý người, project, và quy trình qua `/org/*`.

Reader nên hiểu ngắn gọn:

- đây là nơi team vận hành delivery thật
- khác với user shell ở chỗ nó ưu tiên quản lý context chung
- khác với system admin ở chỗ nó không đại diện cho governance toàn hệ thống

### 3. System Admin Workspace

Quản trị hệ thống, moderation, dispute, audit, dashboard qua `/admin/*`.

Reader nên hiểu ngắn gọn:

- đây là lớp governance và moderation
- không nên trộn mental model của `/admin/*` với workspace giao việc hằng ngày
- nhiều incident hoặc dispute chỉ nhìn đúng khi phân biệt rõ `org admin` với `system admin`

Điều này rất quan trọng cho mọi tài liệu về hành vi sản phẩm:

- một flow ở user shell không nhất thiết giống flow ở org shell
- org admin không đồng nghĩa system admin

### Product Behaviors Đang Là Thật

#### Authentication

- OAuth only với Google và GitHub
- session guard `web`
- login/logout routes hiện có thật

#### Task Management

- task có metadata đủ giàu để phục vụ review và matching
- submission package không chỉ là “đánh done”
- workflow đang chuyển từ `status` legacy sang `task_status_id` làm truth mới

#### Marketplace

- có public task browse
- có apply
- có ranking/match
- có withdraw và triage

#### Review And Trust

- có pending review
- có submit/confirm/dispute
- có reverse-review reading surfaces
- có AI dispute callback
- có flagged review handling

Điều cần hiểu đúng:

- reverse-review pages và APIs đọc dữ liệu vẫn còn
- nhưng create-flow reverse review ở level từng task hiện đã bị product-deprecate

Nếu cần diễn giải domain này đầy đủ và an toàn hơn, đọc thêm:

- `./features/review_dispute_and_governance.md`

#### Profile And Talent Sourcing

- có profile show/edit
- có skill CRUD
- có publish/share snapshot
- có talent directory
- có talent bookmarks

Nếu chỉ cần chốt “hệ thống này hiện đã đi tới đâu”, năm cụm behavior trên là câu trả lời ngắn nhất.

## Scope Document

### Included Technical Domains

Hệ thống hiện cho thấy scope kỹ thuật đang nằm ở:

- AdonisJS backend
- Svelte + Inertia frontend shell
- PostgreSQL + Redis
- OAuth + session auth
- Mermaid diagram corpus
- nhiều lớp test: unit, integration, contract, E2E, UI

### Scope Constraints Đang Còn Tồn Tại

- social login hiện xác nhận ở Google/GitHub
- `/health` có credential guard
- search runtime có health check riêng và có thể warning dù app vẫn còn sống
- callback public có CSRF exception rõ
- workflow task đang ở pha compatibility:
  - `tasks.status` là legacy
  - `tasks.task_status_id` là truth mới

### Scope Gaps Chưa Có Artifact Gốc

Bộ tài liệu hiện chưa có nguồn độc lập rõ cho:

- project charter chính thức
- stakeholder sign-off record
- success metric baseline document
- product roadmap board riêng

Vì vậy file này giữ đúng ranh giới:

- nói cái hệ thống đang chứng minh được
- không bù phần trống bằng suy đoán

Nói cách khác:

- file này để tin phần có evidence
- không phải để biến mong muốn tương lai thành scope hiện tại

## Khi Nào Dừng Ở File Này

Dừng ở file này khi bạn đã trả lời được:

1. Suar thực chất là loại sản phẩm gì
2. hiện đang có những capability lớn nào là thật
3. role hoặc workspace nào liên quan đến câu hỏi của bạn nhất

Sau đó mới đọc tiếp:

- cần language business sâu hơn: `./capability-model-and-product-positioning.md`
- cần requirement hệ thống: `../02-requirements/srs.md`
- cần flow người dùng và business rules: `../02-requirements/user-story-use-case-business-rule.md`
