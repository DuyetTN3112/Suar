# Organization Và Project Workspace

## Mục đích

Tài liệu này giải thích phần nền vận hành của Suar theo cách có thể mang đi độc lập khỏi codebase:

- hai security realm tách biệt: `System` và `User`
- người dùng vào tổ chức bằng cách nào
- hệ thống giữ `current organization` và `current project` ra sao
- đâu là bề mặt quản trị tổ chức
- đâu là bề mặt làm việc theo dự án
- join request, project membership, member candidate thực sự hoạt động theo truth nào

Nếu production lỗi ở chỗ "vào được nhưng sai data", "switch xong vẫn lệch context", "org admin thấy khác project member", hoặc "không thêm được người vào project", đây là một trong những file nên mở đầu tiên.

## Kết Luận Nhanh

Mô hình sản phẩm bắt buộc của Suar có hai security realm tách biệt, không phải một người dùng mang role ở mọi scope:

- `System realm`: principal là `System Admin`, chỉ dùng `/admin/*`.
- `User realm`: principal là `User`, dùng Personal, Organization Management và Project Workspace.

Trong User realm, workspace tách khá rõ thành 3 lớp:

1. `Organization discovery and switching`
2. `Organization Management`
3. `Project Workspace`

Ba lớp này liên quan chặt với nhau nhưng không giống nhau.

Nếu trộn chúng lại thành một khái niệm chung chung như "vùng làm việc của tổ chức", người đọc sẽ rất dễ hiểu sai route, quyền, incident, và cả cách mô tả hệ thống trong report.

System realm không phải lớp thứ tư trong chuỗi trên. Nó là một biên xác thực và ứng dụng khác; System Admin không kế thừa Organization/Project context, còn User không bật “admin mode” để đi vào System realm.

### Trạng thái triển khai cần nói trung thực

Ranh giới frontend, route và domain permission context đã được tách: Admin app không có User workspace switcher; Project/Task/Review policy không nhận System role; `/admin/*` dùng System context riêng.

Tuy nhiên physical identity/session separation vẫn là **Partial**: authentication transport hiện còn dùng `auth.user`, `users.system_role` và landing resolver chung để phân loại request vào System Administration. Đây là migration debt, không phải lý do để mô hình hóa một User “mang thêm System role”. Đích kiến trúc là System principal/session store độc lập; cho tới khi debt này được gỡ, tài liệu phải phân biệt rõ:

- product/security model: hai principal, hai realm;
- current transport/storage adapter: còn shared compatibility coupling;
- Organization và Project role chỉ thuộc User realm, tuyệt đối không cộng với System authorization trong một bảng quyền.

## Nếu Bạn Chỉ Có 5 Phút

Chỉ cần nhớ sáu ý:

1. `System Admin` và `User` là hai principal ở hai realm tách biệt; không mô hình hóa System Admin như một role của User.
2. Trong User realm, Suar tách `organization discovery`, `Organization Management`, và `Project Workspace`.
3. `current organization` là context mạnh ở mức user/runtime; `current project` hiện gần hơn với session/runtime context.
4. Organization Management chỉ giữ governance, people/access, settings, audit và project portfolio; task/review board nằm trong Project Workspace.
5. Join request runtime hiện phải hiểu trước hết như membership-state flow, không phải chỉ như một request-table flow riêng.
6. Sprint planning hiện là Project Workspace capability riêng trong `app/modules/sprints`, không phải chỉ là review artifact.

Nếu đang gấp:

- lỗi switch/jump context: đọc phần `Switch organization và switch project không giống nhau`
- lỗi access `/org/*`: đọc phần `System realm không phải quyền nâng cao của User`
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

### Lớp 2: Organization Management

Đây là vùng `/org/*`.

Mục tiêu của vùng này là quản trị trong phạm vi organization hiện hành:

- overview và insight cấp tổ chức
- members, invitations và join requests
- roles và permissions
- talent resources
- settings và audit log
- project portfolio và khởi tạo project

Vùng này không sở hữu Task Board, Task Review Board, Assigner Review Board hoặc Work Environment Review Board. Khi chọn một project từ portfolio, người dùng rời Organization Management để vào Project Workspace của project đó.

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
- `GET /org/tasks/workflow`
- `POST /org/tasks/workflow`

`/org/tasks/workflow` là cấu hình workflow/status cấp tổ chức, không phải một task board. Các URL đọc task cũ như `/org/tasks`, `/org/tasks/board` và `/org/tasks/list` chỉ là compatibility entry và phải redirect vào Project Task Board; chúng không được dùng để dựng lại một Organization task UI.

Canonical JSON writes cùng domain này cũng đã có ở:

- `POST /api/v1/me/organizations/current/member-invitations`
- `DELETE /api/v1/me/organizations/current/members/:memberId`
- `PUT /api/v1/me/organizations/current/members/:memberId/role`
- `PUT /api/v1/me/organizations/current/join-requests/:joinRequestId/approve`
- `PUT /api/v1/me/organizations/current/roles`
- `POST /api/v1/me/organizations/current/projects`
- `GET /api/v1/me/organizations/current/task-statuses`
- `POST /api/v1/me/organizations/current/task-statuses`

### Lớp 3: Project Workspace

Đây là lớp người dùng dùng hằng ngày để làm việc theo project trong `current organization`.

Mỗi project có đúng bốn board dùng chung cho các participant của project:

1. Task Board — `/projects/:projectId/tasks`
2. Task Review Board — `/projects/:projectId/reviews/tasks`
3. Assigner Review Board — `/projects/:projectId/reviews/assigners`
4. Work Environment Review Board — `/projects/:projectId/reviews/environment`

