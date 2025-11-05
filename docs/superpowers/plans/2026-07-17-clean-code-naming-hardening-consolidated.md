# Kế Hoạch Hợp Nhất Chuẩn Hóa Tên Theo Clean Code

Status: Implemented and verified on 2026-07-17. All checklist items below are
marked complete from current worktree evidence.

> **Dành cho agent thực thi:** BẮT BUỘC dùng `superpowers:subagent-driven-development` hoặc `superpowers:executing-plans` để chạy từng task. Mỗi bước dùng checklist `- [ ]`.

**Mục tiêu:** Chuẩn hóa tên file, thư mục, class, function, type, helper, biến ở backend và frontend theo Clean Code Chapter 2 để tên nói đúng ý định, không cần đoán ngữ cảnh.

**Kiến trúc:** Đây là tài liệu canonical duy nhất, đã gộp 3 tài liệu trước đó: bản tổng, bản backend, bản frontend. Quy trình là guard-first: trước tiên dùng GitNexus đo blast radius, thêm guard test, đổi tên theo lát nhỏ, cập nhật import/reference, ghi exception có chủ đích, rồi verify riêng backend/frontend.

**Công nghệ:** TypeScript, AdonisJS, GitNexus CLI, Japa, Svelte 5, Inertia, Vitest, ESLint, `svelte-check`, Node `fs`/`path`.

## Ràng Buộc Toàn Cục

- Tài liệu này thay thế 3 tài liệu cũ:
  - `docs/superpowers/plans/2026-07-17-clean-code-naming-hardening.md`
  - `docs/superpowers/plans/2026-07-17-backend-clean-code-naming-audit.md`
  - `docs/superpowers/plans/2026-07-17-frontend-clean-code-naming-audit.md`
- Chỉ dùng tài liệu này để phê duyệt và thực thi kế hoạch naming.
- Áp dụng Clean Code Chapter 2: tên phải lộ ý định, tránh đánh lừa, phân biệt có nghĩa, dễ tìm kiếm, dễ đọc, một từ cho một khái niệm.
- Backend scope: `app/`, `start/`, backend tests, docs liên quan naming guard.
- Frontend scope: `inertia/`, frontend tests, docs liên quan naming guard.
- Không sửa symbol backend nào nếu chưa chạy `gitnexus impact <SymbolName>` và ghi lại blast radius.
- Nếu GitNexus báo HIGH hoặc CRITICAL, dừng trước khi sửa và báo người duyệt.
- Không dùng GitNexus MCP trong repo này. Chỉ dùng GitNexus CLI.
- Trước commit bắt buộc chạy `gitnexus detect-changes`.
- Dùng `git mv` cho rename file để giữ lịch sử.
- Không rename route file Inertia như `index.svelte`, `show.svelte`, `create.svelte`, `edit.svelte` nếu chưa có kế hoạch routing riêng.
- `interface Props` và `interface PageProps` trong Svelte được chấp nhận khi file path đã cung cấp ngữ cảnh.
- Không sửa generated frontend files trong `inertia/apps/*/shared/generated/` nếu không có bước regenerate rõ ràng.
- Worktree đang dirty; không revert thay đổi không thuộc task.

---

## Cổng GitNexus Bắt Buộc Trước Khi Đổi Tên

Lý do: đổi một file/class/function/type không chỉ đổi nơi khai báo. Tên đó có thể được import, gọi, truyền qua route, test, docs, view model, Svelte component, hoặc type annotation ở nơi khác. `rg` tìm text tốt, nhưng GitNexus cho thấy blast radius theo symbol và dependency.

### Quy tắc impact

- Trước mỗi rename symbol backend, chạy:

```bash
gitnexus impact <OldSymbolName>
```

- Ghi lại trong PR hoặc task note:
  - `risk`
  - `direct_callers`
  - `affected_processes`
  - file import/call trực tiếp cần sửa
- Với file rename có nhiều export, chạy impact cho export chính trước, rồi dùng `rg` để kiểm tra path import.
- Với frontend Svelte, vẫn chạy `gitnexus impact <ComponentOrExportName>` trước. Nếu output ít chi tiết do Rust impact đang dùng indexed file matches, bổ sung bằng `rg` để cập nhật import path.
- Với tên quá chung như `User` hoặc `Task`, không dùng impact đơn lẻ để ra quyết định vì nhiễu cao. Chạy impact theo module/export cụ thể nếu có tên riêng, rồi dùng `rg` giới hạn theo file.
- Sau mỗi lát đổi tên lớn, chạy:

```bash
gitnexus detect-changes
```

- Trước commit cuối, chạy lại `gitnexus detect-changes` và xác nhận scope khớp kế hoạch.

### Bằng chứng GitNexus hiện tại

Chạy ngày 2026-07-17 tại `/home/tranngocduyet/Projects/Suar`:

```bash
gitnexus status
```

Kết quả:

```text
indexed: true
files: 4825
symbols: 8395
changed: 147
new: 11
deleted: 0
```

Impact mẫu cho các rename backend lớn:

```text
CreateProjectSprintCommand: risk MEDIUM, direct_callers 10, affected_processes 0
StoreProjectController: risk MEDIUM, direct_callers 6, affected_processes 0
UpdateWorkflowCommand: risk MEDIUM, direct_callers 6, affected_processes 0
TaskApplicationMapper: risk MEDIUM, direct_callers 4, affected_processes 0
```

