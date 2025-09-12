import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
    'admin.toggle': { paramsTuple?: []; params?: {} }
    'admin.dashboard': { paramsTuple?: []; params?: {} }
    'admin.dashboard.users': { paramsTuple?: []; params?: {} }
    'admin.dashboard.operations': { paramsTuple?: []; params?: {} }
    'admin.dashboard.subscriptions': { paramsTuple?: []; params?: {} }
    'admin.users.index': { paramsTuple?: []; params?: {} }
    'admin.users.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.users.updateRole': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.users.suspend': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.users.activate': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.organizations.index': { paramsTuple?: []; params?: {} }
    'admin.organizations.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.auditLogs': { paramsTuple?: []; params?: {} }
    'admin.permissions': { paramsTuple?: []; params?: {} }
    'admin.qrCodes': { paramsTuple?: []; params?: {} }
    'admin.reviews.flagged': { paramsTuple?: []; params?: {} }
    'admin.reviews.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.reviews.resolve': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.disputes.index': { paramsTuple?: []; params?: {} }
    'admin.disputes.ai_operator': { paramsTuple?: []; params?: {} }
    'admin.disputes.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.packages.index': { paramsTuple?: []; params?: {} }
    'admin.packages.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api.admin.dashboard': { paramsTuple?: []; params?: {} }
    'api.admin.users': { paramsTuple?: []; params?: {} }
    'api.admin.organizations': { paramsTuple?: []; params?: {} }
    'api.admin.audit_logs': { paramsTuple?: []; params?: {} }
    'org.dashboard': { paramsTuple?: []; params?: {} }
    'org.members.index': { paramsTuple?: []; params?: {} }
    'org.members.invite': { paramsTuple?: []; params?: {} }
    'org.members.remove': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'org.members.updateRole': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'org.requests.index': { paramsTuple?: []; params?: {} }
    'org.requests.approve': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'org.invitations.index': { paramsTuple?: []; params?: {} }
    'org.settings.show': { paramsTuple?: []; params?: {} }
    'org.settings.update': { paramsTuple?: []; params?: {} }
    'org.roles.index': { paramsTuple?: []; params?: {} }
    'org.roles.update': { paramsTuple?: []; params?: {} }
    'org.permissions.index': { paramsTuple?: []; params?: {} }
    'org.departments.index': { paramsTuple?: []; params?: {} }
    'org.projects.index': { paramsTuple?: []; params?: {} }
    'org.projects.create': { paramsTuple?: []; params?: {} }
    'org.projects.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'org.tasks.index': { paramsTuple?: []; params?: {} }
    'org.tasks.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'org.workflow.statuses': { paramsTuple?: []; params?: {} }
    'org.workflow.createStatus': { paramsTuple?: []; params?: {} }
    'error.not_found': { paramsTuple?: []; params?: {} }
    'error.server_error': { paramsTuple?: []; params?: {} }
    'error.forbidden': { paramsTuple?: []; params?: {} }
    'error.require_organization': { paramsTuple?: []; params?: {} }
    'api.v1.skills.skills.proficiency_scales.index': { paramsTuple?: []; params?: {} }
    'api.v1.skills.skills.proficiency_scales.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api.v1.skills.skills.rubrics.show': { paramsTuple: [ParamValue]; params: {'skillId': ParamValue} }
    'api.v1.skills.skills.rubrics.index': { paramsTuple: [ParamValue]; params: {'skillId': ParamValue} }
    'api.v1.skills.skills.list_active': { paramsTuple?: []; params?: {} }
    'api.v1.skills.skills.role_templates.list_active': { paramsTuple?: []; params?: {} }
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
    'api.v1.skills.projects.roles.requirements': { paramsTuple: [ParamValue,ParamValue]; params: {'projectId': ParamValue,'roleId': ParamValue} }
    'api.v1.tasks.requirements.tasks.requirements.index': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'api.v1.tasks.requirements.tasks.requirements.store': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'api.v1.tasks.requirements.tasks.requirements.prefill': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'api.v1.tasks.requirements.tasks.requirements.versions': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'api.v1.tasks.requirements.tasks.requirements.update': { paramsTuple: [ParamValue,ParamValue]; params: {'taskId': ParamValue,'requirementId': ParamValue} }
    'api.v1.tasks.requirements.tasks.requirements.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'taskId': ParamValue,'requirementId': ParamValue} }
    'social_auth.redirect': { paramsTuple: [ParamValue]; params: {'provider': ParamValue} }
    'social_auth.callback': { paramsTuple: [ParamValue]; params: {'provider': ParamValue} }
    'logout': { paramsTuple?: []; params?: {} }
    'logout.show': { paramsTuple?: []; params?: {} }
    'auth.login': { paramsTuple?: []; params?: {} }
    'users.index': { paramsTuple?: []; params?: {} }
    'users.create': { paramsTuple?: []; params?: {} }
    'users.pending_approval': { paramsTuple?: []; params?: {} }
    'users.store': { paramsTuple?: []; params?: {} }
    'users.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'users.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'users.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'users.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'users.approve': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'users.update_role': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'marketplace.talents': { paramsTuple?: []; params?: {} }
    'marketplace.bookmarks': { paramsTuple?: []; params?: {} }
    'api.users.pending_approval': { paramsTuple?: []; params?: {} }
    'api.users.pending_approval_count': { paramsTuple?: []; params?: {} }
    'api.users.system_users': { paramsTuple?: []; params?: {} }
    'api.talents.search': { paramsTuple?: []; params?: {} }
    'api.org.talents.search': { paramsTuple?: []; params?: {} }
    'api.org.talents.show': { paramsTuple: [ParamValue]; params: {'userId': ParamValue} }
    'api.recruiter_bookmarks.index': { paramsTuple?: []; params?: {} }
    'api.recruiter_bookmarks.store': { paramsTuple?: []; params?: {} }
    'api.recruiter_bookmarks.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api.recruiter_bookmarks.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api.recruiters.bookmarks.index': { paramsTuple?: []; params?: {} }
    'api.recruiters.bookmarks.store': { paramsTuple?: []; params?: {} }
    'api.recruiters.bookmarks.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api.recruiters.bookmarks.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api.org.talents.bookmarks.store': { paramsTuple: [ParamValue]; params: {'userId': ParamValue} }
    'api.org.talents.bookmarks.destroy': { paramsTuple: [ParamValue]; params: {'userId': ParamValue} }
    'profile.show': { paramsTuple?: []; params?: {} }
    'profile.edit': { paramsTuple?: []; params?: {} }
    'profile.updateDetails': { paramsTuple?: []; params?: {} }
    'profile.skills.add': { paramsTuple?: []; params?: {} }
    'profile.skills.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'profile.skills.remove': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'profile.viewUser': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'profile.snapshots.publish': { paramsTuple?: []; params?: {} }
    'api.me.profile_snapshots.publish': { paramsTuple?: []; params?: {} }
    'profile.snapshots.current': { paramsTuple?: []; params?: {} }
    'api.me.profile_snapshots.current': { paramsTuple?: []; params?: {} }
    'profile.snapshots.history': { paramsTuple?: []; params?: {} }
    'api.me.profile_snapshots.index': { paramsTuple?: []; params?: {} }
    'profile.snapshots.access': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api.me.profile_snapshots.access': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'profile.snapshots.rotate_link': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api.me.profile_snapshots.rotate_link': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'profile.update_settings': { paramsTuple?: []; params?: {} }
    'profile.snapshot.public': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'tasks.index': { paramsTuple?: []; params?: {} }
    'api.tasks.check_create_permission': { paramsTuple?: []; params?: {} }
    'api.tasks.grouped': { paramsTuple?: []; params?: {} }
    'api.tasks.timeline': { paramsTuple?: []; params?: {} }
    'api.tasks.batch_status': { paramsTuple?: []; params?: {} }
    'api.tasks.status_board': { paramsTuple?: []; params?: {} }
    'api.tasks.sort_order': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api.tasks.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api.tasks.submission.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api.tasks.submission.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api.tasks.submission.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api.tasks.submission.submit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api.tasks.submission.lock': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
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
    'tasks.create': { paramsTuple?: []; params?: {} }
    'tasks.status_board': { paramsTuple?: []; params?: {} }
    'tasks.store': { paramsTuple?: []; params?: {} }
    'tasks.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'tasks.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'tasks.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'tasks.update.status': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'tasks.update.time': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'tasks.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'tasks.audit_logs': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'tasks.applications': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'tasks.apply': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'api.tasks.applications.match': { paramsTuple: [ParamValue,ParamValue]; params: {'taskId': ParamValue,'applicationId': ParamValue} }
    'api.tasks.applications.ranking': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'applications.process': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'applications.withdraw': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'applications.mine': { paramsTuple?: []; params?: {} }
    'api.task_statuses.index': { paramsTuple?: []; params?: {} }
    'api.workflow.index': { paramsTuple?: []; params?: {} }
    'api.task_statuses.store': { paramsTuple?: []; params?: {} }
    'api.task_statuses.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api.task_statuses.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api.workflow.update': { paramsTuple?: []; params?: {} }
    'marketplace.tasks': { paramsTuple?: []; params?: {} }
    'api.marketplace.tasks': { paramsTuple?: []; params?: {} }
    'api.tasks.apply': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'settings.index': { paramsTuple?: []; params?: {} }
    'settings.update': { paramsTuple?: []; params?: {} }
    'settings.profile': { paramsTuple?: []; params?: {} }
    'settings.profile.update': { paramsTuple?: []; params?: {} }
    'settings.account': { paramsTuple?: []; params?: {} }
    'settings.account.update': { paramsTuple?: []; params?: {} }
    'settings.appearance': { paramsTuple?: []; params?: {} }
    'settings.appearance.update': { paramsTuple?: []; params?: {} }
    'settings.display': { paramsTuple?: []; params?: {} }
    'settings.display.update': { paramsTuple?: []; params?: {} }
    'settings.notifications': { paramsTuple?: []; params?: {} }
    'settings.notifications.update': { paramsTuple?: []; params?: {} }
    'account.index': { paramsTuple?: []; params?: {} }
    'account.destroy': { paramsTuple?: []; params?: {} }
    'notifications.index': { paramsTuple?: []; params?: {} }
    'notifications.latest': { paramsTuple?: []; params?: {} }
    'notifications.mark_as_read': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'notifications.mark_all_as_read': { paramsTuple?: []; params?: {} }
    'notifications.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'notifications.destroy_all_read': { paramsTuple?: []; params?: {} }
    'api.v1.me.show': { paramsTuple?: []; params?: {} }
    'api.v1.me.settings.show': { paramsTuple?: []; params?: {} }
    'api.v1.me.settings.update': { paramsTuple?: []; params?: {} }
    'api.v1.notifications.index': { paramsTuple?: []; params?: {} }
    'api.v1.notifications.read_all': { paramsTuple?: []; params?: {} }
    'api.v1.notifications.read': { paramsTuple: [ParamValue]; params: {'notificationId': ParamValue} }
    'api.v1.notifications.destroy_read': { paramsTuple?: []; params?: {} }
    'api.v1.notifications.destroy': { paramsTuple: [ParamValue]; params: {'notificationId': ParamValue} }
    'api.v1.task_statuses.index': { paramsTuple?: []; params?: {} }
    'api.v1.task_statuses.show': { paramsTuple: [ParamValue]; params: {'taskStatusId': ParamValue} }
    'task_statuses.store': { paramsTuple?: []; params?: {} }
    'task_statuses.update': { paramsTuple: [ParamValue]; params: {'taskStatusId': ParamValue} }
    'task_statuses.destroy': { paramsTuple: [ParamValue]; params: {'taskStatusId': ParamValue} }
    'get_task_audit_logs': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api.projects.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api.projects.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api.projects.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'redis_list_keys': { paramsTuple?: []; params?: {} }
    'redis_set_cache': { paramsTuple?: []; params?: {} }
    'redis_get_cache': { paramsTuple: [ParamValue]; params: {'key': ParamValue} }
    'redis_clear_cache': { paramsTuple: [ParamValue]; params: {'key': ParamValue} }
    'redis_flush_cache': { paramsTuple?: []; params?: {} }
    'api.organizations.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api.organizations.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api.organizations.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'get_organization_members_api': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'get_me_api': { paramsTuple?: []; params?: {} }
    'get_users_in_organization_api': { paramsTuple?: []; params?: {} }
    'debug_organization_info_api': { paramsTuple?: []; params?: {} }
    'organizations.all': { paramsTuple?: []; params?: {} }
    'api.organizations.list': { paramsTuple?: []; params?: {} }
    'organizations.debug': { paramsTuple?: []; params?: {} }
    'organizations.join': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'organizations.join.post': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'organizations.index': { paramsTuple?: []; params?: {} }
    'organizations.create': { paramsTuple?: []; params?: {} }
    'organizations.store': { paramsTuple?: []; params?: {} }
    'organizations.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'organizations.switch': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'organizations.members.index': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'organizations.members.pending_requests': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'organizations.members.add': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'organizations.members.invite': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'organizations.members.add_direct': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'organizations.members.process_request': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'userId': ParamValue} }
    'organizations.members.update_role': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'userId': ParamValue} }
    'organizations.members.remove': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'userId': ParamValue} }
    'organizations.switch.redirect': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'organizations.users.remove': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'organizations.users.add': { paramsTuple?: []; params?: {} }
    'organizations.switch.api': { paramsTuple?: []; params?: {} }
    'projects.index': { paramsTuple?: []; params?: {} }
    'projects.switch': { paramsTuple?: []; params?: {} }
    'projects.create': { paramsTuple?: []; params?: {} }
    'projects.store': { paramsTuple?: []; params?: {} }
    'projects.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'projects.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'projects.members.add': { paramsTuple?: []; params?: {} }
    'projects.members.update': { paramsTuple: [ParamValue]; params: {'userId': ParamValue} }
    'projects.members.remove': { paramsTuple: [ParamValue]; params: {'userId': ParamValue} }
    'projects.member_candidates': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'reviews.pending': { paramsTuple?: []; params?: {} }
    'reviews.reverse_reviews': { paramsTuple?: []; params?: {} }
    'org.reverse_reviews': { paramsTuple?: []; params?: {} }
    'reviews.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'reviews.submit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'reviews.confirm': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'reviews.disputes.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'reviews.evidences.list': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'reviews.evidences.add': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'reviews.self_assessment.get': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'reviews.self_assessment.upsert': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'reviews.reverse': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api.review_sessions.reverse_reviews.create': { paramsTuple: [ParamValue]; params: {'sessionId': ParamValue} }
    'api.me.reverse_reviews.list': { paramsTuple?: []; params?: {} }
    'api.org.reverse_reviews.list': { paramsTuple?: []; params?: {} }
    'api.reviews.disputes.create': { paramsTuple?: []; params?: {} }
    'api.reviews.disputes.comments.list': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api.reviews.disputes.comments.create': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api.reviews.disputes.evidences.list': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api.reviews.disputes.evidences.create': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api.org.reviews.disputes.respond': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'reviews.mine': { paramsTuple?: []; params?: {} }
    'users.reviews': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api.reviews.sessions.create': { paramsTuple?: []; params?: {} }
    'admin.reverse_reviews': { paramsTuple?: []; params?: {} }
    'api.admin.reverse_reviews.list': { paramsTuple?: []; params?: {} }
    'api.admin.reviews.disputes.list': { paramsTuple?: []; params?: {} }
    'api.admin.reviews.disputes.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api.admin.reviews.disputes.resolve': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api.admin.reviews.disputes.case_files.list': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api.admin.reviews.disputes.case_files.create': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api.admin.reviews.disputes.ai_evaluations.list': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api.admin.reviews.disputes.ai_evaluations.create': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.flagged_reviews': { paramsTuple?: []; params?: {} }
    'admin.flagged_reviews.resolve': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api.public.ai_disputes.callback': { paramsTuple?: []; params?: {} }
    'api.public.ai.dispute_evaluations.callback.legacy': { paramsTuple?: []; params?: {} }
    'health_checks': { paramsTuple?: []; params?: {} }
    'dev.restart': { paramsTuple?: []; params?: {} }
  }
  POST: {
    'admin.toggle': { paramsTuple?: []; params?: {} }
    'org.members.invite': { paramsTuple?: []; params?: {} }
    'org.projects.create': { paramsTuple?: []; params?: {} }
    'org.workflow.createStatus': { paramsTuple?: []; params?: {} }
    'api.v1.skills.projects.skills.store': { paramsTuple: [ParamValue]; params: {'projectId': ParamValue} }
    'api.v1.skills.projects.roles.store': { paramsTuple: [ParamValue]; params: {'projectId': ParamValue} }
    'api.v1.skills.projects.roles.skills.store': { paramsTuple: [ParamValue,ParamValue]; params: {'projectId': ParamValue,'roleId': ParamValue} }
    'api.v1.tasks.requirements.tasks.requirements.store': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'api.v1.tasks.requirements.tasks.requirements.prefill': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'logout': { paramsTuple?: []; params?: {} }
    'users.store': { paramsTuple?: []; params?: {} }
    'api.recruiter_bookmarks.store': { paramsTuple?: []; params?: {} }
    'api.recruiters.bookmarks.store': { paramsTuple?: []; params?: {} }
    'api.org.talents.bookmarks.store': { paramsTuple: [ParamValue]; params: {'userId': ParamValue} }
    'profile.skills.add': { paramsTuple?: []; params?: {} }
    'profile.snapshots.publish': { paramsTuple?: []; params?: {} }
    'api.me.profile_snapshots.publish': { paramsTuple?: []; params?: {} }
    'profile.snapshots.rotate_link': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api.me.profile_snapshots.rotate_link': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api.tasks.submission.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api.tasks.submission.submit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api.tasks.submission.lock': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api.task_submissions.evidences.store': { paramsTuple: [ParamValue]; params: {'submissionId': ParamValue} }
    'api.tasks.comments.store': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'api.tasks.attachments.store': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'tasks.store': { paramsTuple?: []; params?: {} }
    'tasks.apply': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'applications.process': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'applications.withdraw': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api.task_statuses.store': { paramsTuple?: []; params?: {} }
    'api.tasks.apply': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'settings.profile.update': { paramsTuple?: []; params?: {} }
    'settings.account.update': { paramsTuple?: []; params?: {} }
    'settings.appearance.update': { paramsTuple?: []; params?: {} }
    'settings.display.update': { paramsTuple?: []; params?: {} }
    'settings.notifications.update': { paramsTuple?: []; params?: {} }
    'notifications.mark_as_read': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'notifications.mark_all_as_read': { paramsTuple?: []; params?: {} }
    'api.v1.notifications.read_all': { paramsTuple?: []; params?: {} }
    'api.v1.notifications.read': { paramsTuple: [ParamValue]; params: {'notificationId': ParamValue} }
    'task_statuses.store': { paramsTuple?: []; params?: {} }
    'redis_set_cache': { paramsTuple?: []; params?: {} }
    'organizations.join.post': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'organizations.store': { paramsTuple?: []; params?: {} }
    'organizations.switch': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'organizations.members.add': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'organizations.members.invite': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'organizations.members.add_direct': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'organizations.members.process_request': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'userId': ParamValue} }
    'organizations.members.update_role': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'userId': ParamValue} }
    'organizations.users.add': { paramsTuple?: []; params?: {} }
    'organizations.switch.api': { paramsTuple?: []; params?: {} }
    'projects.switch': { paramsTuple?: []; params?: {} }
    'projects.store': { paramsTuple?: []; params?: {} }
    'projects.members.add': { paramsTuple?: []; params?: {} }
    'reviews.submit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'reviews.confirm': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'reviews.evidences.add': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'reviews.self_assessment.upsert': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'reviews.reverse': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api.review_sessions.reverse_reviews.create': { paramsTuple: [ParamValue]; params: {'sessionId': ParamValue} }
    'api.reviews.disputes.create': { paramsTuple?: []; params?: {} }
    'api.reviews.disputes.comments.create': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api.reviews.disputes.evidences.create': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api.org.reviews.disputes.respond': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api.reviews.sessions.create': { paramsTuple?: []; params?: {} }
    'api.admin.reviews.disputes.resolve': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api.admin.reviews.disputes.case_files.create': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api.admin.reviews.disputes.ai_evaluations.create': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.flagged_reviews.resolve': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api.public.ai_disputes.callback': { paramsTuple?: []; params?: {} }
    'api.public.ai.dispute_evaluations.callback.legacy': { paramsTuple?: []; params?: {} }
    'dev.restart': { paramsTuple?: []; params?: {} }
  }
  GET: {
    'admin.dashboard': { paramsTuple?: []; params?: {} }
    'admin.dashboard.users': { paramsTuple?: []; params?: {} }
    'admin.dashboard.operations': { paramsTuple?: []; params?: {} }
    'admin.dashboard.subscriptions': { paramsTuple?: []; params?: {} }
    'admin.users.index': { paramsTuple?: []; params?: {} }
    'admin.users.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.organizations.index': { paramsTuple?: []; params?: {} }
    'admin.organizations.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.auditLogs': { paramsTuple?: []; params?: {} }
    'admin.permissions': { paramsTuple?: []; params?: {} }
    'admin.qrCodes': { paramsTuple?: []; params?: {} }
    'admin.reviews.flagged': { paramsTuple?: []; params?: {} }
    'admin.reviews.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.disputes.index': { paramsTuple?: []; params?: {} }
    'admin.disputes.ai_operator': { paramsTuple?: []; params?: {} }
    'admin.disputes.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.packages.index': { paramsTuple?: []; params?: {} }
    'api.admin.dashboard': { paramsTuple?: []; params?: {} }
    'api.admin.users': { paramsTuple?: []; params?: {} }
    'api.admin.organizations': { paramsTuple?: []; params?: {} }
    'api.admin.audit_logs': { paramsTuple?: []; params?: {} }
    'org.dashboard': { paramsTuple?: []; params?: {} }
    'org.members.index': { paramsTuple?: []; params?: {} }
    'org.requests.index': { paramsTuple?: []; params?: {} }
    'org.invitations.index': { paramsTuple?: []; params?: {} }
    'org.settings.show': { paramsTuple?: []; params?: {} }
    'org.roles.index': { paramsTuple?: []; params?: {} }
    'org.permissions.index': { paramsTuple?: []; params?: {} }
    'org.departments.index': { paramsTuple?: []; params?: {} }
    'org.projects.index': { paramsTuple?: []; params?: {} }
    'org.projects.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'org.tasks.index': { paramsTuple?: []; params?: {} }
    'org.tasks.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'org.workflow.statuses': { paramsTuple?: []; params?: {} }
    'error.not_found': { paramsTuple?: []; params?: {} }
    'error.server_error': { paramsTuple?: []; params?: {} }
    'error.forbidden': { paramsTuple?: []; params?: {} }
    'error.require_organization': { paramsTuple?: []; params?: {} }
    'api.v1.skills.skills.proficiency_scales.index': { paramsTuple?: []; params?: {} }
    'api.v1.skills.skills.proficiency_scales.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api.v1.skills.skills.rubrics.show': { paramsTuple: [ParamValue]; params: {'skillId': ParamValue} }
    'api.v1.skills.skills.rubrics.index': { paramsTuple: [ParamValue]; params: {'skillId': ParamValue} }
    'api.v1.skills.skills.list_active': { paramsTuple?: []; params?: {} }
    'api.v1.skills.skills.role_templates.list_active': { paramsTuple?: []; params?: {} }
    'api.v1.skills.projects.skills.index': { paramsTuple: [ParamValue]; params: {'projectId': ParamValue} }
    'api.v1.skills.projects.roles.index': { paramsTuple: [ParamValue]; params: {'projectId': ParamValue} }
    'api.v1.skills.projects.roles.candidates': { paramsTuple: [ParamValue,ParamValue]; params: {'projectId': ParamValue,'roleId': ParamValue} }
    'api.v1.skills.projects.roles.requirements': { paramsTuple: [ParamValue,ParamValue]; params: {'projectId': ParamValue,'roleId': ParamValue} }
    'api.v1.tasks.requirements.tasks.requirements.index': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'api.v1.tasks.requirements.tasks.requirements.versions': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'social_auth.redirect': { paramsTuple: [ParamValue]; params: {'provider': ParamValue} }
    'social_auth.callback': { paramsTuple: [ParamValue]; params: {'provider': ParamValue} }
    'logout.show': { paramsTuple?: []; params?: {} }
    'auth.login': { paramsTuple?: []; params?: {} }
    'users.index': { paramsTuple?: []; params?: {} }
    'users.create': { paramsTuple?: []; params?: {} }
    'users.pending_approval': { paramsTuple?: []; params?: {} }
    'users.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'users.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'marketplace.talents': { paramsTuple?: []; params?: {} }
    'marketplace.bookmarks': { paramsTuple?: []; params?: {} }
    'api.users.pending_approval': { paramsTuple?: []; params?: {} }
    'api.users.pending_approval_count': { paramsTuple?: []; params?: {} }
    'api.users.system_users': { paramsTuple?: []; params?: {} }
    'api.talents.search': { paramsTuple?: []; params?: {} }
    'api.org.talents.search': { paramsTuple?: []; params?: {} }
    'api.org.talents.show': { paramsTuple: [ParamValue]; params: {'userId': ParamValue} }
    'api.recruiter_bookmarks.index': { paramsTuple?: []; params?: {} }
    'api.recruiters.bookmarks.index': { paramsTuple?: []; params?: {} }
    'profile.show': { paramsTuple?: []; params?: {} }
    'profile.edit': { paramsTuple?: []; params?: {} }
    'profile.viewUser': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'profile.snapshots.current': { paramsTuple?: []; params?: {} }
    'api.me.profile_snapshots.current': { paramsTuple?: []; params?: {} }
    'profile.snapshots.history': { paramsTuple?: []; params?: {} }
    'api.me.profile_snapshots.index': { paramsTuple?: []; params?: {} }
    'profile.snapshot.public': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'tasks.index': { paramsTuple?: []; params?: {} }
    'api.tasks.check_create_permission': { paramsTuple?: []; params?: {} }
    'api.tasks.grouped': { paramsTuple?: []; params?: {} }
    'api.tasks.timeline': { paramsTuple?: []; params?: {} }
    'api.tasks.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api.tasks.submission.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api.task_submissions.evidences.index': { paramsTuple: [ParamValue]; params: {'submissionId': ParamValue} }
    'api.tasks.comments.index': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'api.tasks.attachments.index': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'tasks.create': { paramsTuple?: []; params?: {} }
    'tasks.status_board': { paramsTuple?: []; params?: {} }
    'tasks.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'tasks.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'tasks.audit_logs': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'tasks.applications': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'api.tasks.applications.match': { paramsTuple: [ParamValue,ParamValue]; params: {'taskId': ParamValue,'applicationId': ParamValue} }
    'api.tasks.applications.ranking': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'applications.mine': { paramsTuple?: []; params?: {} }
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
  HEAD: {
    'admin.dashboard': { paramsTuple?: []; params?: {} }
    'admin.dashboard.users': { paramsTuple?: []; params?: {} }
    'admin.dashboard.operations': { paramsTuple?: []; params?: {} }
    'admin.dashboard.subscriptions': { paramsTuple?: []; params?: {} }
    'admin.users.index': { paramsTuple?: []; params?: {} }
    'admin.users.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.organizations.index': { paramsTuple?: []; params?: {} }
    'admin.organizations.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.auditLogs': { paramsTuple?: []; params?: {} }
    'admin.permissions': { paramsTuple?: []; params?: {} }
    'admin.qrCodes': { paramsTuple?: []; params?: {} }
    'admin.reviews.flagged': { paramsTuple?: []; params?: {} }
    'admin.reviews.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.disputes.index': { paramsTuple?: []; params?: {} }
    'admin.disputes.ai_operator': { paramsTuple?: []; params?: {} }
    'admin.disputes.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.packages.index': { paramsTuple?: []; params?: {} }
    'api.admin.dashboard': { paramsTuple?: []; params?: {} }
    'api.admin.users': { paramsTuple?: []; params?: {} }
    'api.admin.organizations': { paramsTuple?: []; params?: {} }
    'api.admin.audit_logs': { paramsTuple?: []; params?: {} }
    'org.dashboard': { paramsTuple?: []; params?: {} }
    'org.members.index': { paramsTuple?: []; params?: {} }
    'org.requests.index': { paramsTuple?: []; params?: {} }
    'org.invitations.index': { paramsTuple?: []; params?: {} }
    'org.settings.show': { paramsTuple?: []; params?: {} }
    'org.roles.index': { paramsTuple?: []; params?: {} }
    'org.permissions.index': { paramsTuple?: []; params?: {} }
    'org.departments.index': { paramsTuple?: []; params?: {} }
    'org.projects.index': { paramsTuple?: []; params?: {} }
    'org.projects.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'org.tasks.index': { paramsTuple?: []; params?: {} }
    'org.tasks.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'org.workflow.statuses': { paramsTuple?: []; params?: {} }
    'error.not_found': { paramsTuple?: []; params?: {} }
    'error.server_error': { paramsTuple?: []; params?: {} }
    'error.forbidden': { paramsTuple?: []; params?: {} }
    'error.require_organization': { paramsTuple?: []; params?: {} }
    'api.v1.skills.skills.proficiency_scales.index': { paramsTuple?: []; params?: {} }
    'api.v1.skills.skills.proficiency_scales.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api.v1.skills.skills.rubrics.show': { paramsTuple: [ParamValue]; params: {'skillId': ParamValue} }
    'api.v1.skills.skills.rubrics.index': { paramsTuple: [ParamValue]; params: {'skillId': ParamValue} }
    'api.v1.skills.skills.list_active': { paramsTuple?: []; params?: {} }
    'api.v1.skills.skills.role_templates.list_active': { paramsTuple?: []; params?: {} }
    'api.v1.skills.projects.skills.index': { paramsTuple: [ParamValue]; params: {'projectId': ParamValue} }
    'api.v1.skills.projects.roles.index': { paramsTuple: [ParamValue]; params: {'projectId': ParamValue} }
    'api.v1.skills.projects.roles.candidates': { paramsTuple: [ParamValue,ParamValue]; params: {'projectId': ParamValue,'roleId': ParamValue} }
    'api.v1.skills.projects.roles.requirements': { paramsTuple: [ParamValue,ParamValue]; params: {'projectId': ParamValue,'roleId': ParamValue} }
    'api.v1.tasks.requirements.tasks.requirements.index': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'api.v1.tasks.requirements.tasks.requirements.versions': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'social_auth.redirect': { paramsTuple: [ParamValue]; params: {'provider': ParamValue} }
    'social_auth.callback': { paramsTuple: [ParamValue]; params: {'provider': ParamValue} }
    'logout.show': { paramsTuple?: []; params?: {} }
    'auth.login': { paramsTuple?: []; params?: {} }
    'users.index': { paramsTuple?: []; params?: {} }
    'users.create': { paramsTuple?: []; params?: {} }
    'users.pending_approval': { paramsTuple?: []; params?: {} }
    'users.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'users.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'marketplace.talents': { paramsTuple?: []; params?: {} }
    'marketplace.bookmarks': { paramsTuple?: []; params?: {} }
    'api.users.pending_approval': { paramsTuple?: []; params?: {} }
    'api.users.pending_approval_count': { paramsTuple?: []; params?: {} }
    'api.users.system_users': { paramsTuple?: []; params?: {} }
    'api.talents.search': { paramsTuple?: []; params?: {} }
    'api.org.talents.search': { paramsTuple?: []; params?: {} }
    'api.org.talents.show': { paramsTuple: [ParamValue]; params: {'userId': ParamValue} }
    'api.recruiter_bookmarks.index': { paramsTuple?: []; params?: {} }
    'api.recruiters.bookmarks.index': { paramsTuple?: []; params?: {} }
    'profile.show': { paramsTuple?: []; params?: {} }
    'profile.edit': { paramsTuple?: []; params?: {} }
    'profile.viewUser': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'profile.snapshots.current': { paramsTuple?: []; params?: {} }
    'api.me.profile_snapshots.current': { paramsTuple?: []; params?: {} }
    'profile.snapshots.history': { paramsTuple?: []; params?: {} }
    'api.me.profile_snapshots.index': { paramsTuple?: []; params?: {} }
    'profile.snapshot.public': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'tasks.index': { paramsTuple?: []; params?: {} }
    'api.tasks.check_create_permission': { paramsTuple?: []; params?: {} }
    'api.tasks.grouped': { paramsTuple?: []; params?: {} }
    'api.tasks.timeline': { paramsTuple?: []; params?: {} }
    'api.tasks.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api.tasks.submission.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api.task_submissions.evidences.index': { paramsTuple: [ParamValue]; params: {'submissionId': ParamValue} }
    'api.tasks.comments.index': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'api.tasks.attachments.index': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'tasks.create': { paramsTuple?: []; params?: {} }
    'tasks.status_board': { paramsTuple?: []; params?: {} }
    'tasks.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'tasks.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'tasks.audit_logs': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'tasks.applications': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'api.tasks.applications.match': { paramsTuple: [ParamValue,ParamValue]; params: {'taskId': ParamValue,'applicationId': ParamValue} }
    'api.tasks.applications.ranking': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'applications.mine': { paramsTuple?: []; params?: {} }
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