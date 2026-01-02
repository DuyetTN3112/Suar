# Suar — Test Automation Evidence And Traceability Map

## Mục đích

File này giữ tên đường dẫn cũ `test-case-matrix.md` để không phá link, nhưng nội dung đúng là automation evidence/traceability map, không phải hierarchical test-case matrix.

Tài liệu này ghi lại evidence kiểm thử đang hiện diện trong hệ thống hiện tại để hỗ trợ:

- truy vết từ feature sang test
- xác nhận các domain cốt lõi đã có automation
- chỉ ra file test cụ thể để người đọc kiểm tra tiếp

Tài liệu này không thay thế toàn bộ lịch sử test execution. Nguồn sự thật hiện tại nằm ở:

- `app/modules/*/tests/backend/*`
- `inertia/apps/{user,org,admin}/tests/*`
- `tests/helpers/*`, `tests/frontend/*`, và `tests/shared/*` cho harness/helper dùng chung

Nếu bạn chỉ cần dùng nhanh:

- muốn biết domain nào đã có automation: đọc `Traceability Matrix`
- muốn biết có những họ test nào trong hệ thống: đọc `Test Families`
- muốn biết nên chạy command nào trước: đọc `Commands liên quan`

## Nếu Dùng File Này Để Viết Report Bên Ngoài Repo

Bạn có thể dùng file này để viết:

- chương test strategy
- phần traceability giữa feature và automation evidence
- phần nhận xét mức độ coverage theo domain

Đây là file phù hợp để trả lời:

- hệ thống đang có những họ test nào
- domain nào đã có automation proof rõ
- nên dẫn file test nào khi cần bằng chứng kiểm thử

Nhưng file này không tự động chứng minh:

- tất cả test đang green ở mọi thời điểm
- mọi flow đã có end-to-end proof đầy đủ
- một domain đã “hoàn tất chất lượng” chỉ vì có vài test file

Nếu cần nói về mức độ chắc chắn cao hơn, đọc thêm:

- `./hierarchical-test-case-decomposition.md`
- `../12-evidence/workstream-status-audit.md`
- `../09-operations/runbook-monitoring-maintenance.md`

Một câu nhớ ngắn cho report:

`File này là bản đồ automation evidence hiện diện trong hệ thống, không phải báo cáo test execution của một lần chạy cụ thể.`

## Nếu Bạn Chỉ Có 3 Phút

Chỉ cần nhớ bốn ý:

1. File này là bản đồ điều hướng test, không phải kết quả test run.
2. Domain cốt lõi như `tasks`, `projects`, `organizations`, `reviews`, `marketplace` đều đã có automation evidence rõ.
3. Không phải route hay page nào có proof cũng mạnh như nhau; luôn đọc đúng file test khi cần kết luận sâu.
4. Nếu đang sửa code, hãy dùng matrix để tìm file test gần nhất trước rồi mới quyết định chạy suite nào.

Một câu nhớ ngắn:

`File này là bản đồ đọc test, không phải kết quả chạy test.`

## Code Audit Notes

Từ code audit hiện tại, có vài điều rất quan trọng khi dùng test matrix:

- route middleware truth không phải lúc nào cũng là permission truth cuối cùng
- nhiều access rule được enforce thêm ở command/query/domain policy layer
- vì vậy khi chọn test để chứng minh quyền truy cập, nên ưu tiên integration/contract tests hơn là chỉ nhìn unit test của mapper hoặc view model

Một quy tắc thực dụng:

- cần chứng minh route tồn tại: route file + page/component/E2E có thể đủ
- cần chứng minh contract JSON: ưu tiên contract/integration test
- cần chứng minh permission: ưu tiên integration test đi qua command/query thật
- cần chứng minh UI rendering ổn định: ưu tiên component/E2E proof

## Test Families

Các họ test đang có trong hệ thống:

- `app/modules/*/tests/backend/unit`
- `app/modules/*/tests/backend/integration`
- `app/modules/*/tests/backend/contract`
- `app/modules/*/tests/backend/architecture`
- `inertia/apps/*/tests/e2e`
- `inertia/apps/*/tests/modules`
- `inertia/apps/*/tests/shared`
- `inertia/apps/*/tests/storybook`
- `tests/helpers`
- `tests/frontend`
- `tests/shared`

