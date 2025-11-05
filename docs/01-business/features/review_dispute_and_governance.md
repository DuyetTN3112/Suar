# Review, Dispute, Và Governance

## Mục đích

Tài liệu này gom phần business truth đã được kiểm chứng cho domain review của Suar:

- review session sau completed work
- task review workflow board sau delivery-done work
- sprint review packages
- sprint-close reverse review board
- dispute room giữa các bên liên quan
- escalation lên system admin
- case file và AI evaluation
- trạng thái hiện tại của reverse review

Mục tiêu của file này là để người đọc ngoài repo vẫn hiểu được:

- domain review đang vận hành ra sao
- đâu là flow đang active thật
- đâu là flow compatibility
- đâu là flow đã bị product-deprecate

## Một Câu Tóm Tắt Ngắn

Suar không xem review là bước trang trí sau task.

Review trong Suar là chỗ biến completed work thành kết luận năng lực có thể bị challenge, được điều tra, rồi mới đủ sạch để đi tiếp vào profile và governance.

## Nếu Bạn Chỉ Có 5 Phút

Chỉ cần nhớ sáu ý:

1. Review chỉ thật sự có nghĩa sau completed work và có thể bị challenge bằng dispute, chứ không phải kết luận một chiều.
2. Task review board là workflow governance riêng cho delivery-done task; nó không thay thế task delivery status và cũng không phải `review_sessions` đổi tên.
3. Sprint-close reverse review là flow mới thay task-level reverse review creation; sprint review packages vẫn giữ record review đã submit.
4. `/org/disputes` hiện là organization-scoped queue cho `approved member` trong org active, không nên bị kể như một org-admin console thuần túy.
5. Report lên admin không phải nút skip nhanh; với review dispute truyền thống runtime đòi hỏi trao đổi hai phía trước khi dispute sang `admin_reviewing`.
6. Workflow tables mới là storage/index layer; business invariants như quorum, transition, duplicate prevention, và permission nằm ở commands/queries.

Nếu đang gấp:

- lỗi task review board: đọc phần `Task Review Workflow Board`
- lỗi sprint close/reverse board: đọc phần `Sprint Review Packages Và Sprint-Close Reverse Review`
- lỗi dispute queue hoặc quyền xem: đọc phần `Review Dispute`
- lỗi escalation hoặc AI callback: đọc phần `Escalation Lên Admin` và `Case File Và AI Evaluation`
- người đọc đang nhầm reverse review còn active: đọc phần `Reverse Review`

## Mental Model

Đọc domain này theo 7 nấc:

1. completed work tạo điều kiện mở review session
2. delivery-done task xuất hiện trên task review board nếu còn review governance debt
3. reviewer submit review và reviewee có quyền confirm hoặc challenge
4. nếu challenge, dispute room gom comment, evidence, và task context
5. nếu dispute chưa giải quyết được ở mức các bên liên quan, reviewee có thể report lên admin
6. sprint close chỉ mở reverse review khi task review debt của sprint đã `done`
7. admin đọc case file, có thể dùng AI evaluation như input phụ, rồi ra quyết định

Một câu nhớ ngắn:

`Review tạo kết luận. Dispute bảo vệ khỏi kết luận vội. Governance quyết định kết luận nào đủ sạch để tin.`

## Review Session Và Skill Review

### Mục tiêu

Biến công việc đã hoàn thành thành đánh giá có cấu trúc, thay vì chỉ để lại trạng thái done.

### Surface đã xác nhận

- `GET /reviews/pending`
- `GET /reviews/:reviewId`
- `POST /reviews/:reviewId/submit`
- `POST /reviews/:reviewId/confirm`
- `GET /reviews/:reviewId/evidences`
- `POST /reviews/:reviewId/evidences`
- `GET /reviews/:reviewId/self-assessment`
- `POST /reviews/:reviewId/self-assessment`
- `POST /api/reviews/sessions`
- `POST /api/v1/reviews/sessions`

### Data và signals đã xác nhận

- `review_sessions`
- `skill_reviews`
- `review_evidences`
- `task_self_assessments`
- dimension signals như quality, timeliness, requirement adherence, communication, code quality, proactiveness

