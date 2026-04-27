# Sequence, Flow, Data Flow, User Flow, And UI Journey Guide

| Field | Value |
|---|---|
| Status | Active |
| Audience | New joiner, developer, tester, reviewer, DevOps, on-call |
| Purpose | Giúp người đọc hiểu các luồng chính của Suar mà không phải tự mở ngẫu nhiên hàng chục file sơ đồ |
| Source of Truth | `docs/11-diagrams/**/*.mmd`, route/controller/model/test evidence hiện tại |
| Last Reviewed | 2026-07-10 |
| Review Cycle | Khi route flow, page shell, runtime behavior, hoặc diagram taxonomy đổi |
| Owner | Engineering |
| Stale Risk | Cao |

## File Này Dùng Để Làm Gì

File này không cố thay thế toàn bộ diagram source.

Nó tồn tại để giúp người đọc trả lời nhanh:

- flow nào đang có sơ đồ đáng tin
- nên mở overview hay detail trước
- user journey nào đã được route/test/code xác nhận mạnh
- chỗ nào chỉ mới có implemented page, chỗ nào đã có flow proof tốt hơn

Nếu bạn đang gấp:

- muốn hiểu domain nào có flow proof tốt: đọc `Verified Journeys`
- muốn biết nên mở sơ đồ nào trước: đọc `Open The Right Diagram`
- muốn biết đã tới lúc cần state/data support chưa: đọc `Mental Model`

## Nếu Dùng File Này Để Viết Report Bên Ngoài Repo

File này phù hợp khi bạn cần:

- chọn đúng flow để minh họa cho chương nghiệp vụ
- biết flow nào đã có proof route/test/code đủ mạnh để kể thành narrative
- tránh dùng một sequence đẹp nhưng không còn phản ánh runtime truth

Nguyên tắc dùng an toàn:

- chương mở đầu của report không nên bắt đầu bằng sequence detail
- hãy dùng overview flow trước, rồi mới chọn scenario flow đúng chapter
- nếu flow có caveat runtime hoặc legacy note, phải giữ caveat đó khi diễn giải trong report
- mỗi chapter thường chỉ nên có `1` scenario flow detail nếu mục tiêu chính là giải thích, không phải debug

## Nếu Bạn Chỉ Có 10 Phút

Đừng đọc theo thứ tự từ trên xuống dưới.

Đọc theo nhu cầu:

- muốn hiểu hệ thống đi theo hành trình người dùng nào: xuống phần `Verified Journeys`
- muốn biết diagram nào cho domain nào: xuống phần `Open The Right Diagram`
- muốn biết có wireframe/prototype thật không: xuống phần `Wireframe / Prototype`

## Mental Model

Suar có nhiều loại sơ đồ, nhưng nếu nhìn theo nhu cầu đọc thì có ba lớp:

### 1. Overview flow

Dùng khi bạn cần hiểu bức tranh lớn của một domain.

Ví dụ:

- `Action/*_overview.mmd`
- `DFD/dfd_00_context.mmd`
- `DFD/dfd_01_main.mmd`

### 2. Scenario flow

Dùng khi bạn cần biết một flow cụ thể diễn ra theo bước nào.

Ví dụ:

- sequence diagrams
- detail action diagrams
- user-flow diagrams

### 3. State or data support

Dùng khi bạn đã biết flow đang điều tra và cần hiểu:

- state nào đổi
- data nào được giữ
- branch nào có guard/rule riêng

Ví dụ:

- state diagrams
- DFD detail diagrams
- ERD domain slice diagrams

Một câu nhớ ngắn:

`Overview để định hướng. Scenario để theo bước. State/data để giải thích vì sao flow đi như vậy.`

## Dense Scenario Files To Open Late

Các file dưới đây hữu ích cho debug hoặc report detail, nhưng không nên là điểm vào đầu tiên:

- `docs/11-diagrams/Action/act_01b_task_workflow.mmd`
- `docs/11-diagrams/Action/act_06_user_registration_approval.mmd`
- `docs/11-diagrams/Action/act_07b_skill_management.mmd`
- `docs/11-diagrams/Sequence/seq_10_org_join_request.mmd`

Rule:

- chỉ mở sau overview cùng domain
- nếu external reader chưa biết actor hoặc concern chính là gì, chưa nên mở chúng

## Open The Right Diagram

### Authentication

Mở trước:

- `docs/11-diagrams/Sequence/seq_01_auth.mmd`
- nếu concern là linked-provider user, existing-email account link, hoặc brand-new user registration path, mở thêm `docs/11-diagrams/Action/act_06c_social_login_account_resolution.mmd`
- nếu concern là dev/test-only token pair, org-aware refresh, hoặc session bootstrap, mở thêm `docs/11-diagrams/Sequence/seq_01b_testing_auth_context_bridge.mmd`
- nếu concern là session teardown/logout chứ không phải login callback, mở thêm `docs/11-diagrams/Action/act_06b_logout_session_teardown.mmd`

Khi dùng:

- cần hiểu OAuth redirect/callback
- nếu cần logout/session teardown, mở action file riêng thay vì nhét thêm concern vào auth sequence
- cần debug login flow

Runtime proof chính:

- `GET /auth/:provider/redirect`
- `GET /auth/:provider/callback`
- `POST /logout`
- `GET /logout`

### Task Authoring, Workflow, Submission

Mở theo thứ tự:

1. `docs/11-diagrams/Action/act_01_task_management_overview.mmd`
2. `docs/11-diagrams/Sequence/seq_02_task_crud.mmd`
3. `docs/11-diagrams/Sequence/seq_02a_task_create_update.mmd`
4. `docs/11-diagrams/Sequence/seq_02b_task_status_assignment.mmd`
5. `docs/11-diagrams/Sequence/seq_02d_task_assignment_decision.mmd`
6. nếu concern là submission/comment/attachment, mở `docs/11-diagrams/DFD/dfd_02c_task_completion_package.mmd`
7. nếu cần state/data thì mở `State/state_01_task.mmd` hoặc `ERD/logical_erd_03_task_marketplace.mmd`

Khi dùng:

- cần hiểu task create/update/delete
- cần hiểu workflow, assignment, submission package
- cần debug comments/attachments/submission

Lưu ý thực dụng:

- `Action/act_01b_task_workflow.mmd` là file low-level khá dày
- nếu người đọc chưa có mental model task domain, mở `act_01_task_management_overview.mmd` trước rồi mới xuống file này
- `Sequence/seq_02b_task_status_assignment.mmd` hiện nên đọc như status-change sequence; assignment execution thực tế đã tách riêng sang `seq_02d_task_assignment_decision.mmd`
- completion package hiện đã có DFD slice riêng; đừng bắt người đọc suy submission/evidence/comment/attachment từ workflow diagram

Code audit note:

- workflow truth hiện nằm ở `task_status_id`, còn `status` chỉ là legacy compatibility mirror
- workflow/status canonical routes hiện có thật ở `/api/v1/*`, nhưng route source đang rải giữa `start/routes/tasks.ts` và `start/routes/api_v1.ts`
- `PATCH /api/tasks/board-state` và bản v1 của nó vẫn chỉ là POC surface cho board interaction/conflict handling, không phải bằng chứng của một board-state engine persisted hoàn chỉnh

Nếu production đang lỗi ở task nhưng bạn chưa biết là lỗi UI flow hay data/state, dừng ở overview trước rồi mới xuống state/ERD.

### Marketplace Proposal, Ranking, Withdraw

Mở theo thứ tự:

1. `docs/11-diagrams/Action/act_02_marketplace_overview.mmd`
2. `docs/11-diagrams/Action/act_02b_marketplace_apply.mmd`
3. `docs/11-diagrams/Sequence/seq_03_marketplace_apply.mmd`
4. `docs/11-diagrams/Sequence/seq_03b_marketplace_process_application.mmd`
5. `docs/11-diagrams/Sequence/seq_03c_marketplace_withdraw_application.mmd`

Khi dùng:

- cần hiểu contributor proposal journey
- cần hiểu ranking/match score flow
- cần debug approve/reject/withdraw

### Review, Dispute, Reverse Review

Mở theo thứ tự:

1. `docs/11-diagrams/Action/act_03_review_overview.mmd`
2. `docs/11-diagrams/Action/act_03a_review_submit.mmd`
3. `docs/11-diagrams/Action/act_03d_review_dispute_lifecycle.mmd`
4. `docs/11-diagrams/Sequence/seq_04_review.mmd`
5. `docs/11-diagrams/Sequence/seq_04b_review_confirm_pipeline.mmd`
6. `docs/11-diagrams/Sequence/seq_04c_review_dispute_admin_resolution.mmd`
7. nếu cần state thì mở `State/state_02_review_session.mmd`

Khi dùng:

- cần hiểu review session được mở từ submit package hay backstop `DONE` path
- cần hiểu submit, confirm, dispute, admin resolution
- cần debug review-confirm side effects
- cần giải thích dispute room và escalation

Code audit note:

- review session hiện không chỉ xuất hiện sau `DONE`; runtime ưu tiên mở session ở task completion-package submit path rồi mới giữ thêm backstop khi task vào category `done`
- `/org/disputes` không nên bị hiểu máy móc là org-admin shell
- route page này hiện thuộc review domain, nằm trong `auth + requireOrg`, và org dispute queue còn siết thêm approved membership ở query layer
- case file và AI evaluation thuộc pha escalation/admin handling, không phải auto-step vô điều kiện ngay khi dispute vừa được tạo

Đây là nhóm flow rất dễ bị nhảy thẳng vào detail quá sớm. Nếu chưa xác định actor là reviewer, reviewee, org admin, hay system admin, đừng mở sequence detail trước.

### Organization And Project

Mở theo thứ tự:

1. `docs/11-diagrams/Action/act_05_org_management.mmd`
2. `docs/11-diagrams/Sequence/seq_05_org_membership_overview.mmd`
3. `docs/11-diagrams/Sequence/seq_08_project_management.mmd`
4. `docs/11-diagrams/Sequence/seq_10_org_join_request.mmd`
5. `docs/11-diagrams/Sequence/seq_10b_org_join_request_resolution.mmd`

Khi dùng:

- cần hiểu membership, invite, join request
- cần hiểu project lifecycle và shared shell access

Lưu ý thực dụng:

- `Sequence/seq_10_org_join_request.mmd` giờ tập trung vào eligibility + submit
- `Sequence/seq_10b_org_join_request_resolution.mmd` giữ admin-side pending queue + approve/reject
- nếu chapter chỉ cần nói “join request sống theo membership state”, overview + narrative thường đủ trước khi trích hai file detail này

Lưu ý runtime rất quan trọng:

- join request runtime hiện nên đọc theo `organization_users(status='pending')`
- nếu sequence hoặc DFD còn giữ `organization_join_requests` như legacy/auxiliary shape thì phải đọc kèm caveat trong diagram/file docs liên quan
- `switch project` hiện là session-context behavior quanh `current_project_id`, không nên bị kể như một project mutation thông thường
- `/org/tasks` trong org shell có thể vẫn bị thu hẹp theo `current_project_id` nếu request không bật organization-wide scope rõ ràng

### Profile, Talent, Notifications, Settings, Admin Support

Mở theo thứ tự:

1. `docs/11-diagrams/Action/act_07_profile_skills_overview.mmd`
2. `docs/11-diagrams/Sequence/seq_09_skill_profile.mmd`
3. `docs/11-diagrams/UserFlow/uf_03_profile_snapshot_bookmark_journey.mmd`
4. `docs/11-diagrams/Action/act_08_platform_support_overview.mmd`
5. `docs/11-diagrams/Sequence/seq_11_notification_center.mmd`

