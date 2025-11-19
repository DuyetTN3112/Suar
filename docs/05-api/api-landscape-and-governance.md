# API Landscape And Governance

| Field | Value |
|---|---|
| Status | Active |
| Audience | Dev, QA, reviewer, tech lead, incident responder |
| Purpose | Giải thích nhanh hệ thống route/API của Suar mà không bắt người đọc phải mở code trước |
| Source of Truth | `start/routes/*.ts`, controller hiện tại, API governance scripts |
| Last Reviewed | 2026-07-10 |
| Review Cycle | Khi thêm route mới, đổi auth boundary, hoặc đổi contract API |
| Owner | Engineering |
| Stale Risk | Cao nếu route đổi mà docs không cập nhật |

## File Này Phải Giúp Bạn Làm Gì

Sau khi đọc xong file này, người đọc phải trả lời được ngay:

- hệ thống đang dùng page route, JSON API, hay cả hai
- `/api/*` và `/api/v1/*` khác nhau chỗ nào
- route nào cần đăng nhập, cần organization context, hay cần quyền admin
- khi production lỗi ở một flow nào đó thì nên nhìn nhóm route nào trước

Nếu bạn đang gấp:

- muốn biết một flow nên tìm ở route web hay JSON route: đọc `Mental Model Ngắn Nhất`
- muốn debug production theo domain: đọc `Bản Đồ API Theo Cách Người Vận Hành Cần`
- muốn biết quyền chặn ở lớp nào: đọc `Boundary Quyền Truy Cập`

Nếu file này chưa giúp trả lời bốn câu trên ngay, file này chưa đạt.

## Nếu Dùng File Này Để Viết Report Bên Ngoài Repo

Bạn có thể dùng file này để viết:

- chương API landscape
- phần route family và integration boundary
- phần giải thích namespace `/api/*`, `/api/v1/*`, `/api/admin/*`, `/api/public/*`
- phần auth/org/admin boundary ở mức route

Đây là file phù hợp để trả lời:

- Suar đang dùng page route, JSON API, hay mô hình trộn
- canonical API và compatibility API khác nhau ra sao
- production nên khoanh flow theo domain route family như thế nào

Bạn không nên dùng riêng file này để kết luận:

- exact request/response field của mọi endpoint
- mọi compatibility surface đã bị loại bỏ
- toàn repo đã migrate xong sang một contract API duy nhất

File này tự đủ để hiểu landscape API ở mức route family, namespace, auth boundary, và incident triage.

Chỉ đọc thêm khi bạn thật sự cần đào sâu một lát cắt hẹp hơn:

- `../06-data/api-specification.md`
  khi cần inventory endpoint chi tiết hơn theo namespace
- `../07-security/access-control-security-privacy-audit.md`
  khi cần access-control, privacy, hoặc audit boundary sâu hơn
- `../12-evidence/workstream-status-audit.md`
  khi cần đối chiếu evidence test/audit runtime đang đỏ hoặc còn gap

## Safe External Summary

Nếu cần một câu tóm tắt an toàn cho report, có thể dùng:

`API landscape của Suar hiện là mô hình lai giữa page routes và JSON APIs, trong đó các namespace canonical và compatibility cùng tồn tại, nên việc hiểu đúng boundary route là rất quan trọng cho cả tích hợp lẫn vận hành.`

## Nếu Bạn Chỉ Có 3 Phút

Chỉ cần nhớ bốn ý:

1. Suar là runtime trộn giữa `page route` và `JSON API`, không phải API-only cũng không phải page-only.
2. `/api/*` và `/api/v1/*` đang cùng tồn tại; không nên giả định flow mới đã đi hết sang `/api/v1/*`.
3. Muốn debug nhanh thì nhìn route theo domain trước, đừng nhảy ngay vào controller.
4. Quyền truy cập thường được quyết định bởi `auth`, `organization context`, và `admin boundary`.

Thêm một bẫy rất đáng nhớ:

- nhìn URL prefix bằng mắt không đủ để biết transport/auth behavior; route chỉ thật sự rõ khi đã xem `bindHttpTransport(...)` và `bindApiAuthContract(...)`