Nguồn: `start/routes/reviews.ts`, `app/modules/reviews/infra/models/review_session.ts`, `app/modules/reviews/tests/backend/integration/create_session.spec.ts`, `app/modules/reviews/tests/backend/integration/submit_review.spec.ts`, `app/modules/reviews/tests/backend/integration/confirm_review.spec.ts`

### Review Session Được Mở Khi Nào

Đây là chỗ rất dễ bị kể sai nếu chỉ nhìn một phần code.

Runtime hiện có hai đường mở review session:

- đường chính trong task delivery flow: assignee submit completion package, command đưa task sang `in_review` và `ensureReviewSession()` ngay nếu assignment active chưa có session
- đường backstop theo event: khi task thật sự đi vào category `done`, listener sẽ complete active assignment rồi phát event để tạo review session còn thiếu

Vì vậy:

- không nên mô tả review như thể chỉ xuất hiện sau khi task đã `DONE`
- cũng không nên mô tả submit completion package như chỉ lưu report mà chưa đụng tới review governance

Nguồn: `app/modules/tasks/actions/commands/submit_task_submission_command.ts`, `app/modules/tasks/actions/listeners/task_completion_listener.ts`, `app/modules/reviews/actions/listeners/assignment_completion_listener.ts`

### Reviewer Assignment Governance

Một review session mới không chỉ tạo record session trống.

Code audit hiện cho thấy runtime còn seed reviewer assignments khá rõ:

- `creator_required` là reviewer ưu tiên đầu tiên
- nếu creator reviewer bị trùng reviewee hoặc không dùng được, runtime fallback qua `assigned_by`, `project owner`, `project manager`, rồi owner/admin khác trong organization
- tiếp theo hệ thống nạp `manager_required` và `peer_required` theo minimum quotas
- cuối cùng có thể thêm `manager_optional` và `peer_optional` làm reviewer dự phòng

Điều này giải thích vì sao:

- cùng một task nhưng reviewer list không chỉ dựa vào `task.creator_id`
- review governance của Suar mang tính cấu trúc nhiều hơn review comment tự do

Nguồn: `app/modules/reviews/actions/support/review_session_reviewer_assignments.ts`, `app/modules/reviews/tests/backend/integration/create_session.spec.ts`, `app/modules/tasks/tests/backend/contract/task_submission_api_standardization.contract.spec.ts`

## Task Review Workflow Board

### Mục tiêu

Tách trạng thái review/governance khỏi trạng thái delivery của task.

Một task delivery-done vẫn ở Task Board `done`, nhưng cũng có thể xuất hiện ở Review Board để thể hiện review debt, reviewer quorum, reviewee response, dispute/report, và completion.

### Surface đã xác nhận

Page:

- `GET /reviews/task-board`
- `GET /org/reviews/task-board`

Actions:

- `POST /task-reviews/tasks/:taskId/reviews`
- `POST /task-reviews/:workflowId/accept`
- `POST /task-reviews/:workflowId/respond`
- `POST /task-reviews/:workflowId/report`

### Data và workflow đã xác nhận

- `task_review_workflows`
- `task_review_reviewers`
- `task_review_messages`

Workflow columns:

1. `awaiting_review`
2. `in_review`
3. `awaiting_response`
4. `disputed`
5. `reported`
6. `done`

Admin/AI-only persisted statuses:

- `ai_reviewing`
- `resolved`

Legacy persisted value `reviewed` được migration normalize thành `in_review`.

### Sự thật runtime quan trọng

- workflow row được ensure khi reviewer đầu tiên submit review cho task
- submit page controller gọi `EnsureTaskReviewWorkflowCommand` trước `SubmitTaskReviewCommand`; board query không tự tạo workflow row và sprint-close gate hiện chỉ đếm các workflow row đã tồn tại
- reviewer bắt buộc gồm task giver nếu không trùng reviewee, sau đó thêm reviewer đủ điều kiện từ project/org theo priority
- reviewee không thể review task của chính mình
- workflow cần ít nhất hai reviewer đủ điều kiện; không đủ reviewer thì command fail thay vì tự giảm quorum
- reviewer submit lần đầu sẽ chuyển workflow sang `in_review` hoặc `awaiting_response` tùy quorum đã đủ chưa
- reviewee chỉ được accept khi completed review count đã đạt required review count
- reviewee response tạo message `reviewee_response` và chuyển workflow sang `disputed`
- UI chỉ expose report khi workflow đang `disputed`; backend report command hiện actor-guard reviewer/reviewee nhưng không tự state-guard `disputed`
- khi report thành công, workflow chuyển `reported` và ghi `reported_by/reported_at`
- reported workflow có thể đi vào AI advisory path (`ai_reviewing`) hoặc system-admin resolution (`resolved`)
- frontend hiện có user/org task-board page riêng, nhưng mutation controllers redirect về `/reviews/task-board`; org-shell post-action retention là frontend caveat, chưa được chứng minh đầy đủ

