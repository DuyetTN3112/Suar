# API Specification

| Field           | Value                                                                                                           |
| --------------- | --------------------------------------------------------------------------------------------------------------- |
| Status          | Active                                                                                                          |
| Audience        | Backend dev, frontend dev, QA, integrator, on-call                                                              |
| Purpose         | Cho người đọc danh sách route/API đã được xác nhận trong runtime hiện tại mà không phải đi grep từng file route |
| Source of Truth | `start/routes/*.ts`, controller stack, test evidence hiện có                                                    |
| Last Reviewed   | 2026-07-10                                                                                                      |
| Review Cycle    | Khi route surface đổi, thêm namespace mới, hoặc migrate API contract                                            |
| Owner           | Engineering                                                                                                     |
| Stale Risk      | Cao                                                                                                             |

## File Này Dùng Khi Nào

Mở file này khi bạn cần một trong các việc sau:

- xác nhận route có thật trong runtime hiện tại hay không
- biết một domain đang có page route nào và JSON route nào
- rà nhanh namespace trước khi debug production
- kiểm tra một flow đang ở `/api/*`, `/api/v1/*`, hay route web

Nếu bạn đang cần hiểu “vì sao repo lại tổ chức API như vậy”, mở thêm:

- `docs/05-api/api-landscape-and-governance.md`

Nếu bạn chỉ cần dùng nhanh:

- muốn xác nhận route có tồn tại thật không: đọc `Route Families`
- muốn biết flow đang ở web route, `/api/*`, hay `/api/v1/*`: đọc `Namespace Map`
- muốn debug một domain cụ thể: nhảy thẳng tới family tương ứng

File này tự đủ cho việc:

- xác nhận route/page/API có tồn tại thật không
- biết một flow đang sống ở family nào
- khoanh namespace đúng trước khi xuống code

Chỉ đọc file governance khi bạn cần giải thích vì sao boundary đó lại được tổ chức như vậy.

## Nếu Dùng File Này Để Viết Report Bên Ngoài Repo

Bạn có thể dùng file này để viết:

- chương API specification / interface inventory
- phần liệt kê endpoint families theo domain
- phần phân tách route web, `/api/*`, `/api/v1/*`, `/api/admin/*`, `/api/public/*`

Đây là file phù hợp để trả lời:

- endpoint nào đang tồn tại thật trong runtime
- mỗi domain có những route/page/API nào
- flow đang sống ở namespace nào

Nhưng file này không tự động chứng minh:

- business intent đằng sau từng route
- governance decision vì sao route được tổ chức như vậy
- mọi endpoint đều là canonical contract ưu tiên

Nếu cần các phần đó, đọc thêm:

- `../05-api/api-landscape-and-governance.md`
- `../07-security/access-control-security-privacy-audit.md`
- `../08-testing/test-case-matrix.md`

## Safe External Summary

Nếu cần một câu tóm tắt an toàn cho report, có thể dùng:

`Ở mức interface inventory, Suar hiện duy trì đồng thời web routes, compatibility APIs, canonical v1 APIs, admin APIs, và public integration callbacks; vì vậy mô tả API cần gắn với namespace và domain thay vì gom chung như một lớp duy nhất.`

## Nếu Bạn Chỉ Có 3 Phút

Chỉ cần nhớ bốn ý:

1. File này dùng để xác nhận route nào tồn tại thật, không phải để đoán business intent.
2. Inventory của Suar đang trải trên web routes, `/api/*`, `/api/v1/*`, `/api/admin/*`, và `/api/public/*`.
3. Có route nhìn giống canonical nhưng thực ra chỉ là alias hoặc transitional surface, nên namespace phải đọc cùng caveat.
4. Khi production lỗi, dùng file này để khoanh family đúng trước, rồi mới xuống route file và controller.

Nếu đang gấp:

- muốn biết route đang ở family nào: đọc `Namespace Map`
- muốn khoanh domain cụ thể: nhảy thẳng tới `Route Families`
- muốn hiểu vì sao cùng prefix mà behavior khác nhau: đọc `Transport Và Auth Contract Note`

