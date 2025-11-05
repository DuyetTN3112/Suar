# Task Workflow Và Submission

## Mục đích

Tài liệu này gom business truth đã được kiểm chứng cho domain task delivery của Suar:

- task workflow theo `task_status_id`
- board/list/timeline/task detail surfaces
- submission package, evidences, comments, attachments
- audit logs
- compatibility layer giữa `status` cũ và workflow truth mới

Mục tiêu là để người đọc không có code vẫn hiểu được:

- task trong Suar đang chạy theo logic nào
- tại sao `status` không còn là truth chính
- vì sao task không thể bị kéo trạng thái tùy ý
- submission package liên quan gì tới review và transition sang `DONE`

## Một Câu Tóm Tắt Ngắn

Task trong Suar không phải record `title/status` đơn giản.

Nó là một gói công việc có workflow, metadata đánh giá, required skills đủ bốn nhóm canonical, submission package, audit trail, và rule chuyển trạng thái gắn với review readiness.

## Nếu Bạn Chỉ Có 5 Phút

Chỉ cần nhớ bốn ý:

1. `task_status_id` mới là workflow truth; `status` cũ chỉ là mirror compatibility.
2. Task đổi trạng thái qua nhiều surface khác nhau như update status, drag/drop, batch update, và board-state POC; không có một đường vào duy nhất.
3. Task create/update requirement path hiện cần tối thiểu 1 skill cho từng nhóm `technology`, `engineering`, `soft_skill`, `delivery`.
4. Nhiều task muốn sang `DONE` phải có submission hợp lệ, nhưng vẫn có một nhóm task type được bypass rule này.
5. Nếu organization chưa cấu hình workflow transitions, runtime hiện dùng permissive default thay vì chặn toàn bộ drag/drop.

Nếu đang gấp:

- lỗi board, kéo cột, đổi status: đọc phần `Workflow Rules Quan Trọng`
- lỗi không sang `DONE`: đọc phần `Workflow Rules Quan Trọng` và `Submission Package`
- lỗi lệch report giữa board và data: đọc phần `Task Workflow Truth`

## Mental Model

Đọc domain này theo 6 nấc:

1. organization có workflow và status definitions riêng
2. task được tạo với `task_status_id` bắt buộc
3. `task_status_id` mới là workflow truth; `status` cũ chỉ là mirror compatibility
4. task có thể được kéo/reorder hoặc đổi cột, nhưng phải qua permission + workflow validation
5. trước khi đóng task ở trạng thái `DONE`, nhiều loại task phải có submission hợp lệ
6. submission được đẩy sang review zone và tạo thêm audit/notification side effects

Một câu nhớ ngắn:

`Task tạo delivery flow. Submission tạo proof. Review dùng proof đó để tạo kết luận.`

## Task Workflow Truth

### Điều phải hiểu thật rõ

Trong runtime hiện tại:

- `task_status_id` là source of truth
- `tasks.status` chỉ là legacy compatibility field

`tasks.status` hiện chủ yếu mirror theo `category` của status mới để phục vụ reporting hoặc UI path cũ.

Nguồn: `app/modules/tasks/domain/task_status_mirror.ts`, `app/modules/tasks/infra/models/task.ts`, `app/modules/tasks/constants/task_constants.ts`

### Điều này có nghĩa gì trong thực tế

- nếu docs hoặc code cũ chỉ nói về `status`, chưa chắc đã đủ để hiểu workflow thật
- incident kiểu “status nhìn đúng nhưng board/grouping sai” rất có thể liên quan đến lệch giữa `status` mirror và `task_status_id`
- khi audit data hoặc viết report, nên mô tả workflow theo `task_statuses`, `task_workflow_transitions`, và `task_status_id`

## Surface Runtime Đã Xác Nhận

### Page routes

- `GET /tasks`
- `GET /tasks/create`
- `GET /tasks/status-board`
- `GET /tasks/:taskId`
- `GET /tasks/:taskId/edit`
- `GET /tasks/:taskId/audit-logs`
- `POST /tasks`
- `PUT /tasks/:taskId`
- `PUT /tasks/:taskId/status`
- `PATCH /tasks/:taskId/time`
- `DELETE /tasks/:taskId`

### Compatibility/API routes

- `GET /api/tasks/creation-access`
- `GET /api/tasks/status-groups`
- `GET /api/tasks/timeline-items`
- `PATCH /api/tasks/batch-status`
- `PATCH /api/tasks/board-state`
- `PATCH /api/tasks/:taskId/sort-order`
- `GET /api/tasks/:taskId`
- `GET /api/task-statuses`
- `GET /api/workflow`
- `POST /api/task-statuses`
- `PUT /api/task-statuses/:taskStatusId`
- `PATCH /api/task-statuses/:taskStatusId`
- `DELETE /api/task-statuses/:taskStatusId`
- `PUT /api/workflow`