Điểm phải viết đúng:

- `task_review_workflows` là projection/governance workflow riêng, không phải source duy nhất của skill score
- `review_sessions` vẫn tồn tại cho skill/performance review; task review board là lớp điều phối trạng thái và thread quanh task
- workflow table mới không dùng DB FK/check/unique business constraints làm source rule; command/query mới là nơi chốt rule

Nguồn: `start/routes/reviews.ts`, `database/migrations/20260715090000_create_task_review_workflows.ts`, `database/migrations/20260715110000_remove_review_workflow_db_constraints.ts`, `database/migrations/20260715120000_normalize_task_review_in_review_status.ts`, `app/modules/reviews/domain/task_review_workflow.ts`, `app/modules/reviews/controllers/submit_task_review_workflow_controller.ts`, `app/modules/reviews/actions/commands/ensure_task_review_workflow_command.ts`, `app/modules/reviews/actions/commands/submit_task_review_command.ts`, `app/modules/reviews/actions/commands/accept_task_review_command.ts`, `app/modules/reviews/actions/commands/respond_to_task_review_command.ts`, `app/modules/reviews/actions/commands/report_task_review_dispute_command.ts`, `inertia/apps/user/modules/reviews/task-board.svelte`, `inertia/apps/org/modules/reviews/task-board.svelte`, `inertia/apps/user/tests/e2e/reviews/task_review_board_demo.spec.ts`, `inertia/apps/org/tests/e2e/org/org_workspace_navigation_smoke.spec.ts`

## Review Dispute

### Mục tiêu

Cho phép người nhận review challenge kết luận đang có, thay vì để review trở thành chân lý một chiều.

### Surface đã xác nhận

Page:

- `GET /reviews/disputes/:disputeId`
- `GET /org/disputes`

Canonical APIs:

- `POST /api/v1/reviews/disputes`
- `GET /api/v1/reviews/disputes/:disputeId/comments`
- `POST /api/v1/reviews/disputes/:disputeId/comments`
- `GET /api/v1/reviews/disputes/:disputeId/evidences`
- `POST /api/v1/reviews/disputes/:disputeId/evidences`
- `POST /api/v1/reviews/disputes/:disputeId/report`
- `GET /api/v1/me/organizations/current/reviews/disputes`
- `POST /api/v1/me/organizations/current/reviews/disputes/:disputeId/respond`

Compatibility APIs:

- `POST /api/reviews/disputes`
- `GET /api/reviews/disputes/:disputeId/comments`
- `POST /api/reviews/disputes/:disputeId/comments`
- `GET /api/reviews/disputes/:disputeId/evidences`
- `POST /api/reviews/disputes/:disputeId/evidences`
- `POST /api/reviews/disputes/:disputeId/report`
- `GET /api/org/reviews/disputes`
- `POST /api/org/reviews/disputes/:disputeId/respond`

### Sự thật runtime quan trọng

- dispute room không chỉ giữ exchange của dispute
- user dispute page còn tải thêm task comments liên quan
- dispute detail page không chỉ dành cho đúng hai người reviewee và reviewer; access context hiện còn công nhận `org_owner`, `org_admin`, `project_manager`, và `system_admin` là participant hợp lệ trong đúng case phù hợp
- org dispute queue đã có proof mạnh ở route, controller, query access, cursor pagination, search safety, và E2E page behavior
- route page `/org/disputes` hiện nằm trong group `auth + requireOrg`, không đi qua `requireOrgAdmin()`
- query org dispute queue hiện còn tự kiểm tra actor phải là `approved member` của organization đang active

Điều này rất quan trọng:

- tên route `/org/disputes` không tự động có nghĩa đây là màn chỉ dành cho org admin
- boundary thật hiện tại gần hơn với “organization-scoped workspace queue cho approved member trong org” so với “admin console của org”
- nếu sau này product muốn siết hẹp hơn, docs phải cập nhật theo code mới chứ không được giữ mental model cũ

Nguồn: `start/routes/reviews.ts`, `app/modules/reviews/controllers/show_user_dispute_controller.ts`, `app/modules/reviews/controllers/show_org_disputes_page_controller.ts`, `app/modules/reviews/actions/queries/list_org_review_disputes_query.ts`, `app/modules/reviews/tests/backend/integration/org_dispute_queue_access.spec.ts`, `inertia/apps/org/tests/e2e/reviews/org_dispute_queue.spec.ts`, `inertia/apps/org/tests/e2e/reviews/org_dispute_queue_flow.spec.ts`

## Escalation Lên Admin

### Điều kiện business hiện thấy

Reviewee không report dispute lên admin một cách tùy ý.

Code hiện cho thấy escalation chỉ hợp lệ khi:

- reviewee là người đang đứng tên dispute
- dispute chưa ở trạng thái `resolved`, `rejected`, `admin_reviewing`, hoặc `ai_reviewing`
- đã có trao đổi từ phía reviewee
- đã có trao đổi từ phía counterparty

Điều này có nghĩa:

- admin escalation là bước governance sau khi hai phía đã có trao đổi thật
- không phải nút “skip discussion”
- reviewee không thể bỏ qua dispute-room exchange để nhảy thẳng sang admin
- escalation hiện là bước chuyển trạng thái rõ ràng từ dispute room sang admin handling, không phải chỉ là gắn cờ mềm

Nguồn: `app/modules/reviews/controllers/show_user_dispute_controller.ts`, `app/modules/reviews/tests/backend/integration/review_disputes_api_standardization.spec.ts`

### Khi report thành công, hệ thống làm gì

Evidence hiện tại cho thấy hệ thống sẽ:

- đổi dispute sang `admin_reviewing`
- lưu `escalation_reason`
- build `review_dispute_case_files`
- snapshot cả dispute claim, task comments, và evidences
- tạo notification cho system admin

Một nuance runtime rất đáng nhớ:

- build case file hiện không phải bước rời rạc chạy rất lâu sau đó
- command hiện đổi status sang `admin_reviewing` và build case file ngay trong cùng transaction DB, rồi mới đi tiếp sang audit/notification
- điều này làm cho admin flow đáng tin hơn khi incident vừa xảy ra: nếu report thành công, kỳ vọng an toàn là dispute status và dossier snapshot đã đi cùng nhau

Điều này rất quan trọng cho incident hoặc audit vì nó cho thấy admin không đang điều tra “một comment lẻ”, mà đang điều tra một dossier có snapshot.

Nguồn: `app/modules/reviews/actions/commands/report_review_dispute_command.ts`, `app/modules/reviews/tests/backend/integration/review_disputes_api_standardization.spec.ts`

## Case File Và AI Evaluation

### Mục tiêu

Cho admin một dossier đủ ngữ cảnh để quyết định, và cho AI đóng vai trò phụ trợ chứ không tự thay admin ra quyết định.

### Phải Hiểu Đúng Thứ Tự Runtime

Không nên hiểu flow này theo kiểu:

`vừa tạo dispute xong là hệ thống tự build case file và tự gọi AI ngay`

Evidence từ code hiện tại mạnh hơn cho thấy thứ tự an toàn là:

1. reviewee mở dispute
2. các bên trao đổi trong dispute room, thêm comment/evidence
3. nếu đủ điều kiện, reviewee report dispute lên admin
4. hệ thống chuyển dispute sang `admin_reviewing` và build case file
5. system admin có thể chủ động tạo thêm case file mới hoặc start AI evaluation
6. AI callback chỉ trả advisory result về lại cho admin flow

Nghĩa là:

- case file và AI evaluation thuộc pha governance/admin handling
- chúng không phải side effect tự động, vô điều kiện, ngay tại thời điểm dispute vừa được tạo

### Surface đã xác nhận

Admin pages:

- `GET /admin/disputes`
- `GET /admin/disputes/:disputeId`
- `GET /admin/disputes/ai-operator`

Admin APIs:

- `GET /api/admin/reviews/disputes`
- `GET /api/admin/reviews/disputes/:disputeId`
- `POST /api/admin/reviews/disputes/:disputeId/resolve`
- `GET /api/admin/reviews/disputes/:disputeId/case-files`
- `POST /api/admin/reviews/disputes/:disputeId/case-files`
- `GET /api/admin/reviews/disputes/:disputeId/ai-evaluations`
- `POST /api/admin/reviews/disputes/:disputeId/ai-evaluations`

Public callback:

- `POST /api/public/ai-disputes/callback`
- `POST /api/public/ai/dispute-evaluations/callback`

### Sự thật runtime quan trọng

- AI callback hiện dùng credential cấu hình sẵn
- callback kiểm tra freshness window
- callback kiểm tra request authenticity theo payload chuẩn hóa
- callback chỉ xử lý tiếp evaluation còn ở `queued` hoặc `processing`
- callback hợp lệ sẽ update `ai_dispute_evaluations`
- nếu dispute đang ở `ai_reviewing`, callback sẽ kéo về `admin_reviewing`
- AI start hiện còn có thể fail ngay ở bước trigger external service; khi đó evaluation bị cập nhật `failed` thay vì đi tiếp như queued-processing bình thường
- AI operator page hiện còn tự tổng hợp provider metrics, và current runtime đang gộp cả `failed` lẫn `cancelled` vào cùng bucket `failed`

Điều này cho thấy AI evaluation là advisory loop quay về cho admin, không phải trạng thái tự đóng vụ việc.

Nguồn: `app/modules/reviews/controllers/ai_dispute_callback_controller.ts`, `app/modules/reviews/actions/commands/process_ai_dispute_callback_command.ts`, `app/modules/reviews/tests/backend/integration/ai_dispute_callback.spec.ts`

## Sprint Review Packages Và Sprint-Close Reverse Review

### Mục tiêu

Đưa review môi trường làm việc và review người giao task về đúng mốc sprint-close, thay vì ép người dùng tạo reverse review ngay sau từng task.

### Surface đã xác nhận

Project sprint review APIs:

- `POST /api/v1/projects/:projectId/sprints/:sprintId/open-review`
- `POST /api/v1/project-sprints/:sprintId/close-review`
- `POST /api/v1/project-sprints/:sprintId/close-review-period`
- `POST /api/v1/project-sprints/:sprintId/expire-pending-review-packages`
- `GET /api/v1/sprint-review-packages/:packageId`
- `POST /api/v1/sprint-review-packages/:packageId/submit`
- `POST /api/v1/sprint-review-packages/:packageId/disputes`
- `POST /api/v1/sprint-review-disputes/:disputeId/comments`
- `POST /api/v1/sprint-review-disputes/:disputeId/report`

User package APIs:

- `GET /api/v1/me/sprint-review-packages`
- `GET /api/v1/me/sprint-review-packages/pending`

Compatibility APIs under `/api/*` still exist for the same sprint-review package actions.

Boundary note:

- sprint planning/backlog lives in `app/modules/sprints`
- sprint review package, close-period gate, dispute, and sprint reverse workflow live in `app/modules/reviews`
- `project_sprints.goal` belongs to planning context; it is carried through review surfaces only as context, not as review evidence itself

### Data và records đã xác nhận

- `project_sprints`
- `sprint_review_packages`
- `sprint_manager_reviews`
- `sprint_environment_reviews`
- `sprint_review_disputes`
- `sprint_review_dispute_comments`
- `sprint_reverse_review_workflows`
- `sprint_reverse_review_messages`

### Project sprint lifecycle

Domain rule hiện cho phép transition:

```text
draft -> active -> review_open -> review_closed -> archived
```

Khi project owner/manager mở sprint review:

1. command kiểm tra actor có quyền manage sprint
2. command chặn nếu sprint trước còn reverse-review workflow chưa `done`
3. command chặn nếu các task review workflow row đã tồn tại cho task trong sprint hiện tại còn chưa `done`
4. command chuyển sprint sang `review_open`
5. command tạo `sprint_review_packages` cho các reviewer có task evidence trong sprint
6. command tạo `sprint_reverse_review_workflows` cho assigner targets và environment target
7. command tạo sprint kế tiếp ở trạng thái `active`