## Cách Đọc File Này

File này ưu tiên sự thật runtime.

Nó không cố giải thích toàn bộ business logic. Nó trả lời bốn câu thực dụng:

1. Route nào tồn tại thật.
2. Route đó là page hay JSON/API.
3. Route đó nằm ở namespace nào.
4. Có bằng chứng test nào hỗ trợ flow đó.

## Mental Model

Suar hiện là hệ thống trộn:

- route web/page cho Inertia
- route JSON/API cho async data, mutation, callback, admin feed
- namespace compatibility ở `/api/*`
- namespace canonical hơn ở `/api/v1/*`

Vì vậy một flow hoàn chỉnh thường không nằm trọn trong đúng một namespace.

Một câu nhớ ngắn:

`File này trả lời route nào có thật. File governance trả lời nên hiểu nó thế nào.`

## Namespace Map

### Route web/page

Dùng cho:

- render màn hình chính
- entry page của từng domain
- admin pages
- org pages

Ví dụ:

- `/tasks`
- `/projects`
- `/projects/:projectId/tasks`
- `/projects/:projectId/reviews/tasks`
- `/projects/:projectId/reviews/assigners`
- `/projects/:projectId/reviews/environment`
- `/admin/disputes`

### `/api/*`

Dùng cho:

- compatibility surface đang còn active
- nhiều mutation/list cũ nhưng vẫn là runtime thật
- task/review/profile/talent/search flows chưa chuyển hết sang `/api/v1/*`

Code audit note:

- một số `/api/*` surface hiện là deprecated compatibility aliases có `markDeprecatedRoute`
- vì vậy không nên mặc định mọi `/api/*` đều là contract chính cần ưu tiên tin trước
- compat transport còn có thể tự trả `Deprecation`, `Sunset`, `Link`, và `Warning` headers để chỉ sang successor route
- ngoài `/api/*`, repo hiện còn giữ một lớp deprecated canonical-generation aliases dưới `/api/v1/org/*`
- `/api/search` là ops/internal transport surface, nhưng implementation gọi `searchPublicApi.search()`; global search query logic nằm trong `app/modules/search/actions/queries/global_search_query.ts`

### `/api/v1/*`

Dùng cho:

- canonical JSON direction mới hơn cho nhiều read/mutation groups
- camelCase request/response boundary
- org-scoped read/write groups rõ hơn

Code audit note:

- không phải mọi canonical JSON surface đều nằm gọn trong `start/routes/api_v1.ts`
- một phần canonical org-admin surface nằm ở `/api/v1/me/organizations/current/*`
- một phần `/api/v1/org/*` vẫn chỉ là deprecated alias trỏ về `/api/v1/me/organizations/current/*`
- system-admin JSON surface hiện vẫn tách namespace riêng ở `/api/admin/*`
- không phải mọi mutation `/api/v1/*` đều bị route-middleware chặn tới mức admin ngay tại route file
- một số quyền sâu hơn được quyết định tiếp trong command/policy layer

### `/api/admin/*`

Dùng cho:

- system-admin JSON surface
- admin dashboard/API data riêng

Code audit note:

- nhóm này hiện dùng transport kind riêng `api-admin-internal`
- auth contract ở đây hiện là `session-or-bearer`, không phải mặc định giống toàn bộ `/api/v1/*`
- review/admin dispute APIs ở đây không yêu cầu `requireOrg()`

### `/api/public/*`

Dùng cho:

- public callback/integration endpoint
- không phải end-user API thông thường

Code audit note:

- public callback không đồng nghĩa anonymous business mutation không có guard
- AI dispute callback hiện yêu cầu `callback credential`, chữ ký signed-request, và timestamp hợp lệ

## Transport Và Auth Contract Note

File này là inventory route, nhưng có một rule đọc rất quan trọng:

- route prefix không đủ để kết luận auth behavior
- muốn biết route ưu tiên session hay bearer, phải đọc `bindApiAuthContract(...)`
- muốn biết route là canonical, compat, admin-internal, public-callback, hay ops-internal, phải đọc `bindHttpTransport(...)`

