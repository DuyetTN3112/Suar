# Org Admin Workspace Redesign

## Status

Draft for review

## Date

2026-07-02

Current-state update 2026-07-17: frontend paths in this spec have been reconciled with the multi-app split. Current org workspace source lives under `inertia/apps/org/*`; any old `inertia/pages/*` or `inertia/components/*` mention should be read as pre-split evidence only.

## Scope

Thiết kế lại workspace dành cho `org`, tập trung vào `org_owner`, `org_admin`, và các vai trò có liên quan tới quản lý tổ chức, quản lý project, và quản lý task.

Mục tiêu chính:

- tách rõ ba miền công việc: `Quản lý tổ chức`, `Quản lý dự án`, `Quản lý task`
- loại bỏ sự chồng chéo giữa route, page, sidebar, và mental model hiện tại
- làm cho user hiểu ngay “mình đang ở đâu”, “mình đang quản lý cái gì”, và “bước tiếp theo là gì”

Out of scope cho spec này:

- redesign cho `user workspace` thường
- redesign cho `system admin workspace`
- visual styling chi tiết cấp pixel hoặc token system mới
- refactor backend implementation chi tiết

## Problem Statement

Workspace org hiện tại gây khó hiểu vì ba domain `organization`, `project`, `task` đang bị trộn ở cả điều hướng, route model, page reuse, và hành vi redirect.

Người dùng hiện có thể:

- vào cùng một mental model qua nhiều đường khác nhau
- thấy cùng một page shared surface nhưng trong vỏ bọc org shell
- phải tự suy luận scope hiện tại là `toàn tổ chức` hay `theo project`
- mở `project detail` nhưng lại gặp luôn concern của task management và capability management

Kết quả là:

- khó học
- khó tìm màn đúng
- khó hiểu quyền nào áp dụng ở đâu
- khó mở rộng sau này

## Evidence Summary

### Source evidence

- `organizationNavigation` hiện gom workspace navigation tại `inertia/apps/org/shared/components/navigation.svelte.ts`.
- `/org/tasks` render lại `tasks/index` shared surface với `shellMode: 'organization'` tại `app/modules/organizations/controllers/current/tasks/list_tasks_controller.ts`.
- org task page hiện nằm tại `inertia/apps/org/modules/tasks/index.svelte`.
- `/projects` redirect sang `/org/projects` cho org admin/owner tại `app/modules/projects/controllers/list_projects_controller.ts`.
- org project list hiện nằm tại `inertia/apps/org/modules/projects/index.svelte`.
- org project detail hiện nằm tại `inertia/apps/org/modules/projects/show.svelte`, với các tab/component project-local dưới `inertia/apps/org/modules/projects/components/*`.
- `org` route tree đã tồn tại tương đối rõ cho `members`, `roles`, `permissions`, `departments`, `projects`, `tasks`, `workflow`, nhưng navigation và page mental model chưa phản ánh đúng boundary đó tại `start/routes/organizations_current.ts`.

### Runtime evidence

Audit runtime được kiểm chứng bằng Playwright screenshot với data seed local cho các màn:

- `/org`
- `/org/projects`
- `/org/tasks`
- `/org/workflow/statuses`
- `/org/projects/:id`
- `/org/members`
- `/org/roles`
- `/org/settings`
- `/projects`
- `/tasks`

Kết quả runtime xác nhận:

- dashboard org hiện giống “bảng số liệu + shortcut link” hơn là decision hub theo domain
- `Dự án`, `Task`, `Workflow` đang đứng cạnh nhau như item ngang cấp, không nói rõ quan hệ
- task board hiện hiển thị như workspace chính nhưng scope project chỉ nằm ở header chip, chưa đủ mạnh để user hiểu scope
- project detail đang hoạt động như “siêu màn hình” cho nhiều concern khác nhau

### Documentation evidence

- `docs/design/navigation-structure-documentation.md`
- `docs/design/screen-page-inventory.md`

