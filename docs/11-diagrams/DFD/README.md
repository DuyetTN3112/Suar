# DFD Diagram Gallery

## Formal DFD Reading Path

The gallery uses formal DFD decomposition, not arbitrary visual levels:

| Formal level | Entry model | Child relationship |
| --- | --- | --- |
| Level 0 | `dfd_00_context`: Process `0` and every external entity/source/sink | No internal process or data store is shown. |
| Level 1 | Complementary frames `dfd_01a`--`dfd_01d`: Processes `1`--`7` and authoritative data stores | Jointly decompose Process `0`; D2, H1, and H2 make the cross-frame data boundaries explicit, and each numbered process is a valid drill-down entry. |
| Level 2 | Domain maps such as `dfd_02a_task_authoring_context`--`dfd_02b_task_execution_completion` | Expands one Level-1 process and preserves its parent number, for example process `3` becomes `3.1`--`3.3`; complementary frames name their durable handoff. |
| Level 3 | Workflow/primitive maps such as `dfd_02a_task_authoring` and `dfd_02a1_task_creation` | Expands or gives the complete atomic view of one Level-2/Level-3 process identifier. |

The `overview/`, `high-level/`, and `low-level/` folders are navigation tiers; they do not define the
formal DFD level. Each source header names its formal level, parent process and balancing boundary.
External entities use stable `E#` identifiers, processes use `P#` identifiers, and stores use `D#`
identifiers. A child must retain or refine its parent data flows; it cannot introduce an unrelated
source, sink, or store without an explicit scope note.

## Data-flow Direction and Wire Routing

An arrowhead marks the **recipient of named data**, not merely the direction that is convenient for
layout. Each connector is therefore read from source to target:

- external entity/service `→` process: request, callback, submitted input or supplied evidence;
- process `→` external entity/service: result, status, notification or outbound request;
- data store `→` process: current record, state, eligibility or other facts being read;
- process `→` data store: new, updated, persisted or otherwise written facts;
- process `→` process: a named, governed handoff.

Read and write are always separate directed flows. A diagram must not collapse them into a
bidirectional arrow or one mixed label. If both paths would collide, it repeats the same E#/D# symbol
with an explicit `same actor`, `same service`, or `same logical store` label, then routes each arrow
on its own row or lane. A write label must name the updated/persisted fact, while a read label must
name the current/source fact. Connectors use orthogonal paths where possible; an arrowhead must remain
visible at its target and labels must not conceal or reverse the intended direction.

## 00-system-overview

### overview

#### dfd_00_context

[dfd_00_context source](00-system-overview/overview/dfd_00_context.mmd)

![dfd_00_context](00-system-overview/overview/dfd_00_context.png)

### high-level

#### dfd_01a_identity_organisation_delivery_context

[dfd_01a source](00-system-overview/high-level/dfd_01a_identity_organisation_delivery_context.mmd)

![dfd_01a](00-system-overview/high-level/dfd_01a_identity_organisation_delivery_context.png)

#### dfd_01b_task_discovery_submission

[dfd_01b source](00-system-overview/high-level/dfd_01b_task_discovery_submission.mmd)

![dfd_01b](00-system-overview/high-level/dfd_01b_task_discovery_submission.png)

#### dfd_01c_review_profile_advisory

[dfd_01c source](00-system-overview/high-level/dfd_01c_review_profile_advisory.mmd)

![dfd_01c](00-system-overview/high-level/dfd_01c_review_profile_advisory.png)

#### dfd_01d_platform_support

[dfd_01d source](00-system-overview/high-level/dfd_01d_platform_support.mmd)

![dfd_01d](00-system-overview/high-level/dfd_01d_platform_support.png)

### low-level

#### dfd_01a_identity_access

[dfd_01a_identity_access source](00-system-overview/low-level/dfd_01a_identity_access.mmd)

![dfd_01a_identity_access](00-system-overview/low-level/dfd_01a_identity_access.png)

## 01-project-delivery

### overview

#### dfd_01_project_delivery

[dfd_01_project_delivery source](01-project-delivery/overview/dfd_01_project_delivery.mmd)

![dfd_01_project_delivery](01-project-delivery/overview/dfd_01_project_delivery.png)

### high-level

#### dfd_01a_staffing_competency

[dfd_01a_staffing_competency source](01-project-delivery/high-level/dfd_01a_staffing_competency.mmd)

![dfd_01a_staffing_competency](01-project-delivery/high-level/dfd_01a_staffing_competency.png)

