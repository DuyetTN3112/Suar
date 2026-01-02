# Notification Producer Inventory

**Audit date:** 2026-07-23  
**Scope:** Runtime TypeScript under `app/`; tests and README examples excluded  
**Migration rule:** A required notification is staged in the owning PostgreSQL transaction.
Singular/bounded plans create canonical rows in that transaction; larger plans freeze a durable
fan-out job and recipient targets in that transaction.

## Verified totals

- 0 remaining legacy `handle()` emission expressions in runtime application code.
- 0 runtime files contain a legacy notification emission.
- All 24 inventoried producer paths have been migrated to canonical staging or durable fan-out.
- 0 runtime producers write Elasticsearch or Redis directly.
- The unused `CreateNotification` compatibility implementation has been removed; the only legacy
  translation boundary is `notificationPublicApi.acceptLegacy()`.
- The demo operational-event writer lives in
  `app/seed/demo_data/operational_event_seeder.ts` and stages through canonical notification
  acceptance; it is seed infrastructure, not a runtime producer.

The inventory was produced with GitNexus CLI impact/context checks and targeted `rg` verification.
GitNexus did not return a useful concept-query result for producers, so file-level inspection was
used as the documented fallback.

## Severity definitions

- **P0:** Security, access, ownership, or business-state notification. Missing it can leave the user
  with materially incorrect expectations.
- **P1:** Workflow or collaboration notification. Missing it can stall work or require manual
  recovery.
- **Required transactional:** Staging failure aborts the owning business transaction.
- **Bounded fan-out:** The command must enforce a maximum recipient count and stage each recipient
  with a distinct deterministic event ID. Unbounded arrays are not accepted in one transaction.
- **Durable fan-out:** The source transaction freezes a normalized recipient snapshot and immutable
  template. A leased worker later creates each canonical notification and marks that target
  processed in one transaction.

## Producer matrix

