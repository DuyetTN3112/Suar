# Org / Project / Task Redesign Session Handoff

## Status

In progress

## Date

2026-07-03

## Why this handoff exists

Session dài, phạm vi lớn, repo đang rất bẩn với nhiều thay đổi unrelated. File này để session mới tiếp tục đúng nhịp, không phải audit lại từ đầu.

## Active objective

Tiếp tục audit và triển khai redesign workspace dành cho `org`, tập trung vào:

- tách rõ `quản lý tổ chức`, `quản lý project`, `quản lý task`
- làm UX dễ hiểu hơn cho `org_owner`, `org_admin`, và các role quản lý project
- đẩy nhanh flow `tạo project -> setup role/skill/level -> pick user phù hợp -> tạo task nhanh hơn`
- tránh nhồi quá nhiều thứ vào một màn; ưu tiên tách theo tab hoặc route khi cần

## Context already established

Các tài liệu gốc cho hướng redesign này đã có:

- [specs/2026-07-02-org-admin-workspace-redesign-design.md](/home/tranngocduyet/Projects/Suar/docs/superpowers/specs/2026-07-02-org-admin-workspace-redesign-design.md)
- [plans/2026-07-02-org-admin-workspace-phase1-foundation.md](/home/tranngocduyet/Projects/Suar/docs/superpowers/plans/2026-07-02-org-admin-workspace-phase1-foundation.md)
- [mockups/org-admin-workspace-redesign-mockup.html](/home/tranngocduyet/Projects/Suar/docs/superpowers/mockups/org-admin-workspace-redesign-mockup.html)
- [capability-model-and-product-positioning.md](/home/tranngocduyet/Projects/Suar/docs/01-business/capability-model-and-product-positioning.md:1)

Người dùng đã bổ sung thêm định hướng:

- không chỉ có org/project/task cơ bản, còn nhiều domain như review dispute, marketplace, quality flows
- UI không nên dồn mọi thứ vào một trang
- có thể dùng tab mạnh tay nếu cùng một domain nhưng nhiều lớp thông tin
- ở setup project cần hỗ trợ tạo role trong project, định nghĩa skill + level cho từng role, và pick user phù hợp ngay từ lúc khởi tạo để việc tạo task sau đó nhanh hơn

## What was completed in this session chain

### 1. Org / project / task boundary work

Đã đẩy khá xa phần tách mental model giữa org, project, task:

- org dashboard và org project surfaces được chỉnh theo hướng nói rõ hơn scope quản lý
- project surfaces được đẩy về hướng “project management container”, không phải màn ôm luôn task workspace
- mockup HTML đã phản ánh cấu trúc rõ hơn giữa ba miền lớn

### 2. Project creation flow upgraded toward staffing-first setup

Đã triển khai luồng tạo project theo hướng “setup nhanh để chạy delivery”:

- [inertia/pages/projects/create.svelte](/home/tranngocduyet/Projects/Suar/inertia/pages/projects/create.svelte)
  - wizard 3 bước: `foundation -> staffing -> launch`
  - có role setup / staffing framing rõ hơn
- [inertia/pages/projects/types.ts](/home/tranngocduyet/Projects/Suar/inertia/pages/projects/types.ts)
  - thêm kiểu dữ liệu cho member candidates theo org
- [app/modules/projects/actions/queries/get_project_create_page_query.ts](/home/tranngocduyet/Projects/Suar/app/modules/projects/actions/queries/get_project_create_page_query.ts)
  - trả thêm `organizationMembersByOrg`
- [app/modules/projects/controllers/store_project_controller.ts](/home/tranngocduyet/Projects/Suar/app/modules/projects/controllers/store_project_controller.ts)
  - hỗ trợ `seedRoleTemplates`
  - hỗ trợ `initialStaffingAssignments`
  - sau khi tạo project có thể clone professional role templates vào project
  - có thể map assignment theo `userId + templateCode`
  - tạo/cập nhật `project members` với `project_professional_role_id`

### 3. Project staffing support and tests

- [app/modules/projects/tests/backend/integration/project_create_staffing_http.spec.ts](/home/tranngocduyet/Projects/Suar/app/modules/projects/tests/backend/integration/project_create_staffing_http.spec.ts)
  - test backend cho project create + staffing đã được thêm và pass ở session trước

### 4. Project role to task creation bridge

- [inertia/pages/projects/components/project_roles_tab.svelte](/home/tranngocduyet/Projects/Suar/inertia/pages/projects/components/project_roles_tab.svelte)
  - thêm launch links từ role sang tạo task
  - có infer `taskType` từ `role.code` khi mở flow tạo task

### 5. Task creation prefill based on project role requirements

- [inertia/pages/tasks/create_prefill.ts](/home/tranngocduyet/Projects/Suar/inertia/pages/tasks/create_prefill.ts)
  - `buildPrefilledTaskSkills(...)`
  - `findRoleMatchedProjectMembers(...)`