Hai quy tắc an toàn:

1. `/api/*` không đồng nghĩa cùng một behavior.
2. `/api/v1/*` cũng không đồng nghĩa bearer-only.

## Route Families

### Authentication

Routes:

- `GET /auth/:provider/redirect`
- `GET /auth/:provider/callback`
- `POST /logout`
- `GET /logout`
- `POST /api/auth/token`
- `POST /api/auth/refresh`
- `POST /api/v1/auth/token`
- `POST /api/v1/auth/refresh`

Nguồn:

- `start/routes/auth.ts`

Code audit note:

- social login production surface hiện vẫn xoay quanh OAuth redirect/callback + logout
- token issue/refresh JSON routes có thật và dùng để bridge session sang token-bearing clients
- ngoài production auth surfaces, `start/routes/auth.ts` còn mount một nhóm `/api/testing/*` support routes chỉ ở `development|test`
- vì vậy khi viết report hoặc runbook external, không nên kể `/api/testing/*` như production contract

### Organizations

Routes:

- `GET /all-organizations`
- `GET /api/organizations`
- `GET /api/v1/organizations`
- `GET /organizations/:id/join`
- `POST /organizations/:id/join`
- `GET /organizations`
- `GET /organizations/create`
- `POST /organizations`
- `GET /organizations/:id`
- `POST /organizations/:id/switch`
- `GET /organizations/switch/:id`
- `POST /switch-organization`

Canonical reads liên quan:

- `GET /api/v1/organizations/:organizationId`
- `GET /api/v1/organizations/:organizationId/members`
- `GET /api/v1/me/organizations/current/users`
- `POST /api/v1/me/organizations/switch`

Nguồn:

- `start/routes/organizations.ts`
- `start/routes/api_v1.ts`

Code audit note:

- `organization join request` trên runtime mới đang dùng membership state trong `organization_users` với `status = pending`
- vì vậy đừng đọc family này như thể mọi request đều nằm trong một bảng join-request tách riêng

### Projects

Routes:

- `GET /projects`
- `POST /switch-project`
- `GET /projects/create`
- `POST /projects`
- `GET /projects/:id`
- `DELETE /projects/:id`
- `POST /projects/members`
- `PUT /projects/members/:userId`
- `DELETE /projects/members/:userId`
- `GET /projects/:id/member-candidates`

Canonical reads/writes liên quan:

- `GET /api/v1/projects/:projectId`
- `PATCH /api/v1/projects/:projectId`
- `DELETE /api/v1/projects/:projectId`
- `POST /api/v1/me/projects/switch`
- `GET /api/v1/projects/:projectId/sprints`
- `POST /api/v1/projects/:projectId/sprints`
- `GET /api/v1/projects/:projectId/sprints/:sprintId`
- `PATCH /api/v1/projects/:projectId/sprints/:sprintId`
- `POST /api/v1/projects/:projectId/sprints/:sprintId/open-review`
- `GET /api/v1/projects/:projectId/sprint-board`
- `PATCH /api/v1/projects/:projectId/tasks/:taskId/sprint`

Nguồn:

- `start/routes/projects.ts`
- `start/routes/api_v1.ts`

Code audit note:

- `switch project` chỉ đổi `current_project_id` trong session và trả `redirect: /tasks`
- `member-candidates` hiện là staffing-support surface có thêm reviewed/dispute/confidence signals, không chỉ là list user trống
- sprint planning APIs thuộc `app/modules/sprints`; sprint review package/reverse workflow APIs thuộc `app/modules/reviews`
- `GET /api/v1/projects/:projectId/sprint-board` trả Product Backlog qua `project_sprint_id = null` và selected/active sprint tasks qua sprint id
- `PATCH /api/v1/projects/:projectId/tasks/:taskId/sprint` nhận `projectSprintId`/`project_sprint_id`; `null` đưa task về Product Backlog
- task chỉ move vào sprint cùng project và sprint phải ở `draft` hoặc `active`
- `project_sprints.goal` nullable; blank input normalize thành `null`, nonblank input bị cap `2000` ký tự