## Mental Model Ngắn Nhất

Suar hiện không phải hệ thống “API thuần” cũng không phải “web page thuần”.

Runtime hiện tại là mô hình trộn:

- page route để render màn hình Inertia
- JSON route để fetch async data, mutation, queue/feed, modal, bulk action
- một phần API cũ ở `/api/*`
- một phần API chuẩn hóa hơn ở `/api/v1/*`

Điều quan trọng:

- đây là trạng thái runtime thật hiện tại
- đây chưa phải dấu hiệu rằng toàn repo đã chuẩn hóa xong về một chuẩn API duy nhất

Một câu nhớ ngắn:

`Trong Suar, một flow hoàn chỉnh rất hay đi qua cả page route lẫn JSON route.`

Code audit note:

- path namespace và `http transport kind` không phải lúc nào cũng trùng nhau hoàn toàn
- ngoài `api-compat` và `api-canonical`, code hiện còn dùng các transport kinds:
  - `api-admin-internal`
  - `api-public-callback`
  - `api-ops-internal`
- vì vậy khi debug response shape, deprecation header, hoặc auth contract, không nên chỉ nhìn prefix URL; cần nhìn cả `bindHttpTransport(...)`

## Ma Trận Route, Transport, Auth Contract

Đây là bảng tóm tắt rất quan trọng cho người mới và on-call:

| Surface | Ví dụ | Transport thường thấy | Auth contract thường thấy | Ý nghĩa thực tế |
|---|---|---|---|---|
| Page/Inertia | `/tasks`, `/org`, `/admin` | `page` | session web | render shell/màn hình |
| Compatibility JSON | `/api/*` cũ | `api-compat` | thường là `session-or-bearer` | route còn chạy thật nhưng có thể phát tín hiệu migrate |
| Canonical JSON | `/api/v1/*` | `api-canonical` | thường là `bearer-or-session` | direction mới cho JSON contract chuẩn hóa hơn |
| Admin internal JSON | `/api/admin/*` | `api-admin-internal` | `session-or-bearer` | system admin JSON surface riêng |
| Public callback | `/api/public/*` | `api-public-callback` | không theo auth user thông thường | callback/webhook có guard riêng như credential, signature, throttle |
| Ops/internal API | một phần `/api/search/*`, `/api/redis/*`, `/api/testing/*`, auth diagnostics | `api-ops-internal` | tùy route, thường thêm credential, auth, role gate | vận hành, telemetry, debug, internal tooling |

Điều phải nhớ:

- prefix URL không đủ để xác định contract thật
- `bindHttpTransport(...)` và `bindApiAuthContract(...)` mới là bằng chứng đáng tin hơn
- nếu route không bind transport rõ ràng thì hành vi fallback có thể khác điều bạn đoán bằng mắt
- riêng search center, `/search` và `/api/search` là HTTP transport surfaces; global search query/service ownership nằm ở `app/modules/search` qua `searchPublicApi`
- test unit hiện còn chứng minh một nuance rất dễ bị bỏ qua: request `/api/v1/*` mà không được bind transport rõ ràng vẫn có thể bị classify như `api-compat`, không tự động thành canonical chỉ vì nhìn giống v1

## Auth Contract Phải Hiểu Đúng

Code hiện dùng ít nhất ba kiểu auth contract:

- `session-only`
- `session-or-bearer`
- `bearer-or-session`

Ý nghĩa vận hành:

- `session-only`: ưu tiên và giới hạn ở session/cookie flow
- `session-or-bearer`: thử session trước, bearer là đường fallback nếu session fail
- `bearer-or-session`: thử bearer trước, session là đường fallback nếu bearer không pass

Điểm rất quan trọng:

- `AuthMiddleware` không phải bearer-only middleware riêng
- cùng một middleware nhưng thứ tự thử xác thực sẽ đổi theo `apiAuthContract`
- vì vậy nếu production có bug “API lúc chạy bằng token được, lúc chạy bằng cookie được”, phải nhìn auth contract của route trước khi kết luận
- ngoài production auth surfaces, current runtime còn có nhóm test/support surfaces dưới `/api/testing/*`
- các route như `/api/testing/login`, `/api/testing/token-login`, `/api/testing/token-refresh`, `/api/testing/session/bootstrap` chỉ được mount ở `development` hoặc `test`, dùng `api-ops-internal`, và không nên được mô tả như production contract

## Nên Tin Điều Gì Trước

Khi docs này và code có vẻ khác nhau, ưu tiên theo thứ tự:

1. `start/routes/*.ts`
2. middleware gắn trực tiếp lên route group
3. controller và request/response mapper
4. script governance trong `scripts/`
5. docs này

## Bản Đồ API Theo Cách Người Vận Hành Cần

### 1. Authentication

Route chính:

- `/auth/:provider/redirect`
- `/auth/:provider/callback`
- `/logout`

Điều cần nhớ:

- auth runtime hiện tại dùng session/cookie là chính
- `/api/v1/*` có contract cho `bearer-or-session`, không phải chỉ bearer-only
- auth JSON surface không chỉ có `/api/v1/*`; `start/routes/auth.ts` còn có cả compat và ops-internal surfaces
- `session-only` vẫn tồn tại cho một số auth endpoints, nên không nên mô tả auth JSON layer như một bearer API thuần

Nguồn kiểm chứng:

- `start/routes/auth.ts`
- `start/routes/api_v1.ts`

### 2. Hồ sơ cá nhân, talent directory, bookmark

Page route chính:

- `/profile`
- `/profile/edit`
- `/profile/snapshots/*`
- `/org/talents`
- `/org/bookmarks`
- `/marketplace/talents` → redirects to `/org/talents`
- `/marketplace/bookmarks` → redirects to `/org/bookmarks`
- `/profiles/:slug`
- `/org/talents`
- `/org/talents/:userId`

JSON/API liên quan:

- `/api/talents/search`
- `/api/talent-bookmarks/*`
- `/api/me/profile-snapshots/*`
- `/api/v1/talents/search`
- `/api/v1/talent-bookmarks/*`
- `/api/v1/me/organizations/current/talents/search`
- `/api/v1/me/organizations/current/talents/:userId`
- `/api/v1/me/organizations/current/talents/:userId/bookmarks`

Khi production lỗi ở talent/profile:

- kiểm tra `start/routes/users.ts` trước
- sau đó kiểm tra controller page shell và search/bookmark endpoints
- đừng giả định tất cả flow này đã chuyển qua `/api/v1/*`

Caveat quan trọng từ code audit:

- `/api/org/talents/*` hiện là deprecated compatibility aliases
- `/api/recruiters/bookmarks/*` hiện cũng là deprecated compatibility aliases
- ngoài ra còn có cả lớp deprecated canonical-generation aliases dưới `/api/v1/org/*`
- canonical direction hiện tại là:
  - `/api/v1/me/organizations/current/talents/*`
  - `/api/v1/talent-bookmarks/*`

Nếu chỉ nhìn surface cũ mà không để ý deprecated middleware, người đọc rất dễ hiểu sai đâu là contract chính cần tin.

### 3. Organization và project workspace

Mental model đúng:

- `/organizations*` là discovery, join, create, và switch context
- `/org*` là organization admin shell
- `/projects*` là project working shell trong current organization

Page route chính:

- `/organizations`
- `/organizations/create`
- `/organizations/:id`
- `/organizations/:id/join`
- `/organizations/:id/switch`
- `/organizations/switch/:id`
- `/org`
- `/org/members`
- `/org/invitations/requests`
- `/org/projects`
- `/org/tasks`
- `/switch-organization`
- `/projects`
- `/projects/create`
- `/projects/:id`
- `/projects/:id/member-candidates`
- `/switch-project`

JSON/API liên quan:

- `/api/organizations`
- `/api/v1/organizations`
- `/api/v1/organizations/:organizationId`
- `/api/v1/organizations/:organizationId/members`
- `/api/v1/me/organizations/current/users`
- `/api/v1/me/organizations/switch`
- `/api/v1/me/organizations/current/member-invitations`
- `/api/v1/me/organizations/current/join-requests/:joinRequestId/approve`
- `/api/v1/projects/:projectId`
- `/api/v1/me/projects/switch`
- `/api/v1/projects/:projectId/sprints`
- `/api/v1/projects/:projectId/sprints/:sprintId`
- `/api/v1/projects/:projectId/sprints/:sprintId/open-review`
- `/api/v1/projects/:projectId/sprint-board`
- `/api/v1/projects/:projectId/tasks/:taskId/sprint`

Điều cần nhớ:

- org/project boundary có cả route page lẫn JSON seam
- `/api/v1/*` đã có phần read/update cho org/project, nhưng page flow chính vẫn đi qua route web hiện hữu
- org admin shell trong `start/routes/organizations_current.ts` dùng `requireOrgAdmin()`, nên org admin boundary phải được hiểu tách khỏi system admin boundary
- join request flow hiện không nên mô tả như một API/table concern độc lập thuần túy; runtime mới đang dựa mạnh vào `organization_users.status`
- một số `PATCH/DELETE` routes ở `api_v1.ts` chỉ bị chặn ở mức `auth + requireOrg` tại route layer; quyền sâu hơn đang được enforce trong command/policy layer
- ví dụ project update/delete và organization update/delete không nên được mô tả như middleware-admin-only nếu code thật đang quyết định quyền ở bên trong command
- project sprint APIs trong `start/routes/projects.ts` thuộc sprint planning/backlog; chỉ `open-review` bắc cầu sang review governance command
- sprint board đọc Product Backlog qua `tasks.project_sprint_id = null` và selected sprint tasks qua sprint id

### 4. Task, application, workflow

Page route chính:

- `/tasks`
- `/tasks/create`
- `/tasks/status-board`
- `/tasks/:id`
- `/tasks/:taskId/applications`
- `/my-applications`
- `/marketplace/tasks`

JSON/API liên quan:

- `/api/tasks/*`
- `/api/task-submissions/:submissionId/evidences/*`
- `/api/tasks/:taskId/comments/*`
- `/api/tasks/:taskId/attachments/*`
- `/api/task-statuses`
- `/api/workflow`
- `/api/marketplace/tasks`
- `/api/v1/tasks/*`

Điều cần nhớ:

- task domain là chỗ dễ gặp “mixed contract” nhất
- task detail/submission/comments/attachments đã có nhiều canonical surface ở `/api/v1/tasks/*`
- workflow/task-status definitions hiện đã có cả compatibility `/api/*` lẫn canonical `/api/v1/*`
- canonical workflow/status routes không nằm hết trong một file; chúng hiện rải giữa `start/routes/tasks.ts` và `start/routes/api_v1.ts`
- nhiều task/application flow vẫn đang sống ở `/api/*`
- contract parity giữa legacy `/api/task-statuses`, `/api/workflow` và canonical `/api/v1/task-statuses`, `/api/v1/workflow` hiện đã có proof riêng trong `app/modules/tasks/tests/backend/contract/task_statuses_workflow_api.contract.spec.ts`
- task board còn có thêm lớp alias deprecated như `/api/tasks/grouped`, nhưng code audit current worktree cho thấy alias kiểu này có thể bị route dynamic detail `/api/tasks/:taskId` nuốt nếu route order lệch; khi mô tả surface ổn định, ưu tiên dùng `/api/tasks/status-groups`

Khi production lỗi:

- lỗi render/list page: nhìn `start/routes/tasks.ts`
- lỗi contract task detail/submission: nhìn cả compatibility `/api/*` lẫn canonical `/api/v1/tasks/*`
- lỗi task status/workflow definitions: nhìn cả `start/routes/tasks.ts` lẫn `start/routes/api_v1.ts`; current runtime có cả compat và canonical surfaces song song
- lỗi comments/submission/attachment: đừng bỏ qua legacy `/api/*`
- lỗi `/api/tasks/grouped` kiểu 404/500 hoặc UUID parse: nghi route collision trước khi nghi business logic task