- [inertia/pages/tasks/create.svelte](/home/tranngocduyet/Projects/Suar/inertia/pages/tasks/create.svelte)
  - đọc `requestedProjectId`, `requestedRoleId`, `requestedTaskType`
  - derive `roleMatchedProjectMembers`
  - nếu chỉ có đúng 1 member match role thì auto-assign
  - có quick-assign lane cho member phù hợp role
- [inertia/pages/tasks/components/modals/create_task_modal.svelte](/home/tranngocduyet/Projects/Suar/inertia/pages/tasks/components/modals/create_task_modal.svelte)
  - áp cùng logic role-lane trong modal

### 6. Task contract starters

- [inertia/pages/tasks/task_contract_presets.ts](/home/tranngocduyet/Projects/Suar/inertia/pages/tasks/task_contract_presets.ts)
  - preset theo `taskType`
  - `inferTaskTypeFromRoleCode(...)`
- [inertia/pages/tasks/components/modals/create_task_form.svelte](/home/tranngocduyet/Projects/Suar/inertia/pages/tasks/components/modals/create_task_form.svelte)
  - đã có UI cho `Task contract starter`

### 7. Work area starters

- [inertia/pages/tasks/task_work_area_starters.ts](/home/tranngocduyet/Projects/Suar/inertia/pages/tasks/task_work_area_starters.ts)
  - starter theo area như `marketplace`, `review_dispute`, `admin_console`, `audit_logging`, `quality_control`
- [inertia/pages/tasks/components/modals/create_task_form.svelte](/home/tranngocduyet/Projects/Suar/inertia/pages/tasks/components/modals/create_task_form.svelte)
  - đã có UI cho `Work area starter`

### 8. Frontend tests added and passing before interruption

Đã pass ở cuối nhịp trước:

- `pnpm exec vitest run inertia/tests/component/tasks/task_create_prefill_mapping.test.ts`
- `pnpm exec vitest run inertia/tests/component/tasks/task_contract_presets.test.ts`
- `pnpm exec vitest run inertia/tests/component/tasks/task_work_area_starters.test.ts`
- `npm run typecheck`
- `npm run lint`

## Critical current state

### Main unfinished item

`create_task_form.svelte` đang bị quá nhiều thông tin trong một màn. User đã yêu cầu rõ:

- tận dụng tab
- không dồn mọi thứ vào một trang
- giao diện phải dễ đọc hơn cho người quản lý

### What already changed in file

Trong [create_task_form.svelte](/home/tranngocduyet/Projects/Suar/inertia/pages/tasks/components/modals/create_task_form.svelte):

- đã thêm import:
  - `Tabs`
  - `TabsContent`
  - `TabsList`
  - `TabsTrigger`
- đã thêm state:
  - `activeTab = 'setup' | 'skills' | 'contract'`

### What did NOT land yet

Phần refactor layout sang tabs chưa được áp vào file. Lần `apply_patch` lớn trước đó fail do lỗi môi trường patching, nên hiện file vẫn gần như layout linear cũ:

- `BasicFields`
- `MetadataFields`
- `TaskSkillsField`
- whole contract/context section
- `DueDateField`

Tức là:

- imports + state cho tabs đã có
- nhưng markup thật vẫn chưa chuyển thành tabs

## Exact recommended next step

Refactor [create_task_form.svelte](/home/tranngocduyet/Projects/Suar/inertia/pages/tasks/components/modals/create_task_form.svelte) thành 3 tab:

### Tab 1: `Setup`

Giữ các khối:

- `BasicFields`
- `MetadataFields`
- `DueDateField`

Mục tiêu:

- người tạo task chốt project, assignee, status, priority trước
- bớt cognitive load khi mới mở modal

### Tab 2: `Skills`

Giữ:

- `TaskSkillsField`

Mục tiêu:

- role-based prefill vẫn ở đây
- để manager tập trung chỉnh requirement mà không bị lẫn với context/review contract

### Tab 3: `Contract`

Giữ:

- `Work area starter`
- `Task contract starter`
- `acceptance_criteria`
- `context_background`
- `tech_stack_text`
- `domain_tags_text`
- `learning_objectives_text`

Mục tiêu:

- gom toàn bộ “chất lượng đầu ra + ngữ cảnh + profile signal” vào một nơi
- hợp với mental model review/dispute/assessment về sau

## Suggested UX direction for next session

Khi tiếp tục redesign, nên giữ nguyên nguyên tắc:

- project setup là nơi define role baseline và pick người phù hợp
- task creation là nơi consume baseline đó càng ít gõ tay càng tốt
- cùng domain thì dùng tab
- khác domain thì tách route/CTA, không dùng tab để nhảy scope

Nên tiếp tục nhìn thêm các domain mở rộng trong org workspace:

- review dispute / flagged reviews
- marketplace / staffing demand
- quality / reverse review
- workflow / operational config

Nhưng không nên nhét tất cả vào cùng một màn tổng hợp.

## Important files to open first in next session

### Core design docs

