# Database Design, ERD, Data Dictionary

## File Này Dùng Để Làm Gì

File này dành cho lúc người đọc cần trả lời nhanh các câu hỏi như:

- dữ liệu lõi của Suar nằm ở đâu
- nên mở ERD nào trước
- bảng nào là trung tâm của domain đang quan tâm
- đâu là runtime shape nên tin, đâu là chỗ dễ drift giữa docs và code

Nếu bạn chỉ cần hiểu database ở mức đủ để không bị lạc, đừng đọc từ trên xuống như từ điển. Hãy bắt đầu từ `Core Entity Groups` rồi mới xuống `Data Dictionary`.

## Nếu Dùng File Này Để Viết Report Bên Ngoài Repo

Bạn có thể dùng file này để viết:

- chương database design
- phần giải thích nhóm entity chính
- phần mô tả ERD theo domain slice
- phần data dictionary ở mức bảng/cột trọng yếu

Bạn nên coi file này là nguồn chính để trả lời:

- Suar lưu những nhóm dữ liệu nào
- bảng nào là trung tâm của từng domain
- nên chọn ERD nào cho đúng chương report

Bạn không nên dùng riêng file này để kết luận:

- mọi quan hệ vật lý đã được enforce đầy đủ như trong mọi diagram
- mọi field trong model đều đã được dùng như nhau ở mọi flow
- mọi SQL/runtime behavior đã được chứng minh chỉ bằng ERD

Nếu cần nói mạnh hơn về runtime contract hoặc evidence, đọc thêm:

- `../06-data/api-specification.md`
- `../05-api/api-landscape-and-governance.md`
- `../12-evidence/source-register.md`

## Database Design

### Primary Runtime Database

Hệ thống hiện xác nhận PostgreSQL là primary runtime relational database:

- connection name: `pg`
- search path: `public`, `suar`
- migrations path: `database/migrations`

Nguồn: `config/database.ts`

### Auxiliary Runtime Store

Redis dùng cho:

- sessions
- locks
- cache

Nguồn: `config/redis.ts`, `config/session.ts`

### Public Schema Verification Anchors

Public docs không tham chiếu private schema artifacts hoặc line number nội bộ.

Khi cần đối chiếu schema trong tài liệu công khai, dùng các nguồn có trong repo:

- `database/schema.ts`
- `database/migrations/*`
- `app/modules/*/infra/models/*.ts`
- command/query đang đọc hoặc ghi bảng liên quan

### Current Migration Delta

Generated schema có thể chưa phản ánh mọi migration mới nhất trong worktree.

Các migration mới trong `database/migrations` đã thêm hoặc thay đổi review workflow storage, sprint planning schema, skill taxonomy, và enterprise audit metadata:

- `20260715090000_create_task_review_workflows.ts`
- `20260715100000_create_sprint_reverse_review_workflows.ts`
- `20260715110000_remove_review_workflow_db_constraints.ts`
- `20260715120000_normalize_task_review_in_review_status.ts`
- `20260716120000_add_project_sprint_goal.ts`
- `20260718120000_add_sprint_review_dispute_runtime_context.ts`
- `20260718130000_add_ai_dispute_evaluation_source_metadata.ts`
- `20260718133000_add_task_review_workflow_runtime_context.ts`
- `20260718133500_add_task_review_workflow_resolution_columns.ts`
- `20260718140000_add_sprint_reverse_review_resolution_columns.ts`
- `20260718150000_migrate_skill_categories_to_four_groups.ts`
- `20260719090000_add_enterprise_audit_events.ts`

Vì vậy với các bảng sau, ưu tiên đọc migration + command/query hiện tại, không chỉ đọc generated schema:

- `task_review_workflows`
- `task_review_reviewers`
- `task_review_messages`
- `sprint_reverse_review_workflows`
- `sprint_reverse_review_messages`
- `project_sprints.goal`
- `skills.category_code`
- `audit_events` enterprise metadata columns
- `audit_event_scopes`

Điểm thiết kế quan trọng:

- workflow tables mới có primary key và index
- business constraints như FK/check/unique quorum/transition không được coi là DB responsibility
- application commands/queries kiểm tra existence, duplicate prevention, legal transition, reviewer quorum, responder authority, và report permission

Rule thực dụng:

- model cho biết app đang chạm field nào
- schema/SQL cho biết dữ liệu đang tồn tại ra sao
- khi hai bên lệch nhau, đừng đoán; phải ghi rõ boundary hoặc caveat

## Safe External Summary

Nếu cần một câu tóm tắt an toàn cho report, có thể dùng:

`Mô hình dữ liệu của Suar hiện tập trung vào bốn cụm chính: user/auth, organization/project, task/marketplace, và review/governance; các cụm này kết nối với nhau để biến dữ liệu công việc thực thành review evidence, profile signals, và các bề mặt sourcing/quản trị liên quan.`

## Core Entity Groups

Nếu bạn mới vào hệ thống, hãy nhớ bốn nhóm trước:

1. User/Auth
2. Organization/Project
3. Task/Marketplace
4. Review/Governance

Bốn nhóm này giải thích phần lớn cấu trúc dữ liệu quan trọng của Suar.

## Khi Nào Dừng Ở File Này

Dừng ở file này khi bạn đã biết:

1. domain data concern của mình nằm ở nhóm entity nào
2. ERD slice hoặc bảng nào là trọng tâm cần tin trước
3. lúc nào cần sang API spec, data metrics doc, hay source register để verify sâu hơn

### User And Auth

Chứng cứ entity:

- `app/modules/users/infra/models/user.ts`
- `app/modules/auth/infra/models/user_oauth_provider.ts`
- `app/modules/users/infra/models/user_skill.ts`
- `app/modules/users/infra/models/user_profile_snapshot.ts`
- `app/modules/users/infra/models/recruiter_bookmark.ts`
- `app/modules/users/infra/models/user_performance_stat.ts`
- `app/modules/users/infra/models/user_work_history.ts`
- `app/modules/skills/constants/skill_constants.ts`
- `database/migrations/20260718150000_migrate_skill_categories_to_four_groups.ts`

Skill taxonomy runtime:

- `skills.category_code` canonical values: `technology`, `engineering`, `soft_skill`, `delivery`
- old `technical` rows are migrated to `technology`
- `testing` and `code_review` are migrated to `engineering`
- every category currently uses `displayType = spider_chart`

### Organization And Project

Chứng cứ entity:

- `app/modules/organizations/infra/models/organization.ts`
- `app/modules/organizations/infra/models/organization_user.ts`
- `app/modules/organizations/infra/models/organization_invitation.ts`
- `app/modules/organizations/infra/models/organization_join_request.ts`
- `app/modules/projects/infra/models/project.ts`
- `app/modules/projects/infra/models/project_member.ts`

Code audit note rất quan trọng:

- model `organization_join_request.ts` vẫn tồn tại như evidence data shape
- nhưng flow join request runtime mới đã được code và test ghi rõ là dựa vào `organization_users` với `status = pending`
- vì vậy khi vẽ ERD hoặc viết report, cần phân biệt `table/model tồn tại` với `business flow hiện tại đang lấy truth ở đâu`

### Task And Marketplace

Chứng cứ entity:

- `app/modules/tasks/infra/models/task.ts`
- `app/modules/tasks/infra/models/task_status.ts`
- `app/modules/tasks/infra/models/task_workflow_transition.ts`
- `app/modules/tasks/infra/models/task_required_skill.ts`
- `app/modules/tasks/infra/models/task_requirement_version.ts`
- `app/modules/tasks/infra/models/task_requirement_version_item.ts`
- `app/modules/tasks/infra/models/task_application.ts`
- `app/modules/tasks/infra/models/task_assignment.ts`
- `app/modules/tasks/infra/models/task_submission.ts`
- `app/modules/tasks/infra/models/task_submission_evidence.ts`
- `app/modules/tasks/infra/models/task_comment.ts`
- `app/modules/tasks/infra/models/task_attachment.ts`

### Review

Chứng cứ entity:

- `app/modules/reviews/infra/models/review_session.ts`
- `app/modules/reviews/infra/models/skill_review.ts`
- `app/modules/reviews/infra/models/review_evidence.ts`
- `app/modules/reviews/infra/models/reverse_review.ts`
- `app/modules/reviews/infra/models/flagged_review.ts`
- `app/modules/reviews/infra/models/project_sprint.ts`
- `app/modules/reviews/infra/models/sprint_review_package.ts`
- `app/modules/reviews/infra/models/sprint_manager_review.ts`
- `app/modules/reviews/infra/models/sprint_environment_review.ts`
- `app/modules/reviews/domain/task_review_workflow.ts`
- `app/modules/reviews/domain/sprint_reverse_review_workflow.ts`
- `database/migrations/20260715090000_create_task_review_workflows.ts`
- `database/migrations/20260715100000_create_sprint_reverse_review_workflows.ts`
- `database/schema.ts` cho:
  - `AiDisputeEvaluationSchema`
  - `AiDisputeFeedbackSchema`