#### dfd_01b_sprint_planning

[dfd_01b_sprint_planning source](01-project-delivery/high-level/dfd_01b_sprint_planning.mmd)

![dfd_01b_sprint_planning](01-project-delivery/high-level/dfd_01b_sprint_planning.png)

### low-level

#### dfd_01a1_role_skill_contract

[dfd_01a1_role_skill_contract source](01-project-delivery/low-level/dfd_01a1_role_skill_contract.mmd)

![dfd_01a1_role_skill_contract](01-project-delivery/low-level/dfd_01a1_role_skill_contract.png)

#### dfd_01a2_candidate_scoring

[dfd_01a2_candidate_scoring source](01-project-delivery/low-level/dfd_01a2_candidate_scoring.mmd)

![dfd_01a2_candidate_scoring](01-project-delivery/low-level/dfd_01a2_candidate_scoring.png)

#### dfd_01a3_professional_role_assignment

[dfd_01a3_professional_role_assignment source](01-project-delivery/low-level/dfd_01a3_professional_role_assignment.mmd)

![dfd_01a3_professional_role_assignment](01-project-delivery/low-level/dfd_01a3_professional_role_assignment.png)

#### dfd_01b1_sprint_plan

[dfd_01b1_sprint_plan source](01-project-delivery/low-level/dfd_01b1_sprint_plan.mmd)

![dfd_01b1_sprint_plan](01-project-delivery/low-level/dfd_01b1_sprint_plan.png)

#### dfd_01b2_sprint_board

[dfd_01b2_sprint_board source](01-project-delivery/low-level/dfd_01b2_sprint_board.mmd)

![dfd_01b2_sprint_board](01-project-delivery/low-level/dfd_01b2_sprint_board.png)

#### dfd_01b3_move_task_sprint

[dfd_01b3_move_task_sprint source](01-project-delivery/low-level/dfd_01b3_move_task_sprint.mmd)

![dfd_01b3_move_task_sprint](01-project-delivery/low-level/dfd_01b3_move_task_sprint.png)

## 02-task

### overview

#### dfd_02a--02b_task_authoring_context_execution_completion

[P3 authoring source](02-task/overview/dfd_02a_task_authoring_context.mmd) and [P3 execution/completion source](02-task/overview/dfd_02b_task_execution_completion.mmd)

![dfd_02a_task_authoring_context](02-task/overview/dfd_02a_task_authoring_context.png)

![dfd_02b_task_execution_completion](02-task/overview/dfd_02b_task_execution_completion.png)

### high-level

#### dfd_02a_task_authoring

[dfd_02a_task_authoring source](02-task/high-level/dfd_02a_task_authoring.mmd)

![dfd_02a_task_authoring](02-task/high-level/dfd_02a_task_authoring.png)

#### dfd_02b_task_execution

[dfd_02b_task_execution source](02-task/high-level/dfd_02b_task_execution.mmd)

![dfd_02b_task_execution](02-task/high-level/dfd_02b_task_execution.png)

#### dfd_02c_task_completion_package

[dfd_02c_task_completion_package source](02-task/high-level/dfd_02c_task_completion_package.mmd)

![dfd_02c_task_completion_package](02-task/high-level/dfd_02c_task_completion_package.png)

### low-level

#### dfd_02b2c_done_completion_transition

[dfd_02b2c_done_completion_transition source](02-task/low-level/dfd_02b2c_done_completion_transition.mmd)

![dfd_02b2c_done_completion_transition](02-task/low-level/dfd_02b2c_done_completion_transition.png)

#### dfd_02a1_task_creation

[dfd_02a1_task_creation source](02-task/low-level/dfd_02a1_task_creation.mmd)

![dfd_02a1_task_creation](02-task/low-level/dfd_02a1_task_creation.png)

#### dfd_02a2_task_requirement_update

[dfd_02a2_task_requirement_update source](02-task/low-level/dfd_02a2_task_requirement_update.mmd)

![dfd_02a2_task_requirement_update](02-task/low-level/dfd_02a2_task_requirement_update.png)

#### dfd_02b1a_task_comment

[dfd_02b1a_task_comment source](02-task/low-level/dfd_02b1a_task_comment.mmd)

![dfd_02b1a_task_comment](02-task/low-level/dfd_02b1a_task_comment.png)

#### dfd_02b1b_task_attachment

[dfd_02b1b_task_attachment source](02-task/low-level/dfd_02b1b_task_attachment.mmd)

