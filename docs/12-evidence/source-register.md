# Source Register

## Verification Scope

Tài liệu này phục vụ người bảo trì docs, reviewer, và audit trail. Đây không phải điểm vào chính cho người mới muốn hiểu hệ thống; phần hiểu biết dành cho người đọc cuối phải nằm trong các tài liệu domain/feature/operations tương ứng.

Tài liệu trong `docs/` được dựng từ các nguồn đã đọc trực tiếp trong hệ thống hiện tại:

- `package.json`
- `start/routes/index.ts`
- `start/routes/auth.ts`
- `start/routes/api_v1.ts`
- `start/routes/api.ts`
- `start/routes/admin.ts`
- `start/routes/tasks.ts`
- `start/routes/projects.ts`
- `start/routes/reviews.ts`
- `start/routes/organizations.ts`
- `start/routes/users.ts`
- `start/routes/deprecated/api_context_aliases.ts`
- `start/routes/deprecated/api_org_compat_aliases.ts`
- `start/routes/deprecated/api_v1_org_aliases.ts`
- `start/routes/deprecated/task_surface_aliases.ts`
- `start/env.ts`
- `start/health.ts`
- `start/limiter.ts`
- `config/auth.ts`
- `config/database.ts`
- `config/logger.ts`
- `config/redis.ts`
- `config/session.ts`
- `config/shield.ts`
- `config/transmit.ts`
- `database/schema.ts`
- `database/migrations/README.md`
- `database/migrations/00000000000000_template_migration.ts.example`
- `app/modules/users/infra/models/user.ts`
- `app/modules/organizations/infra/models/organization.ts`
- `app/modules/projects/infra/models/project.ts`
- `app/modules/tasks/infra/models/task.ts`
- `app/modules/tasks/infra/models/task_application.ts`
- `app/modules/reviews/infra/models/review_session.ts`
- `app/modules/reviews/infra/models/project_sprint.ts`
- `app/modules/reviews/infra/models/sprint_review_package.ts`
- `app/modules/reviews/infra/models/sprint_manager_review.ts`
- `app/modules/reviews/infra/models/sprint_environment_review.ts`
- `app/modules/users/infra/models/recruiter_bookmark.ts`
- `app/modules/users/infra/models/user_profile_snapshot.ts`
- `app/modules/audit/infra/models/audit_log.ts`
- `app/modules/audit/infra/repositories/audit_repository_provider.ts`
- `app/modules/audit/infra/repositories/postgres_audit_log_repository.ts`
- `app/modules/audit/domain/audit_event_scope.ts`
- `app/modules/audit/domain/audit_event_redaction.ts`
- `app/modules/audit/domain/audit_event_hash.ts`
- `app/modules/notifications/infra/repositories/notification_repository_provider.ts`
- `database/migrations/20260729070000_canonicalize_auth_session_audit_evidence.ts`
- `app/modules/reviews/actions/commands/confirm_review_command.ts`
- `app/modules/reviews/actions/commands/detect_anomaly_command.ts`
- `app/modules/reviews/actions/commands/report_review_dispute_command.ts`
- `app/modules/reviews/actions/commands/process_ai_dispute_callback_command.ts`
- `app/modules/reviews/actions/commands/submit_reverse_review_command.ts`
- `app/modules/reviews/actions/commands/ensure_task_review_workflow_command.ts`
- `app/modules/reviews/actions/commands/submit_task_review_command.ts`
- `app/modules/reviews/actions/commands/accept_task_review_command.ts`
- `app/modules/reviews/actions/commands/respond_to_task_review_command.ts`
- `app/modules/reviews/actions/commands/report_task_review_dispute_command.ts`
- `app/modules/reviews/actions/commands/close_project_sprint_review_command.ts`
- `app/modules/reviews/actions/commands/close_project_sprint_review_period_command.ts`
- `app/modules/reviews/actions/commands/submit_sprint_review_package_command.ts`
- `app/modules/reviews/actions/commands/submit_sprint_reverse_review_workflow_command.ts`
- `app/modules/reviews/actions/commands/accept_sprint_reverse_review_workflow_command.ts`
- `app/modules/reviews/actions/commands/respond_sprint_reverse_review_workflow_command.ts`
- `app/modules/reviews/actions/commands/report_sprint_reverse_review_workflow_command.ts`
- `app/modules/reviews/actions/queries/list_org_review_disputes_query.ts`
- `app/modules/reviews/actions/queries/get_task_review_board_query.ts`
- `app/modules/reviews/actions/queries/get_sprint_reverse_review_board_query.ts`
- `app/modules/reviews/actions/queries/list_sprint_review_packages_query.ts`
- `app/modules/reviews/actions/queries/list_pending_sprint_review_packages_query.ts`
- `app/modules/reviews/actions/queries/get_sprint_review_package_detail_query.ts`
- `app/modules/reviews/infra/repositories/read/task_review_board_queries.ts`
- `app/modules/reviews/domain/task_review_workflow.ts`
- `app/modules/reviews/domain/sprint_reverse_review_workflow.ts`
- `app/modules/reviews/domain/sprint_review_rules.ts`
- `app/modules/http/boundary/http_transport.ts`
- `app/modules/http/middleware/bind_http_transport_middleware.ts`
- `app/modules/auth/middleware/auth_middleware.ts`
- `app/modules/organizations/middleware/organization_resolver_middleware.ts`
- `app/modules/organizations/middleware/require_organization_middleware.ts`
- `app/modules/http/health_checks/search_health_check.ts`
- `app/modules/reviews/actions/commands/recalculate_reviewee_skill_scores_command.ts`
- `app/modules/reviews/actions/commands/calculate_performance_score_command.ts`
- `app/modules/reviews/actions/commands/calculate_trust_score_command.ts`
- `app/modules/reviews/listeners/review_listener.ts`
- `app/modules/reviews/infra/repositories/read/review_metrics_repository.ts`
- `app/modules/tasks/actions/dtos/request/create_task_dto.ts`
- `app/modules/skills/constants/skill_constants.ts`
- `app/modules/tasks/domain/task_required_skill_category_rules.ts`
- `app/modules/users/actions/commands/publish_user_profile_snapshot_command.ts`
- `app/modules/tasks/actions/commands/update_task_sort_order_command.ts`
- `app/modules/tasks/actions/commands/batch_update_task_status_command.ts`
- `app/modules/tasks/actions/commands/complete_task_assignments_command.ts`
- `app/modules/tasks/actions/ports/outbound/task_assignment_completion_event_writer.ts`
- `app/modules/tasks/domain/task_status_mirror.ts`
- `app/composition/task_completion_transition_composition.ts`
- `app/composition/adapters/domain_event_task_assignment_completion_event_writer_adapter.ts`
- `app/composition/review_action_factory_provider.ts`
- `app/composition/factories/composed_review_action_factory.ts`
- `app/composition/user_application_provider.ts`
- `app/composition/task_application_provider.ts`
- `app/modules/sprints/README.md`
- `app/modules/sprints/actions/commands/create_project_sprint_command.ts`
- `app/modules/sprints/actions/commands/update_project_sprint_command.ts`
- `app/modules/sprints/actions/commands/move_task_to_sprint_command.ts`
- `app/modules/sprints/actions/queries/list_project_sprints_query.ts`
- `app/modules/sprints/actions/queries/get_project_sprint_query.ts`
- `app/modules/sprints/actions/queries/get_sprint_board_query.ts`
- `app/modules/sprints/domain/sprint_core_rules.ts`
- `app/modules/sprints/controllers/*`
- `app/modules/sprints/public_contracts/sprint_public_api.ts`
- `inertia/apps/org/modules/talents/index.svelte`
- `inertia/apps/org/modules/talents/show.svelte`
- `inertia/apps/org/modules/bookmarks/index.svelte`
- `inertia/apps/user/modules/reviews/task-board.svelte`
- `inertia/apps/user/modules/reviews/sprint-reverse-board.svelte`
- `inertia/apps/user/modules/tasks/index.svelte`
- `inertia/apps/admin/modules/disputes/index.svelte`
- `inertia/apps/admin/modules/disputes/show.svelte`
- `inertia/apps/user/modules/projects/components/project_sprint_panel.svelte`
- `inertia/apps/org/modules/projects/components/project_sprint_panel.svelte`
- `inertia/apps/user/modules/projects/show.svelte`
- `inertia/apps/org/modules/projects/show.svelte`
- `inertia/apps/admin/modules/proficiency/index.svelte`
- `inertia/apps/admin/modules/proficiency/show.svelte`
- `inertia/apps/admin/modules/proficiency/rubric.svelte`
- `docs/11-diagrams/README.md`
- Tập diagram `.mmd` trong `docs/11-diagrams/`
- `docs/DOCUMENTATION_WRITING_STANDARD_FOR_AI.md`
- `docs/08-testing/test-case-matrix.md`
- `app/modules/tasks/tests/backend/contract/task_statuses_workflow_api.contract.spec.ts`
- `app/modules/reviews/tests/backend/integration/org_dispute_queue_access.spec.ts`
- `app/modules/reviews/tests/backend/integration/ai_dispute_callback.spec.ts`
- `inertia/apps/org/tests/e2e/org/org_talent_pages.spec.ts`
- `inertia/apps/org/tests/e2e/org/talent_bookmarks.spec.ts`
- `inertia/apps/user/tests/e2e/marketplace/talent_directory_bookmarks.spec.ts`
- `inertia/apps/user/tests/e2e/reviews/task_review_board_demo.spec.ts`
- `inertia/apps/user/tests/e2e/reviews/sprint_reverse_review_board_demo.spec.ts`
- `inertia/apps/org/tests/e2e/org/org_workspace_navigation_smoke.spec.ts`
- `inertia/apps/admin/tests/e2e/admin/admin_proficiency_rubric_read.spec.ts`
- `docs/01-business/capability-model-and-product-positioning.md`
- `docs/01-business/features/profile_pipeline_and_marketplace.md`
- `docs/handovers/2026-07-04-search-session-handoff.md`
- `docs/handovers/2026-07-06-review-governance-session-handoff.md`
- `docs/demo-audit/README.md`
- `docs/demo-audit/2026-07-15-demo-runbook.md`
- `docs/demo-audit/2026-07-15-completion-audit.md`
- `docs/superpowers/handoffs/2026-07-03-capability-model-v6-profile-handoff.md`
- `docs/superpowers/handoffs/2026-07-03-org-project-task-redesign-session-handoff.md`
- `docs/superpowers/handoffs/2026-07-05-pagination-rollout-handoff.md`
- `docs/superpowers/plans/*`
- `docs/superpowers/specs/*`
- `docs/12-evidence/working-document-promotion-policy.md`
- `database/migrations/20260715090000_create_task_review_workflows.ts`
- `database/migrations/20260715100000_create_sprint_reverse_review_workflows.ts`
- `database/migrations/20260715110000_remove_review_workflow_db_constraints.ts`
- `database/migrations/20260715120000_normalize_task_review_in_review_status.ts`
- `database/migrations/20260716120000_add_project_sprint_goal.ts`
- `database/migrations/20260718120000_add_sprint_review_dispute_runtime_context.ts`
- `database/migrations/20260718130000_add_ai_dispute_evaluation_source_metadata.ts`
- `database/migrations/20260718133000_add_task_review_workflow_runtime_context.ts`
- `database/migrations/20260718133500_add_task_review_workflow_resolution_columns.ts`
- `database/migrations/20260718140000_add_sprint_reverse_review_resolution_columns.ts`
- `database/migrations/20260718150000_migrate_skill_categories_to_four_groups.ts`
- `database/migrations/20260719090000_add_enterprise_audit_events.ts`
- `docs/12-evidence/legacy-source-retirement-audit.md`
- `schema/migration evidence`
- `git status --short`
- `.gitnexus/meta.json`
- `node .gitnexus/run.cjs --help`