Impact mẫu cho frontend:

```text
TaskScopeBar: risk MEDIUM, direct_callers 1, affected_processes 0
OrganizationCard: risk MEDIUM, direct_callers 2, affected_processes 0
ProjectSkillAddDialog: risk LOW, direct_callers 0, affected_processes 0
User: risk MEDIUM, direct_callers 1357, affected_processes 0
```

Ghi chú GitNexus CLI hiện tại: Rust impact đang dùng indexed file matches cho đến khi call graph extraction được migrate. Vì vậy, `gitnexus impact` là cổng bắt buộc, còn `rg` là bước bổ sung để sửa import/path chính xác.

## Quy Tắc Đặt Tên Theo Clean Code

- Tên trả lời được 3 câu hỏi: vì sao tồn tại, làm gì, dùng thế nào.
- Tên không được đánh lừa hành vi. Ví dụ `UpdateWorkflowCommand` không nên xóa toàn bộ rồi tạo lại.
- Một từ chỉ một khái niệm trong cùng vùng code.
- Shape khác nhau không dùng chung tên quá rộng như `User`, `Task`, `Data`, `Info`.
- Không dùng viết tắt nếu người đọc phải dịch trong đầu: `vm`, `vals`, `ps`.
- File name phải dễ tìm kiếm, trừ khi framework route đã cung cấp ngữ cảnh.
- Exception phải có tài liệu và guard allowlist rõ ràng.

## Bằng Chứng Backend

Lệnh audit đã dùng:

```bash
gitnexus context CreateProjectSprintCommand
gitnexus context StoreProjectController
gitnexus context UpdateWorkflowCommand
gitnexus context TaskApplicationMapper
find app/modules -type f -name 'shared.ts' | sort
rg -n "\b(class|interface|type|function|const)\s+[A-Za-z0-9_]*(Data|Info|Manager|Helper|Utils|Shared|Management)\b" app/modules --glob '*.ts' --glob '!**/tests/**'
```

Quan sát:

- `CreateProjectSprintCommand` tồn tại ở cả `app/modules/reviews` và `app/modules/sprints`.
- `StoreProjectController` không chỉ store project; nó tạo project, seed role template, assign staffing.
- `UpdateWorkflowCommand` có hành vi replace-all: xóa transitions rồi tạo lại.
- `TaskApplicationMapper` map task DTO/entity/response, không map task application.
- Backend có 14 file production tên `shared.ts` trong `app/modules`.
- Symbol business trùng tên có risk cao: sprint CRUD commands, queries, controllers, DTOs, `ProjectSprintRecord`.
- Helper response serialization lặp qua 6 mapper module với tên chung `ResponseRecord`, `SerializableResponseRecord`.

## Kết Luận Backend

| ID | Mức | Bằng chứng | Vấn đề | Hướng đổi tên |
| --- | --- | --- | --- | --- |
| B001 | Critical | `app/modules/sprints/actions/commands/create_project_sprint_command.ts:14`; `app/modules/reviews/actions/commands/create_project_sprint_command.ts:13` | Cùng tên sprint CRUD nhưng implementation khác nhau; bản `sprints` có `goal`, bản `reviews` không. | Giữ sprint CRUD canonical ở `app/modules/sprints`; xóa hoặc rename bản `reviews` với prefix `ReviewCompatibility`. |
| B002 | High | `app/modules/projects/controllers/store_project_controller.ts:50`; seed lines 56-57; clone roles 76-80; membership 104-121 | `StoreProjectController` nghe như persist đơn giản nhưng là orchestration lớn. | `CreateProjectWithStaffingController`; cân nhắc `CreateProjectWithStaffingCommand`. |
| B003 | High | `app/modules/tasks/actions/commands/update_workflow_command.ts:15`; delete-all line 62; controllers non-v1/v1 | `UpdateWorkflow*` che giấu replace-all semantics và class v1/non-v1 khó phân biệt stack trace. | `ReplaceTaskWorkflowTransitionsCommand`, `ReplaceTaskWorkflowTransitionsController`, `ReplaceTaskWorkflowTransitionsV1Controller`. |
| B004 | High | `app/modules/tasks/actions/mapper/task_application_mapper.ts:21` | `TaskApplicationMapper` là disinformation; không map application. | `TaskDtoMapper`, hoặc tách `TaskMutationMapper` và `TaskResponseMapper`. |
| B005 | Medium | `app/modules/skills/controllers/project_auth_helper.ts:7`; throws 10-24; returns `userId` 26 | `checkProjectPermission` nghe boolean nhưng throw và trả `userId`. | `requireProjectAccessUserId`; file `project_access_guard.ts`. |
| B006 | Medium | `app/modules/projects/public_contracts/create_project_dto.ts:6` | `CreateProjectDTOInterface` lộ mechanics và trùng ý với DTO class. | `CreateProjectInput`; giữ `CreateProjectDTO` nếu là wrapper behavior. |
| B007 | Medium | `app/modules/projects/controllers/mappers/request/shared.ts:12`, `:54`, `:70` | `shared.ts`, `toOptionalString`, `toPositiveNumber` không nói rõ request parsing. | `project_request_parsers.ts`; `parseOptionalRequestString`, `parsePositivePageNumber`, `parseBooleanRequestFlag`. |
| B008 | Medium | `app/modules/tasks/infra/repositories/read/shared.ts:24`, `:31`, `:77` | `shared.ts`, `getRecordField`, `getExtraField`, `baseQuery` thiếu ngữ cảnh repository. | `task_read_query_helpers.ts`; `readTaskModelField`, `readTaskModelExtraField`, `makeTaskReadQuery`. |
| B009 | Medium | response mapper `shared.ts` ở projects/reviews và 6 modules | Helper serialization trùng tên chung. | `model_response_serialization.ts`; `SerializableModelRecord`, `serializeModelForHttpResponse`. |
| B010 | Medium | `app/modules/organizations/controllers/current/sprints/show_sprint_management_controller.ts:14` | `management` mơ hồ, route thật là organization sprint workspace. | `ShowOrganizationSprintsWorkspaceController`. |
| B011 | Low | Duplicate `CreateTaskStatusController`, `ShowSettingsController`, versioned/current | Có thể làm stack trace mơ hồ nhưng có thể là wrapper có chủ đích. | Suffix `V1Controller` hoặc ghi exception. |
| B012 | Low | Duplicate `BaseCommand`, `BaseQuery`, `Command`, `Query`, `Result` | Pattern module-local có chủ đích. | Allowlist có comment trong guard. |

