# Activity Diagram Gallery (`Action/`)

Mỗi diagram có hai file cùng basename:

- `.mmd`: source Mermaid, source of truth
- `.png`: ảnh render để xem trực tiếp

Ảnh được render bằng Mermaid CLI `11.16.0`, theme `neutral`, nền trắng, scale `2`. Không sửa `.png` thủ công; sửa `.mmd` rồi render lại.

## Chuẩn đọc

Đây là UML Activity semantics được render bằng Mermaid `flowchart` vì Mermaid CLI chưa có renderer `activityDiagram` native. Shape quy ước: tròn = initial/final, chữ nhật bo góc = action, hình thoi = decision/guard, nét đứt = note/reference. Diagram có từ hai trách nhiệm trở lên phải thể hiện lane bằng subgraph hoặc tách thành scenario riêng.

Trong report dùng file `*_overview` trước. File detail dùng ở phần phân tích hoặc appendix; không nhồi toàn bộ flow vào một trang.

Mỗi domain dùng cùng ba tầng dễ nhận biết: `overview/` = điểm vào report, `high-level/` = workflow nghiệp vụ chính, `low-level/` = guard, rule hoặc nhánh chi tiết. README trong domain chỉ rõ quan hệ cha–con; tầng không có diagram được ghi `—`, không ép một file vào sai mức.

Overview là một phase high-level độc lập, không phải catalog chức năng hay nhiều panel ghép chung canvas. Subtitle trong action node trỏ tới diagram con tương ứng để đọc high → low. Connector tròn cùng chữ (`A` → `A`) chỉ còn dùng trong một flow liên tục khi cần xuống hàng; row layout đó không có border hoặc title riêng.

## 01 — Task Management

Thư mục thử nghiệm phân tầng trực tiếp theo mức đọc:

```text
01-task-management/
├── overview/
├── high-level/
└── low-level/
```

### Overview

### `act_01_task_definition_overview`

![Task definition overview](01-task-management/overview/act_01_task_definition_overview.png)

### `act_01_task_assignment_path_overview`

![Task assignment path overview](01-task-management/overview/act_01_task_assignment_path_overview.png)

### `act_01_task_operation_outcome_overview`

![Task operation outcome overview](01-task-management/overview/act_01_task_operation_outcome_overview.png)

### `act_01_task_cancellation_followup_overview`

![Task cancellation follow-up overview](01-task-management/overview/act_01_task_cancellation_followup_overview.png)

### High level

### `act_01a_task_crud`

![Task authoring](01-task-management/high-level/act_01a_task_crud.png)

### `act_01b_task_workflow`

![Task workflow](01-task-management/high-level/act_01b_task_workflow.png)

### `act_01c_task_assignment_rules`

![Task assignment rules](01-task-management/high-level/act_01c_task_assignment_rules.png)

### `act_01d_task_board_operations`

![Task board operations](01-task-management/high-level/act_01d_task_board_operations.png)

### Low level

### `act_01a1_task_maintenance`

![Task maintenance](01-task-management/low-level/act_01a1_task_maintenance.png)

### `act_01b1_task_cancel_reopen`

![Task cancel and reopen](01-task-management/low-level/act_01b1_task_cancel_reopen.png)

### `act_01c1_direct_assignment_guards`

![Direct assignment guards](01-task-management/low-level/act_01c1_direct_assignment_guards.png)

### `act_01c2_revoke_assignment`

![Revoke assignment](01-task-management/low-level/act_01c2_revoke_assignment.png)

## 02 — Marketplace

### `act_02_marketplace_discovery_apply_overview`

![Marketplace discovery and apply overview](02-marketplace/overview/act_02_marketplace_discovery_apply_overview.png)

### `act_02_marketplace_application_decision_overview`

![Marketplace application decision overview](02-marketplace/overview/act_02_marketplace_application_decision_overview.png)

### `act_02a_marketplace_browse`

![Marketplace browse](02-marketplace/high-level/act_02a_marketplace_browse.png)

### `act_02b_marketplace_apply`

