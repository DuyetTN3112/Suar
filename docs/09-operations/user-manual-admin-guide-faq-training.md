# User Manual, Admin Guide, FAQ, Training Material

| Field | Value |
|---|---|
| Status | Active |
| Audience | Người mới, end user, org admin, system admin, trainer, QA, support |
| Purpose | Giải thích người dùng và quản trị viên thực sự làm gì trong Suar, đọc theo vai trò được ngay, không cần tự ghép từ route và code |
| Source of Truth | `start/routes/*.ts`, verified controllers, verified UI pages, selected tests cited below |
| Last Reviewed | 2026-07-10 |
| Review Cycle | Khi workspace, quyền, route, hoặc flow người dùng đổi |
| Owner | Product + engineering |
| Stale Risk | Cao |

## What This File Must Help You Do

Sau khi đọc file này, người đọc phải trả lời được:

- tôi là ai trong hệ thống
- tôi vào bằng cách nào
- tôi làm việc ở workspace nào
- tôi có thể làm gì với task, review, profile, marketplace
- admin nào làm gì
- phần nào đã được xác nhận mạnh, phần nào mới chỉ có proof hạn chế hơn

Nếu bạn chỉ có ít phút:

1. đọc `System Mental Model`
2. đọc `Read By Role`
3. nhảy thẳng vào section đúng vai trò của bạn

## System Mental Model

Suar không chỉ là task board. Nó là vòng lặp năng lực có xác minh:

`Làm việc -> Nộp kết quả -> Được review -> Hồ sơ mạnh hơn -> Dễ được chọn hơn`

Ở góc nhìn người dùng, hệ thống có ba lớp trải nghiệm chính:

1. `Workspace làm việc`: organization, project, task, review
2. `Marketplace và profile`: talent, bookmarks, public snapshot, public profile
3. `Quản trị`: org admin và system admin

Một câu nhớ ngắn:

`Người dùng làm việc, tạo evidence, rồi evidence đó quay lại làm mạnh profile và staffing.`

## Read By Role

### Nếu bạn là người mới

Đọc theo thứ tự:

1. phần `First 10 Minutes`
2. phần `Daily User Workflows`
3. phần `FAQ`

### Nếu bạn là org admin

Đọc:

1. phần `Organization Admin Guide`
2. phần `Training Tracks`
3. [Production Incident First Response](./production-incident-first-response.md)

### Nếu bạn là system admin

Đọc:

1. phần `System Admin Guide`
2. phần `FAQ`
3. [Runbook, Monitoring, Maintenance](./runbook-monitoring-maintenance.md)

## First 10 Minutes

### 1. Đăng nhập

Hệ thống hiện chỉ xác nhận social login qua:

- `google`
- `github`

Flow vào hệ thống:

1. mở route OAuth redirect
2. đi qua callback
3. nhận session `web`
4. tiếp tục trong workspace đã đăng nhập

Nguồn: `start/routes/auth.ts`, `config/auth.ts`

Điểm phải hiểu đúng:

- user-facing login chính hiện là OAuth session flow
- repo hiện có JSON token routes như `/api/auth/token` và `/api/v1/auth/token`, nhưng chúng đang bind `session-only`, không phải “public bearer bootstrap” theo kiểu nhìn prefix mà đoán
- ngoài ra còn có nhóm `/api/testing/*` để hỗ trợ dev/test seed user, token pair, và session bootstrap; chúng không phải production API và chỉ nên được nhắc như tooling support surface
- vì vậy nếu tester hay support nói “v1 auth route phải dùng token thuần được chứ”, đó chưa chắc là expectation đúng với runtime hiện tại

### 2. Chọn organization hiện hành

Sau khi đăng nhập, phần lớn workspace chính yêu cầu organization context.

Người dùng có thể:

- xem danh sách organization
- tạo organization
- gửi join request
- switch organization hiện hành

Các route switch đã được xác nhận:

- `POST /organizations/:id/switch`
- `GET /organizations/switch/:id`
- `POST /switch-organization`
- `POST /api/v1/me/organizations/switch`