## Source Hierarchy

Khi nhiều nguồn cùng nói về một concern, bộ docs này ưu tiên theo thứ tự:

1. Route, config, schema, schema evidence, model, command/query/listener, test
2. Supporting docs already reconciled against those runtime files
3. Diagram corpus, diagram conventions, và diagram inventory
4. Narrative docs đã được hấp thụ vào taxonomy hiện tại và supplementary docs

`docs/DOCUMENTATION_WRITING_STANDARD_FOR_AI.md` là governance/style standard cho người và AI sửa docs. File này quyết định cách viết, cách phân biệt fact/inference/assumption/recommendation, và cách giữ docs đọc được; nó không được dùng làm bằng chứng rằng một runtime feature tồn tại.

Handoff, demo audit, plan, spec, mockup, và scratch draft là working sources, không phải official product docs. Chỉ dùng chúng như:

- trạng thái công việc đã từng được tuyên bố
- giả thuyết implementation intent
- checkpoint để audit lại với code hiện tại
- evidence theo ngày cho một demo path cụ thể, nếu file có command/date/context rõ

Chúng không được cite như source of truth cho public docs. Muốn đưa một claim từ raw note vào docs chính, phải đi qua promotion rule:

1. xác định claim/concern từ raw note
2. kiểm chứng lại bằng code, route, schema, migration, model, command/query, test, và frontend surface nếu claim chạm UI
3. chưng cất phần còn đúng vào docs chính hoặc diagram chính thức
4. ghi caveat/evidence nếu mức chắc chắn chưa tuyệt đối
5. để raw note ở vai trò historical input, không dùng nó làm bằng chứng cuối

