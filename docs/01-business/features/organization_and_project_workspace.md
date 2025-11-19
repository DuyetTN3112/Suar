# Organization Và Project Workspace

## Mục đích

Tài liệu này giải thích phần nền vận hành của Suar theo cách có thể mang đi độc lập khỏi codebase:

- người dùng vào tổ chức bằng cách nào
- hệ thống giữ `current organization` và `current project` ra sao
- đâu là bề mặt quản trị tổ chức
- đâu là bề mặt làm việc theo dự án
- join request, project membership, member candidate thực sự hoạt động theo truth nào

Nếu production lỗi ở chỗ "vào được nhưng sai data", "switch xong vẫn lệch context", "org admin thấy khác project member", hoặc "không thêm được người vào project", đây là một trong những file nên mở đầu tiên.

## Kết Luận Nhanh

Suar không có một khối "workspace" duy nhất.

Nó tách khá rõ thành 3 lớp:

1. `Organization discovery and switching`
2. `Organization admin workspace`
3. `Project working workspace`

Ba lớp này liên quan chặt với nhau nhưng không giống nhau.

Nếu trộn chúng lại thành một khái niệm chung chung như "vùng làm việc của tổ chức", người đọc sẽ rất dễ hiểu sai route, quyền, incident, và cả cách mô tả hệ thống trong report.

## Nếu Bạn Chỉ Có 5 Phút

Chỉ cần nhớ bốn ý:

1. Suar tách `organization discovery`, `organization admin workspace`, và `project working workspace` thành ba lớp khác nhau.
2. `current organization` là context mạnh ở mức user/runtime; `current project` hiện gần hơn với session/runtime context.
3. Không phải route nào bắt đầu bằng `/org/` cũng là org-admin shell giống nhau.
4. Join request runtime hiện phải hiểu trước hết như membership-state flow, không phải chỉ như một request-table flow riêng.
5. Sprint planning hiện là project workspace capability riêng trong `app/modules/sprints`, không phải chỉ là review artifact.

Nếu đang gấp:

- lỗi switch/jump context: đọc phần `Switch organization và switch project không giống nhau`
- lỗi access `/org/*`: đọc phần `org admin không đồng nghĩa system admin`
- lỗi staffing/member candidates: đọc phần `Member Candidates Thực Chất Là Gì`

## Mental Model Đúng

### Lớp 1: Organization discovery and switching

Đây là nơi người dùng:

- xem mình có những organization nào
- tạo organization mới
- gửi yêu cầu tham gia organization
- đổi `current organization`

Đây chưa phải vùng quản trị tổ chức sâu.

Surface chính:

- `GET /all-organizations`
- `GET /api/organizations`
- `GET /api/v1/organizations`
- `GET /organizations`
- `GET /organizations/create`
- `POST /organizations`
- `GET /organizations/:organizationId`
- `GET /organizations/:organizationId/join`
- `POST /organizations/:organizationId/join`
- `POST /organizations/:organizationId/switch`
- `GET /organizations/switch/:organizationId`
- `POST /switch-organization`
- `POST /api/v1/me/organizations/switch`

### Lớp 2: Organization admin workspace

Đây là vùng `/org/*`.

Mục tiêu của vùng này là quản trị trong phạm vi organization hiện hành:

- dashboard
- members
- invitations
- join requests
- roles, permissions, departments
- projects của organization
- tasks và workflow của organization

Surface chính:

- `GET /org`
- `GET /org/members`
- `POST /org/members/invite`
- `DELETE /org/members/:memberId`
- `PUT /org/members/:memberId/role`
- `GET /org/invitations/requests`
- `PUT /org/invitations/requests/:joinRequestId/approve`
- `GET /org/invitations`
- `GET /org/settings`
- `PUT /org/settings`
- `GET /org/roles`
- `PUT /org/roles`
- `GET /org/permissions`
- `GET /org/departments`
- `GET /org/projects`
- `POST /org/projects`
- `GET /org/projects/:projectId`
- `GET /org/tasks`
- `GET /org/tasks/board`
- `GET /org/tasks/list`
- `GET /org/tasks/workflow`
- `POST /org/tasks/workflow`

Canonical JSON writes cùng domain này cũng đã có ở:

- `POST /api/v1/me/organizations/current/member-invitations`
- `DELETE /api/v1/me/organizations/current/members/:memberId`
- `PUT /api/v1/me/organizations/current/members/:memberId/role`
- `PUT /api/v1/me/organizations/current/join-requests/:joinRequestId/approve`
- `PUT /api/v1/me/organizations/current/roles`
- `POST /api/v1/me/organizations/current/projects`
- `GET /api/v1/me/organizations/current/task-statuses`
- `POST /api/v1/me/organizations/current/task-statuses`

