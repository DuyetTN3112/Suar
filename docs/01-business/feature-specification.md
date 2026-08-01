# Feature Specification

| Field           | Value                                                                                                                             |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Status          | Active                                                                                                                            |
| Audience        | Product, developer, tester, reviewer, new joiner cần hiểu từng capability lớn của sản phẩm                                        |
| Purpose         | Mô tả các feature đã có bằng chứng triển khai thật trong hệ thống theo cách gần người hơn nhưng vẫn bám route/model/runtime truth |
| Source of Truth | routes, models, controllers, commands, tests, SQL/schema evidence hiện tại                                                        |
| Last Reviewed   | 2026-07-10                                                                                                                        |
| Review Cycle    | Khi feature surface, data model, hoặc role boundary đổi                                                                           |
| Owner           | Product + engineering                                                                                                             |
| Stale Risk      | Cao                                                                                                                               |

## File Này Dùng Để Làm Gì

Nếu BRD/PRD trả lời “Suar đang giải bài toán gì”, thì file này trả lời:

- sản phẩm đang có những feature lớn nào thật
- mỗi feature đang phục vụ ai
- feature đó đi qua route/data nào
- giới hạn hiện biết của feature nằm ở đâu

## Cách Đọc

Đừng cố nhớ hết mọi route.

Mỗi feature bên dưới được viết theo bốn câu hỏi thực dụng:

1. Feature này để làm gì.
2. Ai dùng nó.
3. Surface runtime thật nằm ở đâu.
4. Có caveat gì cần nhớ.

Nếu bạn đọc file này theo vai trò:

- manager/new joiner: chỉ cần đọc tên feature + “để làm gì”
- QA/tester: đọc thêm “surface runtime” + “caveat”
- dev: đọc thêm “data/runtime anchors”

## Nếu Bạn Chỉ Có 5 Phút

Chỉ cần nhớ bốn ý:

1. File này trả lời feature lớn nào đang có thật trong runtime hiện tại.
2. Mỗi feature nên được hiểu qua bốn câu hỏi: để làm gì, ai dùng, surface nào thật, caveat nào cần nhớ.
3. `task`, `review/dispute`, `profile/marketplace`, và `organization/project workspace` là bốn cụm nên ưu tiên hiểu trước.
4. Nếu một feature nghe giống roadmap/ý tưởng nhưng file không chỉ ra route/data/runtime anchor đủ rõ, đừng mô tả nó như current truth.

Nếu đang gấp:

- muốn hiểu delivery core: đọc `Feature 4` và `Feature 5`
- muốn hiểu sourcing/profile: đọc `Feature 8`, `Feature 10`, `Feature 11`
- muốn hiểu governance/dispute: đọc `Feature 7` và `Feature 9`

## Nếu Dùng File Này Để Viết Report Bên Ngoài Repo

Bạn có thể dùng file này để viết:

- chương phân tích chức năng
- phần liệt kê feature/capability đang có thật
- phần actor-feature mapping
- phần caveat sản phẩm hoặc hạn chế hiện tại

Đây là file phù hợp để trả lời:

- hệ thống hiện có những feature lớn nào
- mỗi feature phục vụ ai
- feature đó đang bám vào surface runtime nào

Nhưng file này không tự động chứng minh:

- mọi feature đã hoàn thiện tuyệt đối
- mọi test end-to-end đã có đầy đủ
- mọi target state trong plan/spec đã được ship

Nếu cần tăng độ chắc chắn của claim, đọc thêm:

- `../08-testing/test-case-matrix.md`
- `../05-api/api-landscape-and-governance.md`
- `../12-evidence/workstream-status-audit.md`

## What Not To Do

- không đọc tên feature rồi tự suy rằng flow đó đã hoàn thiện end-to-end nếu phần caveat đang nói ngược lại
- không trích capability/vision từ file khác rồi gắn vào đây như thể đã là runtime feature
- không dùng một feature section để suy ra toàn bộ rule chi tiết nếu file đã chỉ sang deep-dive domain khác