Nếu code, route, schema, test, frontend, hoặc runtime evidence hiện tại khác raw note, current system thắng. Nếu chưa kiểm chứng được, claim phải ghi là `planned`, `unverified`, hoặc bị bỏ khỏi public-facing docs.

Root-level scratch drafts không được đưa vào source register và không được cite bằng tên. Nếu có ý còn đúng, ý đó phải được promote vào docs chính hoặc evidence docs rồi scratch draft có thể bị xóa.

Promotion policy chi tiết nằm ở `docs/12-evidence/working-document-promotion-policy.md`.

Module README chỉ được xem là tín hiệu phụ trợ, không dùng làm nguồn quyết định nếu route/model/schema/code hiện tại cho thấy khác đi.

Các narrative file legacy từng nằm ở thư mục gốc repo không còn được xem là nguồn tham chiếu chính trong taxonomy hiện tại. Nếu còn ý nào hữu ích từ chúng, ý đó phải được hấp thụ lại vào `docs/` và đối chiếu với code/tests trước khi được coi là hợp lệ. Chúng đã có audit trail tại `docs/12-evidence/legacy-source-retirement-audit.md`; sự tồn tại của file gốc không còn là điều kiện để docs chính hoạt động. Riêng bản EN v5 từng có conflict marker, nên mọi claim từ đó chỉ được dùng nếu đã được kiểm chứng lại.