## Bằng Chứng Frontend

Lệnh audit đã dùng:

```bash
find inertia/apps -type f -name '*.svelte' | wc -l
find inertia/apps -type f -name '*.svelte' | awk -F/ '{print $NF}' | rg '^[a-z].*_' | wc -l
find inertia/apps -type f -name '*.svelte' | awk -F/ '{print $NF}' | rg '^[A-Z]' | wc -l
find inertia/apps -type f -name 'index.svelte' | wc -l
find inertia/apps -type f -name 'show.svelte' | wc -l
rg -n "\bconst vm\b|\bconst vals\b|\bconst ps\b|function sync\b|export interface (User|Task)\b" inertia/apps --glob '*.{ts,svelte}' --glob '!**/tests/**'
```

Quan sát:

- `inertia/apps` có 756 file `.svelte`.
- 535 `.svelte` basenames là snake_case.
- 28 `.svelte` basenames là PascalCase.
- 37 file tên `index.svelte`; 22 file tên `show.svelte`.
- PascalCase file lặp ở `org` và `user`: `UsersList.svelte`, `ProfileTab.svelte`, `PendingApprovalTable.svelte`, `OrganizationSwitcher.svelte`, `OrganizationList.svelte`, `OrganizationHeader.svelte`, `OrganizationCard.svelte`, `NotificationsTab.svelte`, `EditRoleModal.svelte`, `DeleteUserModal.svelte`, `ApprovalModal.svelte`, `AppearanceTab.svelte`, `AddUserModal.svelte`, `AccountTab.svelte`.
- Local name có mental mapping: hai `const vm`, bảy `const vals`, hai `const ps`, hai `function sync`.
- Exported domain type quá chung: `User` trong 6 production type files, `Task` trong 4 production type files.
- `Props` 504 lần và `PageProps` 7 lần được chấp nhận khi local trong component/page.
- `inertia/apps/user/modules/index/index.svelte:1` chỉ import và render `../dashboard/index.svelte`.

## Kết Luận Frontend

| ID | Mức | Bằng chứng | Vấn đề | Hướng đổi tên |
| --- | --- | --- | --- | --- |
| F001 | High | `inertia/apps/user/modules/tasks/index.svelte:190`; `inertia/apps/org/modules/tasks/index.svelte:190` | `vm` bắt người đọc tự dịch, chỉ wrap `createTaskPermission`. | Xóa wrapper và pass `createTaskPermission` trực tiếp, hoặc `taskScopeState` nếu cần group. |
| F002 | High | 7 match `const vals` ở admin/org/user filter pages | `vals` che giấu filter state từ URL. | `filterQueryValues`. |
| F003 | High | task skill dialog org/user line 75 | `ps` che giấu selected project skill. | `selectedProjectSkill`. |
| F004 | Medium | task verification methods field org/user line 35 | `sync` nói cơ chế, không nói ý định event. | `emitVerificationMethodChange`. |
| F005 | Medium | `User` 6 file; `Task` 4 file | Cùng từ nhưng shape khác nhau ở projects/settings/users/tasks. | `ProjectUserSummary`, `SettingsUser`, `UserDirectoryRecord`, `ProjectTaskSummary`, `TaskDetail`. |
| F006 | Medium | 535 snake_case vs 28 PascalCase `.svelte` | Convention component filename không thống nhất. | Rename repo-local PascalCase components sang snake_case. |
| F007 | Medium | `inertia/apps/user/modules/index/index.svelte:1` | `index/index` không nói domain, chỉ proxy dashboard. | Giữ route exception hoặc thay bằng route `home` trong plan routing riêng. |
| F008 | Low | 37 `index.svelte`; 22 `show.svelte` | Route basename khó search nhưng có thể do framework. | Ghi exception, không rename trong plan này. |
| F009 | Low | duplicate app-shell exports như `FRONTEND_ROUTES`, `useTranslation` | Lặp có thể đúng vì app shell tách admin/org/user. | Cho phép khi path app shell cung cấp context. |

## Phạm Vi File