### Tasks And Task APIs

Primary page:

- `GET /projects/:projectId/tasks`

Compatibility GET entries:

- `GET /tasks` -> resolve current Project rồi redirect
- `GET /tasks/create` -> Project board với create modal intent
- `GET /tasks/:taskId` -> Project board với card room intent
- `GET /tasks/:taskId/edit` -> Project board với edit/card room intent

`GET /tasks/status-board` không còn được đăng ký như primary page. Các endpoint dưới đây là mutation/support contract, không phải bằng chứng cho một frontend page riêng:

- `POST /tasks`
- `PUT /tasks/:taskId`
- `PUT /tasks/:taskId/status`
- `PATCH /tasks/:taskId/time`
- `DELETE /tasks/:taskId`
- `GET /tasks/:taskId/audit-logs`

Compatibility/API routes:

- `GET /api/tasks/creation-access`
- `GET /api/tasks/status-groups`
- `GET /api/tasks/timeline-items`
- `PATCH /api/tasks/batch-status`
- `PATCH /api/tasks/:taskId/sort-order`
- `GET /api/tasks/:taskId`

Submission package:

- `GET /api/tasks/:taskId/submission`
- `POST /api/tasks/:taskId/submission`
- `PATCH /api/tasks/:taskId/submission`
- `POST /api/tasks/:taskId/submission/submit`
- `POST /api/tasks/:taskId/submission/lock`
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

Compatibility warning:

- deprecated helper alias `GET /api/tasks/grouped` vẫn tồn tại trong route tree cũ
- nhưng current code/test audit đang cho thấy alias này không đáng tin bằng `GET /api/tasks/status-groups`
- nếu cần mô tả stable contract cho external reader, ưu tiên `status-groups`; nếu cần audit client cũ hoặc regression, mới quay lại `grouped`

Canonical workflow/task-status routes:

- `GET /api/v1/tasks/creation-access`
- `GET /api/v1/tasks/status-groups`
- `GET /api/v1/tasks/timeline-items`
- `PATCH /api/v1/tasks/batch-status`
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

Task-status/workflow definitions hiện có ở cả compatibility và canonical namespace:

- `GET /api/task-statuses`
- `GET /api/workflow`
- `POST /api/task-statuses`
- `PUT /api/task-statuses/:taskStatusId`
- `PATCH /api/task-statuses/:taskStatusId`
- `DELETE /api/task-statuses/:taskStatusId`
- `PUT /api/workflow`
- `GET /api/v1/task-statuses`
- `GET /api/v1/task-statuses/:taskStatusId`
- `POST /api/v1/task-statuses`
- `PATCH /api/v1/task-statuses/:taskStatusId`
- `DELETE /api/v1/task-statuses/:taskStatusId`
- `GET /api/v1/workflow`
- `PUT /api/v1/workflow`

Điểm practical:

- muốn debug page/task shell: nhìn page routes trước
- muốn debug task detail/submission/comments/attachments: nhìn cả `/api/*` và `/api/v1/tasks/*`
- muốn debug workflow/status definition: nhìn cả `/api/*` và `/api/v1/*`; route thật hiện nằm rải giữa `start/routes/tasks.ts` và `start/routes/api_v1.ts`
- muốn debug submission/comments/attachments: đừng bỏ qua `/api/*`

Nguồn:

- `start/routes/tasks.ts`
- `start/routes/api_v1.ts`

### Marketplace Application APIs

Routes:

- `GET /tasks/:taskId/applications`
- `POST /api/v1/tasks/:taskId/apply`
- `GET /api/v1/tasks/:taskId/applications/:applicationId/match`
- `GET /api/v1/tasks/:taskId/applications/ranking`
- `POST /applications/:id/process`
- `POST /applications/:id/withdraw`
- `GET /my-applications`
- `GET /marketplace/tasks`
- `GET /api/marketplace/tasks`
- `POST /api/tasks/:taskId/apply` (compat)
- `GET /api/tasks/:taskId/applications/:applicationId/match` (compat)
- `GET /api/tasks/:taskId/applications/ranking` (compat)