- [specs/2026-07-02-org-admin-workspace-redesign-design.md](/home/tranngocduyet/Projects/Suar/docs/superpowers/specs/2026-07-02-org-admin-workspace-redesign-design.md)
- [plans/2026-07-02-org-admin-workspace-phase1-foundation.md](/home/tranngocduyet/Projects/Suar/docs/superpowers/plans/2026-07-02-org-admin-workspace-phase1-foundation.md)
- [mockups/org-admin-workspace-redesign-mockup.html](/home/tranngocduyet/Projects/Suar/docs/superpowers/mockups/org-admin-workspace-redesign-mockup.html)
- [capability-model-and-product-positioning.md](/home/tranngocduyet/Projects/Suar/docs/01-business/capability-model-and-product-positioning.md:1)

### Project creation / staffing

- [inertia/pages/projects/create.svelte](/home/tranngocduyet/Projects/Suar/inertia/pages/projects/create.svelte)
- [inertia/pages/projects/types.ts](/home/tranngocduyet/Projects/Suar/inertia/pages/projects/types.ts)
- [app/modules/projects/actions/queries/get_project_create_page_query.ts](/home/tranngocduyet/Projects/Suar/app/modules/projects/actions/queries/get_project_create_page_query.ts)
- [app/modules/projects/controllers/store_project_controller.ts](/home/tranngocduyet/Projects/Suar/app/modules/projects/controllers/store_project_controller.ts)
- [app/modules/projects/tests/backend/integration/project_create_staffing_http.spec.ts](/home/tranngocduyet/Projects/Suar/app/modules/projects/tests/backend/integration/project_create_staffing_http.spec.ts)

### Task creation / role-prefill / starters

- [inertia/pages/tasks/create.svelte](/home/tranngocduyet/Projects/Suar/inertia/pages/tasks/create.svelte)
- [inertia/pages/tasks/components/modals/create_task_modal.svelte](/home/tranngocduyet/Projects/Suar/inertia/pages/tasks/components/modals/create_task_modal.svelte)
- [inertia/pages/tasks/components/modals/create_task_form.svelte](/home/tranngocduyet/Projects/Suar/inertia/pages/tasks/components/modals/create_task_form.svelte)
- [inertia/pages/tasks/create_prefill.ts](/home/tranngocduyet/Projects/Suar/inertia/pages/tasks/create_prefill.ts)
- [inertia/pages/tasks/task_contract_presets.ts](/home/tranngocduyet/Projects/Suar/inertia/pages/tasks/task_contract_presets.ts)
- [inertia/pages/tasks/task_work_area_starters.ts](/home/tranngocduyet/Projects/Suar/inertia/pages/tasks/task_work_area_starters.ts)
- [inertia/pages/projects/components/project_roles_tab.svelte](/home/tranngocduyet/Projects/Suar/inertia/pages/projects/components/project_roles_tab.svelte)

### Tests

- [inertia/tests/component/tasks/task_create_prefill_mapping.test.ts](/home/tranngocduyet/Projects/Suar/inertia/tests/component/tasks/task_create_prefill_mapping.test.ts)
- [inertia/tests/component/tasks/task_contract_presets.test.ts](/home/tranngocduyet/Projects/Suar/inertia/tests/component/tasks/task_contract_presets.test.ts)
- [inertia/tests/component/tasks/task_work_area_starters.test.ts](/home/tranngocduyet/Projects/Suar/inertia/tests/component/tasks/task_work_area_starters.test.ts)

## Verification commands for next session

Sau khi refactor tabs xong, chạy lại:

```bash
pnpm exec vitest run \
  inertia/tests/component/tasks/task_create_prefill_mapping.test.ts \
  inertia/tests/component/tasks/task_contract_presets.test.ts \
  inertia/tests/component/tasks/task_work_area_starters.test.ts
```

```bash
npm run typecheck
```

```bash
npm run lint
```

## Repo caution

Repo hiện có rất nhiều thay đổi unrelated và untracked files. Không nên cố “dọn sạch” trước khi làm tiếp phần này.

Session mới nên:

- chỉ đụng các file trong scope org/project/task redesign
- tránh revert hoặc normalize các thay đổi ngoài phạm vi
- đọc kỹ file trước khi sửa vì worktree đang dirty

## GitNexus / impact-analysis reminder

Theo rule của repo:

- trước khi sửa symbol/function/class mới, chạy impact analysis upstream
- nếu impact báo `HIGH` hoặc `CRITICAL`, phải cảnh báo trước khi sửa
- trước khi commit, chạy change detection

Trong session trước, các symbol liên quan task/project flow đã từng được impact-check và chủ yếu ra `MEDIUM`, nhưng session mới vẫn nên chạy lại nếu tiếp tục sửa thêm symbol mới.

## Success condition for immediate next slice

Nhịp kế tiếp coi là hoàn thành tốt nếu:

1. `create_task_form.svelte` chuyển sang tabs thật
2. task create modal/page bớt rối rõ rệt
3. role-prefill + starter presets vẫn giữ nguyên behavior
4. vitest + typecheck + lint vẫn pass