- Sprint ownership backend: `app/modules/sprints/**`, review compatibility files trong `app/modules/reviews/**project_sprint**`, routes `start/routes/projects.ts`, `start/routes/reviews.ts`.
- Project creation backend: `app/modules/projects/controllers/store_project_controller.ts`, route imports, docs liên quan.
- Task workflow backend: `app/modules/tasks/actions/commands/update_workflow_command.ts`, `app/modules/tasks/controllers/update_workflow_controller.ts`, `app/modules/tasks/controllers/v1/update_workflow_controller.ts`, task route imports.
- Mapper/DTO/guard/parser backend: `app/modules/tasks/actions/mapper/task_application_mapper.ts`, `app/modules/projects/public_contracts/create_project_dto.ts`, `app/modules/projects/actions/dtos/request/create_project_dto.ts`, `app/modules/projects/controllers/mappers/request/shared.ts`, `app/modules/skills/controllers/project_auth_helper.ts`.
- Shared response/read backend: `app/modules/**/controllers/mappers/response/shared.ts`, `app/modules/tasks/infra/repositories/read/shared.ts`.
- Guard frontend: `inertia/apps/admin/tests/modules/naming_conventions.test.ts`, `inertia/apps/org/tests/modules/naming_conventions.test.ts`, `inertia/apps/user/tests/modules/naming_conventions.test.ts`.
- Local-name frontend: disputes, projects, organizations, tasks index pages, task filter bars, task skill dialog, task verification methods under `inertia/apps/{admin,org,user}`.
- Type-name frontend: `inertia/apps/{org,user}/modules/projects/types.ts`, `inertia/apps/{org,user}/modules/tasks/types/index.svelte.ts`, `inertia/apps/{org,user}/modules/settings/types.ts`, `inertia/apps/{org,user}/modules/users/types/index.ts`.
- File convention frontend: PascalCase `.svelte` files under `inertia/apps/{org,user}/modules/**`.
- Exception docs: `docs/08-testing/backend-naming-exceptions.md`, `docs/08-testing/frontend-naming-exceptions.md`.

### Hạng Mục 1: Thêm Naming Guard Tests

**File:**
- Create: `app/modules/http/tests/backend/architecture/backend_naming_conventions.spec.ts`
- Create: `inertia/apps/admin/tests/modules/naming_conventions.test.ts`
- Create: `inertia/apps/org/tests/modules/naming_conventions.test.ts`
- Create: `inertia/apps/user/tests/modules/naming_conventions.test.ts`
- Modify: `app/modules/http/tests/backend/architecture/boundary_guards.spec.ts` chỉ khi cần tái dùng scanner.

**Giao diện/đầu ra:**
- Backend guard scan production `app/modules/**/*.ts`.
- Frontend guard scan production `inertia/apps/{admin,org,user}/**/*.{ts,svelte}`.
- Backend guard allow module-local primitives: `BaseCommand`, `BaseQuery`, `Command`, `Query`, `Result`.
- Frontend guard allow route basenames: `index.svelte`, `show.svelte`, `create.svelte`, `edit.svelte`.

- [x] **Bước 1: Chạy GitNexus impact trước guard-coupled symbol work**

```bash
gitnexus impact CreateProjectSprintCommand
gitnexus impact StoreProjectController
gitnexus impact UpdateWorkflowCommand
gitnexus impact TaskApplicationMapper
```

Kỳ vọng: mỗi output có `risk`, `direct_callers`, `affected_processes`. Nếu HIGH/CRITICAL thì dừng và báo người duyệt.

- [x] **Bước 2: Tạo backend guard**

Guard kiểm tra:

- sprint CRUD business exports không trùng giữa `app/modules/reviews` và `app/modules/sprints`;
- tên misleading chứa `Data`, `Info`, `Manager`, `Helper`, `Utils`, `Shared`, `Management` không nằm trong allowlist;
- production file tên `shared.ts` không nằm trong exception;
- response serialization names không còn trùng sau B009.

- [x] **Bước 3: Tạo frontend guards**

Mỗi app có `APP_ROOT` riêng:

```ts
const APP_ROOT = 'inertia/apps/admin'
const ROUTE_BASENAME_ALLOWLIST = new Set(['index.svelte', 'show.svelte', 'create.svelte', 'edit.svelte'])
```

Guard reject các tên sau:

- `const vm`
- `const vals`
- `const ps`
- `function sync`
- `export interface User`
- `export interface Task`
- PascalCase `.svelte` component basenames

Guard allow các exception sau:

- route basenames;
- local `interface Props`;
- local `interface PageProps`;
- files under `/shared/generated/`.

- [x] **Bước 4: Xác nhận guards fail trước rename**

```bash
pnpm run test:integration --files app/modules/http/tests/backend/architecture/backend_naming_conventions.spec.ts
pnpm exec vitest run inertia/apps/admin/tests/modules/naming_conventions.test.ts inertia/apps/org/tests/modules/naming_conventions.test.ts inertia/apps/user/tests/modules/naming_conventions.test.ts
```

Kỳ vọng: FAIL với findings B/F hiện tại.

### Hạng Mục 2: Đưa Sprint CRUD Về Một Owner

**File:**
- Modify/delete review compatibility sprint files trong `app/modules/reviews/**project_sprint**`
- Keep canonical sprint CRUD files trong `app/modules/sprints/**`
- Modify imports trong `start/routes/projects.ts`, `start/routes/reviews.ts`, tests liên quan.