Nguồn:

- `start/routes/marketplace.ts`

### Review, Dispute, Reverse Review

Page routes:

- `GET /projects/:projectId/reviews/tasks`
- `GET /projects/:projectId/reviews/assigners`
- `GET /projects/:projectId/reviews/environment`
- `POST /reviews/:reviewId/submit`
- `POST /reviews/:reviewId/confirm`
- `GET /reviews/:reviewId/evidences`
- `POST /reviews/:reviewId/evidences`
- `GET /reviews/:reviewId/self-assessment`
- `POST /reviews/:reviewId/self-assessment`
- `POST /reviews/:reviewId/reverse`

Các page history/inbox/review-detail/dispute-detail cũ không còn được đăng ký; detail
và trạng thái lịch sử nằm trong card room/filter của board.

Đây là route family rất dễ nhầm giữa page flow, org flow, admin flow, và public callback flow. Khi đọc, luôn xác định actor và namespace trước.

- `GET /my-reviews`
- `GET /users/:userId/reviews`

Code audit note:

- `GET /org/disputes`, reviewer inbox và review/reverse-review history pages không còn được đăng ký
- Organization-scoped dispute APIs có thể phục vụ card-room data/action nhưng không tạo một Organization page
- System dispute page/API thuộc System principal/realm riêng; không dùng User/Organization/Project permission context

Task review workflow actions:

- `POST /task-reviews/tasks/:taskId/reviews`
- `POST /task-reviews/:workflowId/accept`
- `POST /task-reviews/:workflowId/respond`
- `POST /task-reviews/:workflowId/report`

Sprint reverse workflow actions:

- `POST /sprint-reverse-reviews/:workflowId/submit`
- `POST /sprint-reverse-reviews/:workflowId/accept`
- `POST /sprint-reverse-reviews/:workflowId/respond`
- `POST /sprint-reverse-reviews/:workflowId/report`

Canonical review/dispute APIs:

- `POST /api/v1/reviews/sessions`
- `POST /api/v1/reviews/disputes`
- `GET /api/v1/reviews/disputes/:disputeId/comments`
- `POST /api/v1/reviews/disputes/:disputeId/comments`
- `GET /api/v1/reviews/disputes/:disputeId/evidences`
- `POST /api/v1/reviews/disputes/:disputeId/evidences`
- `POST /api/v1/reviews/disputes/:disputeId/report`
- `GET /api/v1/me/organizations/current/reviews/disputes`
- `POST /api/v1/me/organizations/current/reviews/disputes/:disputeId/respond`
- `POST /api/v1/project-sprints/:sprintId/close-review`
- `POST /api/v1/project-sprints/:sprintId/close-review-period`
- `POST /api/v1/project-sprints/:sprintId/expire-pending-review-packages`
- `GET /api/v1/sprint-review-packages/:packageId`
- `POST /api/v1/sprint-review-packages/:packageId/submit`
- `POST /api/v1/sprint-review-packages/:packageId/disputes`
- `POST /api/v1/sprint-review-disputes/:disputeId/comments`
- `POST /api/v1/sprint-review-disputes/:disputeId/report`
- `GET /api/v1/me/sprint-review-packages`
- `GET /api/v1/me/sprint-review-packages/pending`

Compatibility review/dispute APIs:

- `POST /api/review-sessions/:sessionId/reverse-reviews`
- `POST /api/reviews/disputes`
- `GET /api/reviews/disputes/:disputeId/comments`
- `POST /api/reviews/disputes/:disputeId/comments`
- `GET /api/reviews/disputes/:disputeId/evidences`
- `POST /api/reviews/disputes/:disputeId/evidences`
- `POST /api/reviews/disputes/:disputeId/report`
- `POST /api/reviews/sessions`
- `GET /api/org/reviews/disputes`
- `POST /api/org/reviews/disputes/:disputeId/respond`

Admin review/dispute routes:

- `GET /admin/disputes`
- `GET /admin/disputes/:disputeId`
- `GET /admin/disputes/ai-operator`
- `GET /admin/reviews`
- `GET /admin/reviews/:flaggedReviewId`
- `PUT /admin/reviews/:flaggedReviewId/resolve`
- `GET /api/admin/reviews/disputes`
- `GET /api/admin/reviews/disputes/:disputeId`
- `POST /api/admin/reviews/disputes/:disputeId/resolve`
- `GET /api/admin/reviews/disputes/:disputeId/case-files`
- `POST /api/admin/reviews/disputes/:disputeId/case-files`
- `GET /api/admin/reviews/disputes/:disputeId/ai-evaluations`
- `POST /api/admin/reviews/disputes/:disputeId/ai-evaluations`

Public callback routes:

- `POST /api/public/ai-disputes/callback`
- `POST /api/public/ai/dispute-evaluations/callback`

Ghi chú runtime quan trọng:

- hệ thống đang có cả canonical lẫn compatibility routes cho dispute/reverse-review
- task review workflow và sprint reverse workflow có page/action routes riêng ngoài review-session cũ
- sprint review package APIs thuộc governance flow khi project sprint được mở review
- workflow tables mới là storage/index projection; quorum, self-review guard, transition, và report permission nằm ở application command/query layer
- admin flagged-review surface và admin dispute surface là hai nhánh khác nhau
- không nên gom nhầm thành một flow admin duy nhất
- các compatibility aliases này được cô lập trong `start/routes/deprecated/*`; lúc incident hoặc audit boundary, đọc `/api/v1/*` trước rồi mới quay lại alias

Nguồn:

- `start/routes/reviews.ts`
- `start/routes/admin.ts`

### Users, Profile, Talent Directory

Routes:

- `GET /users`
- `GET /users/create`
- `GET /users/pending-approval`
- `POST /users`
- `GET /users/:id`
- `GET /users/:id/edit`
- `PUT /users/:id`
- `DELETE /users/:id`
- `PUT /users/:id/approve`
- `PUT /users/:id/role`
- `GET /org/talents`
- `GET /org/bookmarks`
- `GET /marketplace/talents` → redirects to `/org/talents`
- `GET /marketplace/bookmarks` → redirects to `/org/bookmarks`
- `GET /api/users/pending-approvals`
- `GET /api/users/pending-approvals/count`
- `GET /api/v1/users/pending-approvals`
- `GET /api/v1/users/pending-approvals/count`
- `GET /api/users/pending-approval` (deprecated alias)
- `GET /api/users/pending-approval/count` (deprecated alias)
- `GET /api/v1/users/pending-approval` (deprecated alias)
- `GET /api/v1/users/pending-approval/count` (deprecated alias)
- `GET /api/system-users`
- `GET /api/talents/search`
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

Nguồn:

- `start/routes/users.ts`

Caveat từ code audit:

- `/api/org/talents/*` và `/api/recruiters/bookmarks/*` hiện là deprecated compatibility aliases
- canonical direction nên ưu tiên đọc là:
  - `/api/v1/me/organizations/current/talents/*`
  - `/api/v1/talent-bookmarks/*`
- talent search query hiện có fallback path; search runtime lỗi hoặc disabled chưa tự động đồng nghĩa mọi talent page sẽ chết hoàn toàn

### Notifications, Settings, Admin Dashboard Support

Routes:

- `GET /notifications`
- `GET /notifications/latest`
- `POST /notifications/:id/mark-as-read`
- `POST /notifications/mark-all-as-read`
- `DELETE /notifications/:id`
- `DELETE /notifications`
- `GET /settings/notifications`
- `POST /settings/notifications`
- `GET /admin`
- `GET /admin/dashboards/users`
- `GET /admin/dashboards/operations`
- `GET /admin/dashboards/subscriptions`
- `GET /api/admin/dashboard`
- `GET /api/v1/notifications`
- `POST /api/v1/notifications/read-all`
- `POST /api/v1/notifications/:notificationId/read`
- `DELETE /api/v1/notifications/read`
- `DELETE /api/v1/notifications/:notificationId`
- `GET /api/v1/me`
- `GET /api/v1/me/settings`
- `PATCH /api/v1/me/settings`