### Lớp 3: Project working workspace

Đây là lớp người dùng dùng hằng ngày để làm việc theo project trong `current organization`.

Surface chính:

- `GET /projects`
- `GET /projects/create`
- `POST /projects`
- `GET /projects/:projectId`
- `DELETE /projects/:projectId`
- `POST /projects/members`
- `PUT /projects/members/:userId`
- `DELETE /projects/members/:userId`
- `GET /projects/:projectId/member-candidates`
- `POST /switch-project`
- `POST /api/v1/me/projects/switch`
- `GET /api/v1/projects/:projectId/sprints`
- `POST /api/v1/projects/:projectId/sprints`
- `GET /api/v1/projects/:projectId/sprints/:sprintId`
- `PATCH /api/v1/projects/:projectId/sprints/:sprintId`
- `POST /api/v1/projects/:projectId/sprints/:sprintId/open-review`
- `GET /api/v1/projects/:projectId/sprint-board`
- `PATCH /api/v1/projects/:projectId/tasks/:taskId/sprint`

Route `GET /api/v1/projects/:projectId` cũng đã tồn tại cho canonical detail read.

## Điều Người Đọc Hay Hiểu Sai

### 1. `org admin` không đồng nghĩa `system admin`

Code đã chặn rất rõ boundary này:

- org admin shell trong `start/routes/organizations_current.ts` dùng `requireOrgAdmin()` để bảo vệ phần lớn `/org/*` thuộc workspace quản trị tổ chức
- nếu user là system admin, middleware redirect sang `/admin`
- nếu user không có quyền `org_owner` hoặc `org_admin`, họ không được vào org admin shell

Caveat rất quan trọng:

- không nên áp câu trên máy móc cho mọi route bắt đầu bằng `/org/`
- ví dụ `/org/disputes` thuộc review domain trong `start/routes/reviews.ts`, hiện nằm ở group `auth + requireOrg`, không đi qua `requireOrgAdmin()`
- vì vậy khi đọc docs hoặc debug access, phải nhìn route family thực tế trước rồi mới suy ra boundary

Nói ngắn:

- `/org/*` là quản trị một tổ chức cụ thể
- `/admin/*` mới là quản trị toàn hệ thống

### 2. Switch organization và switch project không giống nhau

`Switch organization`:

- đổi organization context ở mức user/session
- trả payload có `organization` và `redirect`
- khi đang ở `/tasks` mà đổi sang organization khác, redirect an toàn thường quay về `/org`
- test hiện tại xác nhận `current_organization_id` trên user được cập nhật
- current API/controller còn có thêm một lớp `safe redirect`:
  - nếu `currentPath` cùng loại shell với target mới thì hệ thống cố giữ người dùng ở path cũ
  - nếu đang đổi giữa non-admin shell và org-admin shell, hoặc đang ở `/organizations*`, hệ thống fallback về redirect an toàn do command quyết định
- command hiện trả `/org` cho actor có thể vào org admin shell, còn lại trả `/tasks`

`Switch project`:

- chỉ đổi `current_project_id` trong session
- bắt buộc project phải thuộc `current organization`
- response trả về `redirect: /tasks`

Điểm cực kỳ quan trọng cho docs độc lập:

- `current organization` hiện là truth cấp user/runtime rất mạnh
- `current project` hiện là truth cấp session/runtime
- không nên viết như thể hệ thống có một user-level project context bền vững giống `current_organization_id` nếu chưa có bằng chứng tương đương

### 2b. Org resolver có thể tự sửa context, không chỉ đọc thụ động

Đây là nuance rất dễ bị bỏ sót khi incident:

- nếu session và DB đều chưa có organization context, resolver sẽ thử lấy `first approved membership` đầu tiên để tự gắn context
- nếu session đang trỏ vào org không còn approved membership hợp lệ, resolver sẽ clear context cũ
- sau đó resolver còn có thể fallback sang approved membership khác nếu user vẫn còn một org hợp lệ khác
- chỉ khi không còn approved membership nào và request không nằm trong exempt path/optional contract thì hệ thống mới bật modal hoặc trả lỗi yêu cầu chọn organization

Điều này có nghĩa:

- “tự nhiên current org đổi” đôi khi không phải bug switch button
- có thể là resolver đang tự cứu context sau khi membership hoặc org validity thay đổi
- docs incident và report bên ngoài repo phải xem resolver là một actor runtime thật, không phải middleware thụ động vô hình