**Giao diện/đầu ra:**
- Canonical sprint CRUD command/query/controller names chỉ sống trong `app/modules/sprints`.
- Nếu còn compatibility ở reviews, tên phải có prefix `ReviewCompatibility`.

- [x] **Bước 1: Chạy impact**

```bash
gitnexus impact CreateProjectSprintCommand
gitnexus impact UpdateProjectSprintCommand
gitnexus impact ListProjectSprintsQuery
gitnexus impact GetProjectSprintQuery
gitnexus impact CreateProjectSprintController
gitnexus impact UpdateProjectSprintController
```

Kỳ vọng: biết direct callers trước khi sửa import/path.

- [x] **Bước 2: Rename hoặc xóa bản duplicate trong reviews**

Dùng `git mv` nếu rename file. Nếu xóa duplicate, cập nhật imports sang `app/modules/sprints`.

- [x] **Bước 3: Verify**

```bash
rg -n "class (CreateProjectSprintCommand|UpdateProjectSprintCommand|ListProjectSprintsQuery|GetProjectSprintQuery|CreateProjectSprintController|UpdateProjectSprintController|ListProjectSprintsController|ShowProjectSprintController)" app/modules/reviews app/modules/sprints --glob '*.ts'
pnpm run test:integration --files app/modules/http/tests/backend/architecture/backend_naming_conventions.spec.ts
gitnexus detect-changes
```

Kỳ vọng: symbol canonical chỉ còn trong `app/modules/sprints`; GitNexus changed scope khớp task.

### Hạng Mục 3: Rename Backend Names Đánh Lừa Hành Vi

**File:**
- Modify: `app/modules/projects/controllers/store_project_controller.ts`
- Modify: project route imports
- Modify: `app/modules/tasks/actions/commands/update_workflow_command.ts`
- Modify: `app/modules/tasks/controllers/update_workflow_controller.ts`
- Modify: `app/modules/tasks/controllers/v1/update_workflow_controller.ts`
- Modify: task route imports
- Modify: `app/modules/organizations/controllers/current/sprints/show_sprint_management_controller.ts`

**Giao diện/đầu ra:**
- `CreateProjectWithStaffingController` thay `StoreProjectController`.
- `ReplaceTaskWorkflowTransitionsCommand` thay `UpdateWorkflowCommand`.
- `ReplaceTaskWorkflowTransitionsController` thay non-v1 controller.
- `ReplaceTaskWorkflowTransitionsV1Controller` thay v1 controller.
- `ShowOrganizationSprintsWorkspaceController` thay `ShowSprintManagementController`.

- [x] **Bước 1: Chạy impact**

```bash
gitnexus impact StoreProjectController
gitnexus impact UpdateWorkflowCommand
gitnexus impact UpdateWorkflowController
gitnexus impact ShowSprintManagementController
```

Kỳ vọng: route/test/docs blast radius rõ trước khi rename.

- [x] **Bước 2: Rename file, class, import**

Dùng `git mv` cho file. Sau đó sửa class export và mọi import/call theo tên mới.

- [x] **Bước 3: Verify**

```bash
rg -n "StoreProjectController|UpdateWorkflowCommand|class UpdateWorkflowController|ShowSprintManagementController|show_sprint_management_controller|store_project_controller|update_workflow_command" app start docs --glob '*.{ts,md}'
pnpm run test:unit -- --files app/modules/projects/tests/backend/unit/project_controller_mappers.spec.ts app/modules/tasks/tests/backend/unit/task_request_mapper.spec.ts app/modules/organizations/tests/backend/unit/organization_controller_mappers.spec.ts
pnpm run test:integration --files app/modules/http/tests/backend/architecture/backend_naming_conventions.spec.ts
gitnexus detect-changes
```

Kỳ vọng: chỉ còn match trong docs lịch sử/exception; tests pass; GitNexus scope khớp task.

### Hạng Mục 4: Rename Backend Mapper, DTO, Guard, Shared Helpers

**File:**
- Modify: `app/modules/tasks/actions/mapper/task_application_mapper.ts`
- Modify imports của `TaskApplicationMapper`
- Modify: `app/modules/projects/public_contracts/create_project_dto.ts`
- Modify: `app/modules/projects/actions/dtos/request/create_project_dto.ts`
- Modify: `app/modules/skills/controllers/project_auth_helper.ts`
- Modify imports của `checkProjectPermission`
- Move: `app/modules/projects/controllers/mappers/request/shared.ts`
- Move: `app/modules/tasks/infra/repositories/read/shared.ts`
- Move/standardize response mapper `shared.ts` files.

**Giao diện/đầu ra:**
- `TaskDtoMapper` thay `TaskApplicationMapper`.
- `CreateProjectInput` thay `CreateProjectDTOInterface`.
- `requireProjectAccessUserId` thay `checkProjectPermission`.
- `project_request_parsers.ts` exports `parseOptionalRequestString`, `parsePositivePageNumber`, `parseBooleanRequestFlag`.
- `task_read_query_helpers.ts` exports `readTaskModelField`, `readTaskModelExtraField`, `makeTaskReadQuery`.
- `model_response_serialization.ts` exports `SerializableModelRecord`, `serializeModelForHttpResponse`.

- [x] **Bước 1: Chạy impact**