Khi dùng:

- cần hiểu verified profile, snapshot sharing, bookmark journey
- cần hiểu notification/settings/admin support surfaces

Lưu ý thực dụng:

- `Action/act_07b_skill_management.mmd` giờ tập trung vào manual skill CRUD + spider-chart read
- nếu concern là reviewed skill aggregates sau review confirm, mở thêm `Action/act_07c_reviewed_skill_recalculation.mmd`

## Verified Journeys

Phần này không phải diagram source. Đây là các hành trình đã được code/route/test hỗ trợ đủ mạnh để docs có thể nói thành câu chuyện dễ hiểu.

Đây là phần rất hữu ích cho:

- người mới cần hiểu hệ thống chạy ra sao
- reviewer cần mental model nhanh
- on-call cần biết flow nào đã có proof mạnh thay vì chỉ có page shell

Nguyên tắc tin cậy:

- journey nào được kể ở đây phải bám vào route, controller, model, hoặc test evidence đủ mạnh
- nếu chỉ mới có page artifact mà chưa có runtime proof rõ, file này không được kể như journey đã hoàn chỉnh

### 1. Từ login tới profile có evidence

Hành trình rút gọn:

1. Người dùng đi qua OAuth login.
2. Session được tạo hoặc phục hồi.
3. Người dùng chọn hoặc chuyển organization hiện hành.
4. Người dùng vào project hoặc task thuộc organization đó.
5. Người dùng tạo/nhận task và nộp submission package nếu flow yêu cầu.
6. Review session đi qua submit, confirm, hoặc dispute; task-level reverse review hiện là legacy/deprecated path chứ không còn flow active bình thường.
7. Khi review được confirm, pipeline aggregate/profile cache được cập nhật.

Điểm reader nên nhớ:

- confirm review không chỉ đóng review
- nó còn kéo theo credibility/trust/performance/profile aggregate side effects

Nguồn:

- `start/routes/auth.ts`
- `start/routes/organizations.ts`
- `start/routes/projects.ts`
- `start/routes/tasks.ts`
- `start/routes/reviews.ts`
- `start/routes/users.ts`
- `app/modules/reviews/actions/commands/confirm_review_command.ts`
- `app/modules/reviews/listeners/review_listener.ts`
- `app/modules/reviews/actions/ports/review_cache_port_impl.ts`

### 2. Contributor marketplace proposal journey

Hành trình rút gọn:

1. Người dùng vào `/marketplace/tasks`.
2. Người dùng lọc hoặc tìm task mở.
3. Người dùng gửi đề xuất tham gia qua web route hoặc API route.
4. Bên project/org xem ranking và match score.
5. Đề xuất được approve, reject, hoặc withdraw.
6. Nếu contributor trở thành assignee, flow quay lại task/submission/review pipeline.

Điểm reader nên nhớ:

- proposal submit không phải điểm cuối
- marketplace thực sự nối vào assignment và review governance về sau

Nguồn:

- `start/routes/tasks.ts`
- `app/modules/tasks/tests/backend/integration/task_applications.spec.ts`
- `app/modules/tasks/tests/backend/integration/application_match_score.spec.ts`
- `app/modules/tasks/tests/backend/integration/my_applications_flow.spec.ts`

### 3. Talent sourcing journey

Hành trình rút gọn:

1. Người dùng vào talent discovery surface.
2. Search chạy qua `GET /api/talents/search` hoặc canonical org-talent search `GET /api/v1/me/organizations/current/talents/search`.
3. Talent detail trong org context đọc qua `GET /api/v1/me/organizations/current/talents/:userId`.
4. Bookmark flow lưu recruiter intent/notes/rating.
5. Public snapshot có thể được dùng như profile shareable ở ngoài workspace nội bộ.