Board là bề mặt chính. Danh sách, lịch sử, “waiting on me”, form và chi tiết được biểu diễn bằng lane, filter, drawer/modal hoặc card room trên chính board; không tạo thêm list/history/inbox/detail page cạnh board.

Surface chính:

- `GET /projects`
- `GET /projects/create`
- `POST /projects`
- `GET /projects/:projectId`
- `GET /projects/:projectId/tasks`
- `GET /projects/:projectId/reviews/tasks`
- `GET /projects/:projectId/reviews/assigners`
- `GET /projects/:projectId/reviews/environment`
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

### 1. System realm không phải quyền nâng cao của User

Boundary hiện tại phải được đọc như sau:

- `System Admin` là System principal, dùng System app và `/admin/*`.
- `User` là User principal, có membership/permission trong Organization và từng Project.
- Organization/Project permission context không chứa `system_role` hoặc `isSystemAdmin`.
- System frontend không có organization/project switcher; User/Org frontend không có admin-mode switch.
- Không có flow “User bật admin mode”, “System Admin quay về project”, hoặc một session cộng dồn role giữa hai realm.

Trong User realm:

- Organization owner/admin có thể vào Organization Management.
- Project access được quyết định riêng theo project membership/permission.
- Có quyền quản lý Organization không tự động biến mọi Project action thành hợp lệ; ngược lại, Project member không tự động có Organization Management access.

Nói ngắn:

- `/org/*` là User-realm Organization Management.
- `/projects/:projectId/*` là User-realm Project Workspace.
- `/admin/*` là System realm và chỉ dành cho System Admin principal.

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
- response compatibility có thể trả `/tasks`, nhưng URL đó tiếp tục redirect vào `/projects/:projectId/tasks`

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

### 3. Join request là membership state

Code và test hiện tại đều ghi rõ:

- flow v3 dùng `organization_users` với `status = pending`
- approve chuyển thành `approved`
- reject chuyển thành `rejected`
- pending membership vẫn là membership row, nhưng chưa phải approved membership

Runtime không có model/table join-request riêng. Report và diagram phải dùng membership-state model.

## What Not To Do

- không gom cả organization discovery, org-admin workspace, và project workspace thành một “workspace” duy nhất cho tiện kể chuyện
- không đưa task/review board trở lại `/org/*` chỉ vì project thuộc một organization
- không cộng `System Admin` vào bảng role của User/Organization/Project
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

- chỉ project owner/creator hoặc organization owner/admin mới có quyền quản lý membership project
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

## `/org/tasks*` Chỉ Là Compatibility Redirect

Các URL đọc task cũ dưới `/org/tasks*` không còn là delivery surface:

- chúng không render Organization task list/board/detail;
- controller resolve project đích hợp lệ rồi redirect về `/projects/:projectId/tasks`;
- nếu chưa có project context hợp lệ, flow phải đưa người dùng về nơi chọn project thay vì khôi phục UI cũ.

Hai ngoại lệ cần gọi đúng tên:

- `/org/tasks/workflow` là cấu hình task workflow/status, không phải board;
- `/org/tasks/:taskId/applications` thuộc application/recruitment flow, không phải một task-list page.

Vì vậy report, test và diagram không được dùng `/org/tasks` như bằng chứng rằng Organization Management sở hữu task delivery.

## Evidence Đủ Mạnh Để Tin

### Route và middleware

- `start/routes/organizations.ts`
- `start/routes/organizations_current.ts`
- `start/routes/projects.ts`
- `start/routes/reviews.ts`
- `start/routes/api_v1.ts`
- `app/modules/organizations/middleware/require_org_admin_middleware.ts`
- `app/modules/organizations/middleware/organization_resolver_middleware.ts`

### Controller / command / policy

- `app/modules/organizations/controllers/join_organization_controller.ts`
- `app/modules/organizations/controllers/switch_organization_controller.ts`
- `app/modules/organizations/controllers/current/tasks/list_tasks_controller.ts` — compatibility redirect
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
- `app/modules/authorization/tests/backend/unit/realm_separation_source.spec.ts`
- `app/modules/reviews/tests/backend/integration/review_access_guards.spec.ts`

## Related Diagrams

- `docs/11-diagrams/Architecture/01-system-architecture/high-level/arch_10_realm_workspace_board_topology.mmd`
- `docs/11-diagrams/Architecture/01-system-architecture/high-level/arch_06_security_trust_boundaries.mmd`
- `docs/11-diagrams/Action/05-organization/low-level/act_05h_org_current_workspace.mmd`
- `docs/11-diagrams/Action/04-project-delivery/overview/act_04_project_delivery_review_overview.mmd`
- `docs/11-diagrams/Action/06-user-lifecycle/low-level/act_06d_workspace_routing.mmd`

## Nếu Dùng File Này Để Viết Report Bên Ngoài Repo

Bạn có thể dùng file này để viết:

- phần mô tả cấu trúc workspace của hệ thống
- phần phân tách System principal khỏi User principal, rồi phân quyền Organization/Project bên trong User realm
- phần mô tả organization membership, project membership, và context switching
- phần giải thích vì sao Suar không chỉ là task board mà là workspace nhiều lớp có governance

Một mô tả an toàn có thể dùng:

`Suar tách System realm dành riêng cho System Admin khỏi User realm. Bên trong User realm, không gian làm việc gồm discovery/switching của organization, Organization Management cho governance và project portfolio, cùng Project Workspace chứa bốn board cộng tác của từng project.`

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