Runtime boundary cần nhớ:

- `project_sprints`, `sprint_review_packages`, `sprint_manager_reviews`, `sprint_environment_reviews`, `sprint_review_disputes`, và `sprint_review_dispute_comments` hiện có trong schema evidence
- `task_review_*` và `sprint_reverse_review_*` đến từ migration mới trong repo
- hai nhóm này cùng thuộc review/governance, nhưng không cùng vai trò: package tables là submitted review/audit records, workflow tables là board/projection/response state

### Operational Logs

Chứng cứ entity:

- `app/modules/audit/infra/models/audit_log.ts`
- `app/modules/audit/domain/audit_event_scope.ts`
- `app/modules/audit/domain/audit_event_redaction.ts`
- `app/modules/audit/domain/audit_event_hash.ts`
- `database/schema.ts` cho `AuditEventSchema`, `ErrorEventSchema`, `NotificationSchema`
- `database/migrations/20260719090000_add_enterprise_audit_events.ts`
- `database/schema.ts` cho `UserActivityEventSchema`
- `app/modules/user_activity/infra/repositories/postgres_user_activity_log_repository.ts`
- generated schema/migration evidence cho `user_activity_events`

Enterprise audit note:

- `audit_events` giữ event metadata đủ đọc theo event name/family/module/workflow/stage/severity/outcome/actor/target/request/trace/correlation/retention
- `audit_event_scopes` là projection table quyết định event xuất hiện ở surface `system`, `user`, hoặc `organization`
- payload redaction và hash chaining là helper runtime trong audit domain, không chỉ là field schema

## ERD Inventory

- User/Auth/Skills: `docs/11-diagrams/ERD/logical_erd_01_user_auth_skills.mmd`
- Org/Project: `docs/11-diagrams/ERD/logical_erd_02_org_project.mmd`
- Task/Marketplace: `docs/11-diagrams/ERD/logical_erd_03_task_marketplace.mmd`
- Review/Messaging: `docs/11-diagrams/ERD/logical_erd_04_review_messaging.mmd`

## Chọn Đúng ERD Nhanh Nhất

Nếu bạn chỉ cần chọn đúng ERD mà không muốn đọc cả file:

- đang viết chapter user, profile, skills, snapshot:
  - mở `logical_erd_01_user_auth_skills.mmd`
- đang viết chapter organization, membership, project:
  - mở `logical_erd_02_org_project.mmd`
- đang viết chapter task workflow, marketplace, submission:
  - mở `logical_erd_03_task_marketplace.mmd`
- đang viết chapter review, dispute, moderation:
  - mở `logical_erd_04_review_messaging.mmd`

Rule rất quan trọng:

- không có một ERD duy nhất cho toàn bộ hệ thống để dùng cho mọi chapter
- cố dùng một ERD cho mọi thứ gần như chắc chắn sẽ làm hình quá tải và khó hiểu

Gợi ý mở nhanh:

- muốn hiểu hồ sơ và skill: bắt đầu `logical_erd_01_user_auth_skills.mmd`
- muốn hiểu staffing/delivery: bắt đầu `logical_erd_03_task_marketplace.mmd`
- muốn hiểu review/dispute: bắt đầu `logical_erd_04_review_messaging.mmd`

## ERD Reading Strategy

Đọc ERD theo thứ tự này:

1. xác định đúng domain slice
2. nhìn bảng trung tâm trước
3. nhìn các bảng phụ trực tiếp nối với nó
4. chỉ sau đó mới xuống data dictionary để đọc cột cụ thể

Đừng đọc ERD như ảnh chụp toàn bộ database.
Hãy đọc nó như bản đồ cho đúng một miền dữ liệu đang quan tâm.

Nếu đang viết report:

- mở chapter bằng mô tả domain slice
- đưa đúng một ERD phù hợp
- chỉ nhắc các bảng/cột phục vụ chapter đó
- tránh kể cả những bảng không liên quan chỉ vì chúng cũng nằm trong hình