Đây là vùng dễ làm người đọc mệt nhất, nhưng cũng là vùng đáng đọc kỹ nhất nếu đang debug workflow hay mixed contract issue.

### 5. Review, dispute, reverse review

Page route chính:

- `/reviews/pending`
- `/reviews/task-board`
- `/org/reviews/task-board`
- `/reviews/:id`
- `/reviews/disputes/:id`
- `/my-reviews`
- `/users/:id/reviews`
- `/reviews/sprint-reverse-board`
- `/org/reviews/sprint-reverse-board`
- `/org/disputes`
- `/admin/disputes`
- `/admin/reviews`

JSON/API liên quan:

- canonical:
  - `/api/v1/reviews/sessions`
  - `/api/v1/reviews/disputes`
  - `/api/v1/reviews/disputes/:id/comments`
  - `/api/v1/reviews/disputes/:id/evidences`
  - `/api/v1/reviews/disputes/:id/report`
  - `/api/v1/me/reverse-reviews`
  - `/api/v1/me/organizations/current/reverse-reviews`
  - `/api/v1/me/organizations/current/reviews/disputes`
  - `/api/v1/me/organizations/current/reviews/disputes/:id/respond`
  - `/api/v1/me/sprint-review-packages`
  - `/api/v1/me/sprint-review-packages/pending`
  - `/api/v1/project-sprints/:sprintId/close-review`
  - `/api/v1/project-sprints/:sprintId/close-review-period`
  - `/api/v1/project-sprints/:sprintId/expire-pending-review-packages`
  - `/api/v1/sprint-review-packages/:packageId`
  - `/api/v1/sprint-review-packages/:packageId/submit`
  - `/api/v1/sprint-review-packages/:packageId/disputes`
  - `/api/v1/sprint-review-disputes/:disputeId/comments`
  - `/api/v1/sprint-review-disputes/:disputeId/report`
- compatibility/deprecated:
  - `/api/reviews/sessions`
  - `/api/reviews/disputes`
  - `/api/reviews/disputes/:id/comments`
  - `/api/reviews/disputes/:id/evidences`
  - `/api/me/reverse-reviews`
  - `/api/org/reverse-reviews`
  - `/api/org/reviews/disputes`
  - `/api/org/reviews/disputes/:id/respond`
- `/api/admin/reviews/disputes/*`
- `/api/public/ai-disputes/callback`
- `/api/public/ai/dispute-evaluations/callback`

Điều cần nhớ:

- review page, dispute page, org dispute queue, admin dispute queue là nhiều lớp khác nhau
- `/org/disputes` hiện là page route trong group `auth + requireOrg`, không đi qua `requireOrgAdmin()` ở middleware layer
- access thật của org dispute queue được siết thêm ở query/policy layer; integration proof hiện có trong `app/modules/reviews/tests/backend/integration/org_dispute_queue_access.spec.ts`
- `/reviews/disputes/:id` cũng không nên bị mô tả như page chỉ dành cho đúng reviewee và reviewer; current access context còn có thể công nhận org-side role hoặc system admin là participant hợp lệ theo case
- nhưng `participant access` và `respond action` là hai lớp quyền khác nhau; reviewee có thể xem/report dispute, còn org-side respond action hiện được dành cho reviewer, org-side actor, hoặc system admin
- public callback route là integration surface, không phải user-facing API
- review/dispute là vùng có nhiều permission guard và nhiều bằng chứng test quan trọng
- task review board là workflow riêng quanh review debt/quorum/response/report, không phải task delivery status
- sprint review package và sprint reverse board là flow sprint-close hiện tại; chúng thay thế create-flow reverse review theo từng task
- workflow table mới không nên được đọc như DB-enforced business truth; command/query/domain rule mới là rule truth
- các alias `/api/org/*` và `/api/me/*` kiểu cũ đang được giữ riêng trong `start/routes/deprecated/*`; khi docs hoặc alert không ghi rõ, ưu tiên đọc canonical `/api/v1/*` trước
- `/api/admin/reviews/*` là system-admin surface riêng, không đi qua `requireOrg()`
- AI dispute callback hiện có guard runtime thật: cần `callback credential`, chữ ký signed-request hợp lệ, và timestamp nằm trong cửa sổ khoảng `5` phút
- AI dispute callback không xử lý lại evaluation đã xong; current code chỉ nhận các bản ghi còn ở `queued` hoặc `processing`
- reverse review read surfaces vẫn còn, nhưng task-level reverse review submit hiện chỉ còn là compatibility shell; `SubmitReverseReviewCommand` đang chặn và trả business error theo product decision `2026-07-09`