Nguồn: quét `app/modules/*/tests`, `inertia/apps/*/tests`, và root `tests/*` hiện hành. Các root cũ như `inertia/tests/*`, `tests/integration/*`, `tests/unit/*`, `tests/contract/*`, `tests/e2e/*` đã được migrate hoặc retire; chỉ đọc chúng như legacy path khi xuất hiện trong plan/handoff cũ.

## Commands liên quan

Theo `package.json`, các lệnh kiểm thử chính gồm:

- `pnpm run test:unit`
- `pnpm run test:integration`
- `pnpm run test:contract`
- `pnpm run test:e2e`
- `pnpm run test:ui`
- `pnpm run test:ui:runnable`
- `pnpm run test:inventory`
- `pnpm run test:inventory:modules`
- `pnpm run test:quality:critical`

## Latest Local Verification Snapshot

Ngày `2026-07-17`, worktree hiện tại được rà lại sau đợt split frontend/backend lớn:

- `pnpm run typecheck` pass: TypeScript + `svelte-check` 0 errors, 0 warnings.
- `pnpm run lint` pass: backend app, backend rest/config, frontend Svelte/TS.
- `pnpm run test:unit` pass: 407 backend unit tests.
- `pnpm run test:ui:runnable` pass: 141 frontend test files, 361 tests.
- Focused guard mới `inertia/apps/org/tests/shared/inertia_page_resolution.test.ts` xác nhận các page names tĩnh `index` và `org/no_org` resolve được trong multi-app Inertia setup.

Snapshot này là bằng chứng lần chạy local, không thay thế CI hoặc E2E full browser matrix.

## Traceability Matrix