## Feature 1: OAuth Authentication

### Feature này để làm gì

Cho phép người dùng vào hệ thống bằng social login thay vì local password flow.

### Ai dùng

- user chưa đăng nhập
- user đã đăng nhập muốn logout

### Surface runtime

- `GET /auth/:provider/redirect`
- `GET /auth/:provider/callback`
- `POST /logout`
- `GET /logout`

### Điều đã được xác nhận

- provider đang thấy rõ là Google và GitHub
- redirect/callback có login throttling
- session guard dùng `web`
- social login gắn với `user_oauth_providers`

### Điều chưa nên nói quá tay

- chưa có bằng chứng mạnh cho email/password flow riêng

Đây là feature nhỏ về surface nhưng rất lớn về tác động. Nếu auth hỏng, rất nhiều triệu chứng phía sau sẽ chỉ là hậu quả.

## Feature 2: Organization Discovery And Membership

### Feature này để làm gì

Cho phép user tạo organization, xem organization, join organization, và đổi current organization context.

Đây là lớp discovery và context entry, chưa phải toàn bộ vùng quản trị tổ chức.

### Ai dùng

- authenticated user
- organization owner/admin

### Surface runtime

- `GET /all-organizations`
- `GET /api/organizations`
- `GET /organizations/:id/join`
- `POST /organizations/:id/join`
- `GET /organizations`
- `GET /organizations/create`
- `POST /organizations`
- `GET /organizations/:id`
- `POST /organizations/:id/switch`
- `GET /organizations/switch/:id`
- `POST /switch-organization`

### Data/runtime anchors

- `organizations`
- `organization_users`
- `organization_users.status` và `organization_users.invited_by`
- `users.current_organization_id`

### Điều reader nên nhớ

- invite/join request dùng `organization_users` với `status = pending`; không có request table riêng
- switch organization là context mutation lớn hơn switch project vì nó đổi current organization ở mức user/runtime
- chi tiết độc lập hơn ở `features/organization_and_project_workspace.md`

## Feature 3: Project Lifecycle And Membership

### Feature này để làm gì

Cho phép quản lý project trong organization context, gồm tạo project, xem project, xóa project, và quản lý thành viên project.

### Ai dùng

- organization owner/admin theo policy hiện hành
- project owner/manager
- project member

### Surface runtime

- `GET /projects`
- `GET /projects/create`
- `POST /projects`
- `GET /projects/:id`
- `DELETE /projects/:id`
- `POST /projects/members`
- `PUT /projects/members/:userId`
- `DELETE /projects/members/:userId`
- `GET /projects/:id/member-candidates`
- `GET /api/v1/projects/:projectId/sprints`
- `POST /api/v1/projects/:projectId/sprints`
- `GET /api/v1/projects/:projectId/sprints/:sprintId`
- `PATCH /api/v1/projects/:projectId/sprints/:sprintId`
- `POST /api/v1/projects/:projectId/sprints/:sprintId/open-review`
- `GET /api/v1/projects/:projectId/sprint-board`
- `PATCH /api/v1/projects/:projectId/tasks/:taskId/sprint`

### Data/runtime anchors

- `projects`
- `project_members`
- `project_sprints`
- `tasks.project_sprint_id`

### Điều reader nên nhớ

- project workspace khác `org admin workspace`
- project detail đang có ở cả user shell và org shell
- `allow_external_contributors` và `approval_required_for_members` là runtime fields thật
- `POST /switch-project` chỉ đổi current project trong session và redirect về `/tasks`
- member candidates không phải dropdown user thô; payload hiện có cả reviewed-skill và dispute signals
- sprint planning sống trong `app/modules/sprints`, còn sprint review package/reverse workflow sống trong `app/modules/reviews`
- Sprint Goal là field nullable trên `project_sprints.goal`; blank goal thành `null`, goal dài hơn `2000` ký tự bị chặn
- Product Backlog được biểu diễn bằng `tasks.project_sprint_id = null`
- task chỉ move vào sprint cùng project và chỉ khi sprint `draft` hoặc `active`
- project detail có tab `Sprints`; task board chỉ link sang sprint tab, không phải full sprint management surface
- chi tiết độc lập hơn ở `features/organization_and_project_workspace.md`