![dfd_02b1b_task_attachment](02-task/low-level/dfd_02b1b_task_attachment.png)

#### dfd_02b2a_assignee_change

[dfd_02b2a_assignee_change source](02-task/low-level/dfd_02b2a_assignee_change.mmd)

![dfd_02b2a_assignee_change](02-task/low-level/dfd_02b2a_assignee_change.png)

#### dfd_02b2b_status_transition

[dfd_02b2b_status_transition source](02-task/low-level/dfd_02b2b_status_transition.mmd)

![dfd_02b2b_status_transition](02-task/low-level/dfd_02b2b_status_transition.png)

#### dfd_02b3_board_reads

[dfd_02b3_board_reads source](02-task/low-level/dfd_02b3_board_reads.mmd)

![dfd_02b3_board_reads](02-task/low-level/dfd_02b3_board_reads.png)

#### dfd_02c1a_submission_package

[dfd_02c1a_submission_package source](02-task/low-level/dfd_02c1a_submission_package.mmd)

![dfd_02c1a_submission_package](02-task/low-level/dfd_02c1a_submission_package.png)

#### dfd_02c1b_submission_evidence

[dfd_02c1b_submission_evidence source](02-task/low-level/dfd_02c1b_submission_evidence.mmd)

![dfd_02c1b_submission_evidence](02-task/low-level/dfd_02c1b_submission_evidence.png)

#### dfd_02c2_lock_review_handoff

[dfd_02c2_lock_review_handoff source](02-task/low-level/dfd_02c2_lock_review_handoff.mmd)

![dfd_02c2_lock_review_handoff](02-task/low-level/dfd_02c2_lock_review_handoff.png)

## 03-marketplace

### overview

#### dfd_03_marketplace_detail

[dfd_03_marketplace_detail source](03-marketplace/overview/dfd_03_marketplace_detail.mmd)

![dfd_03_marketplace_detail](03-marketplace/overview/dfd_03_marketplace_detail.png)

### high-level

#### dfd_03a_marketplace_browse_search

[dfd_03a_marketplace_browse_search source](03-marketplace/high-level/dfd_03a_marketplace_browse_search.mmd)

![dfd_03a_marketplace_browse_search](03-marketplace/high-level/dfd_03a_marketplace_browse_search.png)

#### dfd_03b_marketplace_proposal_lifecycle

[dfd_03b_marketplace_proposal_lifecycle source](03-marketplace/high-level/dfd_03b_marketplace_proposal_lifecycle.mmd)

![dfd_03b_marketplace_proposal_lifecycle](03-marketplace/high-level/dfd_03b_marketplace_proposal_lifecycle.png)

#### dfd_03c_marketplace_decision_assignment

[dfd_03c_marketplace_decision_assignment source](03-marketplace/high-level/dfd_03c_marketplace_decision_assignment.mmd)

![dfd_03c_marketplace_decision_assignment](03-marketplace/high-level/dfd_03c_marketplace_decision_assignment.png)

### low-level

#### dfd_03b1_submit_proposal

[dfd_03b1_submit_proposal source](03-marketplace/low-level/dfd_03b1_submit_proposal.mmd)

![dfd_03b1_submit_proposal](03-marketplace/low-level/dfd_03b1_submit_proposal.png)

#### dfd_03b2_withdraw_proposal

[dfd_03b2_withdraw_proposal source](03-marketplace/low-level/dfd_03b2_withdraw_proposal.mmd)

![dfd_03b2_withdraw_proposal](03-marketplace/low-level/dfd_03b2_withdraw_proposal.png)

#### dfd_03c1_rank_explain_proposals

[dfd_03c1_rank_explain_proposals source](03-marketplace/low-level/dfd_03c1_rank_explain_proposals.mmd)

![dfd_03c1_rank_explain_proposals](03-marketplace/low-level/dfd_03c1_rank_explain_proposals.png)

#### dfd_03c2_decide_assign_proposal

[dfd_03c2_decide_assign_proposal source](03-marketplace/low-level/dfd_03c2_decide_assign_proposal.mmd)

![dfd_03c2_decide_assign_proposal](03-marketplace/low-level/dfd_03c2_decide_assign_proposal.png)

## 04-review

### overview

#### dfd_04a--04c_review_lifecycle_governance_profile

[P5 lifecycle source](04-review/overview/dfd_04a_review_lifecycle.mmd), [P5 governance/advisory source](04-review/overview/dfd_04b_governance_advisory.mmd), and [P5 profile-signals source](04-review/overview/dfd_04c_profile_signals.mmd)