| Domain | Capability | Evidence test files |
|---|---|---|
| Auth | Social login concurrency, provider linking, missing email rejection | `app/modules/auth/tests/backend/integration/social_login.spec.ts` |
| Auth | Test-only token login, token refresh, org-aware session bootstrap, bearer/session bridge behavior | `app/modules/auth/tests/backend/integration/testing_auth_tokens.spec.ts`, `app/modules/auth/tests/backend/integration/testing_auth_state.spec.ts` |
| Tasks | Create task, metadata persistence, assignment constraints, org/project invariant | `app/modules/tasks/tests/backend/integration/create_task.spec.ts` |
| Tasks | Assign, reassign, unassign, notifications and audit side effects | `app/modules/tasks/tests/backend/integration/assign_task.spec.ts` |
| Tasks | Task list visibility by org role and membership state | `app/modules/tasks/tests/backend/integration/list_tasks.spec.ts` |
| Tasks | Revoke task access | `app/modules/tasks/tests/backend/integration/revoke_task_access.spec.ts` |
| Tasks | Marketplace apply, duplicate rejection, expired window, approve/reject processing | `app/modules/tasks/tests/backend/integration/task_applications.spec.ts` |
| Tasks | Application access control | `app/modules/tasks/tests/backend/integration/task_application_access.spec.ts` |
| Tasks | My proposals flow | `app/modules/tasks/tests/backend/integration/my_applications_flow.spec.ts` |
| Tasks | Application match score and ranking | `app/modules/tasks/tests/backend/integration/application_match_score.spec.ts` |
| Tasks | Task-status/workflow legacy and `/api/v1` contract parity | `app/modules/tasks/tests/backend/contract/task_statuses_workflow_api.contract.spec.ts` |
| Projects | Create project | `app/modules/projects/tests/backend/integration/create_project.spec.ts` |
| Projects | Delete project and incomplete-task guards | `app/modules/projects/tests/backend/integration/delete_project.spec.ts` |
| Projects | Project member lifecycle and counts | `app/modules/projects/tests/backend/integration/project_members.spec.ts` |
| Projects | Transfer project ownership | `app/modules/projects/tests/backend/integration/transfer_project_ownership.spec.ts` |
| Organizations | Join request lifecycle | `app/modules/organizations/tests/backend/integration/join_request.spec.ts` |
| Organizations | Membership role updates and member removal | `app/modules/organizations/tests/backend/integration/membership.spec.ts` |
| Organizations | Invitation query behavior | `app/modules/organizations/tests/backend/integration/org_invitations_query.spec.ts` |
| Organizations | Join request listing | `app/modules/organizations/tests/backend/integration/org_join_requests_query.spec.ts` |
| Organizations | Transfer organization ownership | `app/modules/organizations/tests/backend/integration/transfer_organization_ownership.spec.ts` |
| Middleware | Organization resolver and current org sync | `app/modules/organizations/tests/backend/integration/org_resolver.spec.ts` |
| Reviews | Create review session | `app/modules/reviews/tests/backend/integration/create_session.spec.ts` |
| Reviews | Submit review | `app/modules/reviews/tests/backend/integration/submit_review.spec.ts` |
| Reviews | Confirm review | `app/modules/reviews/tests/backend/integration/confirm_review.spec.ts` |
| Reviews | Self-assessment | `app/modules/reviews/tests/backend/integration/self_assessment.spec.ts` |
| Reviews | Trust score | `app/modules/reviews/tests/backend/integration/trust_score.spec.ts` |
| Reviews | Performance score | `app/modules/reviews/tests/backend/integration/performance_score.spec.ts` |
| Reviews | Spider chart recalculation | `app/modules/reviews/tests/backend/integration/spider_chart.spec.ts` |
| Reviews | Anomaly detection | `app/modules/reviews/tests/backend/integration/detect_anomaly.spec.ts` |
| Reviews | Reverse review access and page contracts | `app/modules/reviews/tests/backend/integration/reverse_review_access.spec.ts`, `app/modules/reviews/tests/backend/integration/reverse_review_page_contract.spec.ts`, `app/modules/reviews/tests/backend/integration/reverse_review_reads.spec.ts`, `app/modules/reviews/tests/backend/integration/reverse_review_target_guards.spec.ts` |
| Reviews | AI dispute callback | `app/modules/reviews/tests/backend/integration/ai_dispute_callback.spec.ts` |
| Admin | Audit log listing | `app/modules/admin/tests/backend/integration/audit_logs.spec.ts` |
| Admin | Flagged review list and resolve | `app/modules/admin/tests/backend/integration/flagged_reviews.spec.ts` |
| Marketplace | Talent directory access and filters | `app/modules/users/tests/backend/integration/talent_directory_access_and_filters.spec.ts` |
| Marketplace | Talent bookmarks workspace | `app/modules/users/tests/backend/integration/user_marketplace_api_standardization.spec.ts` |
| Auth E2E | OAuth-only login page and logout browser session behavior | `inertia/apps/user/tests/e2e/auth/login_page.spec.ts`, `inertia/apps/user/tests/e2e/auth/logout.spec.ts` |
| E2E | Staffing flow | `inertia/apps/org/tests/e2e/projects/staffing_flow.spec.ts` |
| E2E | Marketplace apply/withdraw/my applications | `inertia/apps/user/tests/e2e/marketplace/apply_withdraw_my_applications.spec.ts` |
| E2E | Marketplace talent directory/bookmarks | `inertia/apps/user/tests/e2e/marketplace/talent_directory_bookmarks.spec.ts`, `inertia/apps/org/tests/e2e/org/talent_bookmarks.spec.ts` |
| E2E | Sprint board role experience | `inertia/apps/org/tests/e2e/projects/sprint_board_role_experience.spec.ts` |
| E2E | Project member/status/detail/portfolio flows | `inertia/apps/org/tests/e2e/projects/project_member_management.spec.ts`, `inertia/apps/org/tests/e2e/projects/project_status_enum_matrix.spec.ts`, `inertia/apps/org/tests/e2e/projects/org_project_detail_split.spec.ts`, `inertia/apps/org/tests/e2e/projects/org_project_portfolio_split.spec.ts` |
| E2E | Match score explainability | `inertia/apps/user/tests/e2e/tasks/match_score_explainability.spec.ts` |
| E2E | Profile trust explanation | `inertia/apps/user/tests/e2e/profile/profile_trust_explanation.spec.ts` |
| E2E | Org invitation/join-request journeys | `inertia/apps/org/tests/e2e/org/invitation_journey.spec.ts`, `inertia/apps/org/tests/e2e/org/join_request_journey.spec.ts` |
| E2E | Org governance and portfolio pages | Current specs under `inertia/apps/org/tests/e2e/org/*`; task/review board proof is intentionally excluded from the Org shell |
| E2E | Canonical Project review boards | `inertia/apps/user/tests/e2e/reviews/task_review_board_demo.spec.ts`, `inertia/apps/user/tests/e2e/reviews/sprint_reverse_review_board_demo.spec.ts` |
| E2E | Task create/submission/application/status-browser checks | `inertia/apps/user/tests/e2e/tasks/task_create_role_prefill.spec.ts`, `inertia/apps/user/tests/e2e/tasks/task_submission_package.spec.ts`, `inertia/apps/user/tests/e2e/tasks/task_application_access.spec.ts`, `inertia/apps/user/tests/e2e/tasks/task_application_triage.spec.ts`, `inertia/apps/user/tests/e2e/tasks/dialog_reactivity_matrix.spec.ts` |
| E2E | Admin audit/proficiency browser checks | `inertia/apps/admin/tests/e2e/admin/admin_audit_logs_console.spec.ts`, `inertia/apps/admin/tests/e2e/admin/admin_proficiency_rubric_read.spec.ts` |
| E2E | Meta policy false-pass guard | `inertia/apps/user/tests/e2e/meta/no_false_pass_patterns.spec.ts` |
| Architecture | Boundary guard | `app/modules/http/tests/backend/architecture/boundary_guards.spec.ts` |