Hai tài liệu này xác nhận thêm rằng vấn đề hiện tại là `discoverability gap` cộng với `scope ambiguity`, không phải thiếu route hay thiếu page đơn thuần.

## Current-State Audit

### 1. Information architecture đang sai tầng

Menu hiện không chia theo công việc người dùng cần làm. Nó chia theo entity lẫn lộn.

Ví dụ:

- `Task`
- `Project`
- `Workflow`

đang bị đặt cạnh nhau như ba item song song, trong khi thực tế:

- `Project` là work container
- `Task` là delivery workspace
- `Workflow` là configuration của task system

### 2. Shared pages đang làm mờ boundary workspace

`tasks/index` và `projects/index` vừa phục vụ user workspace, vừa bị tái dùng cho org workspace. Khi page tự đổi layout theo role, user sẽ không thể hiểu đâu là “đang ở org mode”, đâu là “shared user surface”.

### 3. Route model hiện tại chưa nói thật về scope

Các route như:

- `/org/tasks`
- `/tasks`
- `/org/projects`
- `/projects`

đang đại diện cho những mental model khác nhau nhưng implementation và hiển thị lại quá giống nhau.

### 4. Project detail đang ôm quá nhiều concern

`Project detail` hiện vừa chứa:

- thông tin project
- thành viên project
- công việc
- skills catalog
- professional roles

Điều này làm project trở thành màn “chứa tất cả”, trong khi người dùng thực tế cần:

- một nơi để quản lý chính project
- một nơi riêng để vận hành task

### 5. Org dashboard chưa đóng vai trò hub

Trang `/org` hiện là dashboard thống kê với nhiều shortcut. Nó chưa giúp user trả lời ba câu hỏi nền:

1. tôi đang cần quản lý tổ chức, project, hay task?
2. miền nào đang có vấn đề cần xử lý?
3. tôi nên đi đâu tiếp theo?

## Design Principles

### 1. One workspace, one truth

Mỗi workspace chỉ có một route truth và một mental model truth.

Không dùng cùng một page rồi “đổi layout theo role” để giả lập workspace khác.

### 2. Organize by jobs, not by nouns

Sidebar và dashboard phải chia theo job-to-be-done:

- quản lý tổ chức
- quản lý dự án
- quản lý task

không chỉ liệt kê entity.

### 3. Scope must be explicit

Mỗi màn task hoặc project phải nói rõ scope:

- toàn tổ chức
- project đang chọn
- project cụ thể nào

User không được tự suy luận scope từ context ẩn.

### 4. Project is container, task is operation

Project là container và configuration layer.
Task là nơi tác nghiệp hằng ngày.

Không biến project detail thành task workspace.

### 5. Role-based simplicity beats omniscience

Role cao hơn không có nghĩa phải thấy mọi thứ như nhau.

Menu và landing nên ưu tiên phần mà role đó hay làm nhất.

## Proposed Information Architecture

Workspace org mới được chia thành bốn nhóm, trong đó ba nhóm đầu là bắt buộc theo objective.

### 1. Tổng quan

- Dashboard điều hành

### 2. Quản lý tổ chức

- Thành viên
- Lời mời
- Yêu cầu tham gia
- Vai trò
- Quyền hạn
- Phòng ban
- Thông tin tổ chức

### 3. Quản lý dự án

- Danh mục dự án
- Chi tiết dự án
- Thành viên dự án
- Vai trò dự án
- Skills baseline
- Thiết lập dự án

### 4. Quản lý task

- Task board
- Task list
- Chi tiết task
- Workflow
- Triage / Assignment

### 5. Chất lượng

Nhóm này không phải trọng tâm chính của objective, nhưng cần tách riêng để không phá hỏng IA:

- Reverse reviews
- Disputes nếu surface này được giữ trong org workspace

## Proposed Sidebar

### Tổng quan

- Dashboard điều hành