```bash
gitnexus impact TaskApplicationMapper
gitnexus impact CreateProjectDTOInterface
gitnexus impact checkProjectPermission
gitnexus impact toOptionalString
gitnexus impact getRecordField
gitnexus impact ResponseRecord
```

Kỳ vọng: nắm import/call sites trước khi sửa.

- [x] **Bước 2: Rename mapper, DTO input, access guard**

Dùng `git mv` nếu đổi file. Cập nhật class/function/interface và imports.

- [x] **Bước 3: Rename helper files**

Đổi request parsers, task read helpers, response serialization helpers sang tên nói đúng intent.

- [x] **Bước 4: Verify**

```bash
rg -n "TaskApplicationMapper|CreateProjectDTOInterface|checkProjectPermission|toOptionalString|toPositiveNumber|getRecordField|getExtraField|baseQuery|ResponseRecord|SerializableResponseRecord" app/modules --glob '*.ts' --glob '!**/tests/**'
find app/modules -type f -name 'shared.ts' | sort
pnpm run typecheck
pnpm run test:unit -- --files app/modules/tasks/tests/backend/unit/task_request_mapper.spec.ts app/modules/tasks/tests/backend/unit/task_controller_response_mappers.spec.ts app/modules/projects/tests/backend/unit/project_controller_mappers.spec.ts app/modules/skills/tests/backend/unit/get_active_skills_query.spec.ts
gitnexus detect-changes
```

Kỳ vọng: old ambiguous names biến mất hoặc có trong backend exception; typecheck/tests pass.

### Hạng Mục 5: Ghi Backend Naming Exceptions

**File:**
- Create: `docs/08-testing/backend-naming-exceptions.md`
- Modify: `app/modules/http/tests/backend/architecture/backend_naming_conventions.spec.ts`

**Giao diện/đầu ra:**
- Docs ghi rõ module-local primitives được phép.
- Docs ghi rõ versioned wrapper duplicate class nếu còn.
- Không allow duplicate sprint CRUD business names.

- [x] **Bước 1: Tạo exception doc**

Nội dung phải có:

- module-local architecture primitives: `BaseCommand`, `BaseQuery`, `Command`, `Query`, `Result`;
- versioned wrapper controllers khi current/v1 intentionally identical;
- framework-mandated filenames khi route/loader convention yêu cầu.

- [x] **Bước 2: Đồng bộ guard với docs**

Mỗi allowlist entry trong guard phải có comment và entry tương ứng trong docs.

- [x] **Bước 3: Verify**

```bash
rg -n "BaseCommand|BaseQuery|Command|Query|Result|CreateProjectSprintCommand" docs/08-testing/backend-naming-exceptions.md app/modules/http/tests/backend/architecture/backend_naming_conventions.spec.ts
```

Kỳ vọng: architecture names có docs; duplicate sprint CRUD không được allow.

### Hạng Mục 6: Rename Frontend Local Names Cần Dịch Trong Đầu

**File:**
- Modify: `inertia/apps/admin/modules/disputes/index.svelte`
- Modify: `inertia/apps/org/modules/projects/index.svelte`
- Modify: `inertia/apps/user/modules/projects/index.svelte`
- Modify: `inertia/apps/org/modules/organizations/index.svelte`
- Modify: `inertia/apps/user/modules/organizations/index.svelte`
- Modify: `inertia/apps/org/modules/tasks/components/header/task_filters_bar.svelte`
- Modify: `inertia/apps/user/modules/tasks/components/header/task_filters_bar.svelte`
- Modify: `inertia/apps/org/modules/tasks/index.svelte`
- Modify: `inertia/apps/user/modules/tasks/index.svelte`
- Modify: `inertia/apps/org/modules/tasks/components/task_skill_add_dialog.svelte`
- Modify: `inertia/apps/user/modules/tasks/components/task_skill_add_dialog.svelte`
- Modify: `inertia/apps/org/modules/tasks/components/shared/task_verification_methods_field.svelte`
- Modify: `inertia/apps/user/modules/tasks/components/shared/task_verification_methods_field.svelte`

**Giao diện/đầu ra:**
- `filterQueryValues: Record<string, string>` thay `vals`.
- Pass `createTaskPermission` trực tiếp thay `vm`.
- `selectedProjectSkill` thay `ps`.
- `emitVerificationMethodChange(nextSelectedValues: string[], nextCustomText: string): void` thay `sync`.

- [x] **Bước 1: Chạy impact frontend exports liên quan**

```bash
gitnexus impact TaskScopeBar
gitnexus impact ProjectSkillAddDialog
gitnexus impact TaskVerificationMethodsField
```

Kỳ vọng: biết component consumers trước khi sửa. Nếu GitNexus output thiếu chi tiết, bổ sung bằng `rg`.

- [x] **Bước 2: Rename locals**

Đổi `vals`, `vm`, `ps`, `sync` theo interface bên trên.

- [x] **Bước 3: Verify**

```bash
rg -n "\bconst vm\b|\bconst vals\b|\bconst ps\b|function sync\b" inertia/apps --glob '*.{ts,svelte}' --glob '!**/tests/**'
pnpm exec vitest run inertia/apps/admin/tests/modules/disputes/index.test.ts inertia/apps/org/tests/modules/projects/projects_index_page.test.ts inertia/apps/org/tests/modules/tasks/index.test.ts inertia/apps/user/tests/modules/tasks/index.test.ts inertia/apps/org/tests/modules/tasks/components/task_verification_methods.test.ts inertia/apps/user/tests/modules/tasks/components/task_verification_methods.test.ts
gitnexus detect-changes
```