### 6. Notifications và settings

Page route chính:

- `/notifications`
- `/settings`
- `/settings/profile`
- `/settings/account`
- `/settings/appearance`
- `/settings/display`
- `/settings/notifications`

JSON/API liên quan:

- `/notifications/latest`
- `/api/v1/notifications`
- `/api/v1/me/settings`

Điều cần nhớ:

- đây là vùng đã có canonical `/api/v1/*` khá rõ
- feed notifications còn là ví dụ thật của cursor pagination surface
- nhưng `/notifications/latest` lại là JSON compat surface sống ngoài `/api/*`, nên đừng gom toàn bộ notification JSON vào một mental model “chỉ nằm trong `/api/v1/*`”

### 7. System admin

Page route chính:

- `/admin`
- `/admin/users/*`
- `/admin/organizations/*`
- `/admin/audit-logs`
- `/admin/permissions`
- `/admin/packages/*`
- `/admin/proficiency*`
- `/admin/reviews/*`
- `/admin/disputes/*`

JSON/API liên quan:

- `/api/admin/*`
- `/api/v1/organizations/:organizationId`
- `/api/v1/projects/:projectId`

Điều cần nhớ:

- `api/admin` là admin JSON surface riêng
- không nên nhầm `api/admin` với `api/v1`
- admin page route và admin JSON route thường đi cặp nhưng không phải lúc nào cũng cùng controller stack
- current runtime còn chưa có bằng chứng rằng `/api/admin/*` mirror đầy đủ toàn bộ `/admin/*`; route tree hiện mới xác nhận một tập JSON admin riêng như dashboard, users, organizations, audit logs, và review/dispute APIs
- `/api/v1/organizations/:organizationId` và `/api/v1/projects/:projectId` không tự động có nghĩa là system-admin route; nhiều route trong số này chỉ mới tới mức `auth + requireOrg` ở route layer, rồi quyền sâu hơn mới siết trong command/policy

## Boundary Quyền Truy Cập

Các lớp kiểm soát chính đọc được trực tiếp từ route files:

- `middleware.auth()`
- `middleware.requireOrg()`
- `middleware.requireOrgAdmin()`
- `middleware.requireSystemAdmin()`
- `middleware.systemAdminContext()`
- `apiThrottle`

Nếu bạn chưa chắc lỗi là do auth, org context, hay admin gate, đừng đoán qua controller trước. Hãy nhìn route group và middleware chain trước.

Nhưng code audit cũng cho thấy một caveat quan trọng:

- route middleware không phải lúc nào là lớp quyết định quyền cuối cùng
- nhiều route chỉ chặn tới mức `authenticated + current organization`
- quyền business thật có thể được enforce tiếp ở controller adapter, command, query, hoặc domain policy

Vì vậy khi audit access bug, nên đi theo thứ tự:

1. route group và middleware
2. controller adapter có ép current-org/current-project hay không
3. command/query/domain policy mới là lớp quyết định cuối cùng

### Public hoặc integration callback

Ví dụ:

- OAuth redirect/callback
- AI dispute callback
- health check có credential guard riêng
- search/event telemetry và redis/internal tooling có transport riêng kiểu ops/internal

Lưu ý:

- `health` không phải anonymous route
- callback public không có nghĩa là business action public
- AI callback public hiện vẫn có chữ ký và timestamp gate, không phải webhook mở hoàn toàn