### Quản lý tổ chức

- Thành viên
- Lời mời
- Yêu cầu tham gia
- Vai trò
- Quyền hạn
- Phòng ban
- Thông tin tổ chức

### Quản lý dự án

- Danh mục dự án
- Vai trò dự án
- Skills baseline

### Quản lý task

- Task board
- Task list
- Workflow

### Chất lượng

- Reverse reviews
- Disputes

### Explicit removals

Bỏ nhóm sidebar hiện tại tên `Công Việc`.

Lý do:

- tên nhóm này quá mơ hồ
- nó đang nhét `Task`, `Project`, `Workflow`, và `Reverse reviews` vào một chỗ
- nó không phản ánh hierarchy thực tế

## Proposed Route Model

### Organization management

- `/org`
- `/org/members`
- `/org/invitations`
- `/org/invitations/requests`
- `/org/roles`
- `/org/permissions`
- `/org/departments`
- `/org/settings`

### Project management

- `/org/projects`
- `/org/projects/:id`
- `/org/projects/:id/members`
- `/org/projects/:id/roles`
- `/org/projects/:id/skills`
- `/org/projects/:id/settings`

### Task management

- `/org/tasks/board`
- `/org/tasks/list`
- `/org/tasks/:id`
- `/org/tasks/workflow`
- `/org/tasks/triage`

## Current-To-Target Mapping

| Current surface | Current problem | Target surface | Notes |
|---|---|---|---|
| `/org` | stats + shortcut board, chưa chia 3 miền | `/org` | giữ route, đổi thành decision hub |
| `/org/projects` | project portfolio còn mơ hồ, CTA chưa tách project/task | `/org/projects` | giữ route, đổi IA và CTA |
| `/org/projects/:id` | “siêu màn hình” ôm project + task + capability | `/org/projects/:id` | chỉ giữ project management |
| `/org/tasks` | một route ôm board mental model nhưng scope chưa rõ | `/org/tasks/board` | route truth mới cho board |
| `/tasks` | shared surface, redirect/role logic gây mờ boundary | `/org/tasks/board` hoặc user task route riêng | normalize theo workspace truth |
| `/org/workflow/statuses` | workflow đúng domain nhưng naming chưa bộc lộ task management | `/org/tasks/workflow` | đưa về cụm task management |
| `/projects` | shared route bị redirect theo role | `/org/projects` hoặc user projects route riêng | bỏ ambiguity |
| `project detail tabs: tasks/workflow/skills/roles` | trộn domain | project subnav + task route riêng | project không còn là task workspace |

## Key Design Decisions

### Decision 1: Keep org workspace, do not merge back into shared user shell

Lý do:

- objective nói rõ đang redesign cho org workspace
- ambiguity hiện tại đến từ shared shell tái dùng quá rộng
- tách org truth trước giúp user hiểu hệ thống nhanh hơn

### Decision 2: Project detail is not the daily delivery cockpit

Lý do:

- project là container và cấu hình
- task board mới là delivery cockpit
- nếu giữ task board trong project detail, boundary sẽ tiếp tục mờ

### Decision 3: Workflow belongs to task management

Lý do:

- workflow điều khiển vòng đời task
- workflow không phải thuộc tính riêng của project detail
- user cần thấy đây là cấu hình vận hành task system

### Decision 4: Default task board scope follows selected project

Lý do:

- giảm cognitive load
- hợp với daily habit của org owner / org admin / project manager
- vẫn cho phép nhìn `Toàn tổ chức` bằng toggle rõ ràng

Fallback:

- nếu chưa có project được chọn, mở `Toàn tổ chức`

## Navigation And Scope Rules

### Rule 1: Every page declares one primary domain

Mỗi page phải thuộc đúng một miền:

- `organization-management`
- `project-management`
- `task-management`
- `quality`

Không có page nào thuộc hai miền ngang nhau.

