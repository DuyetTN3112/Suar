import { AdminAuditEventReaderAdapter } from './adapters/admin_audit_event_reader_adapter.js'
import { AdminAuditProjectionReaderAdapter } from './adapters/admin_audit_projection_reader_adapter.js'
import {
  AdminUserDirectoryAdapter,
  AdminUserLifecycleWriterAdapter,
} from './adapters/admin_user_administration_adapter.js'
import { AuthorizationAdminCustomSystemRoleAdapter } from './adapters/authorization_admin_custom_system_role_adapter.js'
import { LucidAdminTransactionRunnerAdapter } from './adapters/lucid_admin_transaction_runner_adapter.js'
import { ReviewsAdminModerationGatewayAdapter } from './adapters/reviews_admin_moderation_gateway_adapter.js'
import {
  SearchAdminOrganizationCandidateReaderAdapter,
  SearchAdminUserCandidateReaderAdapter,
} from './adapters/search_admin_candidate_readers_adapter.js'
import { SkillReviewIdentityReaderAdapter } from './adapters/skill_review_identity_reader_adapter.js'
import { SkillsAdminSkillRubricAdapter } from './adapters/skills_admin_skill_rubric_adapter.js'
import { SystemAdminMutationIdentityGeneratorAdapter } from './adapters/system_admin_mutation_identity_generator_adapter.js'
import { TaskReviewAssignmentProjectionReaderAdapter } from './adapters/task_review_assignment_projection_reader_adapter.js'
import { UserReviewModeratorIdentityProjectionReaderAdapter } from './adapters/user_review_moderator_identity_projection_reader_adapter.js'
import { searchEngineCapability } from './search_engine_composition.js'
import {
  userAdministrationDirectory,
  userAdministrationLifecycle,
} from './user_application_composition.js'
import { userLifecycleEventStager } from './user_persistence_composition.js'

import { type AdminAuditLogActionFactory } from '#modules/admin/audit_logs/actions/ports/inbound/admin_audit_log_action_factory'
import ListAuditLogsQuery from '#modules/admin/audit_logs/actions/query/list_audit_logs_query'
import { type AdminDashboardActionFactory } from '#modules/admin/dashboard/actions/ports/inbound/admin_dashboard_action_factory'
import GetDashboardStatsQuery from '#modules/admin/dashboard/actions/query/get_dashboard_stats_query'
import { AdminProjectReadOps } from '#modules/admin/dashboard/infra/repositories/read/admin_project_queries'
import { AdminTaskReadOps } from '#modules/admin/dashboard/infra/repositories/read/admin_task_queries'
import { type AdminOrganizationActionFactory } from '#modules/admin/organizations/actions/ports/inbound/admin_organization_action_factory'
import GetOrganizationDetailsQuery from '#modules/admin/organizations/actions/query/get_organization_details_query'
import ListOrganizationsQuery from '#modules/admin/organizations/actions/query/list_organizations_query'
import { AdminOrganizationReadOps } from '#modules/admin/organizations/infra/repositories/read/admin_organization_queries'
import UpdateSubscriptionCommand from '#modules/admin/packages/actions/command/update_subscription_command'
import { type AdminPackageActionFactory } from '#modules/admin/packages/actions/ports/inbound/admin_package_action_factory'
import GetSubscriptionQrCatalogQuery from '#modules/admin/packages/actions/query/get_subscription_qr_catalog_query'
import ListSubscriptionsQuery from '#modules/admin/packages/actions/query/list_subscriptions_query'
import { AdminSubscriptionReadOps } from '#modules/admin/packages/infra/repositories/read/admin_subscription_queries'
import { AdminSubscriptionWriteOps } from '#modules/admin/packages/infra/repositories/write/admin_subscription_mutations'
import CreateCustomSystemRoleCommand from '#modules/admin/permissions/actions/command/create_custom_system_role_command'
import DeleteCustomSystemRoleCommand from '#modules/admin/permissions/actions/command/delete_custom_system_role_command'
import UpdateCustomSystemRoleCommand from '#modules/admin/permissions/actions/command/update_custom_system_role_command'
import { type AdminPermissionActionFactory } from '#modules/admin/permissions/actions/ports/inbound/admin_permission_action_factory'
import GetCustomSystemRoleQuery from '#modules/admin/permissions/actions/query/get_custom_system_role_query'
import GetPermissionMatrixQuery from '#modules/admin/permissions/actions/query/get_permission_matrix_query'
import CreateSkillRubricDraftCommand from '#modules/admin/proficiency/actions/command/create_skill_rubric_draft_command'
import PublishSkillRubricVersionCommand from '#modules/admin/proficiency/actions/command/publish_skill_rubric_version_command'
import UpsertSkillRubricLevelCommand from '#modules/admin/proficiency/actions/command/upsert_skill_rubric_level_command'
import { type AdminProficiencyActionFactory } from '#modules/admin/proficiency/actions/ports/inbound/admin_proficiency_action_factory'
import GetProficiencyScaleQuery from '#modules/admin/proficiency/actions/query/get_proficiency_scale_query'
import GetSkillRubricQuery from '#modules/admin/proficiency/actions/query/get_skill_rubric_query'
import ListProficiencyCatalogQuery from '#modules/admin/proficiency/actions/query/list_proficiency_catalog_query'
import ResolveFlaggedReviewCommand from '#modules/admin/reviews/actions/command/resolve_flagged_review_command'
import { type AdminReviewActionFactory } from '#modules/admin/reviews/actions/ports/inbound/admin_review_action_factory'
import GetFlaggedReviewDetailQuery from '#modules/admin/reviews/actions/query/get_flagged_review_detail_query'
import ListFlaggedReviewsQuery from '#modules/admin/reviews/actions/query/list_flagged_reviews_query'
import SuspendUserCommand from '#modules/admin/users/actions/command/suspend_user_command'
import UpdateUserSystemRoleCommand from '#modules/admin/users/actions/command/update_user_system_role_command'
import { type AdminUserActionFactory } from '#modules/admin/users/actions/ports/inbound/admin_user_action_factory'
import GetUserDetailsQuery from '#modules/admin/users/actions/query/get_user_details_query'
import ListUsersQuery from '#modules/admin/users/actions/query/list_users_query'