Nguồn:

- `start/routes/notifications.ts`
- `start/routes/settings.ts`
- `start/routes/admin.ts`
- `start/routes/api_v1.ts`

Caveat từ code audit:

- `GET /notifications/latest` là JSON compat surface dù path không nằm dưới `/api/*`
- vì vậy inventory notification không nên bị kể như thể toàn bộ JSON layer của domain này đã nằm gọn trong `/api/v1/notifications`

## Security Context Tối Thiểu Cần Nhớ

- nhiều route groups dùng `middleware.auth()`
- nhiều workspace/API groups dùng `middleware.requireOrg()`
- admin routes dùng `middleware.requireSystemAdmin()`
- một số org-scoped mutation dùng `middleware.requireOrgAdmin()`
- public callback routes đi qua throttle
- `/health` dùng credential middleware, không phải anonymous access

Muốn đọc sâu hơn:

- `docs/07-security/access-control-security-privacy-audit.md`

## Test Evidence Đã Thấy

Những file dưới đây là bằng chứng tốt cho việc API surface không chỉ tồn tại trên route file:

- `app/modules/tasks/tests/backend/integration/task_applications.spec.ts`
- `app/modules/tasks/tests/backend/integration/application_match_score.spec.ts`
- `app/modules/tasks/tests/backend/integration/task_application_access.spec.ts`
- `app/modules/tasks/tests/backend/integration/my_applications_flow.spec.ts`
- `app/modules/reviews/tests/backend/integration/reverse_review_access.spec.ts`
- `app/modules/reviews/tests/backend/integration/reverse_review_page_contract.spec.ts`
- `app/modules/reviews/tests/backend/integration/ai_dispute_callback.spec.ts`
- `app/modules/auth/tests/backend/integration/social_login.spec.ts`
- `app/modules/projects/tests/backend/integration/create_project.spec.ts`
- `app/modules/projects/tests/backend/integration/delete_project.spec.ts`
- `app/modules/projects/tests/backend/integration/project_members.spec.ts`

Audit mạnh hơn cho vài surface quan trọng đã được ghi riêng trong:

- `docs/12-evidence/workstream-status-audit.md`

## Khi Production Lỗi

1. Xác định flow nằm ở page route, `/api/*`, `/api/v1/*`, `/api/admin/*`, hay `/api/public/*`.
2. Dò domain family trong file này để khoanh vùng nhanh.
3. Mở route file nguồn đã được ghi ngay dưới family đó.
4. Chỉ sau đó mới đi sâu xuống controller/query/test.

## What Not To Do

- Đừng dùng file này để suy đoán business intent sâu; đó không phải mục tiêu chính của inventory.
- Đừng nhìn prefix `/api/v1/*` rồi kết luận route đó chắc chắn là canonical surface ưu tiên cho mọi caller.
- Đừng bỏ qua deprecated alias families như `/api/org/*` hoặc `/api/v1/org/*` khi kiểm tra client cũ hoặc regression.
- Đừng quên các JSON surface nằm ngoài `/api/*`, như `/notifications/latest`, khi khoanh incident theo namespace.

## Khi Nào Dừng Ở File Này

Bạn có thể dừng ở file này nếu mục tiêu của bạn là:

- xác nhận endpoint nào tồn tại thật trong runtime
- biết một flow đang ở web route, compatibility API, canonical v1 API, admin API, hay public callback
- viết report phần API/interface inventory mà không có code
- khoanh nhanh domain route khi sự cố production vừa xảy ra

Bạn nên mở thêm file khác chỉ khi:

- cần giải thích governance hoặc vì sao route bị phân mảnh theo namespace: mở `../05-api/api-landscape-and-governance.md`
- cần access-control và boundary bảo mật: mở `../07-security/access-control-security-privacy-audit.md`
- cần test evidence chi tiết hơn cho từng flow: mở `../08-testing/test-case-matrix.md`