| ID     | Effective producer and current emissions                                                                            | Current boundary and observed failure behavior                                                                                                                                                                                                                                                                               | Class                            | Stable business occurrence strategy                                                                                 | Status       |
| ------ | ------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------ |
| ORG-01 | `CreateOrganizationCommand.stageWelcomeNotification`; `organization_created`                                        | Canonical row, unread state, and outbox are staged before the organization transaction commits. A staging error rolls back organization, membership, workflow seed, audit, and notification.                                                                                                                                 | P0 required                      | UUIDv5 of `organization.created`, immutable `organization.id`, recipient                                            | **Migrated** |
| ORG-02 | `InviteUserCommand.persistInvitationInTransaction`; `organization_invitation`                                       | Pending membership, audit, notification, unread state, and outbox share one transaction. The persisted invitation creation timestamp distinguishes a later legitimate reinvitation.                                                                                                                                          | P0 required                      | UUIDv5 of `organization.invited`, organization/invitee/invitation-created-at, recipient                             | **Migrated** |
| ORG-03 | `AcceptOrganizationInvitationCommand.execute`; `organization_join_approved`                                         | The approval, audit, inviter notification, unread state, and outbox share one transaction. Failure restores the pending invitation.                                                                                                                                                                                          | P1 required                      | UUIDv5 of `organization.invitation_accepted`, organization/invitee/invitation-created-at, inviter                   | **Migrated** |
| ORG-04 | `RejectOrganizationInvitationCommand.execute`; `organization_join_rejected`                                         | The rejection, audit, inviter notification, unread state, and outbox share one transaction. Failure restores the pending invitation.                                                                                                                                                                                         | P1 required                      | UUIDv5 of `organization.invitation_rejected`, organization/invitee/invitation-created-at, inviter                   | **Migrated** |
| ORG-05 | `AddMemberCommand.execute`; `member_added`                                                                          | Membership, audit, canonical notification, unread state, and outbox share one transaction. Failure rolls all of them back. The membership creation timestamp distinguishes a later remove/re-add cycle.                                                                                                                      | P0 required                      | UUIDv5 of `organization.member_added`, organization/user/membership-created-at, recipient                           | **Migrated** |
| ORG-06 | `ProcessJoinRequestCommand.execute`; `join_request_approved` or `join_request_rejected`                             | Decision, audit, notification, unread state, and outbox share one transaction. The persisted membership decision timestamp plus decision kind defines the occurrence; rejected notifications deliberately have no action.                                                                                                    | P0 required                      | UUIDv5 of decision-specific event name, organization/user/membership-updated-at, recipient                          | **Migrated** |
| ORG-07 | `RemoveMemberCommand.stageMemberRemovedNotification`; `member_removed`                                              | Task unassignment, membership deletion, audit, canonical notification and outbox share one transaction. Failure restores all state. Removed-member actions are deliberately `null`.                                                                                                                                          | P0 required                      | UUIDv5 of `organization.member_removed`, organization/user/original-membership-created-at, recipient                | **Migrated** |
| ORG-08 | `UpdateMemberRoleCommand.execute`; `role_changed`                                                                   | Role update, audit, notification, unread state, and outbox share one transaction. Failure restores the old role.                                                                                                                                                                                                             | P0 required                      | UUIDv5 of `organization.member_role_changed`, organization/user/membership-updated-at, recipient                    | **Migrated** |
| ORG-09 | `TransferOrganizationOwnershipCommand.stageNotifications`; two `ownership_transferred` recipients                   | Ownership, both role changes, audit, two canonical notifications, and four outbox intents share one transaction. Fan-out is fixed at two; either staging failure rolls the full transfer back.                                                                                                                               | P0 required, bounded fan-out = 2 | UUIDv5 of `organization.ownership_transferred`, organization/old-owner/new-owner/organization-updated-at, recipient | **Migrated** |
| PRJ-01 | `TransferProjectOwnershipCommand.stageNotifications`; one or two `project_ownership_transferred` recipients         | Project mutation, member-role changes, critical audit, canonical notifications, and outbox share one transaction. This also removes the previous audit autocommit leak. Fan-out is bounded at two.                                                                                                                           | P0 required, bounded fan-out ≤ 2 | UUIDv5 of `project.ownership_transferred`, project/old-owner/new-owner/project-updated-at, recipient                | **Migrated** |
| REV-01 | `CloseProjectSprintReviewCommand.execute`; `review_requested` for every reviewer                                    | Sprint transition, packages, reverse-review workflows, next sprint, audit, and the sorted reviewer target snapshot share one transaction. Worker delivery uses `review.sprint_opened` plus sprint ID and deterministic per-recipient event IDs.                                                                              | P1 required, durable fan-out     | Immutable sprint review-open transition (`sprint.id`) + recipient                                                   | **Migrated** |
| REV-02 | `ReportReviewDisputeCommand.execute`; reporter plus N admins using `review_dispute_escalated`                       | Escalation, case file, two audit events, reporter target, and the admin target snapshot share one transaction. Reporter/admin templates have distinct source identities; AI arbitration remains an explicit post-commit best-effort workflow.                                                                                | P0 required, durable fan-out     | Dispute ID + audience-specific event name + recipient                                                               | **Migrated** |
| TSK-01 | `CreateTaskCommand.stageTaskAssignmentNotification`; `task_assigned`                                                | Task, required skills, critical audit, assigned-user notification, unread state, and outbox share one transaction. Self-assignment deliberately emits nothing. Post-commit support is now limited to event publication and cache invalidation.                                                                               | P0 required                      | UUIDv5 of `task.created_assigned`, immutable one-shot task ID, assignee                                             | **Migrated** |
| TSK-02 | `UpdateTaskCommand.stageTaskUpdateNotifications`; `task_assigned` / `task_updated`                                  | Task update, version snapshot, critical audit, the single-recipient assignment plan, unread state, and outbox share one transaction. Notification failure restores the task and removes the version and audit. Post-commit support now contains only event and cache effects.                                                | P0 required, bounded fan-out ≤ 1 | UUIDv5 of assignment-change kind, task/old-assignee/new-assignee/task-updated-at, recipient                         | **Migrated** |
| TSK-03 | `AssignTaskCommand.stageAssignmentNotifications`; `task_assigned`, `task_unassigned`, `task_reassigned`             | Assignment lifecycle rows, task assignee cache, critical audit, and the bounded recipient plan share one transaction. Fan-out is at most two; a failure on the second reassign notification restores the original assignment and removes the first staged notification. `notify=false` remains an explicit business opt-out. | P0 required, bounded fan-out ≤ 2 | UUIDv5 of event kind, task/old-assignee/new-assignee/task-updated-at, recipient                                     | **Migrated** |
| TSK-04 | `UpdateTaskStatusCommand.stageStatusChangeNotification`; `task_status_updated`                                      | Status mutation, critical audit, creator notification, unread state, and outbox share one transaction. Creator self-updates deliberately do not emit. Failure restores the old status and leaves no audit.                                                                                                                   | P1 required                      | UUIDv5 of `task.status_updated`, task/old-status/new-status/task-updated-at, creator                                | **Migrated** |
| TSK-05 | `DeleteTaskCommand.stageDeletionNotifications`; up to two `task_deleted` recipients                                 | The distinct recipient set is bounded to two and staged before task commit. Staging failure rolls back delete/audit/outbox together. Post-commit cache/event work no longer shares the rollback catch. Deleted-task actions are deliberately `null`.                                                                         | P0 required, bounded fan-out ≤ 2 | UUIDv5 of `task.deleted`, immutable one-shot `task.id`, recipient                                                   | **Migrated** |
| TSK-06 | `RevokeTaskAccessCommand.stageRevokeFanout`; `task_access_revoked` plus N `assignment_revoked_need_action` managers | Assignment cancellation, audit, assignee target, and manager/owner target snapshot share one transaction. Manager discovery uses that transaction; fan-out failure restores the active assignment and removes the audit.                                                                                                     | P0 required, durable fan-out     | Assignment ID + audience-specific event name + recipient                                                            | **Migrated** |
| TSK-07 | `SubmitTaskSubmissionCommand.stageSubmissionAuditAndFanout`; `task_submitted` plus N `review_requested`             | Submission, evidence, assignment snapshot, task status, review session/assignments, critical audit, submitter target, and reviewer target snapshot share one transaction.                                                                                                                                                    | P1 required, durable fan-out     | Submission ID for submitter; review-session ID for reviewers; recipient                                             | **Migrated** |
| TSK-08 | `CreateTaskCommentCommand.execute`; N `task_mentioned`                                                              | Comment, mention rows, and normalized non-self recipient snapshot share one transaction. A fan-out staging failure removes the comment and mention rows.                                                                                                                                                                     | P1 required, durable fan-out     | Immutable comment ID + recipient                                                                                    | **Migrated** |
| TSK-09 | `TaskSubmissionController.updateComment`; N newly `task_mentioned` users                                            | The comment row is locked; edit, replacement mention set, and newly-mentioned recipient snapshot share one transaction. Existing mentions are excluded before staging.                                                                                                                                                       | P1 required, durable fan-out     | Comment ID + persisted edit timestamp + recipient                                                                   | **Migrated** |
| TSK-10 | `ApplyForTaskCommand.handle`; `task_application`                                                                    | Application, task application count, audit, owner notification, unread state, and outbox share one transaction. The in-process notification listener was removed; the domain event remains post-commit for non-notification consumers.                                                                                       | P1 required                      | UUIDv5 of `task.application_submitted`, immutable application ID, owner                                             | **Migrated** |
| TSK-11 | `ProcessApplicationCommand.handle`; `task_application_review`                                                       | Approval/rejection, assignment effects, audit, applicant notification, unread state, and outbox share one transaction. One persisted `reviewed_at` value is reused for occurrence identity and snapshot time.                                                                                                                | P0 required                      | UUIDv5 of `task.application_reviewed`, application/status/reviewed-at, applicant                                    | **Migrated** |
| USR-01 | `DeactivateUserCommand.stageDeactivationNotification`; `account_deactivated`                                        | Mandatory notification is staged with the user status mutation and minimized security audit. Failure rolls back all three; user event publication starts only after commit. The notification action is deliberately `null`.                                                                                                  | P0 required                      | UUIDv5 of `user.deactivated`, persisted user status-transition timestamp, target user                               | **Migrated** |