Nguồn: `start/routes/organizations.ts`

Điểm phải hiểu thật rõ:

- đổi organization là đổi context nền của rất nhiều màn hình
- nếu đổi organization xong mà route hiện tại không còn cùng boundary, hệ thống có thể redirect về `/org`
- vì vậy lỗi "đổi org xong bị nhảy chỗ khác" không phải lúc nào cũng là bug; đôi khi là safety behavior đúng
- nếu user chưa có current org nhưng có approved membership hợp lệ, resolver runtime còn có thể tự gán org đầu tiên cho họ
- nếu org hiện tại không còn membership hợp lệ, resolver có thể tự clear rồi fallback sang org approved khác nếu có

### 3. Bắt đầu làm việc

Sau khi có current organization, người dùng mới truy cập ổn định vào các vùng như:

- `/projects`
- `/tasks`
- `/profile`
- `/reviews/*`

Nếu người mới thấy “vào được nhưng data trống”, điều đầu tiên nên nghi không phải luôn là bug UI. Rất hay là current organization chưa đúng hoặc route đang cần org context.

Nguyên tắc nhớ nhanh:

- `/organizations*` để chọn và đổi context
- `/org*` để quản trị organization hiện hành
- `/projects*`, `/tasks*`, `/reviews*` để làm việc trong context đó

Code audit note:

- `requireOrg` hiện là thin guard sau resolver
- nghĩa là “không có org context” có thể là kết quả của:
  - user chưa có approved membership nào
  - session và DB lệch nhau
  - org cũ đã invalid
  - request đang ở exempt path nên resolver không ép modal/403 như các path khác

## Daily User Workflows

### Project Và Task

Đây là vùng làm việc hàng ngày.

Người dùng có thể:

- mở `/projects`
- tạo project qua `/projects/create`
- đổi project hiện hành qua `POST /switch-project`
- mở `/tasks`
- xem task list, status board, timeline, và grouped-by-status surfaces
- mở task detail để:
  - đổi status
  - ghi thời gian
  - thao tác submission package
  - thêm evidence
  - bình luận
  - upload attachment
  - xem audit log task

Điểm cần hiểu đúng:

- project context không cùng cấp với organization context
- `current organization` là context nền lớn hơn
- `switch project` hiện chỉ đổi session project context và redirect về `/tasks`
- product flow hiện đối xử task như entity thuộc project
- nhưng SQL snapshot hiện vẫn cho thấy `tasks.project_id` còn nullable

Vì vậy:

- đây là product/runtime expectation mạnh
- chưa nên viết như thể DB physical constraint `NOT NULL` đã được chứng minh
- nếu cần gọi tên JSON surface ổn định cho board grouping, ưu tiên `status-groups`; đừng dạy người đọc dùng alias cũ `grouped` như route chuẩn

Nguồn: `start/routes/projects.ts`, `start/routes/tasks.ts`, `schema/migration evidence`, `app/modules/tasks/infra/models/task.ts`, `app/modules/tasks/actions/dtos/request/create_task_dto.ts`, `inertia/apps/user/modules/tasks/create.svelte`, `inertia/apps/org/modules/tasks/create.svelte`

### Marketplace

Marketplace là nơi người dùng ngoài flow nội bộ có thể tìm task và gửi đề xuất tham gia.

Surface chính:

- `/marketplace/tasks`
- `/my-applications`

Hành vi chính:

1. browse task mở cho external applicant
2. apply vào task
3. theo dõi application của mình
4. phía quản lý task xem ranking, match explanation, và xử lý approve/reject

Đây là chỗ người mới hay hiểu nhầm Suar như job board đơn giản. Thực tế hệ thống hiện cho thấy marketplace đang nối khá chặt với task requirement, profile signal, và match explanation.

Nguồn: `start/routes/tasks.ts`

### Profile Và Public Proof

Người dùng có thể:

- mở `/profile`
- cập nhật thông tin
- quản lý skills
- publish snapshot
- xem current snapshot
- xem history
- rotate share link
- cấu hình access

Public profile/shareable proof:

- `/users/:userId/profile`
- `/profiles/:slug`

Nguồn: `start/routes/users.ts`

### Notifications Và Settings

Người dùng có thể:

- mở `/notifications`
- dùng `/notifications/latest` cho quick surface
- đánh dấu đã đọc
- xóa thông báo
- vào `/settings/notifications`

Nguồn: `start/routes/notifications.ts`, `start/routes/settings.ts`, `start/routes/api_v1.ts`

### Review Và Dispute

Khi công việc hoàn thành, review là một flow quan trọng chứ không phải phần phụ.

Surface đã được xác nhận:

- pending reviews
- review detail
- submit review
- confirm or dispute
- reverse-review reading surfaces
- dispute room

Điều cần hiểu đúng:

- repository xác nhận review là core flow quanh completed work
- task-level reverse review creation hiện đã bị tắt; các màn reverse review hiện chủ yếu dùng để đọc dữ liệu đã có và giữ continuity cho product direction mới
- nhưng câu khẳng định kiểu “mọi task đều bắt buộc review ở mọi trường hợp” chỉ nên dùng khi chỉ rõ rule thực thi tương ứng

Nếu đọc sai chỗ này, rất dễ biến docs thành tuyệt đối hóa những rule mà repo chưa chứng minh ở mọi ngóc ngách.

Nguồn: `start/routes/reviews.ts`, `app/modules/reviews/tests/backend/integration/create_session.spec.ts`, `app/modules/reviews/tests/backend/integration/submit_review.spec.ts`, `app/modules/reviews/tests/backend/integration/confirm_review.spec.ts`

## Organization Admin Guide

### Org Admin Quản Lý Gì

Org admin surfaces đã được route-confirm:

- current org members
- invitations
- join requests
- org projects
- org settings
- org tasks
- org workflow / task statuses
- custom roles / access configuration

Một cách hiểu ngắn:

- org admin giữ nhịp delivery trong phạm vi tổ chức
- system admin giữ governance của toàn hệ thống

Điểm phải nhớ thêm:

- org discovery/join/switch không đồng nghĩa org admin
- `pending join request` hay `pending membership` cũng chưa đồng nghĩa người dùng đã vào được org workspace như approved member

Nguồn: `start/routes/organizations_current.ts`, `start/routes/index.ts`

### Org Admin Discovery Surfaces Với Mức Proof Mạnh

#### Org Talents

Đây là runtime surface đã được xác nhận khá mạnh:

- route:
  - `/org/talents`
  - `/org/talents/:userId`
- controller:
  - `app/modules/users/controllers/org_talents_page_controller.ts`
- E2E:
  - listing shell
  - detail navigation
  - bookmark flow
- UI:
  - `inertia/apps/org/modules/talents/index.svelte`
  - `inertia/apps/org/modules/talents/show.svelte`
  - `inertia/apps/org/modules/bookmarks/index.svelte`

Nguồn: `start/routes/users.ts`, `app/modules/users/controllers/org_talents_page_controller.ts`, `app/modules/users/controllers/org_bookmarks_page_controller.ts`, `inertia/apps/org/tests/e2e/org/org_talent_pages.spec.ts`, `inertia/apps/org/tests/e2e/org/talent_bookmarks.spec.ts`

Điều nên hiểu đúng:

- route này nằm trong `start/routes/users.ts`, không nằm trong org-admin shell file
- runtime group của nó hiện là `auth + requireOrg`
- vì vậy đây là org-scoped workspace/discovery surface, không nên mô tả cứng như một màn “chỉ org admin mới vào được” nếu chưa có evidence policy tương đương

#### Org Disputes

Đây cũng là runtime surface đã được xác nhận khá mạnh:

- route:
  - `/org/disputes`
- controller:
  - `app/modules/reviews/controllers/show_org_disputes_page_controller.ts`
- integration proof:
  - access rules
  - organization scoping
  - cursor pagination
  - non-UUID search safety
- E2E:
  - queue page render
  - filter form
  - access behavior
  - empty state