## Verification Method

Cho từng nhóm tài liệu, phương pháp đối chiếu được dùng là:

- Business/Product:
  - `docs/01-business/capability-model-and-product-positioning.md`
  - route surfaces
  - command/query/listener sources
- Architecture/Technical:
  - `docs/11-diagrams/README.md`
  - `docs/11-diagrams/*`
  - `app/modules/*`
  - `config/*`
- Data/API:
  - `database/schema.ts`
  - `schema/migration evidence`
  - Lucid models
  - route files
- Security/Operations:
  - `config/shield.ts`
  - `start/limiter.ts`
  - `start/routes/index.ts`
  - Audit/Notification providers and repositories
  - `database/migrations/20260729070000_canonicalize_auth_session_audit_evidence.ts`
- Traceability:
  - `tests/*`
  - `docs/08-testing/test-case-matrix.md`
- Documentation governance:
  - `docs/DOCUMENTATION_WRITING_STANDARD_FOR_AI.md`
  - `docs/12-evidence/working-document-promotion-policy.md`
- Work-in-progress and session-state audit:
  - `docs/handovers/*`
  - `docs/demo-audit/*`
  - `docs/superpowers/handoffs/*`
  - `docs/superpowers/plans/*`
  - `docs/superpowers/specs/*`
  - `docs/12-evidence/working-document-promotion-policy.md`

## System State Notes

- `docs/` hiện là bộ tài liệu narrative chính bằng tiếng Việt.
- taxonomy hiện tại không duy trì nhánh narrative English riêng.
- `docs/11-diagrams/` đã có tập file `.mmd` lớn và phần lớn header cập nhật `2026-06-26`.
- Workspace hiện có nhiều thay đổi chưa commit ngoài phạm vi tài liệu; bộ docs này không dùng chúng như nguồn sự thật trừ khi nội dung đã có mặt trong file nguồn đọc trực tiếp.
- `docs/12-evidence/legacy-source-retirement-audit.md` là file audit chính cho việc hấp thụ, đánh dấu stale, và cho phép xóa an toàn các narrative root files cũ.
- review workflow tables mới trong migrations 2026-07-15, sprint review runtime-context migrations 2026-07-18, skill taxonomy four-category migration 2026-07-18, và enterprise audit migration 2026-07-19 chưa nhất thiết xuất hiện đầy đủ trong `database/schema.ts` hoặc `schema/migration evidence`; khi docs nói về chúng, ưu tiên migration + command/query/helper runtime mới nhất.