### Rule 2: Scope header is mandatory for task surfaces

Task surfaces phải có header nói rõ:

- đang ở board hay list
- đang ở scope nào
- chuyển scope bằng cách nào

Ví dụ:

- `Task board / Dự án Apollo`
- `Task list / Toàn tổ chức`

### Rule 3: Cross-domain navigation uses CTA, not hidden tabs

Ví dụ:

- từ project detail dùng CTA `Mở task của dự án`
- không dùng tab `Công việc` trong cùng page để nhảy domain

### Rule 4: Role changes visibility, not information architecture

Role có thể ẩn bớt entry.
Nhưng IA nền phải giữ ổn định.

Ví dụ:

- `project_manager` không thấy full `Quản lý tổ chức`
- nhưng nếu được vào `Quản lý task`, cấu trúc miền này vẫn giống org admin

## Role-To-Surface Matrix

| Surface | org_owner | org_admin | project_owner | project_manager | org_member |
|---|---|---|---|---|---|
| `/org` | full | full | limited entry or no | limited entry or no | no |
| `/org/members` | yes | yes | no | no | no |
| `/org/projects` | yes | yes | partial or filtered | partial or filtered | no |
| `/org/projects/:id` | yes | yes | yes | yes | no |
| `/org/tasks/board` | yes | yes | scoped | scoped | no |
| `/org/tasks/list` | yes | yes | scoped | scoped | no |
| `/org/tasks/workflow` | yes | maybe yes | no | no | no |
| `/org/tasks/triage` | yes | yes | scoped | scoped | no |
| `/org/settings` | yes | maybe partial | no | no | no |

`scoped` ở đây nghĩa là chỉ thấy dữ liệu của project được cấp quyền, không phải toàn org.

## Migration Guardrails

### Guardrail 1: Do not break existing deep links without redirect

Mọi route cũ như:

- `/org/tasks`
- `/org/workflow/statuses`
- `/projects`
- `/tasks`

phải có redirect hoặc compatibility handling trước khi bỏ.

### Guardrail 2: Do not repaint before route truth is defined

Nếu repaint trước:

- UI có thể đẹp hơn
- nhưng user vẫn lạc vì mental model không đổi

### Guardrail 3: Separate page responsibilities before polishing visuals

Ưu tiên:

1. page responsibility
2. route truth
3. navigation truth
4. visual polish

### Guardrail 4: Keep test coverage aligned with scope changes

Mỗi phase phải bổ sung hoặc cập nhật test cho:

- redirect truth
- role visibility
- breadcrumb/scope indicator
- empty states
- CTA cross-domain

## Review Checklist

Người review spec này nên kiểm tra 5 câu hỏi:

1. Ba miền `Quản lý tổ chức / Quản lý dự án / Quản lý task` đã đủ rõ chưa?
2. `Project detail` đã được hạ đúng scope chưa?
3. `Task board` mặc định theo project đang chọn có hợp lý không?
4. Route truth mới có giúp bỏ chồng chéo `/projects` vs `/org/projects`, `/tasks` vs `/org/tasks` không?
5. Role matrix có phản ánh đúng công việc hằng ngày của từng vai trò không?

## Redirect And Entry Rules

### Org owner / org admin

- `/projects` redirect sang `/org/projects`
- `/tasks` redirect sang `/org/tasks/board` hoặc route task org mặc định
- deep link vào shared surface cũ phải được normalize sang org route truth

### Project owner / project manager

- không thấy full org management
- có thể được cấp entry trực tiếp vào:
  - project detail
  - task board theo project
  - task list theo project

### Org member

- không được nhìn org admin shell
- nếu mở deep link org admin sẽ thấy permission state rõ ràng

### Shared surface rule

Nếu component hoặc page được tái sử dụng, phải nhận `scope` tường minh:

- `user`
- `org`
- `project`

Không cho phép page tự đoán scope chỉ từ role.

## Proposed Dashboard Design