### 3. Join request runtime mới không nên mô tả như table riêng độc lập

Code và test hiện tại đều ghi rõ:

- flow v3 dùng `organization_users` với `status = pending`
- approve chuyển thành `approved`
- reject chuyển thành `rejected`
- pending membership vẫn là membership row, nhưng chưa phải approved membership

Điều này rất quan trọng vì:

- model/tên bảng `organization_join_requests` vẫn còn trong codebase
- nhưng runtime truth của flow join request hiện đã nghiêng sang membership-state model

Nếu viết report hoặc diagram mà nói "join request luôn là record riêng trong `organization_join_requests`" thì có nguy cơ sai với logic vận hành hiện tại.

## What Not To Do

- không gom cả organization discovery, org-admin workspace, và project workspace thành một “workspace” duy nhất cho tiện kể chuyện
- không nhìn prefix `/org/` rồi tự kết luận route đó chắc chắn dùng cùng một actor boundary
- không mô tả `current project` như một truth bền vững ngang cấp `current_organization_id` nếu current evidence chưa chứng minh điều đó
- không kể join request như standalone request-table flow nếu runtime hiện tại đang lấy truth từ membership state

## Data Truth Đã Được Audit

### Organization

Các truth chính đã được xác nhận:

- `organizations` là identity của tổ chức
- `organization_users` là membership truth quan trọng nhất
- `users.current_organization_id` là context đang làm việc ở mức user

Join request hiện nên hiểu là:

- một trạng thái của membership
- không chỉ là một artifact riêng của bảng join-request

### Project

Các truth chính đã được xác nhận:

- `projects.organization_id` ràng project vào organization
- `project_members` là membership của project
- project member trước hết phải là org member hợp lệ

Policy hiện tại cũng xác nhận:

- chỉ owner/creator/org owner/org admin hoặc system admin mới có quyền quản lý membership project
- project manager có thể update project ở mức giới hạn field
- member candidates phải là org members chưa có trong project

### Project Sprint Management

Sprint planning hiện là một lớp riêng của project workspace.

Runtime truth:

- module chính: `app/modules/sprints`
- review/governance phase vẫn ở `app/modules/reviews`
- `project_sprints.goal` là Sprint Goal nullable, được create/update/list/show và trả trong sprint board selected sprint
- blank goal được normalize thành `null`; goal dài hơn `2000` ký tự bị chặn ở command layer
- `tasks.project_sprint_id = null` nghĩa là Product Backlog
- task chỉ move vào sprint cùng project và chỉ khi sprint còn editable (`draft` hoặc `active`)

Surface chính:

- user/org project detail đều có tab `Sprints`
- `ProjectSprintPanel` gọi sprint list, sprint board, move task, create sprint, open review, expire pending package, và close review period
- task board không render full sprint management; nó chỉ link người dùng sang project sprint tab khi cần

Access model:

- project participant có thể đọc sprint list/board
- project owner, project manager, hoặc project role quản lý (`owner`, `project_owner`, `project_manager`, `manager`) mới được create/update sprint hoặc move task vào/ra sprint
- mở review cho sprint là cầu nối sang review governance: `POST /api/v1/projects/:projectId/sprints/:sprintId/open-review` gọi review command để chuyển `active -> review_open`

Điều dễ hiểu sai:

- đừng gọi toàn bộ sprint surface là "Project Sprint Reviews"; planning/backlog thuộc sprint module, còn review package/reverse workflow thuộc review module
- `project_sprints` vừa là planning container vừa là anchor cho review-close governance, nên docs phải nói rõ đang bàn planning hay review phase

## Member Candidates Thực Chất Là Gì

`GET /projects/:projectId/member-candidates` không chỉ trả "danh sách user còn trống".

Payload hiện tại đã được chuẩn hóa camelCase và có thêm các signal:

- `userId`
- `username`
- `email`
- `orgRole`
- `reviewedSkillsCount`
- `importedSkillsCount`
- `underDisputeSkillsCount`
- `latestConfidenceSignal`

Điều đó có nghĩa:

- đây là staffing-support surface
- không phải dropdown user thô
- candidate list đã bắt đầu mang review/profile governance context

Nếu production lỗi ở bước assign/staffing, đừng chỉ nghi membership table. Hãy nghi cả candidate query, search filter, skill signals, và dispute counters.

## `/org/tasks` Có Một Filter Ngầm Rất Dễ Bỏ Qua

