# State Machine Diagram Gallery (`State/`)

Mỗi diagram có `.mmd` làm source of truth và `.png` cùng basename để xem trực tiếp.

Ảnh được render bằng Mermaid CLI `11.16.0`, theme `neutral`, nền trắng, scale `2`. Không sửa PNG thủ công; sửa MMD rồi render lại.

Mỗi domain dùng `overview/` cho aggregate/lifecycle chính, `high-level/` cho state machine liên quan, `low-level/` cho transition rule hoặc overlay chi tiết. README trong từng domain chỉ rõ thứ tự đọc.

## 01-task

### `state_01_task`

![state_01_task](01-task/overview/state_01_task.png)

### `state_01a_task_transition_rules`

![state_01a_task_transition_rules](01-task/low-level/state_01a_task_transition_rules.png)

### `state_03_task_application`

![state_03_task_application](01-task/high-level/state_03_task_application.png)

### `state_03a_application_eligibility_entry`

![state_03a_application_eligibility_entry](01-task/low-level/state_03a_application_eligibility_entry.png)

### `state_03b_application_decision_outcomes`

![state_03b_application_decision_outcomes](01-task/low-level/state_03b_application_decision_outcomes.png)

### `state_04_task_assignment`

![state_04_task_assignment](01-task/high-level/state_04_task_assignment.png)

## 02-review

### `state_02_review_session`

![state_02_review_session](02-review/overview/state_02_review_session.png)

### `state_02b_task_review_workflow`

![state_02b_task_review_workflow](02-review/high-level/state_02b_task_review_workflow.png)

Current-code caveat: task respond/accept commands still lack expected source-status guards. Board projection now keeps all eight statuses visible; it no longer collapses `ai_reviewing` or `resolved` into `awaiting_review`.

### `state_02c_sprint_reverse_review_workflow`

![state_02c_sprint_reverse_review_workflow](02-review/high-level/state_02c_sprint_reverse_review_workflow.png)

### `state_02d_sprint_reverse_review_escalation`

![state_02d_sprint_reverse_review_escalation](02-review/low-level/state_02d_sprint_reverse_review_escalation.png)

### `state_02e_review_dispute_case`

![state_02e_review_dispute_case](02-review/high-level/state_02e_review_dispute_case.png)

### `state_02e1_dispute_human_resolution`

![state_02e1_dispute_human_resolution](02-review/low-level/state_02e1_dispute_human_resolution.png)

### `state_02e2_dispute_ai_advisory`

![state_02e2_dispute_ai_advisory](02-review/low-level/state_02e2_dispute_ai_advisory.png)

### `state_06_flagged_review`

![state_06_flagged_review](02-review/high-level/state_06_flagged_review.png)

## 05-organization-membership

### `state_05_org_membership`

![state_05_org_membership](05-organization-membership/overview/state_05_org_membership.png)

## 07-user-lifecycle

### `state_07_user_status`

![state_07_user_status](07-user-lifecycle/overview/state_07_user_status.png)

### `state_07a_user_deletion_overlay`

![state_07a_user_deletion_overlay](07-user-lifecycle/low-level/state_07a_user_deletion_overlay.png)

## 08-project

### `state_08_project_status`

![state_08_project_status](08-project/overview/state_08_project_status.png)

### `state_08b_project_sprint_review`

![state_08b_project_sprint_review](08-project/high-level/state_08b_project_sprint_review.png)

## 09-platform-support

### `state_10_notification_lifecycle`

![state_10_notification_lifecycle](09-platform-support/overview/state_10_notification_lifecycle.png)

### `state_11_admin_mode` (System Admin realm session; compatibility basename)

![state_11_admin_mode](09-platform-support/high-level/state_11_admin_mode.png)