## Feature 4: Task Authoring And Workflow

### Feature này để làm gì

Cho phép tạo task giàu metadata, quản lý workflow status động, và vận hành ngay trên Project Task Board. List/timeline nếu được dùng là view hoặc filter của board, không phải primary page độc lập.

### Ai dùng

- task creator
- assignee
- org admin cho workflow/status mutation

### Surface runtime

Primary page:

- `GET /projects/:projectId/tasks`

Compatibility GET entries — chỉ resolve Project rồi redirect vào board/card room/modal:

- `GET /tasks`
- `GET /tasks/create`
- `GET /tasks/:id`
- `GET /tasks/:id/edit`

Mutation/support endpoints — không chứng minh có standalone frontend page:

- `POST /tasks`
- `PUT /tasks/:id`
- `PUT /tasks/:id/status`
- `PATCH /tasks/:id/time`
- `DELETE /tasks/:id`
- `GET /tasks/:taskId/audit-logs`
- `GET /api/tasks/creation-access`
- `GET /api/tasks/status-groups`
- `GET /api/tasks/timeline-items`
- `PATCH /api/tasks/batch-status`
- `PATCH /api/tasks/:taskId/sort-order`
- `GET /api/task-statuses`
- `GET /api/workflow`
- `POST /api/task-statuses`
- `PUT /api/task-statuses/:taskStatusId`

`GET /tasks/status-board` không còn là registered primary page. Workflow/status configuration thuộc Organization Management; task delivery vẫn chỉ dùng Project Task Board.

- `PATCH /api/task-statuses/:taskStatusId`
- `DELETE /api/task-statuses/:taskStatusId`
- `PUT /api/workflow`

Task board naming note:

- `status-groups` là tên surface nên dùng khi viết tài liệu chính hoặc report bên ngoài repo
- alias cũ `grouped` chỉ nên xem là compatibility name, không nên dùng làm tên chuẩn để giải thích kiến trúc

### Data/runtime anchors

- `tasks`
- `task_statuses`
- `task_workflow_transitions`
- `task_required_skills`
- `task_requirement_versions`
- `task_requirement_version_items`
- `task_versions`

### Điều reader nên nhớ

- task ở Suar không còn là record ngắn gọn kiểu title/status đơn giản
- nó có metadata phục vụ review và matching như:
  - acceptance criteria
  - verification method
  - deliverables
  - tech stack
  - learning objectives
  - domain tags
  - autonomy level

Nếu phải chọn một feature để hiểu “Suar khác task board bình thường ở đâu”, hãy bắt đầu từ feature này.

### Caveat quan trọng

- product flow đang xử lý task như project-scoped
- nhưng snapshot SQL vẫn để `tasks.project_id` nullable
- `task_status_id` là workflow truth mới, `status` là compatibility field
- `/tasks/status-board` và các `PATCH .../board-state` POC đã retired; không được dùng chúng để dựng lại page hoặc engine song song

Nếu cần một file độc lập để hiểu trọn domain này, đọc thêm:

- `./features/task_workflow_and_submission.md`

## Feature 5: Task Submission Package

### Feature này để làm gì

Cho phép contributor lưu, nộp, và khi cần khóa gói hoàn thành công việc có thể kiểm chứng.

Đây là chỗ biến “đã làm xong” thành “có cái để review và tin”.

### Surface runtime