Điểm quan trọng:

- reviewer eligibility đến từ task work evidence trong sprint, không phải membership-only
- người ngoài project/org vẫn có thể thành reviewer nếu họ thật sự worked on sprint task
- member không có task evidence không tự động có workflow review

Nguồn: `app/modules/reviews/actions/commands/close_project_sprint_review_command.ts`, `app/modules/reviews/domain/sprint_review_rules.ts`, `app/modules/reviews/tests/backend/integration/close_project_sprint_review_command.spec.ts`, `app/modules/reviews/tests/backend/integration/sprint_reverse_review_board.spec.ts`

### Sprint review package

`sprint_review_packages` là submitted review/audit record.

Khi package được submit:

- reviewer phải là package reviewer
- sprint phải đang `review_open`
- rating phải là integer `1..5`
- environment review bắt buộc có cả target `project` và `organization`
- manager review target không được là reviewer chính họ
- manager target phải được resolve từ evidence: assigner/creator, project manager, project owner, hoặc role tương ứng
- sau khi hợp lệ, runtime ghi `sprint_manager_reviews`, `sprint_environment_reviews`, rồi chuyển package sang `submitted`

Nguồn: `app/modules/reviews/actions/commands/submit_sprint_review_package_command.ts`, `app/modules/reviews/domain/sprint_review_rules.ts`

## Reverse Review

### Điều phải hiểu thật rõ

Task-level reverse review hiện đã bị product-deprecate. Sprint-close reverse review board là flow thay thế đã được triển khai.

Nói ngắn:

- các màn reverse review để đọc dữ liệu vẫn còn
- nhưng flow tạo reverse review mới từ một task review session đã bị tắt
- khi sprint đóng và mở review, hệ thống dùng hai board reverse review mới: board người giao task và board môi trường

### Evidence hiện tại

Route/page surfaces đọc dữ liệu vẫn còn:

- `GET /reviews/reverse-reviews`
- `GET /org/reverse-reviews`
- `GET /admin/reverse-reviews`
- `GET /api/me/reverse-reviews`
- `GET /api/v1/me/reverse-reviews`
- `GET /api/org/reverse-reviews`
- `GET /api/v1/me/organizations/current/reverse-reviews`
- `GET /api/admin/reverse-reviews`

Sprint-close reverse review board hiện có:

- `GET /reviews/sprint-reverse-board`
- `GET /org/reviews/sprint-reverse-board`
- `POST /sprint-reverse-reviews/:workflowId/submit`
- `POST /sprint-reverse-reviews/:workflowId/accept`
- `POST /sprint-reverse-reviews/:workflowId/respond`
- `POST /sprint-reverse-reviews/:workflowId/report`

Hai board dùng chung lane trạng thái chính: `awaiting_review`, `in_review`, `awaiting_response`, `disputed`, `reported`, `done`. Admin/AI handling path còn dùng persisted status `ai_reviewing` và `resolved`. Luồng reverse hiện là single-review nên thường đi từ `awaiting_review` sang `awaiting_response`; lane `in_review` tồn tại để nhất quán với task review board và dành cho multi-review reverse rules sau này.

Board hiện tách hai section:

- `assigner`: worker review người giao/tạo task cho họ trong sprint, card có related sprint tasks
- `environment`: worker review môi trường làm việc chung, responder ưu tiên project owner, project manager, org owner, rồi org admin

Nuance dễ nhầm:

- sprint review package submit bắt buộc environment review cho cả target `project` và `organization`
- sprint reverse workflow board hiện chỉ tạo một environment workflow card với `target_entity_id = organization_id`; card này đại diện môi trường chung, không phải hai card project/org riêng
- frontend hiện có user/org sprint-reverse-board page riêng, nhưng mutation controllers và một số back-links redirect về `/reviews/sprint-reverse-board`; org-shell post-action retention là caveat

Action rules hiện tại:

- reviewer submit reverse review khi workflow `awaiting_review`, rating `1..5`, comment bắt buộc
- submit ghi vào `sprint_manager_reviews` hoặc `sprint_environment_reviews` và đưa workflow sang `awaiting_response`
- reviewer hoặc responder có thể accept khi workflow `awaiting_response` hoặc `disputed`, đưa sang `done`
- reviewer hoặc responder response sẽ đưa workflow sang `disputed` trừ khi workflow đã `done` hoặc `reported`
- chỉ workflow `disputed` mới report được, report đưa sang `reported`
- report sẽ queue AI evaluation nếu automation actor tồn tại; external trigger thành công đưa workflow sang `ai_reviewing`
- AI callback hoàn tất sẽ kéo `ai_reviewing` về `reported` để admin xử lý; system admin resolve từ `reported` hoặc `ai_reviewing` sang `resolved`

Surface submit cũ vẫn tồn tại như compatibility shell:

- `POST /reviews/:reviewId/reverse`
- `POST /api/review-sessions/:sessionId/reverse-reviews`

Nhưng command/controller hiện tại đều chặn và trả thông điệp:

- `Reverse review theo task đã tắt. Hãy dùng reverse review ở thời điểm kết thúc sprint.`

Nguồn: `start/routes/reviews.ts`, `app/modules/reviews/actions/commands/submit_reverse_review_command.ts`, `app/modules/reviews/controllers/submit_reverse_review_controller.ts`, `app/modules/reviews/tests/backend/integration/reverse_review_target_guards.spec.ts`, `app/modules/reviews/tests/backend/integration/review_inherited_data_api_standardization.spec.ts`

Nguồn sprint-close workflow: `app/modules/reviews/domain/sprint_reverse_review_workflow.ts`, `app/modules/reviews/actions/queries/get_sprint_reverse_review_board_query.ts`, `app/modules/reviews/actions/commands/submit_sprint_reverse_review_workflow_command.ts`, `app/modules/reviews/actions/commands/accept_sprint_reverse_review_workflow_command.ts`, `app/modules/reviews/actions/commands/respond_sprint_reverse_review_workflow_command.ts`, `app/modules/reviews/actions/commands/report_sprint_reverse_review_workflow_command.ts`

Một nuance route/page khá quan trọng:

- web reverse-review pages hiện không phải một shell duy nhất tự chia scope ở chỗ khác
- controller đang suy scope trực tiếp từ URL:
  - `/reviews/reverse-reviews` -> `me`
  - `/org/reverse-reviews` -> `org`
  - `/admin/reverse-reviews` -> `admin`
- rồi render ra ba page shells khác nhau tương ứng

### Cách viết an toàn trong docs hoặc report

Bạn có thể viết:

- Suar vẫn duy trì reverse-review reading surfaces để đọc dữ liệu hiện có.
- Product direction hiện đã tắt việc tạo reverse review mới ở level từng task và chuyển sang sprint-close reverse review board.
- Sprint-close reverse review có hai board: người giao task và môi trường.

Bạn không nên viết:

- người dùng hiện có thể tạo reverse review bình thường từ từng task
- reverse review task-level đang là flow active đầy đủ tương đương dispute

## Vai Trò Và Trách Nhiệm

### Reviewee

- xem review của mình
- thêm evidence hoặc self-assessment nếu flow yêu cầu
- mở dispute
- tham gia trao đổi trong dispute room
- report lên admin khi dispute đủ điều kiện escalation

### Counterparty hoặc org-side responder

- tham gia phản hồi dispute trong org context
- bổ sung lập luận hoặc evidence

Code audit note:

- phản hồi dispute hợp lệ không tự động yêu cầu actor là org admin
- command hiện dựa vào `loadReviewDisputeAccessContext` + policy `canRespondToReviewDispute(...)`
- actor có thể là reviewer, org owner, org admin, project manager, hoặc system admin
- reviewee là participant của dispute room nhưng không phải nhánh `canRespond` cho org-side response
- lần phản hồi hợp lệ đầu tiên có thể đẩy dispute từ `pending` sang `collecting_evidence`

Điểm này rất dễ bị hiểu sai nếu chỉ nhìn UI:

- `được xem dispute detail` và `được dùng org-side respond action` không phải cùng một quyền
- reviewee có thể là participant hợp lệ để đọc dispute và report lên admin khi đủ điều kiện
- nhưng nhánh respond ở org queue hiện được thiết kế cho reviewer / org-side / admin actor, không phải cho reviewee tự trả lời chính mình qua cùng action đó