Kỳ vọng: không còn local-name matches trong production; tests pass.

### Hạng Mục 7: Rename Frontend Domain Types Và Component Filenames

**File:**
- Modify: `inertia/apps/org/modules/projects/types.ts`
- Modify: `inertia/apps/user/modules/projects/types.ts`
- Modify: `inertia/apps/org/modules/tasks/types/index.svelte.ts`
- Modify: `inertia/apps/user/modules/tasks/types/index.svelte.ts`
- Modify: `inertia/apps/org/modules/settings/types.ts`
- Modify: `inertia/apps/user/modules/settings/types.ts`
- Modify: `inertia/apps/org/modules/users/types/index.ts`
- Modify: `inertia/apps/user/modules/users/types/index.ts`
- Move PascalCase `.svelte` files trong `inertia/apps/org/modules/**` và `inertia/apps/user/modules/**`.

**Giao diện/đầu ra:**
- `ProjectUserSummary` thay project-module exported `User`.
- `ProjectTaskSummary` thay project-module exported `Task`.
- `TaskDetail` thay task-module exported `Task`.
- `SettingsUser` thay settings-module exported `User`.
- `UserDirectoryRecord` thay users-module exported `User`.
- Svelte component filenames dùng snake_case trừ route basenames.

- [x] **Bước 1: Chạy impact trước type rename**

Không chạy `gitnexus impact User` làm quyết định chính vì output rất nhiễu (`direct_callers 1357`). Chạy impact cho export/component cụ thể nếu đã có tên riêng, rồi dùng `rg` theo file:

```bash
gitnexus impact OrganizationCard
rg -n "from './types'|from '../types'|type \\{[^}]*\\b(User|Task)\\b" inertia/apps/org/modules inertia/apps/user/modules --glob '*.{ts,svelte}'
```

Kỳ vọng: danh sách import/type annotations cần sửa rõ theo module.

- [x] **Bước 2: Rename generic exported types**

Đổi exported interfaces và mọi import sang tên trong `Interfaces`.

- [x] **Bước 3: Rename PascalCase Svelte files**

Dùng `git mv` cho các mapping hiện có:

```text
OrganizationCard.svelte -> organization_card.svelte
OrganizationList.svelte -> organization_list.svelte
OrganizationHeader.svelte -> organization_header.svelte
OrganizationSwitcher.svelte -> organization_switcher.svelte
ProfileTab.svelte -> profile_tab.svelte
AccountTab.svelte -> account_tab.svelte
AppearanceTab.svelte -> appearance_tab.svelte
NotificationsTab.svelte -> notifications_tab.svelte
UsersList.svelte -> users_list.svelte
PendingApprovalTable.svelte -> pending_approval_table.svelte
AddUserModal.svelte -> add_user_modal.svelte
EditRoleModal.svelte -> edit_role_modal.svelte
DeleteUserModal.svelte -> delete_user_modal.svelte
ApprovalModal.svelte -> approval_modal.svelte
```

- [x] **Bước 4: Verify**

```bash
rg -n "export interface (User|Task)\b|import type \{[^}]*\b(User|Task)\b" inertia/apps/org inertia/apps/user --glob '*.{ts,svelte}' --glob '!**/tests/**'
find inertia/apps -type f -name '*.svelte' | awk -F/ '{print $NF}' | rg '^[A-Z]' | wc -l
pnpm run check:svelte
pnpm exec vitest run inertia/apps/org/tests/modules/projects/projects_index_page.test.ts inertia/apps/org/tests/modules/tasks/index.test.ts inertia/apps/user/tests/modules/tasks/index.test.ts
gitnexus detect-changes
```

Kỳ vọng: không còn generic exported `User`/`Task`; PascalCase count `0`; checks pass.

### Hạng Mục 8: Ghi Frontend Route Và App-Shell Exceptions

**File:**
- Create: `docs/08-testing/frontend-naming-exceptions.md`
- Modify: `inertia/apps/admin/tests/modules/naming_conventions.test.ts`
- Modify: `inertia/apps/org/tests/modules/naming_conventions.test.ts`
- Modify: `inertia/apps/user/tests/modules/naming_conventions.test.ts`
- Modify hoặc document: `inertia/apps/user/modules/index/index.svelte`

**Giao diện/đầu ra:**
- Cho phép `index.svelte`, `show.svelte`, `create.svelte`, `edit.svelte`.
- Cho phép local `Props`, `PageProps`.
- Cho phép app-shell exports như `FRONTEND_ROUTES`, `useTranslation`, `buildOffsetPagination`, `FilterConfig`, `FilterValue`.
- Không nới guard cho F001-F006.

- [x] **Bước 1: Tạo frontend exception doc**

Doc phải nói rõ route basename, component props, page props, app-shell exceptions.

- [x] **Bước 2: Quyết định dashboard proxy**

```bash
rg -n "render\('index'|render\(\"index\"|modules/index/index|user/modules/index" inertia resources
```

Kỳ vọng: nếu không có usage thì delete `inertia/apps/user/modules/index/index.svelte`; nếu có usage thì ghi compatibility proxy đến khi retire page name.

- [x] **Bước 3: Verify**