export const adminAuditEventReader = new AdminAuditEventReaderAdapter()
export const adminAuditProjectionReader = new AdminAuditProjectionReaderAdapter()
export const adminCustomSystemRoles = new AuthorizationAdminCustomSystemRoleAdapter()
export const adminOrganizationSearchCandidates =
  new SearchAdminOrganizationCandidateReaderAdapter(searchEngineCapability)
export const adminUserSearchCandidates =
  new SearchAdminUserCandidateReaderAdapter(searchEngineCapability)
export const adminUserDirectory = new AdminUserDirectoryAdapter(userAdministrationDirectory)
export const adminUserLifecycle = new AdminUserLifecycleWriterAdapter(
  userAdministrationLifecycle,
  userLifecycleEventStager
)
export const adminTransactionRunner = new LucidAdminTransactionRunnerAdapter()
export const adminMutationIdentities = new SystemAdminMutationIdentityGeneratorAdapter()
export const adminSkillRubric = new SkillsAdminSkillRubricAdapter()
export const adminReviewModerationGateway = new ReviewsAdminModerationGatewayAdapter(
  new TaskReviewAssignmentProjectionReaderAdapter(),
  new UserReviewModeratorIdentityProjectionReaderAdapter(),
  new SkillReviewIdentityReaderAdapter()
)

export const adminAuditLogActionFactory: AdminAuditLogActionFactory = {
  makeListAuditLogsQuery: (execCtx) =>
    new ListAuditLogsQuery(execCtx, adminAuditEventReader, adminAuditProjectionReader),
}

export const adminOrganizationActionFactory: AdminOrganizationActionFactory = {
  makeListOrganizationsQuery: (execCtx) =>
    new ListOrganizationsQuery(
      execCtx,
      adminOrganizationSearchCandidates,
      AdminOrganizationReadOps
    ),
  makeGetOrganizationDetailsQuery: (execCtx) =>
    new GetOrganizationDetailsQuery(execCtx, AdminOrganizationReadOps),
}