Điểm reader nên nhớ:

- talent sourcing không chỉ là list page
- nó nối search, detail, bookmark, snapshot sharing

Nguồn:

- `start/routes/users.ts`
- `app/modules/users/infra/models/recruiter_bookmark.ts`
- `app/modules/users/infra/models/user_profile_snapshot.ts`
- `docs/01-business/features/profile_pipeline_and_marketplace.md`

### 4. Org talent page shell

Đây không còn là surface mơ hồ.

Hiện đã có:

- route `GET /org/talents`
- route `GET /org/talents/:userId`
- route `GET /org/bookmarks`
- controller `app/modules/users/controllers/org_talents_page_controller.ts`
- page shell `inertia/apps/org/modules/talents/*`
- bookmark shell `inertia/apps/org/modules/bookmarks/index.svelte`
- E2E `inertia/apps/org/tests/e2e/org/org_talent_pages.spec.ts`
- E2E `inertia/apps/org/tests/e2e/org/talent_bookmarks.spec.ts`

Code audit note:

- `/api/org/talents/*` hiện chỉ nên đọc như compatibility alias deprecated
- nếu cần contract chính để tin, ưu tiên `/api/v1/me/organizations/current/talents/*`

Ý nghĩa:

- docs có thể coi đây là user-facing surface đã được xác nhận khá mạnh

## Flow Families In Repo

### Action / Business Flow

Repo dùng:

- `docs/11-diagrams/Action/*`
- `docs/11-diagrams/Usecase/*`

Vai trò:

- action diagrams: business flow overview + detail
- usecase diagrams: actor-goal mapping ở mức khái niệm

Khi mới đọc domain, nên mở action overview trước sequence.

### Sequence

Repo dùng:

- `docs/11-diagrams/Sequence/*`

Vai trò:

- interaction order theo scenario
- rất hợp cho debug, review test, hoặc giải thích “ai gọi ai trước”

### Data Flow

Repo dùng:

- `docs/11-diagrams/DFD/*`

Vai trò:

- external entity, process, data store, data flow
- hợp khi cần hiểu hệ thống vận hành theo data movement thay vì call sequence

### User Flow

Repo dùng:

- `docs/11-diagrams/UserFlow/uf_01_onboarding_org_context.mmd`
- `docs/11-diagrams/UserFlow/uf_02_marketplace_task_application_journey.mmd`
- `docs/11-diagrams/UserFlow/uf_03_profile_snapshot_bookmark_journey.mmd`

Vai trò:

- giúp người không chuyên kỹ thuật nhìn hành trình người dùng nhanh hơn sequence

## Wireframe / Prototype

### Điều Repo Hiện Có

Repo có nhiều UI implemented surfaces thật trong split frontend hiện tại:

- `inertia/apps/user/modules/*`
- `inertia/apps/org/modules/*`
- `inertia/apps/admin/modules/*`
- `inertia/bones/*`

Ngoài ra còn có page shell đã được route-confirmed như:

- `inertia/apps/org/modules/disputes/index.svelte`
- `inertia/apps/org/modules/talents/*`
- `inertia/apps/admin/modules/proficiency/*`

### Điều Hệ Thống Chưa Có

Chưa thấy standalone artifact kiểu:

- wireframe board
- Figma export
- prototype HTML/PDF riêng
- interactive prototype artifact tách biệt

Vì vậy:

- implemented page không tự động bị gọi là wireframe
- docs phải nói thật là hệ thống hiện chủ yếu có implemented UI + diagram support, không có design artifact gốc riêng

## Khi Nào Dừng Ở File Này

Dừng ở file này khi bạn đã biết:

1. domain concern của mình nên mở overview, scenario, hay state/data support
2. sơ đồ nào là điểm vào đúng nhất cho flow đang hỏi
3. lúc nào cần quay lại diagram guide chung, data docs, hay operations docs để lấy thêm context