Trong org admin shell, `GET /org/tasks`, `GET /org/tasks/board`, và `GET /org/tasks/list` không phải lúc nào cũng là “toàn bộ task của organization”.

Current controller cho thấy:

- nếu request không truyền `scope=organization`
- hệ thống sẽ tự lấy `current_project_id` từ session làm `requested_project_id`
- nghĩa là người dùng có thể đang ở org admin shell nhưng vẫn nhìn một lát cắt theo project hiện hành

Chỉ khi:

- truyền `scope=organization`

thì page mới đi theo organization-wide scope rõ ràng hơn.

Điều này cực kỳ quan trọng cho debug:

- hai người cùng ở một organization vẫn có thể thấy danh sách task khác nhau nếu `current_project_id` trong session khác nhau
- một người vừa switch project xong rồi mở `/org/tasks` có thể tưởng dữ liệu org bị thiếu, trong khi thực ra page đang lọc ngầm theo project context
- nếu report hoặc diagram nói `/org/tasks` luôn là org-wide board thì sẽ thiếu mất một sự thật runtime rất quan trọng

## Evidence Đủ Mạnh Để Tin

### Route và middleware

- `start/routes/organizations.ts`
- `start/routes/organizations_current.ts`
- `start/routes/projects.ts`
- `start/routes/api_v1.ts`
- `app/modules/organizations/middleware/require_org_admin_middleware.ts`
- `app/modules/organizations/middleware/organization_resolver_middleware.ts`

### Controller / command / policy

- `app/modules/organizations/controllers/join_organization_controller.ts`
- `app/modules/organizations/controllers/switch_organization_controller.ts`
- `app/modules/organizations/controllers/current/tasks/list_tasks_controller.ts`
- `app/modules/projects/controllers/switch_project_controller.ts`
- `app/modules/projects/controllers/list_project_member_candidates_controller.ts`
- `app/modules/organizations/actions/queries/find_pending_join_request_query.ts`
- `app/modules/organizations/actions/commands/process_join_request_command.ts`
- `app/modules/projects/domain/project_permission_policy.ts`

### Test evidence

- `app/modules/organizations/tests/backend/integration/join_request.spec.ts`
- `app/modules/organizations/tests/backend/integration/membership.spec.ts`
- `app/modules/organizations/tests/backend/integration/switch_context_api_standardization.spec.ts`
- `app/modules/projects/tests/backend/integration/project_members.spec.ts`
- `app/modules/projects/tests/backend/integration/project_member_candidates_http_standardization.spec.ts`
- `inertia/apps/org/tests/modules/projects/project_show_page.test.ts`
- `inertia/apps/org/tests/modules/projects/projects_index_page.test.ts`
- `inertia/apps/org/tests/e2e/projects/staffing_flow.spec.ts`
- `inertia/apps/org/tests/e2e/org/org_task_scope_toggle.spec.ts`

## Nếu Dùng File Này Để Viết Report Bên Ngoài Repo

Bạn có thể dùng file này để viết:

- phần mô tả cấu trúc workspace của hệ thống
- phần phân quyền giữa người dùng thường, org admin, và system admin
- phần mô tả organization membership, project membership, và context switching
- phần giải thích vì sao Suar không chỉ là task board mà là workspace nhiều lớp có governance

Một mô tả an toàn có thể dùng:

`Ở lớp vận hành nền, Suar tổ chức không gian làm việc thành ba tầng: discovery/switching của organization, quản trị trong organization hiện hành, và làm việc theo project trong organization đó; các tầng này dùng chung membership và context nhưng có route, quyền, và hành vi runtime khác nhau.`

## Khi Nào Dừng Ở File Này

Bạn có thể dừng ở file này nếu mục tiêu của bạn là:

- hiểu đúng organization/project workspace mà không cần đọc code
- viết report giải thích cấu trúc context và quyền của Suar
- debug nhanh incident kiểu switch context, join request, project membership, hoặc member candidates
- phân biệt rõ `/organizations`, `/org`, `/projects`, `/admin`

Bạn không cần mở thêm file khác nếu bốn mục trên đã đủ cho câu hỏi của bạn.

Chỉ đọc thêm khi bạn muốn đổi scope:

- cần bức tranh business rộng hơn: mở `../brd-prd-scope.md`
- cần inventory route đầy đủ hơn: mở `../../06-data/api-specification.md`
- cần governance/API boundary: mở `../../05-api/api-landscape-and-governance.md`
- cần task/review/search domains đi sâu hơn: mở các file feature khác trong cùng folder