### Compatibility transport

Với nhiều route `/api/*` kiểu cũ, middleware transport hiện còn tự phát các header:

- `Deprecation`
- `Sunset`
- `Link` với `successor-version`
- `Warning`

Điều này quan trọng cho audit vì:

- một route vẫn còn chạy không có nghĩa nó còn là contract ưu tiên
- production client hoặc integration client có thể đang nhận tín hiệu migrate ngay trong response

### Authenticated only

Ví dụ:

- notifications
- settings
- một phần `/api/v1/me/*`

### Authenticated + current organization

Ví dụ:

- tasks
- projects
- review workspace
- organization-scoped API v1 reads

### Authenticated + org admin

Ví dụ:

- `/api/task-statuses` mutation
- `/api/workflow` update
- `/api/v1/me/organizations/current/*` cho member invitation, role update, join-request approve, project create, workflow/task-status admin action

### Authenticated + system admin

Ví dụ:

- `/admin/*`
- `/api/admin/*`

## `/api/*` Và `/api/v1/*` Khác Nhau Thế Nào

### `/api/v1/*`

Hiểu là canonical direction hiện tại cho JSON contract mới hơn ở nhóm read/mutation chính.

Điểm nhận biết từ `start/routes/api_v1.ts`:

- có `bindHttpTransport('api-canonical')`
- có `bindApiAuthContract('bearer-or-session')`
- dùng camelCase contract cho public request/response
- chia group rõ hơn theo read, org-scoped read, mutation

Nhưng không được nói quá:

- `/api/v1/*` không bao trùm toàn bộ mọi JSON surface trong repo
- system admin JSON hiện vẫn có namespace riêng là `/api/admin/*`
- một phần org-scoped canonical surface nằm ở `start/routes/organizations_current.ts` dưới `/api/v1/me/organizations/current/*`, không chỉ ở `start/routes/api_v1.ts`

### `/api/*`

Hiểu là compatibility/runtime surface đang còn phục vụ nhiều flow thật.

Điều không được hiểu nhầm:

- không phải mọi `/api/*` đều là deprecated chết
- nhưng cũng không được coi đó là namespace canonical đã chuẩn hóa xong
- trong chính `/api/*` còn có các route mang tính ops/internal như search telemetry, redis tooling, debug-only surfaces

### Kết luận vận hành

Nếu bạn đang debug bug thật:

- đừng mặc định route phải nằm ở `/api/v1/*`
- trước tiên xác nhận flow đang gọi namespace nào
- sau đó mới kiểm tra mapper và contract tương ứng

## Governance Hiện Có Trong Repo

Repo hiện có guardrail để giảm drift API và boundary drift:

- `scripts/check_backend_side_effect_boundary.mjs`
- `scripts/check_module_domain_boundary.mjs`
- `scripts/check_public_contract_surface.mjs`
- `scripts/api_deprecated_route_policy.json`
- `scripts/tests/collect_test_inventory.mjs`
- `scripts/tests/collect_module_suite_matrix.mjs`
- `scripts/tests/scan_false_pass_patterns.mjs`

Ý nghĩa thực tế:

- API governance hiện không còn nằm ở một `run_api_suite` riêng
- boundary chính được giữ bằng module/domain/public-contract checks, deprecated route policy, và contract/integration tests trong `app/modules/*/tests/backend/*`
- các script plan cũ như `scripts/check_api_route_governance.mjs`, `scripts/check_api_context_boundary.mjs`, `scripts/check_api_response_boundary.mjs`, `scripts/check_api_transport_binding.mjs`, `scripts/check_api_auth_contracts.mjs`, và `scripts/run_api_suite.mjs` đã bị retire khỏi current worktree
- vì vậy không cite các script đã retire như bằng chứng runtime hiện tại
- sự tồn tại của guardrail hiện tại vẫn không đồng nghĩa mọi surface cũ đã migrate xong

## Những Điều Reader Hay Hiểu Sai

### Hiểu sai 1: Có `/api/v1/*` rồi tức là hệ thống đã chuẩn hóa xong