![Marketplace apply](02-marketplace/high-level/act_02b_marketplace_apply.png)

### `act_02b1_marketplace_process_application`

![Marketplace process application](02-marketplace/low-level/act_02b1_marketplace_process_application.png)

### `act_02c_marketplace_withdraw`

![Marketplace withdraw](02-marketplace/high-level/act_02c_marketplace_withdraw.png)

### `act_02d_marketplace_triage_ranking`

![Marketplace triage and ranking](02-marketplace/high-level/act_02d_marketplace_triage_ranking.png)

### `act_02e_marketplace_application_exceptions`

![Marketplace application exceptions](02-marketplace/low-level/act_02e_marketplace_application_exceptions.png)

### `act_02f_match_score_calculation`

![Match-score calculation](02-marketplace/low-level/act_02f_match_score_calculation.png)

## 03 — Review

### `act_03_review_observation_collection_overview`

![Review observation collection overview](03-review/overview/act_03_review_observation_collection_overview.png)

### `act_03_review_response_resolution_overview`

![Review response resolution overview](03-review/overview/act_03_review_response_resolution_overview.png)

### `act_03a_review_submit`

![Review submit](03-review/high-level/act_03a_review_submit.png)

### `act_03b_review_confirm`

![Review confirm](03-review/high-level/act_03b_review_confirm.png)

### `act_03c_review_score`

![Review score](03-review/high-level/act_03c_review_score.png)

### `act_03c1_anomaly_moderation`

![Review anomaly moderation](03-review/low-level/act_03c1_anomaly_moderation.png)

### `act_03c2_profile_score_recalculation`

![Profile score recalculation](03-review/low-level/act_03c2_profile_score_recalculation.png)

### `act_03d_review_dispute_lifecycle`

![Review dispute lifecycle](03-review/high-level/act_03d_review_dispute_lifecycle.png)

### `act_03e_sprint_review_close`

![Sprint review open and close](03-review/high-level/act_03e_sprint_review_close.png)

## 04 — Project Delivery

### `act_04_project_preparation_overview`

![Project preparation overview](04-project-delivery/overview/act_04_project_preparation_overview.png)

### `act_04_project_delivery_review_overview`

![Project delivery and review overview](04-project-delivery/overview/act_04_project_delivery_review_overview.png)

### `act_04a_project_staffing`

![Project staffing](04-project-delivery/high-level/act_04a_project_staffing.png)

### `act_04a1_project_setup_input`

![Project setup input](04-project-delivery/low-level/act_04a1_project_setup_input.png)

### `act_04a2_initial_staffing_resolution`

![Initial staffing resolution](04-project-delivery/low-level/act_04a2_initial_staffing_resolution.png)

### `act_04b_project_role_skill_governance`

![Project role and skill governance](04-project-delivery/high-level/act_04b_project_role_skill_governance.png)

### `act_04c_sprint_planning_board`

![Sprint planning board](04-project-delivery/high-level/act_04c_sprint_planning_board.png)

## 05 — Organization

### `act_05_org_management`

![Organization management](05-organization/overview/act_05_org_management.png)

### `act_05b_org_administration`

![Organization administration](05-organization/high-level/act_05b_org_administration.png)

### `act_05c_org_create`

![Organization create](05-organization/low-level/act_05c_org_create.png)

### `act_05d_org_invite_member`

![Organization invitation lifecycle](05-organization/high-level/act_05d_org_invite_member.png)

### `act_05d1_org_issue_invitation`

![Issue organization invitation](05-organization/low-level/act_05d1_org_issue_invitation.png)

### `act_05d2_org_accept_invitation`

![Accept organization invitation](05-organization/low-level/act_05d2_org_accept_invitation.png)

### `act_05d3_org_reject_invitation`

![Reject organization invitation](05-organization/low-level/act_05d3_org_reject_invitation.png)

### `act_05e_org_join_request`

![Organization join request](05-organization/low-level/act_05e_org_join_request.png)

### `act_05f_org_update_member_role`

![Organization update member role](05-organization/low-level/act_05f_org_update_member_role.png)