```bash
rg -n "index\.svelte|show\.svelte|Props|FRONTEND_ROUTES|User|Task" docs/08-testing/frontend-naming-exceptions.md inertia/apps/*/tests/modules/naming_conventions.test.ts
```

Kỳ vọng: docs có route/app-shell exceptions; guards vẫn ban exported `User` và `Task`.

### Hạng Mục 9: Final Verification Và Scope Audit

**File:**
- Tất cả file đổi trong Tasks 1-8.

**Giao diện/đầu ra:**
- Backend ambiguous names đã đổi hoặc có exception.
- Frontend ambiguous names đã đổi hoặc có exception.
- Guards pass.
- GitNexus xác nhận changed symbols/flows khớp plan.

- [x] **Bước 1: Backend verification**

```bash
pnpm run typecheck
pnpm run test:unit -- --files app/modules/projects/tests/backend/unit/project_controller_mappers.spec.ts app/modules/tasks/tests/backend/unit/task_request_mapper.spec.ts app/modules/tasks/tests/backend/unit/task_controller_response_mappers.spec.ts app/modules/skills/tests/backend/unit/get_active_skills_query.spec.ts app/modules/organizations/tests/backend/unit/organization_controller_mappers.spec.ts
pnpm run test:integration --files app/modules/http/tests/backend/architecture/backend_naming_conventions.spec.ts
```

Kỳ vọng: PASS.

- [x] **Bước 2: Frontend verification**

```bash
pnpm exec vitest run inertia/apps/admin/tests/modules/naming_conventions.test.ts inertia/apps/org/tests/modules/naming_conventions.test.ts inertia/apps/user/tests/modules/naming_conventions.test.ts
pnpm run lint:frontend
pnpm run check:svelte
```

Kỳ vọng: PASS.

- [x] **Bước 3: Search old names**

```bash
rg -n "StoreProjectController|UpdateWorkflowCommand|TaskApplicationMapper|CreateProjectDTOInterface|checkProjectPermission" app start docs --glob '*.{ts,md}'
rg -n "\bconst vm\b|\bconst vals\b|\bconst ps\b|function sync\b|export interface (User|Task)\b" inertia/apps --glob '*.{ts,svelte}' --glob '!**/tests/**'
find inertia/apps -type f -name '*.svelte' | awk -F/ '{print $NF}' | rg '^[A-Z]' | wc -l
```

Kỳ vọng: chỉ còn documented exception/history; frontend PascalCase count `0`.

- [x] **Bước 4: GitNexus final gate**

```bash
gitnexus detect-changes
```

Kỳ vọng: changed symbols và flows nằm trong scope naming plan. Nếu có symbol/flow ngoài scope, dừng và review diff.

- [x] **Bước 5: Xác nhận chỉ còn 1 plan canonical**

```bash
find docs/superpowers/plans -maxdepth 1 -type f \( -name '2026-07-17-clean-code-naming-hardening*.md' -o -name '2026-07-17-backend-clean-code-naming-audit.md' -o -name '2026-07-17-frontend-clean-code-naming-audit.md' \) | sort
```

Kỳ vọng: chỉ có `docs/superpowers/plans/2026-07-17-clean-code-naming-hardening-consolidated.md`.

## Điều Kiện Hoàn Thành

- Tài liệu này là plan Clean Code naming duy nhất còn lại cho ngày 2026-07-17.
- Nội dung đọc được bằng tiếng Việt để người duyệt phê duyệt được.
- Mọi task rename đều có bước `gitnexus impact` trước khi sửa và `gitnexus detect-changes` sau lát đổi tên.
- Backend findings B001-B012 có evidence và task xử lý.
- Frontend findings F001-F009 có evidence và task xử lý.
- Exception phải có docs và allowlist trong guard.
- Verification cuối có backend tests, frontend tests, naming searches, và GitNexus final gate.

## Verification 2026-07-17

```text
node --import=@poppinss/ts-exec bin/test.ts integration --files app/modules/http/tests/backend/architecture/backend_naming_conventions.spec.ts
=> 1 passed

pnpm exec vitest run inertia/apps/admin/tests/modules/naming_conventions.test.ts inertia/apps/org/tests/modules/naming_conventions.test.ts inertia/apps/user/tests/modules/naming_conventions.test.ts
=> 3 files passed, 3 tests passed

pnpm run typecheck
=> tsc passed; svelte-check found 0 errors and 0 warnings

pnpm run lint:frontend
=> frontend Svelte and TS lint passed

pnpm run check:svelte
=> svelte-check found 0 errors and 0 warnings

node --import=@poppinss/ts-exec bin/test.ts unit --files <each backend naming unit file, run sequentially>
=> project controller mappers 5 passed; task request mapper 8 passed; task controller response mappers 6 passed; get active skills query 1 passed; organization controller mappers 3 passed

rg frontend old local/domain names
=> 0 production matches

find inertia/apps -type f -name '*.svelte' | awk -F/ '{print $NF}' | rg '^[A-Z]'
=> 0 PascalCase Svelte basenames

find docs/superpowers/plans -maxdepth 1 -type f \( -name '2026-07-17-clean-code-naming-hardening*.md' -o -name '2026-07-17-backend-clean-code-naming-audit.md' -o -name '2026-07-17-frontend-clean-code-naming-audit.md' \) | sort
=> docs/superpowers/plans/2026-07-17-clean-code-naming-hardening-consolidated.md
```