Sai.

Runtime hiện tại vẫn là trạng thái song song:

- canonical direction mới
- compatibility surface cũ vẫn còn active

### Hiểu sai 2: Cứ là page route thì không có JSON sidecar

Sai.

Nhiều page trong hệ thống render bằng Inertia nhưng mutation/list async lại dùng JSON route riêng.

### Hiểu sai 3: Route middleware là toàn bộ permission

Sai.

Middleware là lớp đầu. Permission thật còn có thể bị siết thêm ở:

- controller
- request mapper
- command/query
- domain policy

### Hiểu sai 4: Nhìn prefix là biết ngay transport và contract

Sai.

- `/notifications/latest` là JSON compat surface dù không nằm dưới `/api/*`
- `/api/v1/org/*` hiện có nhiều route chỉ là deprecated aliases trỏ về `/api/v1/me/organizations/current/*`
- `/api/v1/*` nếu không bind transport rõ ràng vẫn có thể bị classify theo fallback compat path

## Khi Incident Production Xảy Ra

Đây là thứ on-call cần nhớ nhanh:

1. Xác định người dùng đang hỏng ở page route nào hay JSON route nào.
2. Xác định namespace thật: web, `/api/*`, `/api/v1/*`, `/api/admin/*`, hay `/api/public/*`.
3. Mở route file tương ứng trong `start/routes/`.
4. Kiểm tra middleware chain trước khi đọc sâu xuống controller.
5. Nếu là bug contract, kiểm tra thêm mapper/governance script thay vì chỉ nhìn page component.

## Dấu Hiệu Cần Cảnh Giác Khi Đọc Route

Nếu thấy một route có một trong các dấu hiệu sau, đừng kết luận vội:

- path trông như canonical nhưng auth contract lại là compat-style
- path trông như web route nhưng endpoint con bind `api-compat`
- route layer chỉ có `auth + requireOrg` nhưng business action nghe có vẻ “admin-only”
- route trả JSON nhưng thực ra là ops/internal surface
- route còn sống nhưng response có `Deprecation` hoặc `Sunset`

Khi đó phải đọc thêm:

1. transport binding
2. auth contract binding
3. controller mapper
4. command/query/domain policy

## What Not To Do

- Đừng nhìn `/api/v1/*` rồi mặc định route đó chắc chắn là canonical theo mọi nghĩa vận hành.
- Đừng nhìn `/api/*` rồi mặc định route đó chỉ còn là xác chết; nhiều surface compat vẫn chạy thật và có người dùng thật.
- Đừng bỏ qua `/api/v1/org/*` và `/api/org/*` aliases khi audit incident, nhưng cũng đừng dùng chúng làm source of truth ưu tiên cho report mới.
- Đừng kết luận notification JSON chỉ nằm dưới `/api/*` hay `/api/v1/*`; `/notifications/latest` là phản ví dụ rất thực tế.
- Đừng dừng ở route middleware nếu bug liên quan quyền; nhiều decision quan trọng còn nằm sâu hơn ở command/query/policy.

## File Cần Mở Tiếp Theo Nếu Cần Đào Sâu

- `docs/06-data/api-specification.md`
- `docs/09-operations/production-incident-first-response.md`
- `start/routes/index.ts`
- `start/routes/api_v1.ts`
- `start/routes/tasks.ts`
- `start/routes/reviews.ts`
- `start/routes/users.ts`
- `start/routes/api.ts`
- `app/modules/auth/middleware/auth_middleware.ts`

## Khi Nào Dừng Ở File Này

Dừng ở file này khi bạn đã biết:

1. flow mình đang điều tra nằm ở `page route`, `JSON route`, hay cả hai
2. domain route nào cần mở trước
3. boundary quyền nào có khả năng chặn flow đó
4. route mình đang nhìn là canonical surface hay chỉ là compatibility alias

Nếu sau khi đọc xong mà bạn vẫn chưa biết nên mở `start/routes/*.ts` nào trước, file này vẫn chưa đủ tốt.