Nguồn: `start/routes/reviews.ts`, `app/modules/reviews/controllers/show_org_disputes_page_controller.ts`, `app/modules/reviews/actions/queries/list_org_review_disputes_query.ts`, `app/modules/reviews/tests/backend/integration/org_dispute_queue_access.spec.ts`, `inertia/apps/org/tests/e2e/reviews/org_dispute_queue.spec.ts`, `inertia/apps/org/tests/e2e/reviews/org_dispute_queue_flow.spec.ts`

Điểm phải nhớ:

- route `/org/disputes` cũng không đi qua `requireOrgAdmin()` ở middleware layer
- người support không nên dùng tên path để tự kết luận actor boundary
- khi access fail, phải kiểm tra current org, approved membership, dispute scoping, rồi mới nghi admin role
- đừng trộn `/org/disputes` với `/org/reverse-reviews`; reverse review org scope hiện còn có guard role hẹp hơn ở query layer

## System Admin Guide

### System Admin Quản Lý Gì

Các bề mặt admin đã được xác nhận:

- reverse reviews admin page
- dispute queue/detail
- dispute AI operator page
- case-files / AI evaluations
- flagged reviews
- admin dashboards
- users
- organizations
- audit logs
- permissions
- packages

Đây là vùng cần đọc cẩn thận nhất nếu bạn đang support incident có liên quan moderation, dispute, permissions, hoặc dashboards hệ thống.

Nguồn: `start/routes/reviews.ts`, `start/routes/admin.ts`

### Admin Proficiency

Surface này đã được xác nhận ở mức:

- route:
  - `/admin/proficiency`
  - `/admin/proficiency/:proficiencyScaleId`
  - `/admin/proficiency/rubrics/:skillId`
- controllers:
  - list scale
  - show scale
  - show rubric
- unit proof:
  - view-model mapping
- E2E read proof:
  - `inertia/apps/admin/tests/e2e/admin/admin_proficiency_rubric_read.spec.ts`

Điều chưa nên nói quá:

- rubric E2E có thể skip nếu seed hiện hành không có published rubric
- surface hiện chủ yếu là read/readiness proof, chưa chứng minh UX tạo/sửa rubric

Vì vậy:

- có thể tin đây là runtime admin surface đã tồn tại
- có thể tin read UX đã có browser proof
- nhưng chưa nên mô tả authoring/mutation UX của rubric như đã được chứng minh end-to-end mạnh

Nguồn: `start/routes/admin.ts`, `app/modules/admin/controllers/proficiency/*`, `app/modules/admin/tests/backend/unit/proficiency_view_model.spec.ts`, `inertia/apps/admin/tests/e2e/admin/admin_proficiency_rubric_read.spec.ts`

### Dashboard Surfaces

System admin dashboard routes:

- `/admin`
- `/admin/dashboards/users`
- `/admin/dashboards/operations`
- `/admin/dashboards/subscriptions`
- `/api/admin/dashboard`

Admin work surfaces:

- `/admin/disputes`
- `/admin/disputes/:id`
- `/admin/disputes/ai-operator`
- `/admin/reviews`
- `/admin/reviews/:id`

Nguồn: `start/routes/admin.ts`, `start/routes/reviews.ts`

Điều nên nhớ:

- `/admin/*` là system-admin boundary thật
- nó khác hẳn `/org/*` là organization-admin boundary
- một người là org owner chưa chắc vào được các màn system admin này
- `/api/admin/*` hiện là một tập JSON admin riêng, nhưng chưa nên bị kể như bản sao đầy đủ của mọi page dưới `/admin/*`

## FAQ

### Hệ thống có email/password không?

Chưa có evidence mạnh cho email/password flow riêng. Current runtime evidence chỉ xác nhận Google/GitHub OAuth.

Nguồn: `start/routes/auth.ts`, `schema/migration evidence`

### Task có thể không thuộc project không?

Có một tension cần ghi rõ:

- product và UI flow đối xử task như thuộc project
- SQL snapshot vẫn cho thấy `tasks.project_id` nullable

Vì vậy câu trả lời an toàn là:

- product intent: task gắn với project
- physical DB proof: chưa đủ để nói `NOT NULL`