### Canonical `/api/v1` task routes hiện có

- `GET /api/v1/tasks/creation-access`
- `GET /api/v1/tasks/status-groups`
- `GET /api/v1/tasks/timeline-items`
- `PATCH /api/v1/tasks/batch-status`
- `PATCH /api/v1/tasks/board-state`
- `PATCH /api/v1/tasks/:taskId/sort-order`
- `GET /api/v1/tasks/:taskId`
- `GET /api/v1/tasks/:taskId/audit-logs`
- `GET /api/v1/tasks/:taskId/submission`
- `POST /api/v1/tasks/:taskId/submission`
- `PATCH /api/v1/tasks/:taskId/submission`
- `POST /api/v1/tasks/:taskId/submission/submit`
- `POST /api/v1/tasks/:taskId/submission/lock`
- `GET /api/v1/task-submissions/:submissionId/evidences`
- `POST /api/v1/task-submissions/:submissionId/evidences`
- `DELETE /api/v1/task-submissions/:submissionId/evidences/:evidenceId`
- `GET /api/v1/tasks/:taskId/comments`
- `POST /api/v1/tasks/:taskId/comments`
- `PATCH /api/v1/tasks/:taskId/comments/:commentId`
- `DELETE /api/v1/tasks/:taskId/comments/:commentId`
- `GET /api/v1/tasks/:taskId/attachments`
- `POST /api/v1/tasks/:taskId/attachments`
- `DELETE /api/v1/tasks/:taskId/attachments/:attachmentId`
- `GET /api/v1/tasks/:taskId/applications/:applicationId/match`
- `GET /api/v1/tasks/:taskId/applications/ranking`
- `GET /api/v1/task-statuses`
- `GET /api/v1/task-statuses/:taskStatusId`
- `POST /api/v1/task-statuses`
- `PATCH /api/v1/task-statuses/:taskStatusId`
- `DELETE /api/v1/task-statuses/:taskStatusId`
- `GET /api/v1/workflow`
- `PUT /api/v1/workflow`

### Caveat namespace rất quan trọng

- task detail/submission/comments/attachments đã có nhánh `/api/v1/tasks/*`
- task-status definitions và workflow definitions hiện đã có cả compatibility surface `/api/*` lẫn canonical surface `/api/v1/*`
- nhưng canonical task routes hiện đang nằm rải ở nhiều route files, đáng chú ý nhất là:
  - `start/routes/tasks.ts`
  - `start/routes/api_v1.ts`
- vì vậy nếu chỉ mở một route file hoặc chỉ grep một prefix, người đọc rất dễ kết luận sai là workflow/status “chưa có v1”
- mixed contract vẫn còn là sự thật runtime, nhưng không còn đúng khi mô tả workflow/status definition là chỉ sống ở `/api/*`

Task board alias note:

- khi mô tả board/grouping surface ổn định, nên ưu tiên `GET /api/tasks/status-groups`
- alias cũ `GET /api/tasks/grouped` vẫn tồn tại vì compatibility, nhưng current worktree đang có bằng chứng regression cho thấy alias này có thể bị route dynamic detail `/api/tasks/:taskId` nuốt nếu route order lệch
- vì vậy docs, report, và runbook không nên dùng `grouped` như tên surface chính để người ngoài repo tin tưởng lâu dài

Nguồn: `start/routes/tasks.ts`, `start/routes/api_v1.ts`

## Task Data Và Versioning Signals

### Data/runtime anchors đã xác nhận

- `tasks`
- `task_statuses`
- `task_workflow_transitions`
- `task_required_skills`
- `task_requirement_versions`
- `task_requirement_version_items`
- `task_versions`
- `task_submissions`
- `task_submission_evidences`
- `task_comments`
- `task_attachments`
- `task_assignment_snapshots`

### Điều reader nên hiểu

Task của Suar có nhiều metadata hơn task board phổ thông:

- acceptance criteria
- verification method
- expected deliverables
- tech stack
- measurable outcomes
- learning objectives
- domain tags
- role in task
- autonomy level
- business domain

Điều này giải thích vì sao task ở Suar phục vụ cả review lẫn matching, không chỉ delivery tracking.

## Workflow Rules Quan Trọng

### 0. Chưa cấu hình workflow không đồng nghĩa hệ thống hỏng

Nếu organization chưa có `task_workflow_transitions` nào được cấu hình:

- runtime hiện cho phép chuyển trạng thái theo permissive default
- mục tiêu là để drag/drop và board hoạt động được ngay từ đầu
- vì vậy incident kiểu “vì sao org A kéo được còn org B bị chặn” có thể xuất phát từ việc một bên đã có workflow explicit, bên kia thì chưa

Nguồn: `app/modules/tasks/domain/task_status_rules.ts`

### 1. Không phải mọi kéo-thả đều giống nhau

Khi reorder trong cùng cột:

- hệ thống chủ yếu cần quyền reorder ở collection level

Khi kéo sang cột mới:

- hệ thống cần quyền đổi status
- validate transition theo `task_workflow_transitions`
- có thể bị chặn nếu task đã ở trạng thái `done` và đã có review

Nguồn: `app/modules/tasks/actions/commands/update_task_sort_order_command.ts`

### 2. Task đã done và đã có review thì không nên kéo ngược

Code hiện tại chặn:

- task đang ở category `done`
- và đã có review
- thì không được kéo sang trạng thái khác

Điều này bảo vệ tính nhất quán giữa completed delivery và review governance.

### 3. Không phải task nào cũng được sang `DONE` nếu chưa có submission

Runtime hiện tại yêu cầu nhiều loại task phải có submission hợp lệ ở một trong các trạng thái:

- `submitted`
- `accepted_for_review`
- `locked`

Nếu thiếu, chuyển sang `DONE` sẽ bị chặn.

Có một số task type được bypass rule này, ví dụ:

- `research_spike`
- `poc`
- `prototype`
- `technical_writing`
- `documentation`
- `knowledge_transfer`
- `mentoring`
- `product_management`

Nguồn: `app/modules/tasks/actions/commands/update_task_status_command.ts`, `app/modules/tasks/actions/commands/update_task_sort_order_command.ts`, `app/modules/tasks/actions/commands/batch_update_task_status_command.ts`

### 4. Cùng một rule nhưng đi qua nhiều surface khác nhau

Code hiện tại cho thấy rule workflow không chỉ nằm ở đúng một endpoint:

- đổi status trực tiếp: `UpdateTaskStatusCommand`
- kéo task sang cột mới hoặc reorder: `UpdateTaskSortOrderCommand`
- bulk update nhiều task: `BatchUpdateTaskStatusCommand`
- patch board-state POC: surface riêng cho optimistic/conflict handling, không thay thế workflow engine thật

Điều này có nghĩa:

- incident kiểu “board kéo được nhưng status API fail” hoặc ngược lại không phải chuyện lạ
- phải xác định người dùng đang đi qua surface nào trước khi debug
- docs không nên kể task workflow như thể chỉ có một đường vào duy nhất

## Submission Package

### Mục tiêu

Biến “xong việc” thành một package có thể review, thay vì chỉ đổi cột rồi coi là hoàn thành.

### Surface đã xác nhận

- `GET /api/tasks/:taskId/submission`
- `POST /api/tasks/:taskId/submission`
- `PATCH /api/tasks/:taskId/submission`
- `POST /api/tasks/:taskId/submission/submit`
- `POST /api/tasks/:taskId/submission/lock`
- `GET /api/task-submissions/:submissionId/evidences`
- `POST /api/task-submissions/:submissionId/evidences`
- `DELETE /api/task-submissions/:submissionId/evidences/:evidenceId`

v1 mirrors cũng đã có thật dưới `/api/v1/*`.

### Statuses đã thấy

- `draft`
- `submitted`
- `accepted_for_review`
- `needs_changes`
- `locked`

### Điều phải hiểu đúng

- assignee có thể lưu nháp và nộp báo cáo
- lock là trạng thái ngăn chỉnh sửa tiếp
- lock không tự nó mở review session mới và cũng không tự nó đẩy task sang review zone; đó là nuance khác với submit
- thêm/xóa evidence sẽ bị chặn nếu submission đã `locked`
- lúc submit, hệ thống có thể tạo snapshot và đẩy task sang review zone

Nguồn: `app/modules/tasks/controllers/task_submission_controller.ts`, `app/modules/tasks/actions/commands/submit_task_submission_command.ts`, `app/modules/tasks/actions/commands/add_task_submission_evidence_command.ts`, `app/modules/tasks/actions/commands/delete_task_submission_evidence_command.ts`

## Submission Sau Khi Submit

### Side effects đã được xác nhận

Khi submit thực sự:

- submission được upsert
- evidences được replace theo payload mới
- task assignment snapshot với reason `submitted` có thể được tạo
- task có thể được kéo sang status `in_review`
- runtime sẽ cố `ensureReviewSession()` ngay trong transaction nếu assignment active chưa có session
- reviewer assignments ban đầu cũng được seed ngay ở pha này nếu session mới được tạo
- audit log được ghi
- notification cho submitter được tạo
- reviewer liên quan có thể nhận `REVIEW_REQUESTED`

Điều này có nghĩa submission package là cầu nối trực tiếp giữa delivery và review, không phải file đính kèm phụ.

Một bẫy vận hành rất hay gặp:

- `submit` là đường runtime có side effects mạnh cho review governance
- `lock` chỉ đóng băng completion package hiện có để ngăn chỉnh sửa tiếp
- vì vậy thấy submission đã `locked` không tự động có nghĩa review session vừa được tạo ở bước lock đó

### Một nuance runtime rất quan trọng

Review session hiện không chỉ có đúng một đường sinh ra.

Code audit cho thấy có hai lớp bảo vệ:

- đường chính: assignee submit completion package, command đẩy task sang `in_review` rồi `ensureReviewSession()` ngay trong transaction
- đường bổ trợ: nếu task sau đó được chuyển sang category `done`, listener completion sẽ complete active assignment rồi phát event tạo review session còn thiếu

Nói ngắn gọn:

- submit là lúc runtime ưu tiên mở review sớm
- chuyển sang `done` là lớp backstop để không bỏ sót review session nếu hệ thống đi qua completion path khác

Vì vậy không nên kể domain này theo một câu cứng nhắc kiểu “task DONE rồi mới sinh review”.

Nguồn: `app/modules/tasks/actions/commands/submit_task_submission_command.ts`, `app/modules/tasks/actions/listeners/task_completion_listener.ts`, `app/modules/reviews/actions/listeners/assignment_completion_listener.ts`

### Reviewer Assignment Seed Không Phải Ngẫu Nhiên

Khi runtime tạo review session mới, hệ thống không chỉ “gửi cho vài reviewer”.

Code hiện seed reviewer assignments theo governance rules:

- ưu tiên `creator_required` cho creator reviewer hiệu lực
- nếu creator là reviewee hoặc không dùng được, runtime fallback lần lượt qua `assigned_by`, `project owner`, `project manager`, rồi org owner/admin hợp lệ khác
- sau đó bổ sung `manager_required` theo quota manager tối thiểu
- bổ sung `peer_required` theo quota peer tối thiểu / required peer reviews
- cuối cùng có thể thêm `manager_optional` và `peer_optional` làm lớp dự phòng

Điểm này quan trọng vì:

- review session của Suar là governance workflow có cấu trúc, không phải inbox review tự do
- khi production thấy reviewer list “không giống trực giác”, phải audit theo seed rules chứ không đoán theo tên người tạo task

Nguồn: `app/modules/reviews/actions/support/review_session_reviewer_assignments.ts`, `app/modules/reviews/tests/backend/integration/create_session.spec.ts`, `app/modules/tasks/tests/backend/contract/task_submission_api_standardization.contract.spec.ts`

## Comments, Attachments, Audit Logs

### Comments

Task comments hiện hỗ trợ:

- root thread + reply
- pagination theo root threads
- mention resolution
- notification khi có mention mới
- `review_relevance` flag

### Attachments

Task attachments là runtime surface riêng, không bị trộn với submission evidences.

Điều này quan trọng vì:

- attachment là artifact của task workspace nói chung
- submission evidence là artifact gắn riêng với completion package

### Audit logs

Task audit logs có:

- list theo entity `task`
- format change set
- user info map
- cache Redis 2 phút
- limit mặc định 20, max 100

Nguồn: `app/modules/tasks/controllers/get_task_audit_logs_controller.ts`, `app/modules/tasks/actions/queries/get_task_audit_logs_query.ts`

## Status Board

### Điều phải hiểu đúng

`/tasks/status-board` hiện là page shell có thật.

Nhưng patch endpoint cho board state:

- `PATCH /api/tasks/board-state`
- `PATCH /api/v1/tasks/board-state`

hiện vẫn được mô tả rõ trong code là `POC endpoint` để validate optimistic flow và conflict handling.

Nó không nên bị viết như thể đã là full persisted board-state engine độc lập.

Nếu input `simulateConflict` được bật, command sẽ trả conflict thay vì silently succeed.

Điểm rất quan trọng:

- `PATCH /api/tasks/board-state` và `PATCH /api/v1/tasks/board-state` là POC surface cho board interaction
- workflow engine thật vẫn nằm ở các command đổi status/sort-order/batch-status có validate transition và guard riêng
- vì vậy board-state patch không nên bị dùng như bằng chứng rằng toàn bộ board persistence đã được tách thành engine độc lập