## Cross-cutting findings

1. **Runtime producer migration is complete.** Targeted application searches return no legacy
   `notificationPublicApi.handle`, `createNotification.handle`, or `notificationService.handle`.
2. **Recipient discovery is frozen before source commit.** Later role, manager, reviewer, mention, or
   admin changes cannot alter replay recipients.
3. **Fan-out retries are deterministic.** A changed template or changed recipient snapshot for the
   same source identity raises a conflict rather than silently appending targets.
4. **Workers are fenced.** Claims use `FOR UPDATE SKIP LOCKED`, expiring leases are reclaimable, and
   stale lease tokens cannot ACK, retry, or dead-letter a target.
5. **Canonical acceptance and target ACK are atomic.** A target cannot be marked processed without
   its notification, ledger, unread state, and projection outbox rows, and those rows roll back when
   ACK fails.
6. **Dead letters are operable.** Status and authorized bounded replay commands exist; replay resets
   attempts, repairs job counters, and writes an immutable operator audit event.
7. **The compatibility adapter remains intentionally.** Tests and any undiscovered external caller
   still receive canonical durability, but the adapter is non-idempotent and cannot be deleted until
   production telemetry stays at zero for 30 consecutive days.
8. **The seed writer uses the canonical acceptance path.**
   `app/seed/demo_data/operational_event_seeder.ts` stages notification, ledger, unread state, and
   outbox rows in the same seed transaction.

## Migration order

1. **Completed:** false-response paths TSK-07, REV-02, and REV-01.
2. **Completed:** mandatory access path TSK-06 with durable recipient snapshots.
3. **Completed:** transactional create/edit mention production TSK-08 and TSK-09.
4. **Completed:** all inventoried task, review, project, organization, and user source producers.
5. **Completed:** notification creation removed from in-process application listeners.
6. **Operational gate:** require zero `non_idempotent_legacy` production calls for 30 consecutive
   days before deleting the compatibility adapter.

## Completion check

The producer migration is complete only when:

- this matrix has no `Legacy` status;
- the targeted runtime search returns zero legacy `handle()` / `create()` emissions;
- every fan-out has an explicit bound or a durable fan-out plan;
- retry tests use the same business occurrence identity and produce no duplicates;
- rollback tests prove that required notification staging failure leaves neither business state nor
  canonical notification/outbox rows;
- production telemetry reports zero legacy adapter calls for 30 consecutive days.
