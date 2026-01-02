# Profile Pipeline Và Marketplace

## Mục đích

Tài liệu này gom context đã được kiểm chứng cho pipeline tính điểm hồ sơ, talent sourcing, talent bookmarks, match score, và các surface marketplace liên quan.

## Nếu Bạn Chỉ Có 5 Phút

Chỉ cần nhớ bốn ý:

1. Profile pipeline của Suar biến review evidence thành profile signal có thể hiển thị, chia sẻ, và dùng lại cho marketplace.
2. Talent page chỉ là cửa vào; search query và bookmark APIs mới là nơi contract runtime sống rõ nhất.
3. Search hiện có thể đi qua engine hoặc fallback về legacy query path; đừng giả định Elasticsearch luôn là đường duy nhất.
4. `/api/org/talents/*` là compatibility alias; canonical org-talent surface hiện tại là `/api/v1/me/organizations/current/talents/*`.
5. Skill/profile surface hiện dùng bốn nhóm canonical: `technology`, `engineering`, `soft_skill`, `delivery`; `technical` cũ chỉ là legacy taxonomy, không phải category runtime mới.

Nếu đang gấp:

- lỗi search/talent directory: đọc phần `Search Engine, Fallback, Và Query Truth`
- lỗi bookmark: đọc phần `Talent Search Và Bookmarking`
- lỗi profile/public snapshot: đọc phần `Profile Pipeline`

## Profile Pipeline

### Mục tiêu

Biến dữ liệu review hoàn tất thành dữ liệu hồ sơ có thể hiển thị, chia sẻ, và dùng lại cho marketplace.

Theo capability model hiện hành trong `docs/01-business/`, pipeline này nằm ở điểm giao nhau giữa:

- Work Evidence Layer
- Assessment Layer
- Governance Layer
- Profile Intelligence Layer
- Matching and Recommendation Layer

Điều này có nghĩa pipeline hồ sơ trong Suar không chỉ là “cập nhật điểm”, mà là chuỗi biến đổi từ evidence công việc sang capability conclusion có thể dùng lại cho tuyển chọn.

### Thành phần đã được xác nhận

1. User Skills
2. Trust Score
3. Reviewer Credibility Score
4. Profile Snapshots
5. Delivery / Performance Metrics

Nguồn: `app/modules/users/infra/models/user.ts`, `app/modules/users/infra/models/user_skill.ts`, `app/modules/users/infra/models/user_profile_snapshot.ts`, `app/modules/reviews/actions/commands/calculate_trust_score_command.ts`, `app/modules/reviews/actions/commands/update_reviewer_credibility_command.ts`, `app/modules/users/actions/commands/publish_user_profile_snapshot_command.ts`

### Skill Taxonomy Runtime

Runtime hiện dùng bốn category skill:

- `technology`: ngôn ngữ, framework, runtime, database, tool, platform
- `engineering`: software engineering fundamentals, architecture, design, testing, code review, quality practices
- `soft_skill`: collaboration/cognitive/human skills
- `delivery`: planning, release, risk, documentation, execution ownership

Evidence:

- `app/modules/skills/constants/skill_constants.ts`
- `database/migrations/20260718150000_migrate_skill_categories_to_four_groups.ts`
- `app/modules/tasks/domain/task_required_skill_category_rules.ts`
- `inertia/apps/user/modules/tasks/lib/rules/task_skill_category_rules.ts`
- `inertia/apps/org/modules/tasks/lib/rules/task_skill_category_rules.ts`

Implication:

- profile/spider chart docs mới phải nói `Technology`, `Engineering`, `Soft Skills`, `Delivery`
- `technical` chỉ còn là legacy naming trong notes/spec cũ hoặc migration input; không dùng làm category canonical cho report mới

### Signals dữ liệu đã được xác nhận

- review confirmation
- completed review sessions
- trust_data trên `users`
- credibility_data trên `users`
- profile snapshot summary / performance_metrics / trust_metrics

Từ `schema/migration evidence` và model hiện tại, có thể đối chiếu thêm:

- `review_sessions` giữ các dimension như `overall_quality_score`, `delivery_timeliness`, `requirement_adherence`, `communication_quality`, `code_quality_score`, `proactiveness_score`
- `user_profile_snapshots` giữ các payload dùng cho public/shareable profile
- `users` giữ `trust_data` và `credibility_data`

Nguồn: `app/modules/users/infra/models/user.ts`, `app/modules/users/infra/models/user_profile_snapshot.ts`, `app/modules/reviews/infra/models/review_session.ts`