![dfd_04a_review_lifecycle](04-review/overview/dfd_04a_review_lifecycle.png)

![dfd_04b_governance_advisory](04-review/overview/dfd_04b_governance_advisory.png)

![dfd_04c_profile_signals](04-review/overview/dfd_04c_profile_signals.png)

### high-level

#### dfd_04a_review_submission

[dfd_04a_review_submission source](04-review/high-level/dfd_04a_review_submission.mmd)

![dfd_04a_review_submission](04-review/high-level/dfd_04a_review_submission.png)

#### dfd_04b_review_confirmation

[dfd_04b_review_confirmation source](04-review/high-level/dfd_04b_review_confirmation.mmd)

![dfd_04b_review_confirmation](04-review/high-level/dfd_04b_review_confirmation.png)

#### dfd_04c_review_scoring

[dfd_04c_review_scoring source](04-review/high-level/dfd_04c_review_scoring.mmd)

![dfd_04c_review_scoring](04-review/high-level/dfd_04c_review_scoring.png)

#### dfd_04d_reverse_feedback

[dfd_04d_reverse_feedback source](04-review/high-level/dfd_04d_reverse_feedback.mmd)

![dfd_04d_reverse_feedback](04-review/high-level/dfd_04d_reverse_feedback.png)

### low-level

#### dfd_04a1_open_session

[dfd_04a1_open_session source](04-review/low-level/dfd_04a1_open_session.mmd)

![dfd_04a1_open_session](04-review/low-level/dfd_04a1_open_session.png)

#### dfd_04a2_manager_review

[dfd_04a2_manager_review source](04-review/low-level/dfd_04a2_manager_review.mmd)

![dfd_04a2_manager_review](04-review/low-level/dfd_04a2_manager_review.png)

#### dfd_04a3_peer_review

[dfd_04a3_peer_review source](04-review/low-level/dfd_04a3_peer_review.mmd)

![dfd_04a3_peer_review](04-review/low-level/dfd_04a3_peer_review.png)

#### dfd_04b1_reviewee_response

[dfd_04b1_reviewee_response source](04-review/low-level/dfd_04b1_reviewee_response.mmd)

![dfd_04b1_reviewee_response](04-review/low-level/dfd_04b1_reviewee_response.png)

#### dfd_04b2a_anomaly_detection

[dfd_04b2a_anomaly_detection source](04-review/low-level/dfd_04b2a_anomaly_detection.mmd)

![dfd_04b2a_anomaly_detection](04-review/low-level/dfd_04b2a_anomaly_detection.png)

#### dfd_04b2b_anomaly_resolution

[dfd_04b2b_anomaly_resolution source](04-review/low-level/dfd_04b2b_anomaly_resolution.mmd)

![dfd_04b2b_anomaly_resolution](04-review/low-level/dfd_04b2b_anomaly_resolution.png)

#### dfd_04b3_dispute_governance

[dfd_04b3_dispute_governance source](04-review/low-level/dfd_04b3_dispute_governance.mmd)

![dfd_04b3_dispute_governance](04-review/low-level/dfd_04b3_dispute_governance.png)

#### dfd_04c1_skill_signal

[dfd_04c1_skill_signal source](04-review/low-level/dfd_04c1_skill_signal.mmd)

![dfd_04c1_skill_signal](04-review/low-level/dfd_04c1_skill_signal.png)

#### dfd_04c2_performance_score

[dfd_04c2_performance_score source](04-review/low-level/dfd_04c2_performance_score.mmd)

![dfd_04c2_performance_score](04-review/low-level/dfd_04c2_performance_score.png)

#### dfd_04c3_profile_aggregates

[dfd_04c3_profile_aggregates source](04-review/low-level/dfd_04c3_profile_aggregates.mmd)

![dfd_04c3_profile_aggregates](04-review/low-level/dfd_04c3_profile_aggregates.png)

#### dfd_04d1a_reverse_review_submission

[dfd_04d1a_reverse_review_submission source](04-review/low-level/dfd_04d1a_reverse_review_submission.mmd)

![dfd_04d1a_reverse_review_submission](04-review/low-level/dfd_04d1a_reverse_review_submission.png)

#### dfd_04d1b_reverse_review_response

[dfd_04d1b_reverse_review_response source](04-review/low-level/dfd_04d1b_reverse_review_response.mmd)