### System admin

- xem dispute queue toàn hệ thống
- đọc dispute detail và investigation timeline
- xem/bật case file
- kích hoạt hoặc đọc AI evaluation
- resolve dispute

## Nếu Production Lỗi Ở Domain Này

Khoanh nhanh theo dấu hiệu:

- không mở được org dispute queue: kiểm tra route org, organization context, approved membership access, pagination/filter inputs
- user dispute page thiếu dữ liệu: kiểm tra detail query, comment/evidence loaders, task-comment snapshot path
- report dispute không lên admin: kiểm tra exchange preconditions, case-file build, notification side effect, dispute status đã còn active hay chưa
- AI callback không ăn: kiểm tra credential tích hợp, freshness/signature, evaluation status hiện tại có còn `queued/processing` không, dispute status transition
- AI evaluation start xong nhưng không chạy tiếp: kiểm tra external trigger path, callback URL config, và credential cho external service
- reverse review submit không chạy: đây có thể không phải bug; trước hết xác nhận đó không phải hành vi bị deprecate theo product direction

## Related Diagrams

- `docs/11-diagrams/Action/act_03_review_overview.mmd`
- `docs/11-diagrams/Action/act_03a_review_submit.mmd`
- `docs/11-diagrams/Action/act_03b_review_confirm.mmd`
- `docs/11-diagrams/Action/act_03d_review_dispute_lifecycle.mmd`
- `docs/11-diagrams/Sequence/seq_04c_review_dispute_admin_resolution.mmd`
- `docs/11-diagrams/State/state_02b_task_review_workflow.mmd`
- `docs/11-diagrams/State/state_02c_sprint_reverse_review_workflow.mmd`
- `docs/11-diagrams/State/state_08b_project_sprint_review.mmd`
- `docs/11-diagrams/State/state_02_review_session.mmd`
- `docs/11-diagrams/State/state_06_flagged_review.mmd`
- `docs/11-diagrams/ERD/logical_erd_04_review_messaging.mmd`

## What Not To Do

- Đừng viết review như thể cứ submit xong là trở thành kết luận cuối cùng không thể challenge.
- Đừng nhìn prefix `/org/` rồi kết luận ngay đây là surface chỉ dành cho org admin; với `/org/disputes`, truth hiện tại tinh tế hơn vậy.
- Đừng mô tả AI evaluation như máy tự xử án; nó đang là advisory loop quay về cho admin handling.
- Đừng viết task-level reverse review như flow đang active bình thường, vì code hiện tại đang chặn create path đó.
- Đừng dùng `docs/superpowers/specs/*` hoặc `plans/*` làm truth nếu route/model/command hiện tại đã khác. Những file đó giúp tìm intent, không tự chốt runtime.
- Đừng nói database enforce toàn bộ relationship/rule của workflow tables mới; migration mới cố ý bỏ FK/check/unique business constraints và để application layer validate.

## Boundary

Tài liệu này không cố khẳng định:

- AI evaluation tự động ra quyết định thay admin
- mọi moderation/admin surface đã có proof E2E ngang nhau

File này chỉ khẳng định những gì đã có route, command, controller, query, hoặc test proof đủ mạnh trong hệ thống hiện tại.

## Khi Nào Dừng Ở File Này

Bạn có thể dừng ở file này nếu mục tiêu của bạn là:

- hiểu domain review/dispute/governance của Suar mà không mở code
- viết report về review governance và moderation
- khoanh vùng nhanh incident liên quan review, dispute, escalation, hoặc AI callback
- phân biệt rõ flow nào đang active, flow nào chỉ là compatibility, và flow nào đã bị deprecate

Bạn không cần mở thêm file nào nếu bốn mục trên đã đủ cho câu hỏi của bạn.

Chỉ đọc thêm khi bạn cần đổi góc nhìn:

- cần interface inventory đầy đủ hơn theo namespace: mở `../../06-data/api-specification.md`
- cần flow hoặc state trực quan: mở `../../11-diagrams/README.md`
- cần evidence audit rộng hơn giữa docs cũ và code hiện tại: mở `../../12-evidence/workstream-status-audit.md`