## Coverage Notes

- Nhóm marketplace/profile hiện đã có coverage rõ ở các file test đã liệt kê phía trên; khi cần đi sâu hơn, ưu tiên đọc test file trực tiếp thay vì tóm tắt qua nguồn phụ.
- Nếu cần rà implementation detail, ưu tiên route, test, command/query, và model hiện hành thay vì inventory phụ trợ.
- `org_talent_pages` hiện đã có evidence mạnh hơn mức artifact rời:
  - route `/org/talents` và `/org/talents/:userId` đã được xác nhận trong `start/routes/users.ts`
  - controller page shell đã tồn tại
  - E2E proof đã có ở `inertia/apps/org/tests/e2e/org/org_talent_pages.spec.ts`
- bookmark workspace có UI và E2E riêng:
  - route `/org/bookmarks` đã được xác nhận trong `start/routes/users.ts`
  - page shell `inertia/apps/org/modules/bookmarks/index.svelte`
  - E2E proof đã có ở `inertia/apps/org/tests/e2e/org/talent_bookmarks.spec.ts`
- `review/dispute browser evidence` phải bám canonical surface:
  - bốn Project board routes nằm trong `start/routes/projects.ts`
  - `/org/disputes`, reviewer inbox và review/reverse-review history pages phải tiếp tục vắng mặt
  - route/source guards nằm ở `review_access_guards.spec.ts` và `realm_separation_source.spec.ts`
  - Project board E2E nằm ở hai spec `inertia/apps/user/tests/e2e/reviews/*_board_demo.spec.ts`
  - System board component/backend proof nằm dưới `inertia/apps/admin/tests/modules/disputes/*` và admin dispute tests
- `admin_proficiency_rubric_read` hiện không còn là “route chưa rõ”:
  - admin web routes `/admin/proficiency`, `/admin/proficiency/:proficiencyScaleId`, `/admin/proficiency/rubrics/:skillId` đã được xác nhận trong `start/routes/admin.ts`
  - controller proof đã có
  - E2E proof đã được migrate sang `inertia/apps/admin/tests/e2e/admin/admin_proficiency_rubric_read.spec.ts`

Code audit caveat:

- không phải domain nào có “route + page + một test” cũng mạnh ngang nhau
- ví dụ:
  - route + controller + E2E thường mạnh hơn route + controller + unit/view-model proof
  - integration + contract + E2E là tổ hợp mạnh hơn chỉ component test
- riêng nhóm `testing_auth_*`, đây là evidence rất hữu ích để hiểu auth/tooling behavior trong môi trường `development|test`, nhưng không được dùng như bằng chứng rằng `/api/testing/*` là production surface

Khi viết report hoặc audit coverage, nên mô tả theo mức:

- `strong`: route + runtime logic + integration/contract/E2E
- `medium`: route + controller/page + component hoặc unit proof
- `weak`: artifact có mặt nhưng thiếu proof runtime đủ sâu

## Cách Đọc Theo Vai Trò

- QA/tester: bắt đầu từ domain/capability rồi mở file test tương ứng
- dev: dùng matrix để tìm test gần nhất với vùng code đang sửa
- reviewer/manager: đọc matrix để hiểu automation breadth, nhưng không dùng nó thay cho việc kiểm tra test file khi cần kết luận sâu

## Limit hiện tại

- Tài liệu này không sao chép toàn bộ mọi test case row từ từng file spec.
- Với từng domain, file test cụ thể đã được liệt kê để người đọc tra cứu trực tiếp trong source.

## Khi Nào Dừng Ở File Này

Dừng ở file này khi bạn đã biết:

1. domain hoặc capability mình quan tâm đã có automation gì
2. file test nào là evidence gần nhất với câu hỏi của mình
3. mình nên mở test file, route, hay docs requirement tiếp theo
