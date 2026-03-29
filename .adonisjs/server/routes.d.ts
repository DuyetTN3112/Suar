import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
    'admin.toggle': { paramsTuple?: []; params?: {} }
    'admin.dashboard': { paramsTuple?: []; params?: {} }
    'admin.users.index': { paramsTuple?: []; params?: {} }
    'admin.users.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.users.updateRole': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.users.suspend': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.organizations.index': { paramsTuple?: []; params?: {} }
    'admin.organizations.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.auditLogs': { paramsTuple?: []; params?: {} }
    'admin.reviews.flagged': { paramsTuple?: []; params?: {} }
    'admin.reviews.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.reviews.resolve': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.packages.index': { paramsTuple?: []; params?: {} }
    'admin.packages.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
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
    'org.projects.index': { paramsTuple?: []; params?: {} }
    'org.projects.create': { paramsTuple?: []; params?: {} }
    'org.workflow.statuses': { paramsTuple?: []; params?: {} }
    'org.workflow.createStatus': { paramsTuple?: []; params?: {} }
    'org.billing.show': { paramsTuple?: []; params?: {} }
    'org.billing.updatePlan': { paramsTuple?: []; params?: {} }
    'error.not_found': { paramsTuple?: []; params?: {} }
    'error.server_error': { paramsTuple?: []; params?: {} }
    'error.forbidden': { paramsTuple?: []; params?: {} }
    'error.require_organization': { paramsTuple?: []; params?: {} }
    'social_auth.redirect': { paramsTuple: [ParamValue]; params: {'provider': ParamValue} }
    'social_auth.callback': { paramsTuple: [ParamValue]; params: {'provider': ParamValue} }
    'logout': { paramsTuple?: []; params?: {} }
    'logout.show': { paramsTuple?: []; params?: {} }
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
    'api.users.pending_approval': { paramsTuple?: []; params?: {} }
    'api.users.pending_approval_count': { paramsTuple?: []; params?: {} }
    'api.users.system_users': { paramsTuple?: []; params?: {} }
    'profile.show': { paramsTuple?: []; params?: {} }
    'profile.edit': { paramsTuple?: []; params?: {} }
    'profile.updateDetails': { paramsTuple?: []; params?: {} }
    'profile.skills.add': { paramsTuple?: []; params?: {} }
    'profile.skills.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'profile.skills.remove': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'profile.viewUser': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'profile.snapshots.publish': { paramsTuple?: []; params?: {} }
    'profile.snapshots.current': { paramsTuple?: []; params?: {} }
    'profile.snapshots.history': { paramsTuple?: []; params?: {} }
    'profile.snapshots.access': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'profile.snapshots.rotate_link': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'profile.update_settings': { paramsTuple?: []; params?: {} }
    'profile.snapshot.public': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'tasks.index': { paramsTuple?: []; params?: {} }
    'api.tasks.check_create_permission': { paramsTuple?: []; params?: {} }
    'api.tasks.grouped': { paramsTuple?: []; params?: {} }
    'api.tasks.timeline': { paramsTuple?: []; params?: {} }
    'api.tasks.batch_status': { paramsTuple?: []; params?: {} }
    'api.tasks.sort_order': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'tasks.create': { paramsTuple?: []; params?: {} }
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
    'applications.process': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'applications.withdraw': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'applications.mine': { paramsTuple?: []; params?: {} }
    'api.task_statuses.index': { paramsTuple?: []; params?: {} }
    'api.task_statuses.store': { paramsTuple?: []; params?: {} }
    'api.task_statuses.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api.task_statuses.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api.workflow.index': { paramsTuple?: []; params?: {} }
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
    'get_task_audit_logs': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api.projects.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api.projects.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api.projects.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'redis_list_keys': { paramsTuple?: []; params?: {} }
    'redis_set_cache': { paramsTuple?: []; params?: {} }
    'redis_get_cache': { paramsTuple: [ParamValue]; params: {'key': ParamValue} }
    'redis_clear_cache': { paramsTuple: [ParamValue]; params: {'key': ParamValue} }
    'redis_flush_cache': { paramsTuple?: []; params?: {} }
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
    'organizations.switch.api': { paramsTuple?: []; params?: {} }
    'organizations.switch.redirect': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'organizations.users.remove': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'organizations.users.add': { paramsTuple?: []; params?: {} }
    'projects.index': { paramsTuple?: []; params?: {} }
    'projects.create': { paramsTuple?: []; params?: {} }
    'projects.store': { paramsTuple?: []; params?: {} }
    'projects.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'projects.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'projects.members.add': { paramsTuple?: []; params?: {} }
    'reviews.pending': { paramsTuple?: []; params?: {} }
    'reviews.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'reviews.submit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'reviews.confirm': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'reviews.evidences.list': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'reviews.evidences.add': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'reviews.self_assessment.get': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'reviews.self_assessment.upsert': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'reviews.reverse': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'reviews.mine': { paramsTuple?: []; params?: {} }
    'users.reviews': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.flagged_reviews': { paramsTuple?: []; params?: {} }
    'admin.flagged_reviews.resolve': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api.reviews.sessions.create': { paramsTuple?: []; params?: {} }
    'health_checks': { paramsTuple?: []; params?: {} }
    'dev.restart': { paramsTuple?: []; params?: {} }
  }
  POST: {
    'admin.toggle': { paramsTuple?: []; params?: {} }
    'org.members.invite': { paramsTuple?: []; params?: {} }
    'org.projects.create': { paramsTuple?: []; params?: {} }
    'org.workflow.createStatus': { paramsTuple?: []; params?: {} }
    'logout': { paramsTuple?: []; params?: {} }
    'users.store': { paramsTuple?: []; params?: {} }
    'profile.skills.add': { paramsTuple?: []; params?: {} }
    'profile.snapshots.publish': { paramsTuple?: []; params?: {} }
    'profile.snapshots.rotate_link': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
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
    'redis_set_cache': { paramsTuple?: []; params?: {} }
    'organizations.join.post': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'organizations.store': { paramsTuple?: []; params?: {} }
    'organizations.switch': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'organizations.members.add': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'organizations.members.invite': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'organizations.members.add_direct': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'organizations.members.process_request': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'userId': ParamValue} }
    'organizations.members.update_role': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'userId': ParamValue} }
    'organizations.switch.api': { paramsTuple?: []; params?: {} }
    'organizations.users.add': { paramsTuple?: []; params?: {} }
    'projects.store': { paramsTuple?: []; params?: {} }
    'projects.members.add': { paramsTuple?: []; params?: {} }
    'reviews.submit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'reviews.confirm': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'reviews.evidences.add': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'reviews.self_assessment.upsert': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'reviews.reverse': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.flagged_reviews.resolve': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api.reviews.sessions.create': { paramsTuple?: []; params?: {} }
    'dev.restart': { paramsTuple?: []; params?: {} }
  }
  GET: {
    'admin.dashboard': { paramsTuple?: []; params?: {} }
    'admin.users.index': { paramsTuple?: []; params?: {} }
    'admin.users.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.organizations.index': { paramsTuple?: []; params?: {} }
    'admin.organizations.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.auditLogs': { paramsTuple?: []; params?: {} }
    'admin.reviews.flagged': { paramsTuple?: []; params?: {} }
    'admin.reviews.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.packages.index': { paramsTuple?: []; params?: {} }
    'org.dashboard': { paramsTuple?: []; params?: {} }
    'org.members.index': { paramsTuple?: []; params?: {} }
    'org.requests.index': { paramsTuple?: []; params?: {} }
    'org.invitations.index': { paramsTuple?: []; params?: {} }
    'org.settings.show': { paramsTuple?: []; params?: {} }
    'org.projects.index': { paramsTuple?: []; params?: {} }
    'org.workflow.statuses': { paramsTuple?: []; params?: {} }
    'org.billing.show': { paramsTuple?: []; params?: {} }
    'error.not_found': { paramsTuple?: []; params?: {} }
    'error.server_error': { paramsTuple?: []; params?: {} }
    'error.forbidden': { paramsTuple?: []; params?: {} }
    'error.require_organization': { paramsTuple?: []; params?: {} }
    'social_auth.redirect': { paramsTuple: [ParamValue]; params: {'provider': ParamValue} }
    'social_auth.callback': { paramsTuple: [ParamValue]; params: {'provider': ParamValue} }
    'logout.show': { paramsTuple?: []; params?: {} }
    'users.index': { paramsTuple?: []; params?: {} }
    'users.create': { paramsTuple?: []; params?: {} }
    'users.pending_approval': { paramsTuple?: []; params?: {} }
    'users.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'users.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api.users.pending_approval': { paramsTuple?: []; params?: {} }
    'api.users.pending_approval_count': { paramsTuple?: []; params?: {} }
    'api.users.system_users': { paramsTuple?: []; params?: {} }
    'profile.show': { paramsTuple?: []; params?: {} }
    'profile.edit': { paramsTuple?: []; params?: {} }
    'profile.viewUser': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'profile.snapshots.current': { paramsTuple?: []; params?: {} }
    'profile.snapshots.history': { paramsTuple?: []; params?: {} }
    'profile.snapshot.public': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'tasks.index': { paramsTuple?: []; params?: {} }
    'api.tasks.check_create_permission': { paramsTuple?: []; params?: {} }
    'api.tasks.grouped': { paramsTuple?: []; params?: {} }
    'api.tasks.timeline': { paramsTuple?: []; params?: {} }
    'tasks.create': { paramsTuple?: []; params?: {} }
    'tasks.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'tasks.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'tasks.audit_logs': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'tasks.applications': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
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
    'get_task_audit_logs': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api.projects.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'redis_list_keys': { paramsTuple?: []; params?: {} }
    'redis_get_cache': { paramsTuple: [ParamValue]; params: {'key': ParamValue} }
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
    'reviews.pending': { paramsTuple?: []; params?: {} }
    'reviews.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'reviews.evidences.list': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'reviews.self_assessment.get': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'reviews.mine': { paramsTuple?: []; params?: {} }
    'users.reviews': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.flagged_reviews': { paramsTuple?: []; params?: {} }
    'health_checks': { paramsTuple?: []; params?: {} }
  }
  HEAD: {
    'admin.dashboard': { paramsTuple?: []; params?: {} }
    'admin.users.index': { paramsTuple?: []; params?: {} }
    'admin.users.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.organizations.index': { paramsTuple?: []; params?: {} }
    'admin.organizations.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.auditLogs': { paramsTuple?: []; params?: {} }
    'admin.reviews.flagged': { paramsTuple?: []; params?: {} }
    'admin.reviews.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.packages.index': { paramsTuple?: []; params?: {} }
    'org.dashboard': { paramsTuple?: []; params?: {} }
    'org.members.index': { paramsTuple?: []; params?: {} }
    'org.requests.index': { paramsTuple?: []; params?: {} }
    'org.invitations.index': { paramsTuple?: []; params?: {} }
    'org.settings.show': { paramsTuple?: []; params?: {} }
    'org.projects.index': { paramsTuple?: []; params?: {} }
    'org.workflow.statuses': { paramsTuple?: []; params?: {} }
    'org.billing.show': { paramsTuple?: []; params?: {} }
    'error.not_found': { paramsTuple?: []; params?: {} }
    'error.server_error': { paramsTuple?: []; params?: {} }
    'error.forbidden': { paramsTuple?: []; params?: {} }
    'error.require_organization': { paramsTuple?: []; params?: {} }
    'social_auth.redirect': { paramsTuple: [ParamValue]; params: {'provider': ParamValue} }
    'social_auth.callback': { paramsTuple: [ParamValue]; params: {'provider': ParamValue} }
    'logout.show': { paramsTuple?: []; params?: {} }
    'users.index': { paramsTuple?: []; params?: {} }
    'users.create': { paramsTuple?: []; params?: {} }
    'users.pending_approval': { paramsTuple?: []; params?: {} }
    'users.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'users.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api.users.pending_approval': { paramsTuple?: []; params?: {} }
    'api.users.pending_approval_count': { paramsTuple?: []; params?: {} }
    'api.users.system_users': { paramsTuple?: []; params?: {} }
    'profile.show': { paramsTuple?: []; params?: {} }
    'profile.edit': { paramsTuple?: []; params?: {} }
    'profile.viewUser': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'profile.snapshots.current': { paramsTuple?: []; params?: {} }
    'profile.snapshots.history': { paramsTuple?: []; params?: {} }
    'profile.snapshot.public': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'tasks.index': { paramsTuple?: []; params?: {} }
    'api.tasks.check_create_permission': { paramsTuple?: []; params?: {} }
    'api.tasks.grouped': { paramsTuple?: []; params?: {} }
    'api.tasks.timeline': { paramsTuple?: []; params?: {} }
    'tasks.create': { paramsTuple?: []; params?: {} }
    'tasks.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'tasks.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'tasks.audit_logs': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'tasks.applications': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
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
    'get_task_audit_logs': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api.projects.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'redis_list_keys': { paramsTuple?: []; params?: {} }
    'redis_get_cache': { paramsTuple: [ParamValue]; params: {'key': ParamValue} }
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
    'reviews.pending': { paramsTuple?: []; params?: {} }
    'reviews.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'reviews.evidences.list': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'reviews.self_assessment.get': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'reviews.mine': { paramsTuple?: []; params?: {} }
    'users.reviews': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.flagged_reviews': { paramsTuple?: []; params?: {} }
    'health_checks': { paramsTuple?: []; params?: {} }
  }
  PUT: {
    'admin.users.updateRole': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.users.suspend': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.reviews.resolve': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.packages.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'org.members.updateRole': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'org.requests.approve': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'org.settings.update': { paramsTuple?: []; params?: {} }
    'org.billing.updatePlan': { paramsTuple?: []; params?: {} }
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
  }
  DELETE: {
    'org.members.remove': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'users.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'profile.skills.remove': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'tasks.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api.task_statuses.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'account.destroy': { paramsTuple?: []; params?: {} }
    'notifications.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'notifications.destroy_all_read': { paramsTuple?: []; params?: {} }
    'api.projects.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'redis_clear_cache': { paramsTuple: [ParamValue]; params: {'key': ParamValue} }
    'redis_flush_cache': { paramsTuple?: []; params?: {} }
    'organizations.members.remove': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'userId': ParamValue} }
    'organizations.users.remove': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'projects.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  PATCH: {
    'profile.snapshots.access': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api.tasks.batch_status': { paramsTuple?: []; params?: {} }
    'api.tasks.sort_order': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'tasks.update.time': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}