- `GET /api/tasks/:id/submission`
- `POST /api/tasks/:id/submission`
- `PATCH /api/tasks/:id/submission`
- `POST /api/tasks/:id/submission/submit`
- `POST /api/tasks/:id/submission/lock`
- `GET /api/task-submissions/:submissionId/evidences`
- `POST /api/task-submissions/:submissionId/evidences`
- `DELETE /api/task-submissions/:submissionId/evidences/:evidenceId`
- `GET /api/tasks/:taskId/comments`
- `POST /api/tasks/:taskId/comments`
- `PATCH /api/tasks/:taskId/comments/:commentId`
- `DELETE /api/tasks/:taskId/comments/:commentId`
- `GET /api/tasks/:taskId/attachments`
- `POST /api/tasks/:taskId/attachments`
- `DELETE /api/tasks/:taskId/attachments/:attachmentId`

### Data/runtime anchors

- `task_submissions`
- `task_submission_evidences`
- `task_comments`
- `task_attachments`

### Điều reader nên nhớ

- submission có lifecycle riêng: `draft`, `submitted`, `accepted_for_review`, `needs_changes`, `locked`
- nhiều loại task không thể sang `DONE` nếu chưa có submission hợp lệ
- `submit` và `lock` không phải cùng một việc:
  - `submit` là nhánh có side effects mạnh cho review governance
  - `lock` chỉ đóng băng package hiện có để ngăn chỉnh sửa tiếp
- evidences của submission khác attachments của task workspace nói chung

Nếu cần file domain giải thích kỹ hơn, đọc:

- `./features/task_workflow_and_submission.md`

## Feature 6: Marketplace Browse, Apply, Triage, Withdraw

### Feature này để làm gì

Cho phép staffing cho task và cho phép owner/manager triage người gửi đề xuất tham gia.

### Surface runtime

Browse/apply:

- `GET /marketplace/tasks`
- `GET /api/marketplace/tasks`
- `POST /api/v1/tasks/:taskId/apply`
- `POST /api/tasks/:taskId/apply` (compat)
- `GET /my-applications`
- `POST /applications/:id/withdraw`

Triage/ranking:

- `GET /tasks/:taskId/applications`
- `GET /api/v1/tasks/:taskId/applications/ranking`
- `GET /api/v1/tasks/:taskId/applications/:applicationId/match`
- `GET /api/tasks/:taskId/applications/ranking` (compat)
- `GET /api/tasks/:taskId/applications/:applicationId/match` (compat)
- `POST /applications/:id/process`

### Data/runtime anchors

- `task_applications`
- `task_assignments`
- `tasks.external_applications_count`

### Điều reader nên nhớ

- application statuses hiện có: `pending`, `approved`, `rejected`, `withdrawn`
- application sources hiện có: `public_listing`, `invitation`, `referral`

## Feature 7: Review Session And Skill Review

### Feature này để làm gì

Tạo vòng đánh giá năng lực sau khi công việc hoàn thành.

### Surface runtime

- `GET /projects/:projectId/reviews/tasks`
- `POST /reviews/:id/submit`
- `POST /reviews/:id/confirm`
- `GET /reviews/:id/evidences`
- `POST /reviews/:id/evidences`
- `GET /reviews/:id/self-assessment`
- `POST /reviews/:id/self-assessment`
- `POST /task-reviews/tasks/:taskId/reviews`
- `POST /task-reviews/:workflowId/accept`
- `POST /task-reviews/:workflowId/respond`
- `POST /task-reviews/:workflowId/report`
- canonical:
  - `POST /api/v1/reviews/sessions`
- compatibility/deprecated:
  - `POST /api/reviews/sessions`

### Data/runtime anchors

- `review_sessions`
- `skill_reviews`
- `review_evidences`
- `task_self_assessments`
- `task_review_workflows`
- `task_review_reviewers`
- `task_review_messages`

### Điều reader nên nhớ

- `Waiting on me`, history và detail là filter/card room/overlay trên Project Task Review Board, không phải page riêng
- review ở đây không chỉ có một điểm tổng
- hiện có các dimension như quality, timeliness, adherence, communication, code quality, proactiveness
- review session hiện không nên bị kể như chỉ sinh ra sau khi task đã `DONE`
- current runtime có hai đường mở session:
  - đường ưu tiên khi assignee submit completion package và task được đưa sang `in_review`
  - đường backstop khi task thực sự đi vào category `done`
