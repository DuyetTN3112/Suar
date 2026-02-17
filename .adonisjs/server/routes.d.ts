import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
    'admin.mode.switch': { paramsTuple?: []; params?: {} }
    'admin.dashboard.show': { paramsTuple?: []; params?: {} }
    'admin.dashboard.users': { paramsTuple?: []; params?: {} }
    'admin.dashboard.operations': { paramsTuple?: []; params?: {} }
    'admin.dashboard.subscriptions': { paramsTuple?: []; params?: {} }
    'admin.users.index': { paramsTuple?: []; params?: {} }
    'admin.users.show': { paramsTuple: [ParamValue]; params: {'userId': ParamValue} }
    'admin.users.update_role': { paramsTuple: [ParamValue]; params: {'userId': ParamValue} }
    'admin.users.suspend': { paramsTuple: [ParamValue]; params: {'userId': ParamValue} }
    'admin.users.activate': { paramsTuple: [ParamValue]; params: {'userId': ParamValue} }
    'admin.organizations.index': { paramsTuple?: []; params?: {} }
    'admin.organizations.show': { paramsTuple: [ParamValue]; params: {'organizationId': ParamValue} }
    'admin.audit_logs.index': { paramsTuple?: []; params?: {} }
    'admin.permissions.index': { paramsTuple?: []; params?: {} }
    'admin.permissions.system': { paramsTuple?: []; params?: {} }
    'admin.permissions.custom_roles.create': { paramsTuple?: []; params?: {} }
    'admin.permissions.custom_roles.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.permissions.custom_roles.store': { paramsTuple?: []; params?: {} }
    'admin.permissions.custom_roles.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.permissions.custom_roles.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.permissions.organization': { paramsTuple?: []; params?: {} }
    'admin.permissions.project': { paramsTuple?: []; params?: {} }
    'admin.qr_codes.show': { paramsTuple?: []; params?: {} }
    'admin.proficiency.index': { paramsTuple?: []; params?: {} }
    'admin.proficiency.show': { paramsTuple: [ParamValue]; params: {'proficiencyScaleId': ParamValue} }
    'admin.proficiency.rubrics.show': { paramsTuple: [ParamValue]; params: {'skillId': ParamValue} }
    'admin.reviews.flagged': { paramsTuple?: []; params?: {} }
    'admin.reviews.show': { paramsTuple: [ParamValue]; params: {'flaggedReviewId': ParamValue} }
    'admin.reviews.resolutions.store': { paramsTuple: [ParamValue]; params: {'flaggedReviewId': ParamValue} }
    'admin.disputes.index': { paramsTuple?: []; params?: {} }
    'admin.disputes.ai_operator.show': { paramsTuple?: []; params?: {} }
    'admin.disputes.show': { paramsTuple: [ParamValue]; params: {'disputeId': ParamValue} }
    'admin.packages.index': { paramsTuple?: []; params?: {} }
    'admin.packages.update': { paramsTuple: [ParamValue]; params: {'subscriptionId': ParamValue} }
    'api.admin.dashboard.show': { paramsTuple?: []; params?: {} }
    'api.admin.users.index': { paramsTuple?: []; params?: {} }
    'api.admin.organizations.index': { paramsTuple?: []; params?: {} }
    'api.admin.audit_logs.index': { paramsTuple?: []; params?: {} }
    'org.dashboard': { paramsTuple?: []; params?: {} }
    'org.members.index': { paramsTuple?: []; params?: {} }
    'org.members.invite': { paramsTuple?: []; params?: {} }
    'org.members.destroy': { paramsTuple: [ParamValue]; params: {'memberId': ParamValue} }
    'org.members.update_role': { paramsTuple: [ParamValue]; params: {'memberId': ParamValue} }
    'org.join_requests.index': { paramsTuple?: []; params?: {} }
    'org.join_requests.approvals.store': { paramsTuple: [ParamValue]; params: {'joinRequestId': ParamValue} }
    'org.invitations.index': { paramsTuple?: []; params?: {} }
    'org.settings.show': { paramsTuple?: []; params?: {} }
    'org.settings.update': { paramsTuple?: []; params?: {} }
    'org.roles.index': { paramsTuple?: []; params?: {} }
    'org.roles.update': { paramsTuple?: []; params?: {} }
    'org.permissions.index': { paramsTuple?: []; params?: {} }
    'org.departments.index': { paramsTuple?: []; params?: {} }
    'org.audit_logs.index': { paramsTuple?: []; params?: {} }
    'org.marketplace.tasks': { paramsTuple?: []; params?: {} }
    'org.sprints.index': { paramsTuple?: []; params?: {} }
    'org.projects.index': { paramsTuple?: []; params?: {} }
    'org.projects.create': { paramsTuple?: []; params?: {} }
    'org.projects.store': { paramsTuple?: []; params?: {} }
    'org.projects.show': { paramsTuple: [ParamValue]; params: {'projectId': ParamValue} }
    'org.tasks.index': { paramsTuple?: []; params?: {} }
    'org.tasks.board': { paramsTuple?: []; params?: {} }
    'org.tasks.list': { paramsTuple?: []; params?: {} }
    'org.tasks.workflow': { paramsTuple?: []; params?: {} }
    'org.tasks.workflow.create': { paramsTuple?: []; params?: {} }
    'org.tasks.show': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'org.workflow.statuses': { paramsTuple?: []; params?: {} }
    'org.workflow.statuses.store': { paramsTuple?: []; params?: {} }
    'api.v1.me.organizations.current.member_invitations.store': { paramsTuple?: []; params?: {} }
    'api.v1.me.organizations.current.members.destroy': { paramsTuple: [ParamValue]; params: {'memberId': ParamValue} }
    'api.v1.me.organizations.current.members.role.update': { paramsTuple: [ParamValue]; params: {'memberId': ParamValue} }
    'api.v1.me.organizations.current.join_requests.approvals.store': { paramsTuple: [ParamValue]; params: {'joinRequestId': ParamValue} }
    'api.v1.me.organizations.current.roles.update': { paramsTuple?: []; params?: {} }
    'api.v1.me.organizations.current.projects.store': { paramsTuple?: []; params?: {} }
    'api.v1.me.organizations.current.task_statuses.index': { paramsTuple?: []; params?: {} }
    'api.v1.me.organizations.current.task_statuses.store': { paramsTuple?: []; params?: {} }
    'marketplace.index': { paramsTuple?: []; params?: {} }
    'marketplace.talents.legacy': { paramsTuple?: []; params?: {} }
    'marketplace.bookmarks.legacy': { paramsTuple?: []; params?: {} }
    'marketplace.tasks': { paramsTuple?: []; params?: {} }
    'api.marketplace.tasks.index': { paramsTuple?: []; params?: {} }
    'api.v1.marketplace.tasks.index': { paramsTuple?: []; params?: {} }
    'api.v1.tasks.applications.store': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'api.v1.tasks.applications.match': { paramsTuple: [ParamValue,ParamValue]; params: {'taskId': ParamValue,'applicationId': ParamValue} }
    'api.v1.tasks.applications.ranking': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'api.tasks.applications.store': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'applications.withdrawals.store': { paramsTuple: [ParamValue]; params: {'applicationId': ParamValue} }
    'applications.decisions.store': { paramsTuple: [ParamValue]; params: {'applicationId': ParamValue} }
    'me.applications.index': { paramsTuple?: []; params?: {} }
    'tasks.applications': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'api.tasks.applications.match': { paramsTuple: [ParamValue,ParamValue]; params: {'taskId': ParamValue,'applicationId': ParamValue} }
    'api.tasks.applications.ranking': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'api.v1.skills.skills.proficiency_scales.index': { paramsTuple?: []; params?: {} }
    'api.v1.skills.skills.proficiency_scales.show': { paramsTuple: [ParamValue]; params: {'proficiencyScaleId': ParamValue} }
    'api.v1.skills.skills.rubrics.show': { paramsTuple: [ParamValue]; params: {'skillId': ParamValue} }
    'api.v1.skills.skills.rubrics.index': { paramsTuple: [ParamValue]; params: {'skillId': ParamValue} }
    'api.v1.skills.index': { paramsTuple?: []; params?: {} }
    'api.v1.skills.role_templates.index': { paramsTuple?: []; params?: {} }
    'api.v1.skills.projects.skills.index': { paramsTuple: [ParamValue]; params: {'projectId': ParamValue} }
    'api.v1.skills.projects.skills.store': { paramsTuple: [ParamValue]; params: {'projectId': ParamValue} }
    'api.v1.skills.projects.skills.update': { paramsTuple: [ParamValue,ParamValue]; params: {'projectId': ParamValue,'projectSkillId': ParamValue} }
    'api.v1.skills.projects.skills.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'projectId': ParamValue,'projectSkillId': ParamValue} }
    'api.v1.skills.projects.roles.index': { paramsTuple: [ParamValue]; params: {'projectId': ParamValue} }
    'api.v1.skills.projects.roles.store': { paramsTuple: [ParamValue]; params: {'projectId': ParamValue} }
    'api.v1.skills.projects.roles.skills.update': { paramsTuple: [ParamValue,ParamValue,ParamValue]; params: {'projectId': ParamValue,'roleId': ParamValue,'roleSkillId': ParamValue} }
    'api.v1.skills.projects.roles.skills.store': { paramsTuple: [ParamValue,ParamValue]; params: {'projectId': ParamValue,'roleId': ParamValue} }
    'api.v1.skills.projects.roles.skills.destroy': { paramsTuple: [ParamValue,ParamValue,ParamValue]; params: {'projectId': ParamValue,'roleId': ParamValue,'roleSkillId': ParamValue} }
    'api.v1.skills.projects.roles.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'projectId': ParamValue,'roleId': ParamValue} }
    'api.v1.skills.projects.roles.candidates': { paramsTuple: [ParamValue,ParamValue]; params: {'projectId': ParamValue,'roleId': ParamValue} }
    'api.v1.skills.projects.professional_roles.requirements.index': { paramsTuple: [ParamValue,ParamValue]; params: {'projectId': ParamValue,'roleId': ParamValue} }
    'api.v1.skills.projects.roles.requirements.index': { paramsTuple: [ParamValue,ParamValue]; params: {'projectId': ParamValue,'roleId': ParamValue} }
    'api.v1.tasks.requirements.index': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'api.v1.tasks.requirements.store': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'api.v1.tasks.requirements.role_prefill.store': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'api.v1.tasks.requirements.versions.index': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'api.v1.tasks.requirements.update': { paramsTuple: [ParamValue,ParamValue]; params: {'taskId': ParamValue,'requirementId': ParamValue} }
    'api.v1.tasks.requirements.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'taskId': ParamValue,'requirementId': ParamValue} }
    'error.not_found': { paramsTuple?: []; params?: {} }
    'error.server_error': { paramsTuple?: []; params?: {} }
    'error.forbidden': { paramsTuple?: []; params?: {} }
    'error.require_organization': { paramsTuple?: []; params?: {} }
    'social_auth.redirect': { paramsTuple: [ParamValue]; params: {'provider': ParamValue} }
    'social_auth.callback': { paramsTuple: [ParamValue]; params: {'provider': ParamValue} }
    'logout': { paramsTuple?: []; params?: {} }
    'logout.show': { paramsTuple?: []; params?: {} }
    'api.v1.auth.tokens.store': { paramsTuple?: []; params?: {} }
    'api.v1.auth.tokens.refresh.store': { paramsTuple?: []; params?: {} }
    'auth.login': { paramsTuple?: []; params?: {} }
    'users.index': { paramsTuple?: []; params?: {} }
    'users.create': { paramsTuple?: []; params?: {} }
    'users.pending_approvals.index': { paramsTuple?: []; params?: {} }
    'users.store': { paramsTuple?: []; params?: {} }
    'users.show': { paramsTuple: [ParamValue]; params: {'userId': ParamValue} }
    'users.edit': { paramsTuple: [ParamValue]; params: {'userId': ParamValue} }
    'users.update': { paramsTuple: [ParamValue]; params: {'userId': ParamValue} }
    'users.destroy': { paramsTuple: [ParamValue]; params: {'userId': ParamValue} }
    'users.approvals.store': { paramsTuple: [ParamValue]; params: {'userId': ParamValue} }
    'users.update_role': { paramsTuple: [ParamValue]; params: {'userId': ParamValue} }
    'org.bookmarks': { paramsTuple?: []; params?: {} }
    'org.talents.index': { paramsTuple?: []; params?: {} }
    'org.talents.show': { paramsTuple: [ParamValue]; params: {'userId': ParamValue} }
    'profile.show': { paramsTuple?: []; params?: {} }
    'profile.edit': { paramsTuple?: []; params?: {} }
    'profile.details.update': { paramsTuple?: []; params?: {} }
    'profile.invitations.index': { paramsTuple?: []; params?: {} }
    'profile.skills.store': { paramsTuple?: []; params?: {} }
    'profile.skills.update': { paramsTuple: [ParamValue]; params: {'skillId': ParamValue} }
    'profile.skills.destroy': { paramsTuple: [ParamValue]; params: {'skillId': ParamValue} }
    'profile.user.show': { paramsTuple: [ParamValue]; params: {'userId': ParamValue} }
    'profile.snapshots.store': { paramsTuple?: []; params?: {} }
    'api.me.profile_snapshots.store': { paramsTuple?: []; params?: {} }
    'profile.snapshots.current': { paramsTuple?: []; params?: {} }
    'api.me.profile_snapshots.current.show': { paramsTuple?: []; params?: {} }
    'profile.snapshots.history': { paramsTuple?: []; params?: {} }
    'api.me.profile_snapshots.index': { paramsTuple?: []; params?: {} }
    'profile.snapshots.access.update': { paramsTuple: [ParamValue]; params: {'snapshotId': ParamValue} }
    'api.me.profile_snapshots.access.update': { paramsTuple: [ParamValue]; params: {'snapshotId': ParamValue} }
    'profile.snapshots.share_link.rotate': { paramsTuple: [ParamValue]; params: {'snapshotId': ParamValue} }
    'api.me.profile_snapshots.share_link.rotate': { paramsTuple: [ParamValue]; params: {'snapshotId': ParamValue} }
    'profile.update_settings': { paramsTuple?: []; params?: {} }
    'api.users.pending_approvals.index': { paramsTuple?: []; params?: {} }
    'api.users.pending_approvals.count.show': { paramsTuple?: []; params?: {} }
    'api.users.system_users.index': { paramsTuple?: []; params?: {} }
    'api.talents.search.index': { paramsTuple?: []; params?: {} }
    'api.talent_bookmarks.index': { paramsTuple?: []; params?: {} }
    'api.talent_bookmarks.store': { paramsTuple?: []; params?: {} }
    'api.talent_bookmarks.update': { paramsTuple: [ParamValue]; params: {'bookmarkId': ParamValue} }
    'api.talent_bookmarks.destroy': { paramsTuple: [ParamValue]; params: {'bookmarkId': ParamValue} }
    'api.recruiter_bookmarks.index': { paramsTuple?: []; params?: {} }
    'api.recruiter_bookmarks.store': { paramsTuple?: []; params?: {} }
    'api.recruiter_bookmarks.update': { paramsTuple: [ParamValue]; params: {'bookmarkId': ParamValue} }
    'api.recruiter_bookmarks.destroy': { paramsTuple: [ParamValue]; params: {'bookmarkId': ParamValue} }
    'api.v1.users.pending_approvals.index': { paramsTuple?: []; params?: {} }
    'api.v1.users.pending_approvals.count.show': { paramsTuple?: []; params?: {} }
    'api.v1.users.approvals.store': { paramsTuple: [ParamValue]; params: {'userId': ParamValue} }
    'api.v1.users.system_users.index': { paramsTuple?: []; params?: {} }
    'api.v1.talents.search.index': { paramsTuple?: []; params?: {} }
    'api.v1.talent_bookmarks.index': { paramsTuple?: []; params?: {} }
    'api.v1.talent_bookmarks.store': { paramsTuple?: []; params?: {} }
    'api.v1.talent_bookmarks.update': { paramsTuple: [ParamValue]; params: {'bookmarkId': ParamValue} }
    'api.v1.talent_bookmarks.destroy': { paramsTuple: [ParamValue]; params: {'bookmarkId': ParamValue} }
    'api.v1.recruiter_bookmarks.index': { paramsTuple?: []; params?: {} }
    'api.v1.recruiter_bookmarks.store': { paramsTuple?: []; params?: {} }
    'api.v1.recruiter_bookmarks.update': { paramsTuple: [ParamValue]; params: {'bookmarkId': ParamValue} }
    'api.v1.recruiter_bookmarks.destroy': { paramsTuple: [ParamValue]; params: {'bookmarkId': ParamValue} }
    'api.v1.me.profile_snapshots.store': { paramsTuple?: []; params?: {} }
    'api.v1.me.profile_snapshots.current.show': { paramsTuple?: []; params?: {} }
    'api.v1.me.profile_snapshots.index': { paramsTuple?: []; params?: {} }
    'api.v1.me.profile_snapshots.access.update': { paramsTuple: [ParamValue]; params: {'snapshotId': ParamValue} }
    'api.v1.me.profile_snapshots.share_link.rotate': { paramsTuple: [ParamValue]; params: {'snapshotId': ParamValue} }
    'api.v1.me.invitations.accept': { paramsTuple: [ParamValue]; params: {'organizationId': ParamValue} }
    'api.v1.me.invitations.reject': { paramsTuple: [ParamValue]; params: {'organizationId': ParamValue} }
    'api.v1.me.organizations.current.talents.search.index': { paramsTuple?: []; params?: {} }
    'api.v1.me.organizations.current.talents.show': { paramsTuple: [ParamValue]; params: {'userId': ParamValue} }
    'api.v1.me.organizations.current.talents.bookmarks.store': { paramsTuple: [ParamValue]; params: {'userId': ParamValue} }
    'api.v1.me.organizations.current.talents.bookmarks.destroy': { paramsTuple: [ParamValue]; params: {'userId': ParamValue} }
    'profile.snapshot.public': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'tasks.index': { paramsTuple?: []; params?: {} }
    'api.tasks.creation_access.show': { paramsTuple?: []; params?: {} }
    'api.tasks.status_groups.index': { paramsTuple?: []; params?: {} }
    'api.tasks.timeline_items.index': { paramsTuple?: []; params?: {} }
    'api.tasks.statuses.batch.update': { paramsTuple?: []; params?: {} }
    'api.tasks.board_state.update': { paramsTuple?: []; params?: {} }
    'api.tasks.sort_order.update': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'api.tasks.show': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'api.tasks.submission.show': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'api.tasks.submission.store': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'api.tasks.submission.update': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'api.tasks.submission.submit': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'api.tasks.submission.lock': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'api.task_submissions.evidences.index': { paramsTuple: [ParamValue]; params: {'submissionId': ParamValue} }
    'api.task_submissions.evidences.store': { paramsTuple: [ParamValue]; params: {'submissionId': ParamValue} }
    'api.task_submissions.evidences.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'submissionId': ParamValue,'evidenceId': ParamValue} }
    'api.tasks.comments.index': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'api.tasks.comments.store': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'api.tasks.comments.update': { paramsTuple: [ParamValue,ParamValue]; params: {'taskId': ParamValue,'commentId': ParamValue} }
    'api.tasks.comments.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'taskId': ParamValue,'commentId': ParamValue} }
    'api.tasks.attachments.index': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'api.tasks.attachments.store': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'api.tasks.attachments.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'taskId': ParamValue,'attachmentId': ParamValue} }
    'api.v1.tasks.creation_access.show': { paramsTuple?: []; params?: {} }
    'api.v1.tasks.status_groups.index': { paramsTuple?: []; params?: {} }
    'api.v1.tasks.timeline_items.index': { paramsTuple?: []; params?: {} }
    'api.v1.tasks.statuses.batch.update': { paramsTuple?: []; params?: {} }
    'api.v1.tasks.board_state.update': { paramsTuple?: []; params?: {} }
    'api.v1.tasks.sort_order.update': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'api.v1.tasks.show': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'api.v1.tasks.audit_logs.index': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'api.v1.tasks.submission.show': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'api.v1.tasks.submission.store': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'api.v1.tasks.submission.update': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'api.v1.tasks.submission.submit': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'api.v1.tasks.submission.lock': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'api.v1.task_submissions.evidences.index': { paramsTuple: [ParamValue]; params: {'submissionId': ParamValue} }
    'api.v1.task_submissions.evidences.store': { paramsTuple: [ParamValue]; params: {'submissionId': ParamValue} }
    'api.v1.task_submissions.evidences.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'submissionId': ParamValue,'evidenceId': ParamValue} }
    'api.v1.tasks.comments.index': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'api.v1.tasks.comments.store': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'api.v1.tasks.comments.update': { paramsTuple: [ParamValue,ParamValue]; params: {'taskId': ParamValue,'commentId': ParamValue} }
    'api.v1.tasks.comments.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'taskId': ParamValue,'commentId': ParamValue} }
    'api.v1.tasks.attachments.index': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'api.v1.tasks.attachments.store': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'api.v1.tasks.attachments.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'taskId': ParamValue,'attachmentId': ParamValue} }
    'tasks.create': { paramsTuple?: []; params?: {} }
    'tasks.board_state.show': { paramsTuple?: []; params?: {} }
    'tasks.store': { paramsTuple?: []; params?: {} }
    'tasks.show': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'tasks.edit': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'tasks.update': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'tasks.update.status': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'tasks.update.time': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'tasks.destroy': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'tasks.audit_logs': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'api.task_statuses.index': { paramsTuple?: []; params?: {} }
    'api.task_statuses.workflow.index': { paramsTuple?: []; params?: {} }
    'api.task_statuses.store': { paramsTuple?: []; params?: {} }
    'api.task_statuses.replace': { paramsTuple: [ParamValue]; params: {'taskStatusId': ParamValue} }
    'api.task_statuses.update': { paramsTuple: [ParamValue]; params: {'taskStatusId': ParamValue} }
    'api.task_statuses.destroy': { paramsTuple: [ParamValue]; params: {'taskStatusId': ParamValue} }
    'api.task_statuses.workflow.update': { paramsTuple?: []; params?: {} }
    'settings.index': { paramsTuple?: []; params?: {} }
    'settings.update': { paramsTuple?: []; params?: {} }
    'settings.profile': { paramsTuple?: []; params?: {} }
    'settings.profile.update': { paramsTuple?: []; params?: {} }
    'settings.account': { paramsTuple?: []; params?: {} }
    'settings.account.update': { paramsTuple?: []; params?: {} }
    'settings.audit_logs.index': { paramsTuple?: []; params?: {} }
    'settings.notifications': { paramsTuple?: []; params?: {} }
    'settings.notifications.update': { paramsTuple?: []; params?: {} }
    'account.index': { paramsTuple?: []; params?: {} }
    'account.destroy': { paramsTuple?: []; params?: {} }
    'notifications.index': { paramsTuple?: []; params?: {} }
    'notifications.latest': { paramsTuple?: []; params?: {} }
    'notifications.mark_as_read': { paramsTuple: [ParamValue]; params: {'notificationId': ParamValue} }
    'notifications.mark_all_as_read': { paramsTuple?: []; params?: {} }
    'notifications.destroy': { paramsTuple: [ParamValue]; params: {'notificationId': ParamValue} }
    'notifications.destroy_all_read': { paramsTuple?: []; params?: {} }
    'api.v1.me.show': { paramsTuple?: []; params?: {} }
    'api.v1.me.settings.show': { paramsTuple?: []; params?: {} }
    'api.v1.me.settings.update': { paramsTuple?: []; params?: {} }
    'api.v1.notifications.index': { paramsTuple?: []; params?: {} }
    'api.v1.notifications.read_statuses.update': { paramsTuple?: []; params?: {} }
    'api.v1.notifications.read_status.update': { paramsTuple: [ParamValue]; params: {'notificationId': ParamValue} }
    'api.v1.notifications.read_notifications.destroy': { paramsTuple?: []; params?: {} }
    'api.v1.notifications.destroy': { paramsTuple: [ParamValue]; params: {'notificationId': ParamValue} }
    'api.v1.task_statuses.index': { paramsTuple?: []; params?: {} }
    'api.v1.task_statuses.show': { paramsTuple: [ParamValue]; params: {'taskStatusId': ParamValue} }
    'api.v1.task_statuses.workflow.index': { paramsTuple?: []; params?: {} }
    'api.v1.projects.show': { paramsTuple: [ParamValue]; params: {'projectId': ParamValue} }
    'api.v1.organizations.show': { paramsTuple: [ParamValue]; params: {'organizationId': ParamValue} }
    'api.v1.organizations.members.index': { paramsTuple: [ParamValue]; params: {'organizationId': ParamValue} }
    'api.v1.organizations.users.index': { paramsTuple?: []; params?: {} }
    'api.v1.task_statuses.store': { paramsTuple?: []; params?: {} }
    'api.v1.task_statuses.update': { paramsTuple: [ParamValue]; params: {'taskStatusId': ParamValue} }
    'api.v1.task_statuses.destroy': { paramsTuple: [ParamValue]; params: {'taskStatusId': ParamValue} }
    'api.v1.task_statuses.workflow.update': { paramsTuple?: []; params?: {} }
    'api.v1.projects.update': { paramsTuple: [ParamValue]; params: {'projectId': ParamValue} }
    'api.v1.projects.destroy': { paramsTuple: [ParamValue]; params: {'projectId': ParamValue} }
    'api.v1.organizations.update': { paramsTuple: [ParamValue]; params: {'organizationId': ParamValue} }
    'api.v1.organizations.destroy': { paramsTuple: [ParamValue]; params: {'organizationId': ParamValue} }
    'api.search.index': { paramsTuple?: []; params?: {} }
    'api.search.events.store': { paramsTuple?: []; params?: {} }
    'api.telemetry.ui_events.store': { paramsTuple?: []; params?: {} }
    'api.tasks.audit_logs.index': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'api.projects.show': { paramsTuple: [ParamValue]; params: {'projectId': ParamValue} }
    'api.projects.replace': { paramsTuple: [ParamValue]; params: {'projectId': ParamValue} }
    'api.projects.update': { paramsTuple: [ParamValue]; params: {'projectId': ParamValue} }
    'api.projects.destroy': { paramsTuple: [ParamValue]; params: {'projectId': ParamValue} }
    'api.redis.keys.index': { paramsTuple?: []; params?: {} }
    'api.redis.cache.store': { paramsTuple?: []; params?: {} }
    'api.redis.cache.show': { paramsTuple: [ParamValue]; params: {'key': ParamValue} }
    'api.redis.cache.destroy': { paramsTuple: [ParamValue]; params: {'key': ParamValue} }
    'api.redis.cache.all.destroy': { paramsTuple?: []; params?: {} }
    'api.organizations.show': { paramsTuple: [ParamValue]; params: {'organizationId': ParamValue} }
    'api.organizations.replace': { paramsTuple: [ParamValue]; params: {'organizationId': ParamValue} }
    'api.organizations.update': { paramsTuple: [ParamValue]; params: {'organizationId': ParamValue} }
    'api.organizations.destroy': { paramsTuple: [ParamValue]; params: {'organizationId': ParamValue} }
    'api.organizations.members.index': { paramsTuple: [ParamValue]; params: {'organizationId': ParamValue} }
    'api.me.show': { paramsTuple?: []; params?: {} }
    'api.organizations.users.index': { paramsTuple?: []; params?: {} }
    'api.dev.organizations.debug_info.show': { paramsTuple?: []; params?: {} }
    'organizations.directory.index': { paramsTuple?: []; params?: {} }
    'api.organizations.index': { paramsTuple?: []; params?: {} }
    'api.v1.organizations.index': { paramsTuple?: []; params?: {} }
    'organizations.join': { paramsTuple: [ParamValue]; params: {'organizationId': ParamValue} }
    'organizations.join.post': { paramsTuple: [ParamValue]; params: {'organizationId': ParamValue} }
    'organizations.index': { paramsTuple?: []; params?: {} }
    'organizations.create': { paramsTuple?: []; params?: {} }
    'organizations.store': { paramsTuple?: []; params?: {} }
    'organizations.show': { paramsTuple: [ParamValue]; params: {'organizationId': ParamValue} }
    'organizations.switch': { paramsTuple: [ParamValue]; params: {'organizationId': ParamValue} }
    'organizations.switch.redirect': { paramsTuple: [ParamValue]; params: {'organizationId': ParamValue} }
    'organizations.context_switch.store': { paramsTuple?: []; params?: {} }
    'api.v1.me.organizations.switch.store': { paramsTuple?: []; params?: {} }
    'projects.index': { paramsTuple?: []; params?: {} }
    'projects.switch': { paramsTuple?: []; params?: {} }
    'projects.create': { paramsTuple?: []; params?: {} }
    'projects.store': { paramsTuple?: []; params?: {} }
    'projects.show': { paramsTuple: [ParamValue]; params: {'projectId': ParamValue} }
    'projects.destroy': { paramsTuple: [ParamValue]; params: {'projectId': ParamValue} }
    'projects.members.store': { paramsTuple?: []; params?: {} }
    'projects.members.update': { paramsTuple: [ParamValue]; params: {'userId': ParamValue} }
    'projects.members.destroy': { paramsTuple: [ParamValue]; params: {'userId': ParamValue} }
    'projects.member_candidates': { paramsTuple: [ParamValue]; params: {'projectId': ParamValue} }
    'api.v1.me.projects.switch.store': { paramsTuple?: []; params?: {} }
    'api.v1.projects.sprints.index': { paramsTuple: [ParamValue]; params: {'projectId': ParamValue} }
    'api.v1.projects.sprints.store': { paramsTuple: [ParamValue]; params: {'projectId': ParamValue} }
    'api.v1.projects.sprints.show': { paramsTuple: [ParamValue,ParamValue]; params: {'projectId': ParamValue,'sprintId': ParamValue} }
    'api.v1.projects.sprints.update': { paramsTuple: [ParamValue,ParamValue]; params: {'projectId': ParamValue,'sprintId': ParamValue} }
    'api.v1.projects.sprints.open_review': { paramsTuple: [ParamValue,ParamValue]; params: {'projectId': ParamValue,'sprintId': ParamValue} }
    'api.v1.projects.tasks.sprint.update': { paramsTuple: [ParamValue,ParamValue]; params: {'projectId': ParamValue,'taskId': ParamValue} }
    'api.v1.projects.sprint_board.show': { paramsTuple: [ParamValue]; params: {'projectId': ParamValue} }
    'api.me.reverse_reviews.index': { paramsTuple?: []; params?: {} }
    'api.v1.me.reverse_reviews.index': { paramsTuple?: []; params?: {} }
    'api.v1.me.sprint_review_packages.index': { paramsTuple?: []; params?: {} }
    'api.v1.me.sprint_review_packages.pending': { paramsTuple?: []; params?: {} }
    'reviews.pending_reviews.index': { paramsTuple?: []; params?: {} }
    'reviews.task_board.index': { paramsTuple?: []; params?: {} }
    'org.reviews.task_board.index': { paramsTuple?: []; params?: {} }
    'reviews.sprint_reverse_board.index': { paramsTuple?: []; params?: {} }
    'reviews.reverse_reviews.index': { paramsTuple?: []; params?: {} }
    'org.reviews.sprint_reverse_board.index': { paramsTuple?: []; params?: {} }
    'task_reviews.reviews.store': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'task_reviews.accept': { paramsTuple: [ParamValue]; params: {'workflowId': ParamValue} }
    'task_reviews.responses.store': { paramsTuple: [ParamValue]; params: {'workflowId': ParamValue} }
    'task_reviews.report': { paramsTuple: [ParamValue]; params: {'workflowId': ParamValue} }
    'sprint_reverse_reviews.submit': { paramsTuple: [ParamValue]; params: {'workflowId': ParamValue} }
    'sprint_reverse_reviews.accept': { paramsTuple: [ParamValue]; params: {'workflowId': ParamValue} }
    'sprint_reverse_reviews.respond': { paramsTuple: [ParamValue]; params: {'workflowId': ParamValue} }
    'sprint_reverse_reviews.report': { paramsTuple: [ParamValue]; params: {'workflowId': ParamValue} }
    'org.reverse_reviews.index': { paramsTuple?: []; params?: {} }
    'org.disputes.index': { paramsTuple?: []; params?: {} }
    'reviews.show': { paramsTuple: [ParamValue]; params: {'reviewId': ParamValue} }
    'reviews.submissions.store': { paramsTuple: [ParamValue]; params: {'reviewId': ParamValue} }
    'reviews.confirmations.store': { paramsTuple: [ParamValue]; params: {'reviewId': ParamValue} }
    'reviews.disputes.show': { paramsTuple: [ParamValue]; params: {'disputeId': ParamValue} }
    'reviews.sprint_disputes.show': { paramsTuple: [ParamValue]; params: {'disputeId': ParamValue} }
    'reviews.evidences.index': { paramsTuple: [ParamValue]; params: {'reviewId': ParamValue} }
    'reviews.evidences.store': { paramsTuple: [ParamValue]; params: {'reviewId': ParamValue} }
    'reviews.self_assessment.show': { paramsTuple: [ParamValue]; params: {'reviewId': ParamValue} }
    'reviews.self_assessment.store': { paramsTuple: [ParamValue]; params: {'reviewId': ParamValue} }
    'reviews.reverse_reviews.submissions.store': { paramsTuple: [ParamValue]; params: {'reviewId': ParamValue} }
    'users.reviews.index': { paramsTuple: [ParamValue]; params: {'userId': ParamValue} }
    'api.v1.reviews.sessions.store': { paramsTuple?: []; params?: {} }
    'api.v1.review_sessions.reverse_reviews.store': { paramsTuple: [ParamValue]; params: {'sessionId': ParamValue} }
    'api.v1.reviews.disputes.store': { paramsTuple?: []; params?: {} }
    'api.v1.reviews.disputes.comments.index': { paramsTuple: [ParamValue]; params: {'disputeId': ParamValue} }
    'api.v1.reviews.disputes.comments.store': { paramsTuple: [ParamValue]; params: {'disputeId': ParamValue} }
    'api.v1.reviews.disputes.evidences.index': { paramsTuple: [ParamValue]; params: {'disputeId': ParamValue} }
    'api.v1.reviews.disputes.evidences.store': { paramsTuple: [ParamValue]; params: {'disputeId': ParamValue} }
    'api.v1.reviews.disputes.report': { paramsTuple: [ParamValue]; params: {'disputeId': ParamValue} }
    'api.v1.project_sprints.close_review': { paramsTuple: [ParamValue]; params: {'sprintId': ParamValue} }
    'api.v1.project_sprints.close_review_period': { paramsTuple: [ParamValue]; params: {'sprintId': ParamValue} }
    'api.v1.project_sprints.expire_pending_review_packages': { paramsTuple: [ParamValue]; params: {'sprintId': ParamValue} }
    'api.v1.sprint_review_packages.show': { paramsTuple: [ParamValue]; params: {'packageId': ParamValue} }
    'api.v1.sprint_review_packages.submit': { paramsTuple: [ParamValue]; params: {'packageId': ParamValue} }
    'api.v1.sprint_review_packages.disputes.store': { paramsTuple: [ParamValue]; params: {'packageId': ParamValue} }
    'api.v1.sprint_review_disputes.comments.store': { paramsTuple: [ParamValue]; params: {'disputeId': ParamValue} }
    'api.v1.sprint_review_disputes.report': { paramsTuple: [ParamValue]; params: {'disputeId': ParamValue} }
    'api.review_sessions.reverse_reviews.store': { paramsTuple: [ParamValue]; params: {'sessionId': ParamValue} }
    'api.reviews.disputes.store': { paramsTuple?: []; params?: {} }
    'api.reviews.disputes.comments.index': { paramsTuple: [ParamValue]; params: {'disputeId': ParamValue} }
    'api.reviews.disputes.comments.store': { paramsTuple: [ParamValue]; params: {'disputeId': ParamValue} }
    'api.reviews.disputes.evidences.index': { paramsTuple: [ParamValue]; params: {'disputeId': ParamValue} }
    'api.reviews.disputes.evidences.store': { paramsTuple: [ParamValue]; params: {'disputeId': ParamValue} }
    'api.reviews.disputes.report': { paramsTuple: [ParamValue]; params: {'disputeId': ParamValue} }
    'api.reviews.sessions.store': { paramsTuple?: []; params?: {} }
    'api.project_sprints.close_review': { paramsTuple: [ParamValue]; params: {'sprintId': ParamValue} }
    'api.project_sprints.close_review_period': { paramsTuple: [ParamValue]; params: {'sprintId': ParamValue} }
    'api.project_sprints.expire_pending_review_packages': { paramsTuple: [ParamValue]; params: {'sprintId': ParamValue} }
    'api.sprint_review_packages.show': { paramsTuple: [ParamValue]; params: {'packageId': ParamValue} }
    'api.sprint_review_packages.submit': { paramsTuple: [ParamValue]; params: {'packageId': ParamValue} }
    'api.sprint_review_packages.disputes.store': { paramsTuple: [ParamValue]; params: {'packageId': ParamValue} }
    'api.sprint_review_disputes.comments.store': { paramsTuple: [ParamValue]; params: {'disputeId': ParamValue} }
    'api.sprint_review_disputes.report': { paramsTuple: [ParamValue]; params: {'disputeId': ParamValue} }
    'api.v1.me.organizations.current.reverse_reviews.index': { paramsTuple?: []; params?: {} }
    'api.v1.me.organizations.current.reviews.disputes.index': { paramsTuple?: []; params?: {} }
    'api.v1.me.organizations.current.reviews.disputes.responses.store': { paramsTuple: [ParamValue]; params: {'disputeId': ParamValue} }
    'admin.reverse_reviews.index': { paramsTuple?: []; params?: {} }
    'admin.flagged_reviews.index': { paramsTuple?: []; params?: {} }
    'admin.flagged_reviews.resolutions.store': { paramsTuple: [ParamValue]; params: {'flaggedReviewId': ParamValue} }
    'api.admin.reverse_reviews.index': { paramsTuple?: []; params?: {} }
    'api.admin.reviews.disputes.index': { paramsTuple?: []; params?: {} }
    'api.admin.reviews.disputes.show': { paramsTuple: [ParamValue]; params: {'disputeId': ParamValue} }
    'api.admin.reviews.disputes.resolution.store': { paramsTuple: [ParamValue]; params: {'disputeId': ParamValue} }
    'api.admin.reviews.disputes.case_files.index': { paramsTuple: [ParamValue]; params: {'disputeId': ParamValue} }
    'api.admin.reviews.disputes.case_files.store': { paramsTuple: [ParamValue]; params: {'disputeId': ParamValue} }
    'api.admin.reviews.disputes.ai_evaluations.index': { paramsTuple: [ParamValue]; params: {'disputeId': ParamValue} }
    'api.admin.reviews.disputes.ai_evaluations.store': { paramsTuple: [ParamValue]; params: {'disputeId': ParamValue} }
    'api.public.ai_disputes.callbacks.store': { paramsTuple?: []; params?: {} }
    'api.public.ai_dispute_evaluations.callbacks.store': { paramsTuple?: []; params?: {} }
    'api.v1.me.organizations.current.member_invitations.alias.store': { paramsTuple?: []; params?: {} }
    'api.v1.me.organizations.current.members.alias.destroy': { paramsTuple: [ParamValue]; params: {'memberId': ParamValue} }
    'api.v1.me.organizations.current.members.role.alias.update': { paramsTuple: [ParamValue]; params: {'memberId': ParamValue} }
    'api.v1.me.organizations.current.join_requests.alias.approvals.store': { paramsTuple: [ParamValue]; params: {'joinRequestId': ParamValue} }
    'api.v1.me.organizations.current.roles.alias.update': { paramsTuple?: []; params?: {} }
    'api.v1.me.organizations.current.projects.alias.store': { paramsTuple?: []; params?: {} }
    'api.v1.me.organizations.current.task_statuses.alias.index': { paramsTuple?: []; params?: {} }
    'api.v1.me.organizations.current.task_statuses.alias.store': { paramsTuple?: []; params?: {} }
    'api.v1.me.organizations.current.reverse_reviews.alias.index': { paramsTuple?: []; params?: {} }
    'api.v1.me.organizations.current.reviews.disputes.alias.index': { paramsTuple?: []; params?: {} }
    'api.v1.me.organizations.current.reviews.disputes.alias.responses.store': { paramsTuple: [ParamValue]; params: {'disputeId': ParamValue} }
    'api.v1.me.organizations.current.talents.search.alias.index': { paramsTuple?: []; params?: {} }
    'api.v1.me.organizations.current.talents.alias.show': { paramsTuple: [ParamValue]; params: {'userId': ParamValue} }
    'api.v1.me.organizations.current.talents.bookmarks.alias.store': { paramsTuple: [ParamValue]; params: {'userId': ParamValue} }
    'api.v1.me.organizations.current.talents.bookmarks.alias.destroy': { paramsTuple: [ParamValue]; params: {'userId': ParamValue} }
    'api.organizations.members.alias.index': { paramsTuple: [ParamValue]; params: {'organizationId': ParamValue} }
    'api.me.organizations.current.users.alias.index': { paramsTuple?: []; params?: {} }
    'api.v1.organizations.members.alias.index': { paramsTuple: [ParamValue]; params: {'organizationId': ParamValue} }
    'api.v1.me.organizations.current.users.alias.index': { paramsTuple?: []; params?: {} }
    'api.users.pending_approvals.alias.index': { paramsTuple?: []; params?: {} }
    'api.users.pending_approvals.count.alias.show': { paramsTuple?: []; params?: {} }
    'api.v1.users.pending_approvals.alias.index': { paramsTuple?: []; params?: {} }
    'api.v1.users.pending_approvals.count.alias.show': { paramsTuple?: []; params?: {} }
    'api.tasks.creation_access.alias.show': { paramsTuple?: []; params?: {} }
    'api.tasks.status_groups.alias.index': { paramsTuple?: []; params?: {} }
    'api.tasks.timeline_items.alias.index': { paramsTuple?: []; params?: {} }
    'api.tasks.board_state.alias.update': { paramsTuple?: []; params?: {} }
    'api.v1.tasks.creation_access.alias.show': { paramsTuple?: []; params?: {} }
    'api.v1.tasks.status_groups.alias.index': { paramsTuple?: []; params?: {} }
    'api.v1.tasks.timeline_items.alias.index': { paramsTuple?: []; params?: {} }
    'api.v1.tasks.board_state.alias.update': { paramsTuple?: []; params?: {} }
    'api.v1.tasks.requirements.role_prefill.alias.store': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'api.me.organizations.current.talents.search.alias.index': { paramsTuple?: []; params?: {} }
    'api.me.organizations.current.talents.alias.show': { paramsTuple: [ParamValue]; params: {'userId': ParamValue} }
    'api.me.organizations.current.talents.bookmarks.alias.store': { paramsTuple: [ParamValue]; params: {'userId': ParamValue} }
    'api.me.organizations.current.talents.bookmarks.alias.destroy': { paramsTuple: [ParamValue]; params: {'userId': ParamValue} }
    'api.me.organizations.current.reverse_reviews.alias.index': { paramsTuple?: []; params?: {} }
    'api.me.organizations.current.reviews.disputes.alias.index': { paramsTuple?: []; params?: {} }
    'api.me.organizations.current.reviews.disputes.alias.responses.store': { paramsTuple: [ParamValue]; params: {'disputeId': ParamValue} }
    'api.recruiters.bookmarks.index': { paramsTuple?: []; params?: {} }
    'api.recruiters.bookmarks.store': { paramsTuple?: []; params?: {} }
    'api.recruiters.bookmarks.update': { paramsTuple: [ParamValue]; params: {'bookmarkId': ParamValue} }
    'api.recruiters.bookmarks.destroy': { paramsTuple: [ParamValue]; params: {'bookmarkId': ParamValue} }
    'search.index': { paramsTuple?: []; params?: {} }
    'dashboard.show': { paramsTuple?: []; params?: {} }
    'health_checks': { paramsTuple?: []; params?: {} }
    'api.dev.restart.store': { paramsTuple?: []; params?: {} }
  }
  POST: {
    'admin.mode.switch': { paramsTuple?: []; params?: {} }
    'admin.permissions.custom_roles.store': { paramsTuple?: []; params?: {} }
    'org.members.invite': { paramsTuple?: []; params?: {} }
    'org.projects.store': { paramsTuple?: []; params?: {} }
    'org.tasks.workflow.create': { paramsTuple?: []; params?: {} }
    'org.workflow.statuses.store': { paramsTuple?: []; params?: {} }
    'api.v1.me.organizations.current.member_invitations.store': { paramsTuple?: []; params?: {} }
    'api.v1.me.organizations.current.projects.store': { paramsTuple?: []; params?: {} }
    'api.v1.me.organizations.current.task_statuses.store': { paramsTuple?: []; params?: {} }
    'api.v1.tasks.applications.store': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'api.tasks.applications.store': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'applications.withdrawals.store': { paramsTuple: [ParamValue]; params: {'applicationId': ParamValue} }
    'applications.decisions.store': { paramsTuple: [ParamValue]; params: {'applicationId': ParamValue} }
    'api.v1.skills.projects.skills.store': { paramsTuple: [ParamValue]; params: {'projectId': ParamValue} }
    'api.v1.skills.projects.roles.store': { paramsTuple: [ParamValue]; params: {'projectId': ParamValue} }
    'api.v1.skills.projects.roles.skills.store': { paramsTuple: [ParamValue,ParamValue]; params: {'projectId': ParamValue,'roleId': ParamValue} }
    'api.v1.tasks.requirements.store': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'api.v1.tasks.requirements.role_prefill.store': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'logout': { paramsTuple?: []; params?: {} }
    'api.v1.auth.tokens.store': { paramsTuple?: []; params?: {} }
    'api.v1.auth.tokens.refresh.store': { paramsTuple?: []; params?: {} }
    'users.store': { paramsTuple?: []; params?: {} }
    'profile.skills.store': { paramsTuple?: []; params?: {} }
    'profile.snapshots.store': { paramsTuple?: []; params?: {} }
    'api.me.profile_snapshots.store': { paramsTuple?: []; params?: {} }
    'profile.snapshots.share_link.rotate': { paramsTuple: [ParamValue]; params: {'snapshotId': ParamValue} }
    'api.me.profile_snapshots.share_link.rotate': { paramsTuple: [ParamValue]; params: {'snapshotId': ParamValue} }
    'api.talent_bookmarks.store': { paramsTuple?: []; params?: {} }
    'api.recruiter_bookmarks.store': { paramsTuple?: []; params?: {} }
    'api.v1.talent_bookmarks.store': { paramsTuple?: []; params?: {} }
    'api.v1.recruiter_bookmarks.store': { paramsTuple?: []; params?: {} }
    'api.v1.me.profile_snapshots.store': { paramsTuple?: []; params?: {} }
    'api.v1.me.profile_snapshots.share_link.rotate': { paramsTuple: [ParamValue]; params: {'snapshotId': ParamValue} }
    'api.v1.me.organizations.current.talents.bookmarks.store': { paramsTuple: [ParamValue]; params: {'userId': ParamValue} }
    'api.tasks.submission.store': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'api.tasks.submission.submit': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'api.tasks.submission.lock': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'api.task_submissions.evidences.store': { paramsTuple: [ParamValue]; params: {'submissionId': ParamValue} }
    'api.tasks.comments.store': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'api.tasks.attachments.store': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'api.v1.tasks.submission.store': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'api.v1.tasks.submission.submit': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'api.v1.tasks.submission.lock': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'api.v1.task_submissions.evidences.store': { paramsTuple: [ParamValue]; params: {'submissionId': ParamValue} }
    'api.v1.tasks.comments.store': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'api.v1.tasks.attachments.store': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'tasks.store': { paramsTuple?: []; params?: {} }
    'api.task_statuses.store': { paramsTuple?: []; params?: {} }
    'settings.profile.update': { paramsTuple?: []; params?: {} }
    'settings.account.update': { paramsTuple?: []; params?: {} }
    'settings.notifications.update': { paramsTuple?: []; params?: {} }
    'notifications.mark_as_read': { paramsTuple: [ParamValue]; params: {'notificationId': ParamValue} }
    'notifications.mark_all_as_read': { paramsTuple?: []; params?: {} }
    'api.v1.notifications.read_statuses.update': { paramsTuple?: []; params?: {} }
    'api.v1.notifications.read_status.update': { paramsTuple: [ParamValue]; params: {'notificationId': ParamValue} }
    'api.v1.task_statuses.store': { paramsTuple?: []; params?: {} }
    'api.search.events.store': { paramsTuple?: []; params?: {} }
    'api.telemetry.ui_events.store': { paramsTuple?: []; params?: {} }
    'api.redis.cache.store': { paramsTuple?: []; params?: {} }
    'organizations.join.post': { paramsTuple: [ParamValue]; params: {'organizationId': ParamValue} }
    'organizations.store': { paramsTuple?: []; params?: {} }
    'organizations.switch': { paramsTuple: [ParamValue]; params: {'organizationId': ParamValue} }
    'organizations.context_switch.store': { paramsTuple?: []; params?: {} }
    'api.v1.me.organizations.switch.store': { paramsTuple?: []; params?: {} }
    'projects.switch': { paramsTuple?: []; params?: {} }
    'projects.store': { paramsTuple?: []; params?: {} }
    'projects.members.store': { paramsTuple?: []; params?: {} }
    'api.v1.me.projects.switch.store': { paramsTuple?: []; params?: {} }
    'api.v1.projects.sprints.store': { paramsTuple: [ParamValue]; params: {'projectId': ParamValue} }
    'api.v1.projects.sprints.open_review': { paramsTuple: [ParamValue,ParamValue]; params: {'projectId': ParamValue,'sprintId': ParamValue} }
    'task_reviews.reviews.store': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'task_reviews.accept': { paramsTuple: [ParamValue]; params: {'workflowId': ParamValue} }
    'task_reviews.responses.store': { paramsTuple: [ParamValue]; params: {'workflowId': ParamValue} }
    'task_reviews.report': { paramsTuple: [ParamValue]; params: {'workflowId': ParamValue} }
    'sprint_reverse_reviews.submit': { paramsTuple: [ParamValue]; params: {'workflowId': ParamValue} }
    'sprint_reverse_reviews.accept': { paramsTuple: [ParamValue]; params: {'workflowId': ParamValue} }
    'sprint_reverse_reviews.respond': { paramsTuple: [ParamValue]; params: {'workflowId': ParamValue} }
    'sprint_reverse_reviews.report': { paramsTuple: [ParamValue]; params: {'workflowId': ParamValue} }
    'reviews.submissions.store': { paramsTuple: [ParamValue]; params: {'reviewId': ParamValue} }
    'reviews.confirmations.store': { paramsTuple: [ParamValue]; params: {'reviewId': ParamValue} }
    'reviews.evidences.store': { paramsTuple: [ParamValue]; params: {'reviewId': ParamValue} }
    'reviews.self_assessment.store': { paramsTuple: [ParamValue]; params: {'reviewId': ParamValue} }
    'reviews.reverse_reviews.submissions.store': { paramsTuple: [ParamValue]; params: {'reviewId': ParamValue} }
    'api.v1.reviews.sessions.store': { paramsTuple?: []; params?: {} }
    'api.v1.review_sessions.reverse_reviews.store': { paramsTuple: [ParamValue]; params: {'sessionId': ParamValue} }
    'api.v1.reviews.disputes.store': { paramsTuple?: []; params?: {} }
    'api.v1.reviews.disputes.comments.store': { paramsTuple: [ParamValue]; params: {'disputeId': ParamValue} }
    'api.v1.reviews.disputes.evidences.store': { paramsTuple: [ParamValue]; params: {'disputeId': ParamValue} }
    'api.v1.reviews.disputes.report': { paramsTuple: [ParamValue]; params: {'disputeId': ParamValue} }
    'api.v1.project_sprints.close_review': { paramsTuple: [ParamValue]; params: {'sprintId': ParamValue} }
    'api.v1.project_sprints.close_review_period': { paramsTuple: [ParamValue]; params: {'sprintId': ParamValue} }
    'api.v1.project_sprints.expire_pending_review_packages': { paramsTuple: [ParamValue]; params: {'sprintId': ParamValue} }
    'api.v1.sprint_review_packages.submit': { paramsTuple: [ParamValue]; params: {'packageId': ParamValue} }
    'api.v1.sprint_review_packages.disputes.store': { paramsTuple: [ParamValue]; params: {'packageId': ParamValue} }
    'api.v1.sprint_review_disputes.comments.store': { paramsTuple: [ParamValue]; params: {'disputeId': ParamValue} }
    'api.v1.sprint_review_disputes.report': { paramsTuple: [ParamValue]; params: {'disputeId': ParamValue} }
    'api.review_sessions.reverse_reviews.store': { paramsTuple: [ParamValue]; params: {'sessionId': ParamValue} }
    'api.reviews.disputes.store': { paramsTuple?: []; params?: {} }
    'api.reviews.disputes.comments.store': { paramsTuple: [ParamValue]; params: {'disputeId': ParamValue} }
    'api.reviews.disputes.evidences.store': { paramsTuple: [ParamValue]; params: {'disputeId': ParamValue} }
    'api.reviews.disputes.report': { paramsTuple: [ParamValue]; params: {'disputeId': ParamValue} }
    'api.reviews.sessions.store': { paramsTuple?: []; params?: {} }
    'api.project_sprints.close_review': { paramsTuple: [ParamValue]; params: {'sprintId': ParamValue} }
    'api.project_sprints.close_review_period': { paramsTuple: [ParamValue]; params: {'sprintId': ParamValue} }
    'api.project_sprints.expire_pending_review_packages': { paramsTuple: [ParamValue]; params: {'sprintId': ParamValue} }
    'api.sprint_review_packages.submit': { paramsTuple: [ParamValue]; params: {'packageId': ParamValue} }
    'api.sprint_review_packages.disputes.store': { paramsTuple: [ParamValue]; params: {'packageId': ParamValue} }
    'api.sprint_review_disputes.comments.store': { paramsTuple: [ParamValue]; params: {'disputeId': ParamValue} }
    'api.sprint_review_disputes.report': { paramsTuple: [ParamValue]; params: {'disputeId': ParamValue} }
    'api.v1.me.organizations.current.reviews.disputes.responses.store': { paramsTuple: [ParamValue]; params: {'disputeId': ParamValue} }
    'admin.flagged_reviews.resolutions.store': { paramsTuple: [ParamValue]; params: {'flaggedReviewId': ParamValue} }
    'api.admin.reviews.disputes.resolution.store': { paramsTuple: [ParamValue]; params: {'disputeId': ParamValue} }
    'api.admin.reviews.disputes.case_files.store': { paramsTuple: [ParamValue]; params: {'disputeId': ParamValue} }
    'api.admin.reviews.disputes.ai_evaluations.store': { paramsTuple: [ParamValue]; params: {'disputeId': ParamValue} }
    'api.public.ai_disputes.callbacks.store': { paramsTuple?: []; params?: {} }
    'api.public.ai_dispute_evaluations.callbacks.store': { paramsTuple?: []; params?: {} }
    'api.v1.me.organizations.current.member_invitations.alias.store': { paramsTuple?: []; params?: {} }
    'api.v1.me.organizations.current.projects.alias.store': { paramsTuple?: []; params?: {} }
    'api.v1.me.organizations.current.task_statuses.alias.store': { paramsTuple?: []; params?: {} }
    'api.v1.me.organizations.current.reviews.disputes.alias.responses.store': { paramsTuple: [ParamValue]; params: {'disputeId': ParamValue} }
    'api.v1.me.organizations.current.talents.bookmarks.alias.store': { paramsTuple: [ParamValue]; params: {'userId': ParamValue} }
    'api.v1.tasks.requirements.role_prefill.alias.store': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'api.me.organizations.current.talents.bookmarks.alias.store': { paramsTuple: [ParamValue]; params: {'userId': ParamValue} }
    'api.me.organizations.current.reviews.disputes.alias.responses.store': { paramsTuple: [ParamValue]; params: {'disputeId': ParamValue} }
    'api.recruiters.bookmarks.store': { paramsTuple?: []; params?: {} }
    'api.dev.restart.store': { paramsTuple?: []; params?: {} }
  }
  GET: {
    'admin.dashboard.show': { paramsTuple?: []; params?: {} }
    'admin.dashboard.users': { paramsTuple?: []; params?: {} }
    'admin.dashboard.operations': { paramsTuple?: []; params?: {} }
    'admin.dashboard.subscriptions': { paramsTuple?: []; params?: {} }
    'admin.users.index': { paramsTuple?: []; params?: {} }
    'admin.users.show': { paramsTuple: [ParamValue]; params: {'userId': ParamValue} }
    'admin.organizations.index': { paramsTuple?: []; params?: {} }
    'admin.organizations.show': { paramsTuple: [ParamValue]; params: {'organizationId': ParamValue} }
    'admin.audit_logs.index': { paramsTuple?: []; params?: {} }
    'admin.permissions.index': { paramsTuple?: []; params?: {} }
    'admin.permissions.system': { paramsTuple?: []; params?: {} }
    'admin.permissions.custom_roles.create': { paramsTuple?: []; params?: {} }
    'admin.permissions.custom_roles.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.permissions.organization': { paramsTuple?: []; params?: {} }
    'admin.permissions.project': { paramsTuple?: []; params?: {} }
    'admin.qr_codes.show': { paramsTuple?: []; params?: {} }
    'admin.proficiency.index': { paramsTuple?: []; params?: {} }
    'admin.proficiency.show': { paramsTuple: [ParamValue]; params: {'proficiencyScaleId': ParamValue} }
    'admin.proficiency.rubrics.show': { paramsTuple: [ParamValue]; params: {'skillId': ParamValue} }
    'admin.reviews.flagged': { paramsTuple?: []; params?: {} }
    'admin.reviews.show': { paramsTuple: [ParamValue]; params: {'flaggedReviewId': ParamValue} }
    'admin.disputes.index': { paramsTuple?: []; params?: {} }
    'admin.disputes.ai_operator.show': { paramsTuple?: []; params?: {} }
    'admin.disputes.show': { paramsTuple: [ParamValue]; params: {'disputeId': ParamValue} }
    'admin.packages.index': { paramsTuple?: []; params?: {} }
    'api.admin.dashboard.show': { paramsTuple?: []; params?: {} }
    'api.admin.users.index': { paramsTuple?: []; params?: {} }
    'api.admin.organizations.index': { paramsTuple?: []; params?: {} }
    'api.admin.audit_logs.index': { paramsTuple?: []; params?: {} }
    'org.dashboard': { paramsTuple?: []; params?: {} }
    'org.members.index': { paramsTuple?: []; params?: {} }
    'org.join_requests.index': { paramsTuple?: []; params?: {} }
    'org.invitations.index': { paramsTuple?: []; params?: {} }
    'org.settings.show': { paramsTuple?: []; params?: {} }
    'org.roles.index': { paramsTuple?: []; params?: {} }
    'org.permissions.index': { paramsTuple?: []; params?: {} }
    'org.departments.index': { paramsTuple?: []; params?: {} }
    'org.audit_logs.index': { paramsTuple?: []; params?: {} }
    'org.marketplace.tasks': { paramsTuple?: []; params?: {} }
    'org.sprints.index': { paramsTuple?: []; params?: {} }
    'org.projects.index': { paramsTuple?: []; params?: {} }
    'org.projects.create': { paramsTuple?: []; params?: {} }
    'org.projects.show': { paramsTuple: [ParamValue]; params: {'projectId': ParamValue} }
    'org.tasks.index': { paramsTuple?: []; params?: {} }
    'org.tasks.board': { paramsTuple?: []; params?: {} }
    'org.tasks.list': { paramsTuple?: []; params?: {} }
    'org.tasks.workflow': { paramsTuple?: []; params?: {} }
    'org.tasks.show': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'org.workflow.statuses': { paramsTuple?: []; params?: {} }
    'api.v1.me.organizations.current.task_statuses.index': { paramsTuple?: []; params?: {} }
    'marketplace.index': { paramsTuple?: []; params?: {} }
    'marketplace.talents.legacy': { paramsTuple?: []; params?: {} }
    'marketplace.bookmarks.legacy': { paramsTuple?: []; params?: {} }
    'marketplace.tasks': { paramsTuple?: []; params?: {} }
    'api.marketplace.tasks.index': { paramsTuple?: []; params?: {} }
    'api.v1.marketplace.tasks.index': { paramsTuple?: []; params?: {} }
    'api.v1.tasks.applications.match': { paramsTuple: [ParamValue,ParamValue]; params: {'taskId': ParamValue,'applicationId': ParamValue} }
    'api.v1.tasks.applications.ranking': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'me.applications.index': { paramsTuple?: []; params?: {} }
    'tasks.applications': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'api.tasks.applications.match': { paramsTuple: [ParamValue,ParamValue]; params: {'taskId': ParamValue,'applicationId': ParamValue} }
    'api.tasks.applications.ranking': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'api.v1.skills.skills.proficiency_scales.index': { paramsTuple?: []; params?: {} }
    'api.v1.skills.skills.proficiency_scales.show': { paramsTuple: [ParamValue]; params: {'proficiencyScaleId': ParamValue} }
    'api.v1.skills.skills.rubrics.show': { paramsTuple: [ParamValue]; params: {'skillId': ParamValue} }
    'api.v1.skills.skills.rubrics.index': { paramsTuple: [ParamValue]; params: {'skillId': ParamValue} }
    'api.v1.skills.index': { paramsTuple?: []; params?: {} }
    'api.v1.skills.role_templates.index': { paramsTuple?: []; params?: {} }
    'api.v1.skills.projects.skills.index': { paramsTuple: [ParamValue]; params: {'projectId': ParamValue} }
    'api.v1.skills.projects.roles.index': { paramsTuple: [ParamValue]; params: {'projectId': ParamValue} }
    'api.v1.skills.projects.roles.candidates': { paramsTuple: [ParamValue,ParamValue]; params: {'projectId': ParamValue,'roleId': ParamValue} }
    'api.v1.skills.projects.professional_roles.requirements.index': { paramsTuple: [ParamValue,ParamValue]; params: {'projectId': ParamValue,'roleId': ParamValue} }
    'api.v1.skills.projects.roles.requirements.index': { paramsTuple: [ParamValue,ParamValue]; params: {'projectId': ParamValue,'roleId': ParamValue} }
    'api.v1.tasks.requirements.index': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'api.v1.tasks.requirements.versions.index': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'error.not_found': { paramsTuple?: []; params?: {} }
    'error.server_error': { paramsTuple?: []; params?: {} }
    'error.forbidden': { paramsTuple?: []; params?: {} }
    'error.require_organization': { paramsTuple?: []; params?: {} }
    'social_auth.redirect': { paramsTuple: [ParamValue]; params: {'provider': ParamValue} }
    'social_auth.callback': { paramsTuple: [ParamValue]; params: {'provider': ParamValue} }
    'logout.show': { paramsTuple?: []; params?: {} }
    'auth.login': { paramsTuple?: []; params?: {} }
    'users.index': { paramsTuple?: []; params?: {} }
    'users.create': { paramsTuple?: []; params?: {} }
    'users.pending_approvals.index': { paramsTuple?: []; params?: {} }
    'users.show': { paramsTuple: [ParamValue]; params: {'userId': ParamValue} }
    'users.edit': { paramsTuple: [ParamValue]; params: {'userId': ParamValue} }
    'org.bookmarks': { paramsTuple?: []; params?: {} }
    'org.talents.index': { paramsTuple?: []; params?: {} }
    'org.talents.show': { paramsTuple: [ParamValue]; params: {'userId': ParamValue} }
    'profile.show': { paramsTuple?: []; params?: {} }
    'profile.edit': { paramsTuple?: []; params?: {} }
    'profile.invitations.index': { paramsTuple?: []; params?: {} }
    'profile.user.show': { paramsTuple: [ParamValue]; params: {'userId': ParamValue} }
    'profile.snapshots.current': { paramsTuple?: []; params?: {} }
    'api.me.profile_snapshots.current.show': { paramsTuple?: []; params?: {} }
    'profile.snapshots.history': { paramsTuple?: []; params?: {} }
    'api.me.profile_snapshots.index': { paramsTuple?: []; params?: {} }
    'api.users.pending_approvals.index': { paramsTuple?: []; params?: {} }
    'api.users.pending_approvals.count.show': { paramsTuple?: []; params?: {} }
    'api.users.system_users.index': { paramsTuple?: []; params?: {} }
    'api.talents.search.index': { paramsTuple?: []; params?: {} }
    'api.talent_bookmarks.index': { paramsTuple?: []; params?: {} }
    'api.recruiter_bookmarks.index': { paramsTuple?: []; params?: {} }
    'api.v1.users.pending_approvals.index': { paramsTuple?: []; params?: {} }
    'api.v1.users.pending_approvals.count.show': { paramsTuple?: []; params?: {} }
    'api.v1.users.system_users.index': { paramsTuple?: []; params?: {} }
    'api.v1.talents.search.index': { paramsTuple?: []; params?: {} }
    'api.v1.talent_bookmarks.index': { paramsTuple?: []; params?: {} }
    'api.v1.recruiter_bookmarks.index': { paramsTuple?: []; params?: {} }
    'api.v1.me.profile_snapshots.current.show': { paramsTuple?: []; params?: {} }
    'api.v1.me.profile_snapshots.index': { paramsTuple?: []; params?: {} }
    'api.v1.me.organizations.current.talents.search.index': { paramsTuple?: []; params?: {} }
    'api.v1.me.organizations.current.talents.show': { paramsTuple: [ParamValue]; params: {'userId': ParamValue} }
    'profile.snapshot.public': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'tasks.index': { paramsTuple?: []; params?: {} }
    'api.tasks.creation_access.show': { paramsTuple?: []; params?: {} }
    'api.tasks.status_groups.index': { paramsTuple?: []; params?: {} }
    'api.tasks.timeline_items.index': { paramsTuple?: []; params?: {} }
    'api.tasks.show': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'api.tasks.submission.show': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'api.task_submissions.evidences.index': { paramsTuple: [ParamValue]; params: {'submissionId': ParamValue} }
    'api.tasks.comments.index': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'api.tasks.attachments.index': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'api.v1.tasks.creation_access.show': { paramsTuple?: []; params?: {} }
    'api.v1.tasks.status_groups.index': { paramsTuple?: []; params?: {} }
    'api.v1.tasks.timeline_items.index': { paramsTuple?: []; params?: {} }
    'api.v1.tasks.show': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'api.v1.tasks.audit_logs.index': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'api.v1.tasks.submission.show': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'api.v1.task_submissions.evidences.index': { paramsTuple: [ParamValue]; params: {'submissionId': ParamValue} }
    'api.v1.tasks.comments.index': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'api.v1.tasks.attachments.index': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'tasks.create': { paramsTuple?: []; params?: {} }
    'tasks.board_state.show': { paramsTuple?: []; params?: {} }
    'tasks.show': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'tasks.edit': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'tasks.audit_logs': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'api.task_statuses.index': { paramsTuple?: []; params?: {} }
    'api.task_statuses.workflow.index': { paramsTuple?: []; params?: {} }
    'settings.index': { paramsTuple?: []; params?: {} }
    'settings.profile': { paramsTuple?: []; params?: {} }
    'settings.account': { paramsTuple?: []; params?: {} }
    'settings.audit_logs.index': { paramsTuple?: []; params?: {} }
    'settings.notifications': { paramsTuple?: []; params?: {} }
    'account.index': { paramsTuple?: []; params?: {} }
    'notifications.index': { paramsTuple?: []; params?: {} }
    'notifications.latest': { paramsTuple?: []; params?: {} }
    'api.v1.me.show': { paramsTuple?: []; params?: {} }
    'api.v1.me.settings.show': { paramsTuple?: []; params?: {} }
    'api.v1.notifications.index': { paramsTuple?: []; params?: {} }
    'api.v1.task_statuses.index': { paramsTuple?: []; params?: {} }
    'api.v1.task_statuses.show': { paramsTuple: [ParamValue]; params: {'taskStatusId': ParamValue} }
    'api.v1.task_statuses.workflow.index': { paramsTuple?: []; params?: {} }
    'api.v1.projects.show': { paramsTuple: [ParamValue]; params: {'projectId': ParamValue} }
    'api.v1.organizations.show': { paramsTuple: [ParamValue]; params: {'organizationId': ParamValue} }
    'api.v1.organizations.members.index': { paramsTuple: [ParamValue]; params: {'organizationId': ParamValue} }
    'api.v1.organizations.users.index': { paramsTuple?: []; params?: {} }
    'api.search.index': { paramsTuple?: []; params?: {} }
    'api.tasks.audit_logs.index': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'api.projects.show': { paramsTuple: [ParamValue]; params: {'projectId': ParamValue} }
    'api.redis.keys.index': { paramsTuple?: []; params?: {} }
    'api.redis.cache.show': { paramsTuple: [ParamValue]; params: {'key': ParamValue} }
    'api.organizations.show': { paramsTuple: [ParamValue]; params: {'organizationId': ParamValue} }
    'api.organizations.members.index': { paramsTuple: [ParamValue]; params: {'organizationId': ParamValue} }
    'api.me.show': { paramsTuple?: []; params?: {} }
    'api.organizations.users.index': { paramsTuple?: []; params?: {} }
    'api.dev.organizations.debug_info.show': { paramsTuple?: []; params?: {} }
    'organizations.directory.index': { paramsTuple?: []; params?: {} }
    'api.organizations.index': { paramsTuple?: []; params?: {} }
    'api.v1.organizations.index': { paramsTuple?: []; params?: {} }
    'organizations.join': { paramsTuple: [ParamValue]; params: {'organizationId': ParamValue} }
    'organizations.index': { paramsTuple?: []; params?: {} }
    'organizations.create': { paramsTuple?: []; params?: {} }
    'organizations.show': { paramsTuple: [ParamValue]; params: {'organizationId': ParamValue} }
    'organizations.switch.redirect': { paramsTuple: [ParamValue]; params: {'organizationId': ParamValue} }
    'projects.index': { paramsTuple?: []; params?: {} }
    'projects.create': { paramsTuple?: []; params?: {} }
    'projects.show': { paramsTuple: [ParamValue]; params: {'projectId': ParamValue} }
    'projects.member_candidates': { paramsTuple: [ParamValue]; params: {'projectId': ParamValue} }
    'api.v1.projects.sprints.index': { paramsTuple: [ParamValue]; params: {'projectId': ParamValue} }
    'api.v1.projects.sprints.show': { paramsTuple: [ParamValue,ParamValue]; params: {'projectId': ParamValue,'sprintId': ParamValue} }
    'api.v1.projects.sprint_board.show': { paramsTuple: [ParamValue]; params: {'projectId': ParamValue} }
    'api.me.reverse_reviews.index': { paramsTuple?: []; params?: {} }
    'api.v1.me.reverse_reviews.index': { paramsTuple?: []; params?: {} }
    'api.v1.me.sprint_review_packages.index': { paramsTuple?: []; params?: {} }
    'api.v1.me.sprint_review_packages.pending': { paramsTuple?: []; params?: {} }
    'reviews.pending_reviews.index': { paramsTuple?: []; params?: {} }
    'reviews.task_board.index': { paramsTuple?: []; params?: {} }
    'org.reviews.task_board.index': { paramsTuple?: []; params?: {} }
    'reviews.sprint_reverse_board.index': { paramsTuple?: []; params?: {} }
    'reviews.reverse_reviews.index': { paramsTuple?: []; params?: {} }
    'org.reviews.sprint_reverse_board.index': { paramsTuple?: []; params?: {} }
    'org.reverse_reviews.index': { paramsTuple?: []; params?: {} }
    'org.disputes.index': { paramsTuple?: []; params?: {} }
    'reviews.show': { paramsTuple: [ParamValue]; params: {'reviewId': ParamValue} }
    'reviews.disputes.show': { paramsTuple: [ParamValue]; params: {'disputeId': ParamValue} }
    'reviews.sprint_disputes.show': { paramsTuple: [ParamValue]; params: {'disputeId': ParamValue} }
    'reviews.evidences.index': { paramsTuple: [ParamValue]; params: {'reviewId': ParamValue} }
    'reviews.self_assessment.show': { paramsTuple: [ParamValue]; params: {'reviewId': ParamValue} }
    'users.reviews.index': { paramsTuple: [ParamValue]; params: {'userId': ParamValue} }
    'api.v1.reviews.disputes.comments.index': { paramsTuple: [ParamValue]; params: {'disputeId': ParamValue} }
    'api.v1.reviews.disputes.evidences.index': { paramsTuple: [ParamValue]; params: {'disputeId': ParamValue} }
    'api.v1.sprint_review_packages.show': { paramsTuple: [ParamValue]; params: {'packageId': ParamValue} }
    'api.reviews.disputes.comments.index': { paramsTuple: [ParamValue]; params: {'disputeId': ParamValue} }
    'api.reviews.disputes.evidences.index': { paramsTuple: [ParamValue]; params: {'disputeId': ParamValue} }
    'api.sprint_review_packages.show': { paramsTuple: [ParamValue]; params: {'packageId': ParamValue} }
    'api.v1.me.organizations.current.reverse_reviews.index': { paramsTuple?: []; params?: {} }
    'api.v1.me.organizations.current.reviews.disputes.index': { paramsTuple?: []; params?: {} }
    'admin.reverse_reviews.index': { paramsTuple?: []; params?: {} }
    'admin.flagged_reviews.index': { paramsTuple?: []; params?: {} }
    'api.admin.reverse_reviews.index': { paramsTuple?: []; params?: {} }
    'api.admin.reviews.disputes.index': { paramsTuple?: []; params?: {} }
    'api.admin.reviews.disputes.show': { paramsTuple: [ParamValue]; params: {'disputeId': ParamValue} }
    'api.admin.reviews.disputes.case_files.index': { paramsTuple: [ParamValue]; params: {'disputeId': ParamValue} }
    'api.admin.reviews.disputes.ai_evaluations.index': { paramsTuple: [ParamValue]; params: {'disputeId': ParamValue} }
    'api.v1.me.organizations.current.task_statuses.alias.index': { paramsTuple?: []; params?: {} }
    'api.v1.me.organizations.current.reverse_reviews.alias.index': { paramsTuple?: []; params?: {} }
    'api.v1.me.organizations.current.reviews.disputes.alias.index': { paramsTuple?: []; params?: {} }
    'api.v1.me.organizations.current.talents.search.alias.index': { paramsTuple?: []; params?: {} }
    'api.v1.me.organizations.current.talents.alias.show': { paramsTuple: [ParamValue]; params: {'userId': ParamValue} }
    'api.organizations.members.alias.index': { paramsTuple: [ParamValue]; params: {'organizationId': ParamValue} }
    'api.me.organizations.current.users.alias.index': { paramsTuple?: []; params?: {} }
    'api.v1.organizations.members.alias.index': { paramsTuple: [ParamValue]; params: {'organizationId': ParamValue} }
    'api.v1.me.organizations.current.users.alias.index': { paramsTuple?: []; params?: {} }
    'api.users.pending_approvals.alias.index': { paramsTuple?: []; params?: {} }
    'api.users.pending_approvals.count.alias.show': { paramsTuple?: []; params?: {} }
    'api.v1.users.pending_approvals.alias.index': { paramsTuple?: []; params?: {} }
    'api.v1.users.pending_approvals.count.alias.show': { paramsTuple?: []; params?: {} }
    'api.tasks.creation_access.alias.show': { paramsTuple?: []; params?: {} }
    'api.tasks.status_groups.alias.index': { paramsTuple?: []; params?: {} }
    'api.tasks.timeline_items.alias.index': { paramsTuple?: []; params?: {} }
    'api.v1.tasks.creation_access.alias.show': { paramsTuple?: []; params?: {} }
    'api.v1.tasks.status_groups.alias.index': { paramsTuple?: []; params?: {} }
    'api.v1.tasks.timeline_items.alias.index': { paramsTuple?: []; params?: {} }
    'api.me.organizations.current.talents.search.alias.index': { paramsTuple?: []; params?: {} }
    'api.me.organizations.current.talents.alias.show': { paramsTuple: [ParamValue]; params: {'userId': ParamValue} }
    'api.me.organizations.current.reverse_reviews.alias.index': { paramsTuple?: []; params?: {} }
    'api.me.organizations.current.reviews.disputes.alias.index': { paramsTuple?: []; params?: {} }
    'api.recruiters.bookmarks.index': { paramsTuple?: []; params?: {} }
    'search.index': { paramsTuple?: []; params?: {} }
    'dashboard.show': { paramsTuple?: []; params?: {} }
    'health_checks': { paramsTuple?: []; params?: {} }
  }
  HEAD: {
    'admin.dashboard.show': { paramsTuple?: []; params?: {} }
    'admin.dashboard.users': { paramsTuple?: []; params?: {} }
    'admin.dashboard.operations': { paramsTuple?: []; params?: {} }
    'admin.dashboard.subscriptions': { paramsTuple?: []; params?: {} }
    'admin.users.index': { paramsTuple?: []; params?: {} }
    'admin.users.show': { paramsTuple: [ParamValue]; params: {'userId': ParamValue} }
    'admin.organizations.index': { paramsTuple?: []; params?: {} }
    'admin.organizations.show': { paramsTuple: [ParamValue]; params: {'organizationId': ParamValue} }
    'admin.audit_logs.index': { paramsTuple?: []; params?: {} }
    'admin.permissions.index': { paramsTuple?: []; params?: {} }
    'admin.permissions.system': { paramsTuple?: []; params?: {} }
    'admin.permissions.custom_roles.create': { paramsTuple?: []; params?: {} }
    'admin.permissions.custom_roles.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.permissions.organization': { paramsTuple?: []; params?: {} }
    'admin.permissions.project': { paramsTuple?: []; params?: {} }
    'admin.qr_codes.show': { paramsTuple?: []; params?: {} }
    'admin.proficiency.index': { paramsTuple?: []; params?: {} }
    'admin.proficiency.show': { paramsTuple: [ParamValue]; params: {'proficiencyScaleId': ParamValue} }
    'admin.proficiency.rubrics.show': { paramsTuple: [ParamValue]; params: {'skillId': ParamValue} }
    'admin.reviews.flagged': { paramsTuple?: []; params?: {} }
    'admin.reviews.show': { paramsTuple: [ParamValue]; params: {'flaggedReviewId': ParamValue} }
    'admin.disputes.index': { paramsTuple?: []; params?: {} }
    'admin.disputes.ai_operator.show': { paramsTuple?: []; params?: {} }
    'admin.disputes.show': { paramsTuple: [ParamValue]; params: {'disputeId': ParamValue} }
    'admin.packages.index': { paramsTuple?: []; params?: {} }
    'api.admin.dashboard.show': { paramsTuple?: []; params?: {} }
    'api.admin.users.index': { paramsTuple?: []; params?: {} }
    'api.admin.organizations.index': { paramsTuple?: []; params?: {} }
    'api.admin.audit_logs.index': { paramsTuple?: []; params?: {} }
    'org.dashboard': { paramsTuple?: []; params?: {} }
    'org.members.index': { paramsTuple?: []; params?: {} }
    'org.join_requests.index': { paramsTuple?: []; params?: {} }
    'org.invitations.index': { paramsTuple?: []; params?: {} }
    'org.settings.show': { paramsTuple?: []; params?: {} }
    'org.roles.index': { paramsTuple?: []; params?: {} }
    'org.permissions.index': { paramsTuple?: []; params?: {} }
    'org.departments.index': { paramsTuple?: []; params?: {} }
    'org.audit_logs.index': { paramsTuple?: []; params?: {} }
    'org.marketplace.tasks': { paramsTuple?: []; params?: {} }
    'org.sprints.index': { paramsTuple?: []; params?: {} }
    'org.projects.index': { paramsTuple?: []; params?: {} }
    'org.projects.create': { paramsTuple?: []; params?: {} }
    'org.projects.show': { paramsTuple: [ParamValue]; params: {'projectId': ParamValue} }
    'org.tasks.index': { paramsTuple?: []; params?: {} }
    'org.tasks.board': { paramsTuple?: []; params?: {} }
    'org.tasks.list': { paramsTuple?: []; params?: {} }
    'org.tasks.workflow': { paramsTuple?: []; params?: {} }
    'org.tasks.show': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'org.workflow.statuses': { paramsTuple?: []; params?: {} }
    'api.v1.me.organizations.current.task_statuses.index': { paramsTuple?: []; params?: {} }
    'marketplace.index': { paramsTuple?: []; params?: {} }
    'marketplace.talents.legacy': { paramsTuple?: []; params?: {} }
    'marketplace.bookmarks.legacy': { paramsTuple?: []; params?: {} }
    'marketplace.tasks': { paramsTuple?: []; params?: {} }
    'api.marketplace.tasks.index': { paramsTuple?: []; params?: {} }
    'api.v1.marketplace.tasks.index': { paramsTuple?: []; params?: {} }
    'api.v1.tasks.applications.match': { paramsTuple: [ParamValue,ParamValue]; params: {'taskId': ParamValue,'applicationId': ParamValue} }
    'api.v1.tasks.applications.ranking': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'me.applications.index': { paramsTuple?: []; params?: {} }
    'tasks.applications': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'api.tasks.applications.match': { paramsTuple: [ParamValue,ParamValue]; params: {'taskId': ParamValue,'applicationId': ParamValue} }
    'api.tasks.applications.ranking': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'api.v1.skills.skills.proficiency_scales.index': { paramsTuple?: []; params?: {} }
    'api.v1.skills.skills.proficiency_scales.show': { paramsTuple: [ParamValue]; params: {'proficiencyScaleId': ParamValue} }
    'api.v1.skills.skills.rubrics.show': { paramsTuple: [ParamValue]; params: {'skillId': ParamValue} }
    'api.v1.skills.skills.rubrics.index': { paramsTuple: [ParamValue]; params: {'skillId': ParamValue} }
    'api.v1.skills.index': { paramsTuple?: []; params?: {} }
    'api.v1.skills.role_templates.index': { paramsTuple?: []; params?: {} }
    'api.v1.skills.projects.skills.index': { paramsTuple: [ParamValue]; params: {'projectId': ParamValue} }
    'api.v1.skills.projects.roles.index': { paramsTuple: [ParamValue]; params: {'projectId': ParamValue} }
    'api.v1.skills.projects.roles.candidates': { paramsTuple: [ParamValue,ParamValue]; params: {'projectId': ParamValue,'roleId': ParamValue} }
    'api.v1.skills.projects.professional_roles.requirements.index': { paramsTuple: [ParamValue,ParamValue]; params: {'projectId': ParamValue,'roleId': ParamValue} }
    'api.v1.skills.projects.roles.requirements.index': { paramsTuple: [ParamValue,ParamValue]; params: {'projectId': ParamValue,'roleId': ParamValue} }
    'api.v1.tasks.requirements.index': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'api.v1.tasks.requirements.versions.index': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'error.not_found': { paramsTuple?: []; params?: {} }
    'error.server_error': { paramsTuple?: []; params?: {} }
    'error.forbidden': { paramsTuple?: []; params?: {} }
    'error.require_organization': { paramsTuple?: []; params?: {} }
    'social_auth.redirect': { paramsTuple: [ParamValue]; params: {'provider': ParamValue} }
    'social_auth.callback': { paramsTuple: [ParamValue]; params: {'provider': ParamValue} }
    'logout.show': { paramsTuple?: []; params?: {} }
    'auth.login': { paramsTuple?: []; params?: {} }
    'users.index': { paramsTuple?: []; params?: {} }
    'users.create': { paramsTuple?: []; params?: {} }
    'users.pending_approvals.index': { paramsTuple?: []; params?: {} }
    'users.show': { paramsTuple: [ParamValue]; params: {'userId': ParamValue} }
    'users.edit': { paramsTuple: [ParamValue]; params: {'userId': ParamValue} }
    'org.bookmarks': { paramsTuple?: []; params?: {} }
    'org.talents.index': { paramsTuple?: []; params?: {} }
    'org.talents.show': { paramsTuple: [ParamValue]; params: {'userId': ParamValue} }
    'profile.show': { paramsTuple?: []; params?: {} }
    'profile.edit': { paramsTuple?: []; params?: {} }
    'profile.invitations.index': { paramsTuple?: []; params?: {} }
    'profile.user.show': { paramsTuple: [ParamValue]; params: {'userId': ParamValue} }
    'profile.snapshots.current': { paramsTuple?: []; params?: {} }
    'api.me.profile_snapshots.current.show': { paramsTuple?: []; params?: {} }
    'profile.snapshots.history': { paramsTuple?: []; params?: {} }
    'api.me.profile_snapshots.index': { paramsTuple?: []; params?: {} }
    'api.users.pending_approvals.index': { paramsTuple?: []; params?: {} }
    'api.users.pending_approvals.count.show': { paramsTuple?: []; params?: {} }
    'api.users.system_users.index': { paramsTuple?: []; params?: {} }
    'api.talents.search.index': { paramsTuple?: []; params?: {} }
    'api.talent_bookmarks.index': { paramsTuple?: []; params?: {} }
    'api.recruiter_bookmarks.index': { paramsTuple?: []; params?: {} }
    'api.v1.users.pending_approvals.index': { paramsTuple?: []; params?: {} }
    'api.v1.users.pending_approvals.count.show': { paramsTuple?: []; params?: {} }
    'api.v1.users.system_users.index': { paramsTuple?: []; params?: {} }
    'api.v1.talents.search.index': { paramsTuple?: []; params?: {} }
    'api.v1.talent_bookmarks.index': { paramsTuple?: []; params?: {} }
    'api.v1.recruiter_bookmarks.index': { paramsTuple?: []; params?: {} }
    'api.v1.me.profile_snapshots.current.show': { paramsTuple?: []; params?: {} }
    'api.v1.me.profile_snapshots.index': { paramsTuple?: []; params?: {} }
    'api.v1.me.organizations.current.talents.search.index': { paramsTuple?: []; params?: {} }
    'api.v1.me.organizations.current.talents.show': { paramsTuple: [ParamValue]; params: {'userId': ParamValue} }
    'profile.snapshot.public': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'tasks.index': { paramsTuple?: []; params?: {} }
    'api.tasks.creation_access.show': { paramsTuple?: []; params?: {} }
    'api.tasks.status_groups.index': { paramsTuple?: []; params?: {} }
    'api.tasks.timeline_items.index': { paramsTuple?: []; params?: {} }
    'api.tasks.show': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'api.tasks.submission.show': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'api.task_submissions.evidences.index': { paramsTuple: [ParamValue]; params: {'submissionId': ParamValue} }
    'api.tasks.comments.index': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'api.tasks.attachments.index': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'api.v1.tasks.creation_access.show': { paramsTuple?: []; params?: {} }
    'api.v1.tasks.status_groups.index': { paramsTuple?: []; params?: {} }
    'api.v1.tasks.timeline_items.index': { paramsTuple?: []; params?: {} }
    'api.v1.tasks.show': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'api.v1.tasks.audit_logs.index': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'api.v1.tasks.submission.show': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'api.v1.task_submissions.evidences.index': { paramsTuple: [ParamValue]; params: {'submissionId': ParamValue} }
    'api.v1.tasks.comments.index': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'api.v1.tasks.attachments.index': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'tasks.create': { paramsTuple?: []; params?: {} }
    'api.task_statuses.index': { paramsTuple?: []; params?: {} }
    'api.workflow.index': { paramsTuple?: []; params?: {} }
    'marketplace.tasks': { paramsTuple?: []; params?: {} }
    'api.marketplace.tasks': { paramsTuple?: []; params?: {} }
    'settings.index': { paramsTuple?: []; params?: {} }
    'settings.profile': { paramsTuple?: []; params?: {} }
    'settings.account': { paramsTuple?: []; params?: {} }
    'settings.appearance': { paramsTuple?: []; params?: {} }
    'settings.display': { paramsTuple?: []; params?: {} }
    'settings.notifications': { paramsTuple?: []; params?: {} }
    'account.index': { paramsTuple?: []; params?: {} }
    'notifications.index': { paramsTuple?: []; params?: {} }
    'notifications.latest': { paramsTuple?: []; params?: {} }
    'api.v1.me.show': { paramsTuple?: []; params?: {} }
    'api.v1.me.settings.show': { paramsTuple?: []; params?: {} }
    'api.v1.notifications.index': { paramsTuple?: []; params?: {} }
    'api.v1.task_statuses.index': { paramsTuple?: []; params?: {} }
    'api.v1.task_statuses.show': { paramsTuple: [ParamValue]; params: {'taskStatusId': ParamValue} }
    'get_task_audit_logs': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api.projects.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'redis_list_keys': { paramsTuple?: []; params?: {} }
    'redis_get_cache': { paramsTuple: [ParamValue]; params: {'key': ParamValue} }
    'api.organizations.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'get_organization_members_api': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'get_me_api': { paramsTuple?: []; params?: {} }
    'get_users_in_organization_api': { paramsTuple?: []; params?: {} }
    'debug_organization_info_api': { paramsTuple?: []; params?: {} }
    'organizations.all': { paramsTuple?: []; params?: {} }
    'api.organizations.list': { paramsTuple?: []; params?: {} }
    'organizations.debug': { paramsTuple?: []; params?: {} }
    'organizations.join': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'organizations.index': { paramsTuple?: []; params?: {} }
    'organizations.create': { paramsTuple?: []; params?: {} }
    'organizations.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'organizations.members.index': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'organizations.members.pending_requests': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'organizations.switch.redirect': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'projects.index': { paramsTuple?: []; params?: {} }
    'projects.create': { paramsTuple?: []; params?: {} }
    'projects.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'projects.member_candidates': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'reviews.pending': { paramsTuple?: []; params?: {} }
    'reviews.reverse_reviews': { paramsTuple?: []; params?: {} }
    'org.reverse_reviews': { paramsTuple?: []; params?: {} }
    'reviews.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'reviews.disputes.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'reviews.evidences.list': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'reviews.self_assessment.get': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api.me.reverse_reviews.list': { paramsTuple?: []; params?: {} }
    'api.org.reverse_reviews.list': { paramsTuple?: []; params?: {} }
    'api.reviews.disputes.comments.list': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api.reviews.disputes.evidences.list': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'reviews.mine': { paramsTuple?: []; params?: {} }
    'users.reviews': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.reverse_reviews': { paramsTuple?: []; params?: {} }
    'api.admin.reverse_reviews.list': { paramsTuple?: []; params?: {} }
    'api.admin.reviews.disputes.list': { paramsTuple?: []; params?: {} }
    'api.admin.reviews.disputes.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api.admin.reviews.disputes.case_files.list': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api.admin.reviews.disputes.ai_evaluations.list': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.flagged_reviews': { paramsTuple?: []; params?: {} }
    'health_checks': { paramsTuple?: []; params?: {} }
  }
  PUT: {
    'admin.users.updateRole': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.users.suspend': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.users.activate': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.reviews.resolve': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.packages.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'org.members.updateRole': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'org.requests.approve': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'org.settings.update': { paramsTuple?: []; params?: {} }
    'org.roles.update': { paramsTuple?: []; params?: {} }
    'api.v1.skills.projects.skills.update': { paramsTuple: [ParamValue,ParamValue]; params: {'projectId': ParamValue,'projectSkillId': ParamValue} }
    'api.v1.skills.projects.roles.skills.update': { paramsTuple: [ParamValue,ParamValue,ParamValue]; params: {'projectId': ParamValue,'roleId': ParamValue,'roleSkillId': ParamValue} }
    'api.v1.tasks.requirements.tasks.requirements.update': { paramsTuple: [ParamValue,ParamValue]; params: {'taskId': ParamValue,'requirementId': ParamValue} }
    'users.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'users.approve': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'users.update_role': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'profile.updateDetails': { paramsTuple?: []; params?: {} }
    'profile.skills.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'profile.update_settings': { paramsTuple?: []; params?: {} }
    'tasks.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'tasks.update.status': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api.task_statuses.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api.workflow.update': { paramsTuple?: []; params?: {} }
    'settings.update': { paramsTuple?: []; params?: {} }
    'api.projects.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api.organizations.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'projects.members.update': { paramsTuple: [ParamValue]; params: {'userId': ParamValue} }
  }
  DELETE: {
    'org.members.remove': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api.v1.skills.projects.skills.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'projectId': ParamValue,'projectSkillId': ParamValue} }
    'api.v1.skills.projects.roles.skills.destroy': { paramsTuple: [ParamValue,ParamValue,ParamValue]; params: {'projectId': ParamValue,'roleId': ParamValue,'roleSkillId': ParamValue} }
    'api.v1.skills.projects.roles.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'projectId': ParamValue,'roleId': ParamValue} }
    'api.v1.tasks.requirements.tasks.requirements.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'taskId': ParamValue,'requirementId': ParamValue} }
    'users.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api.recruiter_bookmarks.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api.recruiters.bookmarks.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api.org.talents.bookmarks.destroy': { paramsTuple: [ParamValue]; params: {'userId': ParamValue} }
    'profile.skills.remove': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api.task_submissions.evidences.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'submissionId': ParamValue,'evidenceId': ParamValue} }
    'api.tasks.comments.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'taskId': ParamValue,'commentId': ParamValue} }
    'api.tasks.attachments.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'taskId': ParamValue,'attachmentId': ParamValue} }
    'tasks.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api.task_statuses.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'account.destroy': { paramsTuple?: []; params?: {} }
    'notifications.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'notifications.destroy_all_read': { paramsTuple?: []; params?: {} }
    'api.v1.notifications.destroy_read': { paramsTuple?: []; params?: {} }
    'api.v1.notifications.destroy': { paramsTuple: [ParamValue]; params: {'notificationId': ParamValue} }
    'task_statuses.destroy': { paramsTuple: [ParamValue]; params: {'taskStatusId': ParamValue} }
    'api.projects.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'redis_clear_cache': { paramsTuple: [ParamValue]; params: {'key': ParamValue} }
    'redis_flush_cache': { paramsTuple?: []; params?: {} }
    'api.organizations.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'organizations.members.remove': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'userId': ParamValue} }
    'organizations.users.remove': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'projects.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'projects.members.remove': { paramsTuple: [ParamValue]; params: {'userId': ParamValue} }
  }
  PATCH: {
    'api.recruiter_bookmarks.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api.recruiters.bookmarks.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'profile.snapshots.access': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api.me.profile_snapshots.access': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api.tasks.batch_status': { paramsTuple?: []; params?: {} }
    'api.tasks.status_board': { paramsTuple?: []; params?: {} }
    'api.tasks.sort_order': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api.tasks.submission.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api.tasks.comments.update': { paramsTuple: [ParamValue,ParamValue]; params: {'taskId': ParamValue,'commentId': ParamValue} }
    'tasks.update.time': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api.v1.me.settings.update': { paramsTuple?: []; params?: {} }
    'task_statuses.update': { paramsTuple: [ParamValue]; params: {'taskStatusId': ParamValue} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}