## Data Dictionary

### `users`

Key columns verified from `app/modules/users/infra/models/user.ts`:

- `id`
- `username`
- `email`
- `status`
- `system_role`
- `current_organization_id`
- `auth_method`
- `avatar_url`
- `bio`
- `phone`
- `address`
- `timezone`
- `language`
- `is_external_contributor`
- `external_contributor_rating`
- `external_contributor_completed_tasks_count`
- `profile_settings`
- `user_setting`
- `trust_data`
- `credibility_data`
- `deleted_at`
- `created_at`
- `updated_at`

### `organizations`

Key columns verified from `app/modules/organizations/infra/models/organization.ts`:

- `id`
- `name`
- `slug`
- `description`
- `logo`
- `website`
- `plan`
- `owner_id`
- `custom_roles`
- `partner_type`
- `partner_verified_at`
- `partner_verified_by`
- `partner_verification_proof`
- `partner_expires_at`
- `partner_is_active`
- `deleted_at`
- `created_at`
- `updated_at`

### `projects`

Key columns verified from `app/modules/projects/infra/models/project.ts`:

- `id`
- `creator_id`
- `name`
- `description`
- `organization_id`
- `start_date`
- `end_date`
- `status`
- `manager_id`
- `owner_id`
- `visibility`
- `allow_external_contributors`
- `approval_required_for_members`
- `tags`
- `custom_roles`

### `tasks`

Key columns verified from `app/modules/tasks/infra/models/task.ts`:

- `id`
- `title`
- `description`
- `status`
- `task_status_id`
- `label`
- `priority`
- `difficulty`
- `assigned_to`
- `creator_id`
- `updated_by`
- `due_date`
- `parent_task_id`
- `estimated_time`
- `actual_time`
- `organization_id`
- `project_id`
- `project_sprint_id`
- `task_visibility`
- `application_deadline`
- `task_type`
- `acceptance_criteria`
- `verification_method`
- `expected_deliverables`
- `context_background`
- `impact_scope`
- `tech_stack`
- `environment`
- `collaboration_type`
- `complexity_notes`
- `measurable_outcomes`
- `learning_objectives`
- `domain_tags`
- `role_in_task`
- `autonomy_level`
- `problem_category`
- `business_domain`
- `estimated_users_affected`
- `external_applications_count`
- `sort_order`

Ghi chú đối chiếu SQL:

- generated schema xác nhận `tasks.task_status_id` là `uuid NOT NULL`
- `tasks.status` vẫn còn trong schema evidence và nhiều query/view như legacy compatibility field
- `tasks.project_sprint_id` là Sprint Backlog link; `NULL` nghĩa là Product Backlog
- nếu comment trong model hoặc migration note còn nói về rollout/nullable, data dictionary này ưu tiên snapshot SQL hiện tại

Đây là một ví dụ điển hình cho kiểu dữ liệu dễ làm người đọc hiểu sai nếu chỉ nhìn một phía.

- nhìn app flow thôi: dễ tưởng `task_status_id` là thứ duy nhất còn tồn tại
- nhìn schema evidence thôi: dễ không thấy logic compatibility đang còn ảnh hưởng

Nên với `tasks`, luôn đọc cả runtime behavior lẫn persisted shape.

### `task_applications`

Key columns verified from `app/modules/tasks/infra/models/task_application.ts`:

- `id`
- `task_id`
- `applicant_id`
- `application_status`
- `application_source`
- `message`
- `portfolio_links`
- `applied_at`
- `reviewed_by`
- `reviewed_at`
- `rejection_reason`

### `review_sessions`

Key columns verified from `app/modules/reviews/infra/models/review_session.ts`:

- `id`
- `task_assignment_id`
- `reviewee_id`
- `status`
- `manager_review_completed`
- `peer_reviews_count`
- `required_peer_reviews`
- `confirmations`
- `overall_quality_score`
- `delivery_timeliness`
- `requirement_adherence`
- `communication_quality`
- `code_quality_score`
- `proactiveness_score`
- `would_work_with_again`
- `strengths_observed`
- `areas_for_improvement`
- `deadline`
- `completed_at`

### `task_review_workflows`

Key columns verified from `database/migrations/20260715090000_create_task_review_workflows.ts` and task review commands:

- `id`
- `task_id`
- `project_id`
- `organization_id`
- `reviewee_id`
- `status`
- `required_review_count`
- `completed_review_count`
- `accepted_by_reviewee_at`
- `reported_at`
- `reported_by`
- `final_decision`
- `final_rationale`
- `resolved_at`
- `resolved_by`
- `completed_at`
- `created_at`
- `updated_at`

Board lane statuses:

- `awaiting_review`
- `in_review`
- `awaiting_response`
- `disputed`
- `reported`
- `done`

Admin/AI persisted statuses:

- `ai_reviewing`
- `resolved`

`reviewed` legacy rows are normalized to `in_review` by migration `20260715120000_normalize_task_review_in_review_status.ts`.

### `task_review_reviewers`

Key columns verified from `database/migrations/20260715090000_create_task_review_workflows.ts` and `EnsureTaskReviewWorkflowCommand`:

- `id`
- `workflow_id`
- `reviewer_id`
- `reviewer_role`
- `is_required`
- `status`
- `priority_rank`
- `reviewed_at`
- `created_at`
- `updated_at`

Runtime note:

- quorum and reviewer eligibility are application-level rules
- reviewer status currently uses values like `pending` and `submitted`

### `task_review_messages`

Key columns verified from `database/migrations/20260715090000_create_task_review_workflows.ts` and task review action commands:

- `id`
- `workflow_id`
- `author_id`
- `message_type`
- `body`
- `metadata`
- `created_at`

Runtime message types seen in commands:

- `review`
- `reviewee_response`
- `system`

### `project_sprints`

Key columns verified from generated schema, sprint migrations/models, and sprint commands:

- `id`
- `organization_id`
- `project_id`
- `name`
- `goal`
- `status`
- `starts_at`
- `ends_at`
- `created_by`
- `closed_by`
- `review_opened_at`
- `review_closed_at`
- `created_at`
- `updated_at`

Status transition rule in domain:

```text
draft -> active -> review_open -> review_closed -> archived
```

Sprint planning notes:

- `goal` là Sprint Goal nullable, hiện được `app/modules/sprints` create/update/read và trả trong sprint board
- blank goal được normalize thành `null`; command chặn goal dài hơn `2000` ký tự
- sprint planning/backlog thuộc `app/modules/sprints`; review-open/package/reverse workflow thuộc `app/modules/reviews`

### `sprint_review_packages`

Key columns verified from generated schema, sprint review models, and sprint review commands:

- `id`
- `sprint_id`
- `reviewer_id`
- `status`
- `submitted_at`
- `created_at`
- `updated_at`

Status values:

- `pending`
- `submitted`
- `expired`

Runtime note:

- packages are submitted review/audit records
- package submit writes manager/environment review rows

### `sprint_manager_reviews`

Key columns verified from generated schema and `app/modules/reviews/infra/models/sprint_manager_review.ts`:

- `id`
- `package_id`
- `target_user_id`
- `target_role`
- `rating`
- `dimensions`
- `comment`
- `is_anonymous_to_target`
- `created_at`
- `updated_at`

Target roles:

- `manager`
- `lead`
- `assigner`
- `owner`

### `sprint_environment_reviews`

Key columns verified from generated schema and `app/modules/reviews/infra/models/sprint_environment_review.ts`:

- `id`
- `package_id`
- `target_type`
- `target_id`
- `rating`
- `dimensions`
- `comment`
- `is_anonymous_publicly`
- `created_at`
- `updated_at`

Target types:

- `project`
- `organization`

### `sprint_reverse_review_workflows`

Key columns verified from `database/migrations/20260715100000_create_sprint_reverse_review_workflows.ts` and sprint reverse review commands:

- `id`
- `sprint_id`
- `project_id`
- `organization_id`
- `reviewer_id`
- `target_type`
- `target_user_id`
- `target_entity_id`
- `responder_id`
- `status`
- `rating`
- `comment`
- `package_id`
- `submitted_at`
- `accepted_at`
- `reported_at`
- `final_decision`
- `final_rationale`
- `resolved_at`
- `resolved_by`
- `created_at`
- `updated_at`

Target types:

- `assigner`
- `environment`

Statuses:

- `awaiting_review`
- `in_review`
- `awaiting_response`
- `disputed`
- `reported`
- `ai_reviewing`
- `resolved`
- `done`

Runtime note:

- this table is board/projection/response state
- submitted rows still land in `sprint_manager_reviews` or `sprint_environment_reviews`
- current environment workflow card stores `target_entity_id = organization_id`; sprint package submission separately records both project and organization environment review rows
- `reported` can enter AI advisory handling as `ai_reviewing`; callback returns it to `reported`, and system-admin resolution writes `resolved`

### `sprint_reverse_review_messages`

Key columns verified from `database/migrations/20260715100000_create_sprint_reverse_review_workflows.ts` and sprint reverse review action commands:

- `id`
- `workflow_id`
- `author_id`
- `message_type`
- `body`
- `metadata`
- `created_at`

Message types seen in commands:

- `review`
- `accept`
- `response`
- `report`

### `sprint_review_disputes`

Key columns verified from generated schema and sprint review dispute commands/queries:

- `id`
- `package_id`
- `opened_by`
- `status`
- `dispute_reason`
- `requested_outcome`
- `reported_to_admin_at`
- `reported_to_admin_by`
- `escalation_reason`
- `resolved_at`
- `resolved_by`
- `final_decision`
- `final_rationale`
- `created_at`
- `updated_at`

Status values:

- `pending`
- `collecting_evidence`
- `admin_reviewing`
- `resolved`
- `rejected`
- `cancelled`

### `sprint_review_dispute_comments`

Key columns verified from generated schema and sprint review dispute commands:

- `id`
- `dispute_id`
- `author_id`
- `body`
- `visibility`
- `created_at`
- `updated_at`

Visibility values:

- `all_parties`
- `admin_only`

### `audit_events`

Key enterprise columns verified from `database/migrations/20260719090000_add_enterprise_audit_events.ts` and audit domain helpers:

- `event_name`
- `event_family`
- `module`
- `subsystem`
- `workflow`
- `stage`
- `severity`
- `outcome`
- `actor_type`
- `actor_user_id`
- `actor_org_id`
- `actor_role_surface`
- `target_type`
- `target_id`
- `target_org_id`
- `request_id`
- `trace_id`
- `correlation_key`
- `retention_class`
- `redaction_applied`
- `schema_version`
- `event_hash`
- `prev_hash`
- `recorded_at`

Runtime notes:

- sensitive payload keys matching password/token/secret/authorization/cookie/session/refresh/api_key are redacted by `redactAuditValue`
- `computeAuditEventHash` hashes canonical event content plus `prev_hash`
- admin audit read paths should treat these fields as enterprise metadata, not arbitrary JSON extras

### `audit_event_scopes`

Key columns verified from `database/migrations/20260719090000_add_enterprise_audit_events.ts` and `deriveAuditEventScopes`:

- `id`
- `event_id`
- `surface`
- `user_id`
- `organization_id`
- `created_at`

Surface values:

- `system`
- `user`
- `organization`

Runtime notes:

- every audit event receives a `system` scope
- actor user, target user, and affected users derive `user` scopes
- target organization or actor organization derives `organization` scope
- read repositories should prefer explicit scopes when deciding user/org visibility

### `user_profile_snapshots`

Key columns verified from `app/modules/users/infra/models/user_profile_snapshot.ts`:

- `id`
- `user_id`
- `is_current`
- `is_public`
- `shareable_slug`
- `shareable_token`
- `summary`
- `skills_verified`
- `work_highlights`
- `performance_metrics`
- `trust_metrics`
- `version`
- `snapshot_name`
- `scoring_version`
- `created_at`
- `updated_at`

## Schema Interpretation Boundary

- `database/schema.ts` là generated schema snapshot.
- Lucid models là ORM-facing runtime contract gần nhất ở tầng ứng dụng.
- `database/schema.ts` và migrations cung cấp bằng chứng vật lý ở mức:
  - function
  - enum
  - index
  - current-state constraint

Khi tài liệu này ghi field hoặc object database, ưu tiên đối chiếu đồng thời cả model và schema evidence nếu có.

## Database Notes

- `database/schema.ts` là file generated, dùng như snapshot tên bảng/cột đã được hệ thống sinh ra.
- `app/modules/*/infra/models/*.ts` phản ánh contract runtime ở tầng ORM.
- `database/migrations/*` phản ánh delta schema đang được repo áp dụng thêm; với workflow tables mới, migration hiện đáng tin hơn generated schema nếu hai bên chưa sync.
- Khi có khác biệt giữa comment migration rollout và product truth, tài liệu này giữ nguyên cả hai phía và trỏ về nguồn.