- task delivery-done vẫn ở Task Board Done và đồng thời xuất hiện ở Task Review `awaiting_review`
- Task Review Board là projection/governance workflow riêng, với đủ tám lane `awaiting_review`, `in_review`, `awaiting_response`, `disputed`, `reported`, `ai_reviewing`, `resolved`, `done`
- đồng nghiệp, người giao việc, reviewee và project manager dùng chung một Project board theo permission; không có User/Org bản riêng
- workflow tables mới là storage-only; application command/query chốt reviewer quorum, duplicate prevention, transition, permission, và report rule

Nếu task là đầu vào, thì review là chỗ bắt đầu biến công việc thành evidence có nghĩa.

## Feature 8: Review Dispute, Flagged Review, AI Evaluation

### Feature này để làm gì

Cho phép challenge review và cho phép admin có case workflow để giải quyết.

Đây là feature giữ cho profile và assessment không bị đọc như chân lý tuyệt đối.

### Surface runtime

User realm — Project board/card-room data and actions; không có standalone `GET /reviews/disputes/:id` page:

- canonical:
  - `POST /api/v1/reviews/disputes`
  - `GET /api/v1/reviews/disputes/:disputeId/comments`
  - `POST /api/v1/reviews/disputes/:disputeId/comments`
  - `GET /api/v1/reviews/disputes/:disputeId/evidences`
  - `POST /api/v1/reviews/disputes/:disputeId/evidences`
  - `GET /api/v1/me/organizations/current/reviews/disputes`
  - `POST /api/v1/me/organizations/current/reviews/disputes/:disputeId/respond`
- compatibility/deprecated:
  - `POST /api/reviews/disputes`
  - `GET /api/reviews/disputes/:disputeId/comments`
  - `POST /api/reviews/disputes/:disputeId/comments`
  - `GET /api/reviews/disputes/:disputeId/evidences`
  - `POST /api/reviews/disputes/:disputeId/evidences`
  - `POST /api/org/reviews/disputes/:disputeId/respond`

Admin:

- `GET /api/admin/reviews/disputes`
- `GET /api/admin/reviews/disputes/:id`
- `POST /api/admin/reviews/disputes/:id/comments`
- `POST /api/admin/reviews/disputes/:id/resolve`
- `GET /api/admin/reviews/disputes/:id/case-files`
- `POST /api/admin/reviews/disputes/:id/case-files`
- `GET /api/admin/reviews/disputes/:id/ai-evaluations`
- `POST /api/admin/reviews/disputes/:id/ai-evaluations`
- `GET /admin/disputes`
- `GET /admin/disputes/:id`
- `GET /admin/disputes/ai-operator`
- `GET /admin/reviews`
- `GET /admin/reviews/:id`
- `PUT /admin/reviews/:flaggedReviewId/resolve`
- `GET /admin/flagged-reviews`
- `POST /admin/flagged-reviews/:flaggedReviewId/resolve`

Callback public:

- `POST /api/public/ai-disputes/callback`
- `POST /api/public/ai/dispute-evaluations/callback`

### Caveat reader nên nhớ

- hệ thống hiện có hai family admin surface cùng đụng `flagged_reviews`
- dashboard AI operator hiện gộp `failed` và `cancelled` vào cùng bucket `failed`; khi đọc metric cần nhớ đây là business aggregation, không phải raw enum 1-1
- escalation không phải nút skip-thẳng-lên-admin; evidence test hiện tại cho thấy report dispute chỉ hợp lệ sau khi đã có trao đổi hai phía và hệ thống sẽ build case file snapshot trước khi đẩy sang admin

Nếu cần một file độc lập để hiểu trọn domain này, đọc thêm:

- `./features/review_dispute_and_governance.md`

## Feature 9: Reverse Review