![dfd_04d1b_reverse_review_response](04-review/low-level/dfd_04d1b_reverse_review_response.png)

#### dfd_04d2a_reverse_review_report

[dfd_04d2a_reverse_review_report source](04-review/low-level/dfd_04d2a_reverse_review_report.mmd)

![dfd_04d2a_reverse_review_report](04-review/low-level/dfd_04d2a_reverse_review_report.png)

#### dfd_04d2b_reverse_review_resolution

[dfd_04d2b_reverse_review_resolution source](04-review/low-level/dfd_04d2b_reverse_review_resolution.mmd)

![dfd_04d2b_reverse_review_resolution](04-review/low-level/dfd_04d2b_reverse_review_resolution.png)

## 05-organization

### overview

#### dfd_05_org_detail

[dfd_05_org_detail source](05-organization/overview/dfd_05_org_detail.mmd)

![dfd_05_org_detail](05-organization/overview/dfd_05_org_detail.png)

### high-level

#### dfd_05a_org_membership

[dfd_05a_org_membership source](05-organization/high-level/dfd_05a_org_membership.mmd)

![dfd_05a_org_membership](05-organization/high-level/dfd_05a_org_membership.png)

#### dfd_05b_org_admin_controls

[dfd_05b_org_admin_controls source](05-organization/high-level/dfd_05b_org_admin_controls.mmd)

![dfd_05b_org_admin_controls](05-organization/high-level/dfd_05b_org_admin_controls.png)

#### dfd_05c_org_context

[dfd_05c_org_context source](05-organization/high-level/dfd_05c_org_context.mmd)

![dfd_05c_org_context](05-organization/high-level/dfd_05c_org_context.png)

### low-level

#### dfd_05a1_create_invitation

[dfd_05a1_create_invitation source](05-organization/low-level/dfd_05a1_create_invitation.mmd)

![dfd_05a1_create_invitation](05-organization/low-level/dfd_05a1_create_invitation.png)

#### dfd_05a2_invitation_response

[dfd_05a2_invitation_response source](05-organization/low-level/dfd_05a2_invitation_response.mmd)

![dfd_05a2_invitation_response](05-organization/low-level/dfd_05a2_invitation_response.png)

#### dfd_05a3_join_request

[dfd_05a3_join_request source](05-organization/low-level/dfd_05a3_join_request.mmd)

![dfd_05a3_join_request](05-organization/low-level/dfd_05a3_join_request.png)

#### dfd_05a4_join_request_resolution

[dfd_05a4_join_request_resolution source](05-organization/low-level/dfd_05a4_join_request_resolution.mmd)

![dfd_05a4_join_request_resolution](05-organization/low-level/dfd_05a4_join_request_resolution.png)

#### dfd_05b1_member_administration

[dfd_05b1_member_administration source](05-organization/low-level/dfd_05b1_member_administration.mmd)

![dfd_05b1_member_administration](05-organization/low-level/dfd_05b1_member_administration.png)

#### dfd_05b2_policy_update

[dfd_05b2_policy_update source](05-organization/low-level/dfd_05b2_policy_update.mmd)

![dfd_05b2_policy_update](05-organization/low-level/dfd_05b2_policy_update.png)

#### dfd_05c1_organization_creation

[dfd_05c1_organization_creation source](05-organization/low-level/dfd_05c1_organization_creation.mmd)

![dfd_05c1_organization_creation](05-organization/low-level/dfd_05c1_organization_creation.png)

#### dfd_05c2_current_context_switch

[dfd_05c2_current_context_switch source](05-organization/low-level/dfd_05c2_current_context_switch.mmd)

![dfd_05c2_current_context_switch](05-organization/low-level/dfd_05c2_current_context_switch.png)

## 06-platform-support

### overview

#### dfd_06_platform_support_detail

[dfd_06_platform_support_detail source](06-platform-support/overview/dfd_06_platform_support_detail.mmd)

![dfd_06_platform_support_detail](06-platform-support/overview/dfd_06_platform_support_detail.png)

### high-level

#### dfd_06a_notification_center

[dfd_06a_notification_center source](06-platform-support/high-level/dfd_06a_notification_center.mmd)

![dfd_06a_notification_center](06-platform-support/high-level/dfd_06a_notification_center.png)

#### dfd_06b_user_settings

[dfd_06b_user_settings source](06-platform-support/high-level/dfd_06b_user_settings.mmd)

![dfd_06b_user_settings](06-platform-support/high-level/dfd_06b_user_settings.png)

#### dfd_06c_system_admin_console