### Gates đã được xác nhận trong tài liệu nguồn cũ và source hiện tại

- profile recalculation chạy sau review confirmation
- dispute có thể chặn hoặc điều chỉnh recalculation path
- public snapshot đóng gói dữ liệu shareable

Điều này cũng khớp với các route:

- `POST /profile/snapshots/publish`
- `GET /profile/snapshots/current`
- `GET /profile/snapshots/history`
- `PATCH /profile/snapshots/:id/access`
- `POST /profile/snapshots/:id/rotate-link`
- `GET /profiles/:slug`

Nguồn: `app/modules/reviews/actions/commands/confirm_review_command.ts`, `app/modules/reviews/listeners/review_listener.ts`, `app/modules/reviews/infra/repositories/read/review_metrics_repository.ts`, `start/routes/users.ts`, `app/modules/users/actions/commands/publish_user_profile_snapshot_command.ts`

## Talent Search Và Bookmarking

### Surface đã xác nhận

- `GET /org/talents`
- `GET /org/bookmarks`
- legacy redirects: `/marketplace/talents` → `/org/talents`, `/marketplace/bookmarks` → `/org/bookmarks`
- `GET /api/talents/search`
- `GET /api/talent-bookmarks`
- `POST /api/talent-bookmarks`
- `PATCH /api/talent-bookmarks/:bookmarkId`
- `DELETE /api/talent-bookmarks/:bookmarkId`
- `GET /api/v1/talents/search`
- `GET /api/v1/me/organizations/current/talents/search`
- `GET /api/v1/me/organizations/current/talents/:userId`
- `POST /api/v1/me/organizations/current/talents/:userId/bookmarks`
- `DELETE /api/v1/me/organizations/current/talents/:userId/bookmarks`

Nguồn: `start/routes/users.ts`

### Ghi chú về page shell org context

Hệ thống hiện có thêm:

- controller `app/modules/users/controllers/org_talents_page_controller.ts`
- UI `inertia/apps/org/modules/talents/*`
- E2E `inertia/apps/org/tests/e2e/org/org_talent_pages.spec.ts`
- bookmark E2E `inertia/apps/org/tests/e2e/org/talent_bookmarks.spec.ts`
- marketplace redirect smoke `inertia/apps/user/tests/e2e/marketplace/talent_directory_bookmarks.spec.ts`

Đối chiếu route hiện tại cho thấy page shell này đã được bind:

- `GET /org/talents`
- `GET /org/talents/:userId`

Vì vậy concern talent trong org context hiện không còn chỉ là page/controller/test artifact rời. Đây là user-facing surface đã có route, controller, UI, và E2E proof tương đối mạnh.

Caveat từ code audit:

- `/api/org/talents/*` hiện là deprecated compatibility aliases
- canonical org-talent JSON surface hiện tại là `/api/v1/me/organizations/current/talents/*`
- talent search hiện không phải all-or-nothing Elasticsearch; query có thể fallback về legacy path nếu engine rỗng hoặc lỗi

### Data đã xác nhận

- `recruiter_bookmarks.recruiter_user_id`
- `recruiter_bookmarks.talent_user_id`
- `recruiter_bookmarks.notes`
- `recruiter_bookmarks.folder`
- `recruiter_bookmarks.rating`

`recruiter_bookmarks` là tên bảng legacy đang backing talent bookmarks runtime; API/domain label mới dùng talent bookmarks.

Nguồn: `app/modules/users/infra/models/recruiter_bookmark.ts`

## Marketplace Matching Và Ranking

### Surface đã xác nhận

- `GET /api/tasks/:taskId/applications/ranking`
- `GET /api/tasks/:taskId/applications/:applicationId/match`
- `GET /api/v1/tasks/:taskId/applications/ranking`
- `GET /api/v1/tasks/:taskId/applications/:applicationId/match`
- `GET /tasks/:taskId/applications`

Nguồn: `start/routes/marketplace.ts` cho applicant tracking, canonical `/api/v1` match/ranking, và compat `/api` match/ranking.

### Cấu phần match context đã được xác nhận trong evidence nguồn

- required skills của task
- reviewed skill signals
- quality / delivery signals
- work history hoặc domain overlap signals
- public profile snapshot and validated aggregate signals
- task context fields như autonomy, business domain, measurable outcomes, tech stack

Nguồn: `start/routes/tasks.ts`, `app/modules/tasks/infra/models/task.ts`, `app/modules/reviews/infra/repositories/read/review_metrics_repository.ts`, `app/modules/users/infra/models/user_profile_snapshot.ts`