### Feature này để làm gì

Thực hiện review sau sprint ngay trên hai board Project dùng chung; không duy trì màn
hoặc API lịch sử reverse-review độc lập.

### Surface runtime

- `GET /projects/:projectId/reviews/assigners`
- `GET /projects/:projectId/reviews/environment`
- `POST /reviews/:id/reverse`
- `POST /sprint-reverse-reviews/:workflowId/submit`
- `POST /sprint-reverse-reviews/:workflowId/accept`
- `POST /sprint-reverse-reviews/:workflowId/respond`
- `POST /sprint-reverse-reviews/:workflowId/report`
- `GET /api/v1/me/sprint-review-packages`
- `GET /api/v1/me/sprint-review-packages/pending`
- canonical:
  - `POST /api/v1/project-sprints/:sprintId/close-review`
  - `POST /api/v1/project-sprints/:sprintId/close-review-period`
  - `POST /api/v1/project-sprints/:sprintId/expire-pending-review-packages`
  - `GET /api/v1/sprint-review-packages/:packageId`
  - `POST /api/v1/sprint-review-packages/:packageId/submit`
  - `POST /api/v1/sprint-review-packages/:packageId/disputes`
  - `POST /api/v1/sprint-review-disputes/:disputeId/comments`
  - `POST /api/v1/sprint-review-disputes/:disputeId/report`
- compatibility write only: `POST /api/review-sessions/:sessionId/reverse-reviews`

Các page/read API reverse-review history cũ không còn được đăng ký.

### Data/runtime anchors

- `project_sprints`
- `sprint_review_packages`
- `sprint_manager_reviews`
- `sprint_environment_reviews`
- `sprint_review_disputes`
- `sprint_review_dispute_comments`
- `sprint_reverse_review_workflows`
- `sprint_reverse_review_messages`
- legacy storage only: `reverse_reviews`

### Điều reader phải hiểu đúng

- reverse-review page/read-history surfaces không còn được đăng ký
- task-level reverse review creation hiện đã bị tắt theo product decision `2026-07-09`
- command/controller cũ hiện trả rõ thông điệp chuyển hướng sang sprint-close flow
- sprint-close reverse review hiện là hai shared Project boards: người giao task và môi trường
- cả hai board hiển thị đủ tám lane `awaiting_review`, `in_review`, `awaiting_response`, `disputed`, `reported`, `ai_reviewing`, `resolved`, `done`
- sprint-close chỉ chặn các task review workflow rows đã tồn tại nhưng chưa `done`; missing workflow rows không được gate này đếm
- sprint N+1 close bị chặn nếu sprint N còn reverse review workflow chưa `done`
- `sprint_review_packages`, `sprint_manager_reviews`, và `sprint_environment_reviews` là submitted review/audit records; `sprint_reverse_review_workflows` là board projection/response state

Vì vậy feature này không nên bị mô tả như một create-flow đang active đầy đủ ở level từng task.

Nếu cần file domain giải thích kỹ hơn, đọc:

- `./features/review_dispute_and_governance.md`

## Feature 10: Profile, Skills, Snapshots

### Feature này để làm gì

Biến dữ liệu review và lịch sử công việc thành profile có thể đọc, chia sẻ, và so sánh.

### Surface runtime

- `GET /profile`
- `GET /profile/edit`
- `PUT /profile/details`
- `POST /profile/skills`
- `PUT /profile/skills/:id`
- `DELETE /profile/skills/:id`
- `GET /users/:id/profile`
- `POST /profile/snapshots/publish`
- `POST /api/me/profile-snapshots`
- `GET /profile/snapshots/current`
- `GET /api/me/profile-snapshots/current`
- `GET /profile/snapshots/history`
- `GET /api/me/profile-snapshots`
- `PATCH /profile/snapshots/:id/access`
- `PATCH /api/me/profile-snapshots/:id/access`
- `POST /profile/snapshots/:id/rotate-link`
- `POST /api/me/profile-snapshots/:id/rotate-link`
- `GET /profiles/:slug`