Nguồn: `app/modules/tasks/controllers/show_task_status_board_controller.ts`, `app/modules/tasks/controllers/patch_task_status_board_poc_controller.ts`, `app/modules/tasks/actions/commands/patch_task_status_board_poc_command.ts`

## Nếu Production Lỗi Ở Domain Này

Khoanh nhanh theo dấu hiệu:

- task đổi cột sai hoặc không đổi được: kiểm tra `task_status_id`, workflow transitions, permission, và rule submission-before-done
- board hiển thị đúng nhưng detail/status mismatch: nghi drift giữa `task_status_id` truth và `status` mirror
- task status/workflow API có vẻ “mất v1”: kiểm tra cả `start/routes/tasks.ts` lẫn `start/routes/api_v1.ts` trước khi kết luận route chưa tồn tại
- submission sửa không được: kiểm tra submission có đang `locked` hay không
- assignee báo đã nộp nhưng review không mở: kiểm tra move-to-review path, snapshot creation, và reviewer notification side effects
- audit logs trống hoặc lạ: kiểm tra audit writer, cache TTL 2 phút, và limit input
- board patch bị conflict: xác nhận đó có phải nhánh `POC conflict simulation` hay không trước khi kết luận bug workflow

## Test Evidence

### Contract

- task audit logs endpoint returns wrapped collection
- status board patch endpoint accepts aliased request fields và trả wrapped response
- task submission lock endpoint trả `locked` state đúng shape

### E2E / Component

- assignee có thể save draft submission
- outsider thấy read-only state
- locked submission render read-only state rõ ràng

Nguồn: `app/modules/tasks/tests/backend/contract/task_auxiliary_api_standardization.contract.spec.ts`, `app/modules/tasks/tests/backend/contract/task_board_api_standardization.contract.spec.ts`, `app/modules/tasks/tests/backend/contract/task_submission_api_standardization.contract.spec.ts`, `inertia/apps/user/tests/e2e/tasks/task_submission_package.spec.ts`, `inertia/apps/user/tests/modules/tasks/components/task_submission_panel.test.ts`

## Related Diagrams

- `docs/11-diagrams/Action/act_01_task_management_overview.mmd`
- `docs/11-diagrams/Action/act_01a_task_crud.mmd`
- `docs/11-diagrams/Action/act_01b_task_workflow.mmd`
- `docs/11-diagrams/Action/act_01c_task_assignment_rules.mmd`
- `docs/11-diagrams/Sequence/seq_02_task_crud.mmd`
- `docs/11-diagrams/State/state_01_task.mmd`
- `docs/11-diagrams/ERD/logical_erd_03_task_marketplace.mmd`

## What Not To Do

- Đừng audit task workflow chỉ bằng cột `tasks.status`; doing vậy rất dễ kết luận sai.
- Đừng kể `PATCH /api/tasks/board-state` như thể đó là workflow engine duy nhất hoặc canonical nhất.
- Đừng giả định mọi task sang `DONE` đều cần submission giống nhau; code hiện có nhánh bypass theo task type.
- Đừng quên nhánh permissive default khi org chưa cấu hình workflow transitions, vì đây là nguồn gây nhầm lẫn rất thực tế khi debug.

## Boundary

Tài liệu này không khẳng định:

- mọi task APIs đã canonicalized hoàn chỉnh sang `/api/v1/*`
- board-state POC đã là workflow engine hoàn chỉnh
- physical DB constraint nào cũng đã khớp 100% với mọi product expectation trong mọi tài liệu cũ

File này chỉ khẳng định những gì đã có route, command, controller, model, hoặc test proof đủ mạnh trong hệ thống hiện tại.

## Khi Nào Dừng Ở File Này

Bạn có thể dừng ở file này nếu mục tiêu của bạn là:

- hiểu task workflow và submission của Suar mà không mở code
- viết report phần delivery core, workflow, và completion package
- khoanh vùng nhanh incident liên quan status, kanban move, submission lock, hoặc audit trail
- phân biệt đúng giữa workflow truth mới và compatibility layer cũ

Bạn không cần mở thêm file nào nếu bốn mục trên đã đủ cho câu hỏi của bạn.

Chỉ đọc thêm khi bạn cần một lát cắt khác hẳn:

- cần API inventory đầy đủ hơn theo namespace: mở `../../06-data/api-specification.md`
- cần business feature landscape toàn sản phẩm: mở `../feature-specification.md`
- cần flow hoặc state trực quan: mở `../../11-diagrams/README.md`