Dashboard `/org` mới là decision hub, không chỉ là stat board.

### Khối 1: Quản lý tổ chức

Hiển thị:

- tổng thành viên
- lời mời đang chờ
- yêu cầu tham gia đang chờ
- biến động thành viên gần đây

CTA chính:

- `Quản lý thành viên`

### Khối 2: Quản lý dự án

Hiển thị:

- số project đang hoạt động
- project chưa có owner/manager
- project có staffing gap
- project gần deadline

CTA chính:

- `Mở danh mục dự án`

### Khối 3: Quản lý task

Hiển thị:

- task overdue
- task chưa gán
- task block ở workflow
- task mới cần triage

CTA chính:

- `Mở task board`

### Dashboard anti-patterns cần tránh

- không dùng dàn shortcut ngang hàng 8-10 nút
- không trộn CTA của project, task, và org trong một block
- không để user vào dashboard mà vẫn phải đoán “mình nên vào chỗ nào”

## Project Management Redesign

## Project Portfolio

Trang `/org/projects` mới là portfolio management surface.

Mục tiêu:

- thấy toàn bộ danh mục project
- phát hiện project nào cần chú ý
- mở đúng project detail hoặc task workspace của project đó

Card hoặc row của project nên có:

- tên
- trạng thái
- owner/manager
- task count
- overdue count
- staffing health

CTA nên tách thành:

- `Xem chi tiết project`
- `Mở task của project`

Không dùng chỉ một nút `Mở chi tiết dự án` nếu thực tế user hay muốn vào task board.

## Project Detail

Project detail phải giảm scope.

### Giữ lại

- thông tin project
- owner / manager
- timeline
- trạng thái
- metadata chính
- staffing summary
- task summary mini

### Không giữ như tab mặc định

- full task board
- workflow editor
- triage screen

### Subnav project mới

- Tổng quan
- Thành viên
- Vai trò dự án
- Skills baseline
- Cài đặt

### CTA chính

- `Xem task của dự án`

### CTA phụ

- `Quản lý thành viên`
- `Cài đặt dự án`

## Task Management Redesign

Task management được tách thành hai entry chính.

### Task board

Mục đích:

- điều phối hằng ngày
- kéo thả
- phân công nhanh
- tạo task nhanh

### Task list

Mục đích:

- rà soát hàng loạt
- filter mạnh
- bulk action
- audit / export / reporting

### Scope model

Task surface luôn hiện rõ:

- `Toàn tổ chức`
- hoặc `Theo project`

### Default assumption

Spec này tạm giả định:

- task board mặc định mở theo `project đang chọn`
- luôn có toggle sang `Toàn tổ chức`
- nếu chưa chọn project thì rơi về `Toàn tổ chức` với empty-guidance

### Workflow

Workflow là task system configuration.

Nó thuộc `Quản lý task`, không thuộc `Quản lý dự án`.

Nó không nên là một tab ngầm trong project detail.

## Role Mapping

### Org owner

Primary:

- Quản lý tổ chức
- Quản lý dự án
- Quản lý task

Secondary:

- Chất lượng

Landing ưu tiên:

- toàn cảnh org health
- staffing
- overdue
- governance

### Org admin

Primary:

- Quản lý tổ chức
- Quản lý dự án

Secondary:

- Quản lý task

Landing ưu tiên:

- members
- invitations
- project roster
- task bottleneck

### Project owner

Primary:

- Quản lý dự án

Secondary:

- Quản lý task trong project được giao

### Project manager

Primary:

- Quản lý task

Secondary:

- một phần quản lý dự án liên quan staffing và scope

### Org member

- không vào org admin workspace

## User Journeys

### Org owner journey

1. vào `/org`
2. nhìn ba miền lớn `Tổ chức / Dự án / Task`
3. chọn miền cần xử lý
4. nếu vào task, thấy ngay board của project đang chọn
5. nếu cần nhìn rộng, bật `Toàn tổ chức`