## Handoff And Plan Audit Notes

Khi dùng `docs/handovers/*` hoặc `docs/superpowers/*`, phải luôn phân loại:

- `verified current`: claim còn khớp với code/tests hiện tại
- `partially stale`: claim đúng một phần, nhưng đã có tiến triển mới
- `stale`: claim cũ, code hiện tại đã đi xa hơn hoặc khác hướng

Ví dụ đọc trực tiếp trong hệ thống hiện tại:

- `docs/handovers/2026-07-04-search-session-handoff.md`:
  - trạng thái `generic user-directory search` còn đang thiếu file là **stale**
  - code hiện tại đã có `app/modules/search/actions/queries/search_users_via_engine_query.ts`
  - code hiện tại cũng đã có `app/modules/search/infra/users/*`
- `docs/superpowers/plans/2026-07-04-search-phase1-talents.md`:
  - phần session notes xác nhận search decoupling đã đi xa hơn handoff cũ
- `docs/handovers/2026-07-06-review-governance-session-handoff.md`:
  - hữu ích như audit checklist
  - nhưng chính file này cũng nói rõ objective `not proven complete`

Vì vậy reader không được đọc handoff/plan như kết luận cuối. Chúng là input cho audit, không phải output cuối.

## Route-Wiring Audit Notes

Các artifact dưới đây được audit lại trực tiếp với `start/routes/*.ts`, controller, page shell, và test hiện có:

- Org talent pages:
  - controller: `app/modules/users/controllers/org_talents_page_controller.ts`
  - UI: `inertia/apps/org/modules/talents/*`
  - bookmark UI: `inertia/apps/org/modules/bookmarks/index.svelte`
  - E2E targets: `inertia/apps/org/tests/e2e/org/org_talent_pages.spec.ts`, `inertia/apps/org/tests/e2e/org/talent_bookmarks.spec.ts`, `inertia/apps/user/tests/e2e/marketplace/talent_directory_bookmarks.spec.ts`
  - route hiện đã xác nhận: `/org/talents`, `/org/talents/:userId`
- Admin proficiency pages:
  - controllers: `app/modules/admin/controllers/proficiency/*`
  - UI: `inertia/apps/admin/modules/proficiency/*`
  - unit proof đã tìm thấy: `app/modules/admin/tests/backend/unit/proficiency_view_model.spec.ts`
  - dedicated E2E target đã xác nhận: `inertia/apps/admin/tests/e2e/admin/admin_proficiency_rubric_read.spec.ts`
  - route hiện đã xác nhận: `/admin/proficiency`, `/admin/proficiency/:proficiencyScaleId`, `/admin/proficiency/rubrics/:skillId`

Đối chiếu mới nhất:

- `/org/talents` hiện đã được route-bind trong `start/routes/users.ts`
- `/org/talents/:userId` hiện đã được route-bind trong `start/routes/users.ts`
- org talent/bookmark pages hiện dùng `OrgTalentsPageController` và `OrgBookmarksPageController`; các tên cũ `TalentDirectoryPageController` và `RecruiterBookmarksWorkspaceController` không còn là artifact hiện hành
- pending approvals API route hiện dùng plural canonical/compat:
  - `GET /api/users/pending-approvals`
  - `GET /api/users/pending-approvals/count`
  - `GET /api/v1/users/pending-approvals`
  - `GET /api/v1/users/pending-approvals/count`
- singular `/pending-approval*` API paths chỉ còn là deprecated aliases trong `start/routes/deprecated/api_context_aliases.ts`
- `/admin/proficiency` hiện đã được route-bind trong `start/routes/admin.ts`
- `/admin/proficiency/:proficiencyScaleId` hiện đã được route-bind trong `start/routes/admin.ts`
- `/admin/proficiency/rubrics/:skillId` hiện đã được route-bind trong `start/routes/admin.ts`
  Vì vậy hai discovery/governance surface sau có page route được xác nhận:

- `/org/talents`
- `/admin/proficiency*`

Đối chiếu review-governance mới nhất ngày `2026-07-28` xác nhận:

- canonical Project board routes:
  - `GET /projects/:projectId/tasks`
  - `GET /projects/:projectId/reviews/tasks`
  - `GET /projects/:projectId/reviews/assigners`
  - `GET /projects/:projectId/reviews/environment`
- canonical System board route:
  - `GET /admin/disputes`
- task review workflow mutations:
  - `POST /task-reviews/tasks/:taskId/reviews`
  - `POST /task-reviews/:workflowId/accept`
  - `POST /task-reviews/:workflowId/respond`
  - `POST /task-reviews/:workflowId/report`
- sprint reverse workflow mutations:
  - `POST /sprint-reverse-reviews/:workflowId/submit`
  - `POST /sprint-reverse-reviews/:workflowId/accept`
  - `POST /sprint-reverse-reviews/:workflowId/respond`
  - `POST /sprint-reverse-reviews/:workflowId/report`
- project sprint review/package routes live under project/review route groups and are backed by `project_sprints`, `sprint_review_packages`, `sprint_manager_reviews`, `sprint_environment_reviews`, `sprint_reverse_review_workflows`.
- sprint planning routes under `start/routes/projects.ts` are backed by `app/modules/sprints`, `project_sprints.goal`, `tasks.project_sprint_id`, and project detail `Sprints` tabs.
- task review and sprint reverse boards đều render đủ tám lane, gồm `ai_reviewing` và `resolved`.
- `/reviews/pending`, `/org/disputes`, review/reverse-review history/detail pages và `/admin/reverse-reviews` không được đăng ký.
- Product/security target coi System Admin và User là hai principal/realm; System board/API không dùng User/Organization/Project workspace context.
- route/UI/policy separation có proof ở `start/routes/admin.ts`, `start/routes/projects.ts`, `start/routes/reviews.ts` và `app/modules/authorization/tests/backend/unit/realm_separation_source.spec.ts`.
- physical identity/session separation vẫn `Partial`: `RequireSystemAdminMiddleware` đọc `auth.user.system_role`, `AuthLandingResolver` nhận `systemRole`, và current schema giữ `users.system_role`. Target split được ghi ở `docs/11-diagrams/ERD/01-user-auth-skills/high-level/logical_erd_01d_target_realm_identity_split.mmd`.

Nhưng độ mạnh evidence hiện không giống nhau:

- `/org/talents` và `/org/bookmarks`: route + controller + component tests + E2E
- `/admin/proficiency*`: route + controller + unit/view-model proof + E2E read proof
- Project Task Review Board: backend/route/component + seeded E2E
- Project Assigner/Environment Review Board: backend/route/component + seeded E2E
- System dispute board: backend/unit/component evidence; System/Admin isolation has source guards
- `/org/projects/:projectId?focus=sprints` and `/projects/:projectId?focus=sprints`: sprint management panel exists in both shells; component proof currently strongest for org panel, with E2E proof for manager/member role experience and foreign-sprint rejection

## API Boundary Audit Notes

Đối chiếu mới nhất với code hiện tại cho thấy:

- route prefix và `http transport kind` không phải lúc nào cũng trùng hoàn toàn
- các transport kinds hiện diện gồm:
  - `page`
  - `api-compat`
  - `api-canonical`
  - `api-admin-internal`
  - `api-public-callback`
  - `api-ops-internal`
- nhiều compat routes có middleware phát `Deprecation`, `Sunset`, `Link`, `Warning` headers
- một số mutation routes chỉ chặn tới mức auth/context ở route layer; quyền business sâu hơn được enforce tiếp ở command/query/domain policy

Vì vậy khi tài liệu nói về API boundary, source hierarchy phải ưu tiên thêm:

1. route group + `bindHttpTransport(...)`
2. `bindApiAuthContract(...)`
3. controller adapter có ép current-org/current-project hay không
4. command/query/domain policy mới là permission truth sâu hơn

## Search Scope For Missing Artifacts

Đã quét tên file trong hệ thống tài liệu và workspace hiện tại cho các loại artifact sau:

- roadmap
- plan
- meeting
- minutes
- risk
- change
- privacy
- policy
- runbook
- monitor
- faq
- training
- guide
- manual
- wireframe
- prototype

Kết quả:

- Không tìm thấy tài liệu chính thức hiện hành dạng độc lập cho `Meeting Minutes`, `Project Plan`, `Product Roadmap`, `Privacy Policy`, `Runbook`, `Training Material`, `Wireframe`, `Prototype`.
- Có tín hiệu liên quan qua code, test, route, diagram, và GitNexus metadata; các tài liệu tương ứng trong `docs/` chỉ ghi những phần được nguồn này xác nhận.

## Diagram Evidence Families

- Architecture: `docs/11-diagrams/Architecture/*/{overview,high-level,low-level}/*`
- Package structure: `docs/11-diagrams/Package/*/{overview,high-level,low-level}/*`
- Action flows: `docs/11-diagrams/Action/*/{overview,high-level,low-level}/*.mmd`
- Sequence: `docs/11-diagrams/Sequence/*/{overview,high-level,low-level}/*`
- DFD: `docs/11-diagrams/DFD/*/{overview,high-level,low-level}/*`
- ERD: `docs/11-diagrams/ERD/*/{overview,high-level,low-level}/*`
- State: `docs/11-diagrams/State/*/{overview,high-level,low-level}/*`
- Use case approximation: `docs/11-diagrams/Usecase/*/{overview,high-level,low-level}/*`

## UI Evidence Families

- User shell: `inertia/apps/user/*`
- Organization workspace shell: `inertia/apps/org/*`
- System admin shell: `inertia/apps/admin/*`
- Historical docs may still mention `inertia/pages/*`; treat that as legacy path evidence unless the file exists in current worktree.

Các UI path này được dùng như evidence khi tài liệu nói tới implemented user surface, nhưng không được dùng để suy diễn business rule nếu rule đó không có route/model/source khác đỡ phía dưới.

## Test Evidence Families

- Architecture tests: `app/modules/*/tests/backend/architecture/*`
- Unit tests: `app/modules/*/tests/backend/unit/*`
- Integration tests: `app/modules/*/tests/backend/integration/*`
- Contract tests: `app/modules/*/tests/backend/contract/*`
- E2E tests: `inertia/apps/*/tests/e2e/*`
- UI/component tests: `inertia/apps/*/tests/modules/*`, `inertia/apps/*/tests/shared/*`, `inertia/apps/*/tests/storybook/*`
- Root test support: `tests/helpers/*`, `tests/frontend/*`, `tests/shared/*`

## Current Organization Resolution Audit Notes

Code audit mới nhất xác nhận:

- `AuthMiddleware` xử lý auth và preload organizations, đồng thời có bearer/session fallback behavior theo `api auth contract`
- `OrganizationResolverMiddleware` mới là lớp resolve current-org thực tế
- `RequireOrganizationMiddleware` chỉ enforce kết quả resolver, không tự làm toàn bộ logic resolution

Resolver behavior hiện thấy trong code:

- nếu session và DB đều chưa có org, thử chọn approved membership đầu tiên
- nếu org hiện tại invalid, clear rồi fallback sang approved membership khác nếu có
- đồng bộ `current_organization_id` giữa session và DB
- tránh ép flow trên một số exempt paths như `/admin`, `/api/admin`, `/organizations`, `/auth`, `/health`

Vì vậy khi docs nói về current-org behavior, evidence nên ưu tiên thêm ba file middleware này cùng các integration tests liên quan, không chỉ `requireOrg()` hoặc route group.

## Evidence Handling Rule

Nếu một tài liệu con trong `docs/` nêu chi tiết về capability, field, route, hoặc trạng thái, chi tiết đó phải quy chiếu được về ít nhất một trong các nguồn liệt kê ở trên.

Nếu không có standalone artifact nguồn cho một loại tài liệu user yêu cầu, tài liệu tương ứng phải:

- nói rõ artifact nguồn riêng chưa được tìm thấy
- mô tả phạm vi tìm kiếm đã dùng
- chỉ giữ lại context mà hệ thống hiện tại xác nhận được

Tuy vậy, việc quy chiếu này là quy tắc cho người viết và người rà soát. Tài liệu đọc chính không nên biến thành danh sách dẫn đường sang code ở mọi đoạn.

## Khi Nào Dừng Ở File Này

Dừng ở file này khi bạn đã biết:

1. claim hoặc concern mình đang audit đang bám vào nguồn nào
2. thứ tự ưu tiên giữa route/config/schema/test/docs hỗ trợ ra sao
3. có cần quay lại docs chính để đọc nội dung hay đã đủ evidence để kết luận boundary