### Review có gắn với completed work không?

Có, đây là một flow lõi đã được xác nhận bởi route, command, model, test.

Điều cần tránh là viết quá tay thành “mọi task đều luôn bắt buộc review” nếu không chỉ rõ rule enforcement tương ứng.

### Có profile public không?

Có:

- public profile route: `/users/:userId/profile`
- public snapshot route: `/profiles/:slug`

### Có realtime active transport không?

Không thấy transport active được xác nhận trong runtime config hiện tại vì `config/transmit.ts` đặt `transport: null`.

### Có health endpoint không?

Có `/health`, nhưng không public hoàn toàn. Nó đi qua credential middleware, phụ thuộc `health-check credential`, và nếu env này chưa cấu hình thì middleware chặn luôn theo kiểu `secure by default`.

Nguồn: `start/routes/index.ts`, `start/env.ts`

### Có notification center không?

Có. Route, API route, repository provider, serializer, UI page, và dropdown component đều đã có dấu vết trực tiếp trong hệ thống hiện tại.

Nguồn: `start/routes/notifications.ts`, `start/routes/api_v1.ts`, `app/modules/notifications/infra/repositories/notification_repository_provider.ts`, `inertia/apps/user/modules/notifications/index.svelte`, `inertia/apps/org/modules/notifications/index.svelte`

Điểm nên nhớ thêm:

- `/notifications` là page surface
- `/notifications/latest` là quick JSON surface có `api-compat` transport dù path không có prefix `/api`
- nếu dropdown lệch dữ liệu nhưng notifications page vẫn mở được, bug có thể nằm ở latest JSON surface chứ không phải page shell

## What Not To Do

- Đừng nhìn route rồi tự gom `/org/*` thành một loại quyền duy nhất; org discovery, org workspace, org dispute queue, và org admin actions không hoàn toàn giống nhau.
- Đừng thấy user đã gửi join request rồi kết luận họ sẽ đọc được org workspace; `pending` và `approved` khác nhau rất nhiều ở runtime.
- Đừng mô tả reverse review như flow create active bình thường theo task; docs user-facing cũng phải giữ đúng caveat deprecate hiện tại.
- Đừng thấy `/api/v1/auth/*` rồi suy ra login/token flow ở đó là bearer bootstrap thuần; runtime hiện không đơn giản như vậy.
- Đừng kết luận notification bug nằm ở page `/notifications` nếu chỉ dropdown/latest đang sai; `/notifications/latest` là seam riêng.

## Training Material

### Training Track 1: Người mới vào workspace

- đăng nhập OAuth
- chọn organization
- mở project
- mở task

### Training Track 2: Người trực tiếp làm task

- tạo task
- cập nhật task status
- nộp submission package
- xem audit log task

### Training Track 3: Reviewer / reviewee

- submit review
- confirm hoặc dispute
- đọc reverse review hiện có và hiểu caveat flow mới

### Training Track 4: Xây hồ sơ năng lực

- edit profile
- quản lý skills
- publish snapshot
- chia sẻ public snapshot

### Training Track 5: Talent sourcing / marketplace

- marketplace proposal
- ranking
- talent bookmark

### Training Track 6: Admin / support

- notifications inbox
- notification settings
- admin dashboards
- dispute moderation queue

## Training Boundary

Không tìm thấy:

- slide deck riêng
- SOP training script riêng
- LMS artifact riêng

Vì vậy phần training trong file này là:

- đường học tập suy ra trực tiếp từ route surfaces
- module behavior đã có dấu vết trong hệ thống hiện tại

Nó là tài liệu training thực dụng dựa trên runtime hiện có, không phải curriculum pack chính thức đã được xuất bản riêng.

## Khi Nào Dừng Ở File Này

Dừng ở file này khi bạn đã biết:

1. user hoặc admin concern của mình nằm ở phần manual, FAQ, hay training track nào
2. surface runtime nào đang hỗ trợ concern đó
3. lúc nào cần sang operations runbook, feature spec, hay diagram docs để đọc sâu hơn