## What Not To Do

- không mô tả talent discovery như page list user đơn giản nếu file này đang ghi rõ engine/fallback/profile-signal context
- không dùng compatibility alias `/api/org/talents/*` làm canonical surface trong report mới
- không thấy search page tồn tại rồi tự kết luận search engine luôn active hoặc luôn được dùng
- không kể talent bookmarks như UI-only convenience nếu runtime đã có stored artifact và CRUD surfaces thật

## My Applications

### Surface đã xác nhận

- `GET /my-applications`
- `POST /applications/:id/withdraw`

Nguồn: `start/routes/marketplace.ts`.

### Constraint đã xác nhận

- withdrawn application giữ trong history
- active list không giữ withdrawn application

Nguồn: `start/routes/marketplace.ts`, `app/modules/marketplace/controllers/my_marketplace_applications_controller.ts`, `app/modules/marketplace/controllers/withdraw_marketplace_application_controller.ts`, `docs/11-diagrams/Action/02-marketplace/high-level/act_02c_marketplace_withdraw.mmd`

## Test Evidence

### Integration

- `app/modules/users/tests/backend/integration/talent_directory_access_and_filters.spec.ts`
- `app/modules/users/tests/backend/integration/user_marketplace_api_standardization.spec.ts`
- `app/modules/tasks/tests/backend/integration/task_application_access.spec.ts`
- `app/modules/tasks/tests/backend/integration/my_applications_flow.spec.ts`
- `app/modules/tasks/tests/backend/integration/application_match_score.spec.ts`
- `app/modules/reviews/tests/backend/integration/reverse_review_access.spec.ts`
- `app/modules/reviews/tests/backend/integration/reverse_review_page_contract.spec.ts`
- `app/modules/reviews/tests/backend/integration/reverse_review_reads.spec.ts`

### E2E

- `inertia/apps/user/tests/e2e/tasks/task_application_triage.spec.ts`
- `inertia/apps/org/tests/e2e/projects/staffing_flow.spec.ts`
- `inertia/apps/org/tests/e2e/projects/project_member_management.spec.ts`
- `inertia/apps/user/tests/e2e/tasks/task_create_role_prefill.spec.ts`
- `inertia/apps/user/tests/e2e/tasks/match_score_explainability.spec.ts`
- `inertia/apps/user/tests/e2e/profile/profile_trust_explanation.spec.ts`
- `inertia/apps/org/tests/e2e/org/org_talent_pages.spec.ts`
- `inertia/apps/org/tests/e2e/org/talent_bookmarks.spec.ts`
- `inertia/apps/user/tests/e2e/marketplace/talent_directory_bookmarks.spec.ts`

## Related Diagrams

- `docs/11-diagrams/Action/02-marketplace/README.md`
- `docs/11-diagrams/Action/02-marketplace/high-level/act_02b_marketplace_apply.mmd`
- `docs/11-diagrams/Action/02-marketplace/high-level/act_02c_marketplace_withdraw.mmd`
- `docs/11-diagrams/Action/02-marketplace/high-level/act_02d_marketplace_triage_ranking.mmd`
- `docs/11-diagrams/Action/07-profile-skills/README.md`
- `docs/11-diagrams/Sequence/03-marketplace/high-level/seq_03_marketplace_apply.mmd`
- `docs/11-diagrams/Sequence/09-profile-skills/high-level/seq_09_skill_profile.mmd`

## Boundary

Hệ thống hiện không có:

- standalone matching-formula whitepaper
- standalone recruiter scoring guide
- standalone profile aggregation legal statement

Tài liệu này chỉ ghi lại pipeline, fields, routes, tests, và diagram đã có bằng chứng trong hệ thống.

## Khi Nào Dừng Ở File Này

Bạn có thể dừng ở file này nếu mục tiêu của bạn là:

- hiểu profile pipeline của Suar biến review evidence thành public/shareable profile như thế nào
- mô tả talent search, bookmark, matching, ranking, và my-applications ở mức business + runtime surface
- viết report về marketplace/profile capability mà không cần mở code
- khoanh nhanh khu vực cần điều tra khi production lỗi ở talent, bookmark, ranking, hoặc profile snapshot

Bạn nên đọc thêm file khác chỉ khi:

- cần business scope rộng hơn của toàn sản phẩm: mở `../feature-specification.md`
- cần API inventory đầy đủ hơn theo namespace: mở `../../06-data/api-specification.md`
- cần sequence hoặc action flow trực quan: mở các file trong `../../11-diagrams/`