### Data/runtime anchors

- `users`
- `user_skills`
- `user_profile_snapshots`
- `user_work_history`
- `user_performance_stats`
- `user_domain_expertise`

## Feature 11: Talent Directory And Talent Bookmarks

### Feature này để làm gì

Cho phép sourcing talent từ profile đã xác minh và giữ shortlist có ghi chú nội bộ.

### Surface runtime

- `GET /org/talents`
- `GET /org/bookmarks`
- legacy redirects:
  - `GET /marketplace/talents` → `/org/talents`
  - `GET /marketplace/bookmarks` → `/org/bookmarks`
- `GET /api/talents/search`
- compatibility vẫn còn dùng:
  - `GET /api/recruiter-bookmarks`
  - `POST /api/recruiter-bookmarks`
  - `PATCH /api/recruiter-bookmarks/:bookmarkId`
  - `DELETE /api/recruiter-bookmarks/:bookmarkId`
- canonical:
  - `GET /api/talent-bookmarks`
  - `POST /api/talent-bookmarks`
  - `PATCH /api/talent-bookmarks/:bookmarkId`
  - `DELETE /api/talent-bookmarks/:bookmarkId`
  - `GET /api/v1/talents/search`
  - `GET /api/v1/talent-bookmarks`
  - `POST /api/v1/talent-bookmarks`
  - `PATCH /api/v1/talent-bookmarks/:bookmarkId`
  - `DELETE /api/v1/talent-bookmarks/:bookmarkId`
  - `GET /api/v1/me/organizations/current/talents/search`
  - `GET /api/v1/me/organizations/current/talents/:userId`
  - `POST /api/v1/me/organizations/current/talents/:userId/bookmarks`
  - `DELETE /api/v1/me/organizations/current/talents/:userId/bookmarks`
- compatibility/deprecated:
  - `GET /api/org/talents/search`
  - `GET /api/org/talents/:userId`
  - `POST /api/org/talents/:userId/bookmarks`
  - `DELETE /api/org/talents/:userId/bookmarks`
  - `GET /api/recruiters/bookmarks`
  - `POST /api/recruiters/bookmarks`
  - `PATCH /api/recruiters/bookmarks/:bookmarkId`
  - `DELETE /api/recruiters/bookmarks/:bookmarkId`

### Data/runtime anchors

- `recruiter_bookmarks`

### Điều reader nên nhớ

- talent search không phải lúc nào cũng đi qua search engine
- current query chỉ thử engine khi có keyword và search runtime đang bật
- nếu engine rỗng hoặc lỗi, hệ thống còn fallback về query legacy
- org talent shell và bookmark workspace là management-facing surfaces, không phải public browse cho mọi member

Nếu cần file domain giải thích kỹ hơn, đọc:

- `./features/search_talent_discovery_and_bookmarks.md`

## Feature 12: Notification And Audit Evidence

### Feature này để làm gì

Hiển thị thông báo cho user và giữ Audit evidence phục vụ lịch sử cá nhân,
điều tra, hoặc phân tích vận hành. Đây không phải generic behavioral tracking.

### Surface/runtime anchors

Notification:

- `GET /notifications`
- `POST /notifications/read-all`
- `POST /notifications/:notificationId/read`
- `DELETE /notifications/read`
- `DELETE /notifications/:notificationId`

Storage/runtime:

- audit runtime: PostgreSQL-backed
- notification runtime: PostgreSQL-backed
- Auth login/logout uses schema-v3 Audit evidence with separate source and
  database-record timestamps
- legacy `retired_user_activity_events` is a read-only archive, not runtime

## Khi Nào Dừng Ở File Này

Dừng ở file này khi bạn đã biết:

1. feature concern của mình đang phục vụ ai và nằm ở surface runtime nào
2. caveat chính của feature đó là gì
3. có cần sang API, testing, data, hay workstream audit để kiểm tra độ mạnh evidence hay không