### Org admin journey

1. vào `/org`
2. thường đi `Thành viên` hoặc `Danh mục dự án`
3. từ project detail bấm `Xem task của dự án`
4. sang task board đúng scope project

### Project manager journey

1. vào từ link project hoặc task
2. landing ưu tiên `Task board`
3. breadcrumb nói rõ:
   - `Quản lý task / Dự án Apollo`
4. không bị đẩy vào full org governance

## Breadcrumb Rules

Breadcrumb phải nói thật scope:

- `Quản lý tổ chức / Thành viên`
- `Quản lý dự án / Danh mục dự án`
- `Quản lý dự án / Dự án Apollo / Thành viên`
- `Quản lý task / Dự án Apollo / Board`
- `Quản lý task / Toàn tổ chức / Workflow`

Tabs chỉ dùng trong cùng một miền.

Không dùng tabs để nhảy giữa `project management` và `task management`.

## Empty States

### Organization management

Ví dụ:

- chưa có member pending
- chưa có lời mời
- chưa có join request

Message phải xác nhận trạng thái ổn định và đề xuất việc tiếp theo.

### Project management

Nếu chưa có project:

- CTA duy nhất `Tạo dự án đầu tiên`

### Task management

Nếu chưa chọn project:

- hướng dẫn rõ user đang xem `toàn tổ chức`
- giải thích vì sao chọn project sẽ dễ điều phối hơn

Nếu project chưa có task:

- CTA `Tạo task đầu tiên`

### Workflow

Nếu chưa có custom status:

- giải thích đây là cấu hình của task system, không phải config riêng của project

## Phased Rollout

### Phase 1: IA and labeling

- đổi sidebar group
- đổi labels
- đổi dashboard `/org`
- thêm breadcrumb và scope header rõ ràng

### Phase 2: Route normalization

- chuẩn hóa route truth
- thêm redirect rule nhất quán
- bỏ dần entry path mơ hồ

### Phase 3: Page separation

- tách shared pages gây nhầm
- project detail chỉ còn project management
- task pages thành task management thật

### Phase 4: QA and polish

- role-based smoke tests
- navigation discoverability tests
- permission states
- empty states
- scope persistence tests

## Success Criteria

Thiết kế lại này được xem là thành công khi:

1. user vào org workspace có thể phân biệt ngay `Quản lý tổ chức`, `Quản lý dự án`, `Quản lý task`
2. không còn chỗ nào mà `project`, `task`, `workflow` bị coi như item ngang cấp vô ngữ cảnh
3. task board luôn hiển thị scope rõ ràng
4. project detail không còn là “siêu màn hình” ôm mọi concern
5. redirect và route truth nhất quán với workspace truth
6. role khác nhau thấy đúng entry path phục vụ công việc của họ

## Risks

- giữ shared page quá lâu sẽ tiếp tục duy trì ambiguity
- đổi route mà không có redirect strategy sẽ phá discoverability và test
- tách quá mạnh một lần có thể tăng blast radius lên docs, e2e, và permissions

## Recommendation

Không đi thẳng vào repaint UI.

Thứ tự đúng:

1. khóa IA
2. khóa route truth
3. khóa scope rules
4. rồi mới redesign page visuals

Nếu không, workspace có thể đẹp hơn nhưng vẫn rối.

## Open Assumptions

- Task board mặc định theo `project đang chọn`, có toggle sang `toàn tổ chức`
- `Reverse reviews` và `Disputes` vẫn ở org workspace, nhưng được tách ra nhóm riêng thay vì trộn vào `Project/Task`
- `Project manager` và `Project owner` sẽ cần entry route hẹp hơn, không nhất thiết thấy full org shell

## Next Step

Sau khi spec này được review và chốt:

- tạo implementation plan theo phase
- map từng phase sang route/page/component/controller
- xác định blast radius, test matrix, và rollout strategy