export const adminPackageActionFactory: AdminPackageActionFactory = {
  makeListSubscriptionsQuery: (execCtx) =>
    new ListSubscriptionsQuery(execCtx, AdminSubscriptionReadOps),
  makeGetSubscriptionQrCatalogQuery: (execCtx) =>
    new GetSubscriptionQrCatalogQuery(execCtx, AdminSubscriptionReadOps),
  makeUpdateSubscriptionCommand: (execCtx) =>
    new UpdateSubscriptionCommand(execCtx, AdminSubscriptionWriteOps),
}

export const adminDashboardActionFactory: AdminDashboardActionFactory = {
  makeGetDashboardStatsQuery: (execCtx) =>
    new GetDashboardStatsQuery(
      execCtx,
      adminUserDirectory,
      adminReviewModerationGateway,
      AdminOrganizationReadOps,
      AdminProjectReadOps,
      AdminTaskReadOps,
      AdminSubscriptionReadOps
    ),
  makeListSubscriptionsQuery: (execCtx) =>
    new ListSubscriptionsQuery(execCtx, AdminSubscriptionReadOps),
}

export const adminPermissionActionFactory: AdminPermissionActionFactory = {
  makeGetPermissionMatrixQuery: (execCtx) =>
    new GetPermissionMatrixQuery(execCtx, adminCustomSystemRoles),
  makeGetCustomSystemRoleQuery: (execCtx) =>
    new GetCustomSystemRoleQuery(execCtx, adminCustomSystemRoles),
  makeCreateCustomSystemRoleCommand: (execCtx) =>
    new CreateCustomSystemRoleCommand(execCtx, adminCustomSystemRoles),
  makeUpdateCustomSystemRoleCommand: (execCtx) =>
    new UpdateCustomSystemRoleCommand(execCtx, adminCustomSystemRoles),
  makeDeleteCustomSystemRoleCommand: (execCtx) =>
    new DeleteCustomSystemRoleCommand(execCtx, adminCustomSystemRoles),
}

export const adminProficiencyActionFactory: AdminProficiencyActionFactory = {
  makeListProficiencyCatalogQuery: (execCtx) =>
    new ListProficiencyCatalogQuery(execCtx, adminSkillRubric),
  makeGetProficiencyScaleQuery: (execCtx) =>
    new GetProficiencyScaleQuery(execCtx, adminSkillRubric),
  makeGetSkillRubricQuery: (execCtx) =>
    new GetSkillRubricQuery(execCtx, adminSkillRubric),
  makeCreateSkillRubricDraftCommand: (execCtx) =>
    new CreateSkillRubricDraftCommand(execCtx, adminSkillRubric),
  makeUpsertSkillRubricLevelCommand: (execCtx) =>
    new UpsertSkillRubricLevelCommand(execCtx, adminSkillRubric),
  makePublishSkillRubricVersionCommand: (execCtx) =>
    new PublishSkillRubricVersionCommand(execCtx, adminSkillRubric),
}

export const adminReviewActionFactory: AdminReviewActionFactory = {
  makeListFlaggedReviewsQuery: (execCtx) =>
    new ListFlaggedReviewsQuery(execCtx, adminReviewModerationGateway),
  makeGetFlaggedReviewDetailQuery: (execCtx) =>
    new GetFlaggedReviewDetailQuery(execCtx, adminReviewModerationGateway),
  makeResolveFlaggedReviewCommand: (execCtx) =>
    new ResolveFlaggedReviewCommand(execCtx, adminReviewModerationGateway),
}

export const adminUserActionFactory: AdminUserActionFactory = {
  makeListUsersQuery: (execCtx) =>
    new ListUsersQuery(execCtx, adminUserSearchCandidates, adminUserDirectory),
  makeGetUserDetailsQuery: (execCtx) =>
    new GetUserDetailsQuery(execCtx, adminUserDirectory),
  makeSuspendUserCommand: (execCtx) =>
    new SuspendUserCommand(
      execCtx,
      adminUserDirectory,
      adminUserLifecycle,
      adminTransactionRunner,
      adminMutationIdentities
    ),
  makeUpdateUserSystemRoleCommand: (execCtx) =>
    new UpdateUserSystemRoleCommand(
      execCtx,
      adminUserDirectory,
      adminUserLifecycle,
      adminTransactionRunner
    ),
}