[dfd_06c_system_admin_console source](06-platform-support/high-level/dfd_06c_system_admin_console.mmd)

![dfd_06c_system_admin_console](06-platform-support/high-level/dfd_06c_system_admin_console.png)

### low-level

#### dfd_06a1_notification_feed

[dfd_06a1_notification_feed source](06-platform-support/low-level/dfd_06a1_notification_feed.mmd)

![dfd_06a1_notification_feed](06-platform-support/low-level/dfd_06a1_notification_feed.png)

#### dfd_06a2_notification_read_state

[dfd_06a2_notification_read_state source](06-platform-support/low-level/dfd_06a2_notification_read_state.mmd)

![dfd_06a2_notification_read_state](06-platform-support/low-level/dfd_06a2_notification_read_state.png)

#### dfd_06a3_notification_removal

[dfd_06a3_notification_removal source](06-platform-support/low-level/dfd_06a3_notification_removal.mmd)

![dfd_06a3_notification_removal](06-platform-support/low-level/dfd_06a3_notification_removal.png)

#### dfd_06b1_settings_read

[dfd_06b1_settings_read source](06-platform-support/low-level/dfd_06b1_settings_read.mmd)

![dfd_06b1_settings_read](06-platform-support/low-level/dfd_06b1_settings_read.png)

#### dfd_06b2_preference_update

[dfd_06b2_preference_update source](06-platform-support/low-level/dfd_06b2_preference_update.mmd)

![dfd_06b2_preference_update](06-platform-support/low-level/dfd_06b2_preference_update.png)

#### dfd_06b3_profile_setting_update

[dfd_06b3_profile_setting_update source](06-platform-support/low-level/dfd_06b3_profile_setting_update.mmd)

![dfd_06b3_profile_setting_update](06-platform-support/low-level/dfd_06b3_profile_setting_update.png)

#### dfd_06c1_admin_context

[dfd_06c1_admin_context source](06-platform-support/low-level/dfd_06c1_admin_context.mmd)

![dfd_06c1_admin_context](06-platform-support/low-level/dfd_06c1_admin_context.png)

#### dfd_06c2_admin_dashboard

[dfd_06c2_admin_dashboard source](06-platform-support/low-level/dfd_06c2_admin_dashboard.mmd)

![dfd_06c2_admin_dashboard](06-platform-support/low-level/dfd_06c2_admin_dashboard.png)

#### dfd_06c3_user_governance

[dfd_06c3_user_governance source](06-platform-support/low-level/dfd_06c3_user_governance.mmd)

![dfd_06c3_user_governance](06-platform-support/low-level/dfd_06c3_user_governance.png)

#### dfd_06c4_review_governance

[dfd_06c4_review_governance source](06-platform-support/low-level/dfd_06c4_review_governance.mmd)

![dfd_06c4_review_governance](06-platform-support/low-level/dfd_06c4_review_governance.png)

#### dfd_06d_error_capture

[dfd_06d_error_capture source](06-platform-support/low-level/dfd_06d_error_capture.mmd)

![dfd_06d_error_capture](06-platform-support/low-level/dfd_06d_error_capture.png)

## 07-search-observability

### overview

#### dfd_07_search_detail

[dfd_07_search_detail source](07-search-observability/overview/dfd_07_search_detail.mmd)

![dfd_07_search_detail](07-search-observability/overview/dfd_07_search_detail.png)

### high-level

#### dfd_07a_search_query_fallback

[dfd_07a_search_query_fallback source](07-search-observability/high-level/dfd_07a_search_query_fallback.mmd)

![dfd_07a_search_query_fallback](07-search-observability/high-level/dfd_07a_search_query_fallback.png)

#### dfd_07b_search_projection_sync

[dfd_07b_search_projection_sync source](07-search-observability/high-level/dfd_07b_search_projection_sync.mmd)

![dfd_07b_search_projection_sync](07-search-observability/high-level/dfd_07b_search_projection_sync.png)

### low-level

#### dfd_07c1_search_health

[dfd_07c1_search_health source](07-search-observability/low-level/dfd_07c1_search_health.mmd)

![dfd_07c1_search_health](07-search-observability/low-level/dfd_07c1_search_health.png)

#### dfd_07c2_search_reindex

[dfd_07c2_search_reindex source](07-search-observability/low-level/dfd_07c2_search_reindex.mmd)

![dfd_07c2_search_reindex](07-search-observability/low-level/dfd_07c2_search_reindex.png)