### `act_05g_org_remove_member`

![Organization remove member](05-organization/low-level/act_05g_org_remove_member.png)

### `act_05h_org_current_workspace`

![Organization current workspace](05-organization/low-level/act_05h_org_current_workspace.png)

## 06 — User Lifecycle

### `act_06_user_authentication_overview`

![User authentication overview](06-user-lifecycle/overview/act_06_user_authentication_overview.png)

### `act_06_user_workspace_session_overview`

![User workspace session overview](06-user-lifecycle/overview/act_06_user_workspace_session_overview.png)

### `act_06_user_registration_approval`

![User registration and approval](06-user-lifecycle/high-level/act_06_user_registration_approval.png)

### `act_06a_oauth_provider_handoff`

![OAuth provider handoff](06-user-lifecycle/low-level/act_06a_oauth_provider_handoff.png)

### `act_06b_logout_session_teardown`

![Logout session teardown](06-user-lifecycle/low-level/act_06b_logout_session_teardown.png)

### `act_06c_social_login_account_resolution`

![Social login account resolution](06-user-lifecycle/low-level/act_06c_social_login_account_resolution.png)

### `act_06d_workspace_routing`

![Authenticated workspace routing](06-user-lifecycle/low-level/act_06d_workspace_routing.png)

## 07 — Profile And Skills

### `act_07_profile_signal_production_overview`

![Profile signal production overview](07-profile-skills/overview/act_07_profile_signal_production_overview.png)

### `act_07_profile_signal_presentation_overview`

![Profile signal presentation overview](07-profile-skills/overview/act_07_profile_signal_presentation_overview.png)

### `act_07a_profile_management`

![Profile management](07-profile-skills/high-level/act_07a_profile_management.png)

### `act_07a1_profile_snapshot_sharing`

![Profile snapshot sharing](07-profile-skills/low-level/act_07a1_profile_snapshot_sharing.png)

### `act_07b_skill_management`

![Skill management](07-profile-skills/high-level/act_07b_skill_management.png)

### `act_07b1_add_imported_skill`

![Add imported skill](07-profile-skills/low-level/act_07b1_add_imported_skill.png)

### `act_07b2_update_remove_imported_skill`

![Update or remove imported skill](07-profile-skills/low-level/act_07b2_update_remove_imported_skill.png)

### `act_07c_reviewed_skill_recalculation`

![Reviewed skill recalculation](07-profile-skills/high-level/act_07c_reviewed_skill_recalculation.png)

### `act_07d_skill_rubric_resolution`

![Skill rubric resolution](07-profile-skills/high-level/act_07d_skill_rubric_resolution.png)

### `act_07e_profile_skill_visualization`

![Current profile skill visualization](07-profile-skills/high-level/act_07e_profile_skill_visualization.png)

### `act_07f_talent_directory_bookmarks`

![Talent directory and recruiter bookmarks](07-profile-skills/high-level/act_07f_talent_directory_bookmarks.png)

## 08 — Platform Support

### `act_08_support_request_routing_overview`

![Support request routing overview](08-platform-support/overview/act_08_support_request_routing_overview.png)

### `act_08_support_result_recording_overview`

![Support result recording overview](08-platform-support/overview/act_08_support_result_recording_overview.png)

### `act_08a_notification_center`

![Notification center](08-platform-support/high-level/act_08a_notification_center.png)

### `act_08b_user_settings`

![User settings](08-platform-support/high-level/act_08b_user_settings.png)

### `act_08c_system_admin_console`

![System admin console](08-platform-support/high-level/act_08c_system_admin_console.png)

### `act_08c1_admin_session_entry`

![Administrator session entry](08-platform-support/low-level/act_08c1_admin_session_entry.png)

### `act_08c2_governed_admin_action`

![Governed administrator action](08-platform-support/low-level/act_08c2_governed_admin_action.png)

## 09 — Search And Observability

### `act_09_search_runtime`

![Search runtime with fallback](09-search-observability/overview/act_09_search_runtime.png)
