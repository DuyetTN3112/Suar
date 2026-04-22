import { AdminAuditEventReaderAdapter } from '#composition/adapters/admin/audit/admin_audit_event_reader_adapter'
import { AdminAuditProjectionReaderAdapter } from '#composition/adapters/admin/audit/admin_audit_projection_reader_adapter'
import {
  AdminUserDirectoryAdapter,
  AdminUserLifecycleWriterAdapter,
} from '#composition/adapters/admin/administration/admin_user_administration_adapter'
import { AuthorizationAdminCustomSystemRoleAdapter } from '#composition/adapters/authorization/authorization_admin_custom_system_role_adapter'
import { LucidAdminTransactionRunnerAdapter } from '#composition/adapters/admin/administration/lucid_admin_transaction_runner_adapter'
import { ReviewsAdminModerationGatewayAdapter } from '#composition/adapters/reviews/reviews_admin_moderation_gateway_adapter'
import {
  SearchAdminOrganizationCandidateReaderAdapter,
  SearchAdminUserCandidateReaderAdapter,
} from '#composition/adapters/search/search_admin_candidate_readers_adapter'
import { SkillReviewIdentityReaderAdapter } from '#composition/adapters/skills/skill_review_identity_reader_adapter'
import { SkillsAdminSkillRubricAdapter } from '#composition/adapters/skills/skills_admin_skill_rubric_adapter'
import { SystemAdminMutationIdentityGeneratorAdapter } from '#composition/adapters/admin/administration/system_admin_mutation_identity_generator_adapter'
import { TaskReviewAssignmentProjectionReaderAdapter } from '#composition/adapters/tasks/task_review_assignment_projection_reader_adapter'
import { UserReviewModeratorIdentityProjectionReaderAdapter } from '#composition/adapters/users/user_review_moderator_identity_projection_reader_adapter'
import { searchEngineCapability } from '#composition/search/search-engine/search_engine_composition'
import {
  userAdministrationDirectory,
  userAdministrationLifecycle,
} from '#composition/users/user-application/user_application_composition'
import { userLifecycleEventStager } from '#composition/users/user-persistence/user_persistence_composition'

import { type AdminAuditLogActionFactory } from '#modules/admin/audit_logs/actions/ports/inbound/audit_logs/admin_audit_log_action_factory'
import ListAuditLogsQuery from '#modules/admin/audit_logs/actions/queries/audit_logs/list_audit_logs_query'
import { type AdminDashboardActionFactory } from '#modules/admin/dashboard/actions/ports/inbound/dashboard/admin_dashboard_action_factory'
import GetDashboardStatsQuery from '#modules/admin/dashboard/actions/queries/dashboard/get_dashboard_stats_query'
import { AdminProjectReadOps } from '#modules/admin/dashboard/infra/repositories/read/dashboard/admin_project_queries'
import { AdminTaskReadOps } from '#modules/admin/dashboard/infra/repositories/read/dashboard/admin_task_queries'
import { type AdminOrganizationActionFactory } from '#modules/admin/organizations/actions/ports/inbound/organizations/admin_organization_action_factory'
import GetOrganizationDetailsQuery from '#modules/admin/organizations/actions/queries/organizations/get_organization_details_query'
import ListOrganizationsQuery from '#modules/admin/organizations/actions/queries/organizations/list_organizations_query'
import { AdminOrganizationReadOps } from '#modules/admin/organizations/infra/repositories/read/organizations/admin_organization_queries'
import UpdateSubscriptionCommand from '#modules/admin/packages/actions/commands/packages/update_subscription_command'
import { type AdminPackageActionFactory } from '#modules/admin/packages/actions/ports/inbound/packages/admin_package_action_factory'
import GetSubscriptionQrCatalogQuery from '#modules/admin/packages/actions/queries/packages/get_subscription_qr_catalog_query'
import ListSubscriptionsQuery from '#modules/admin/packages/actions/queries/packages/list_subscriptions_query'
import { AdminSubscriptionReadOps } from '#modules/admin/packages/infra/repositories/read/packages/admin_subscription_queries'
import { AdminSubscriptionWriteOps } from '#modules/admin/packages/infra/repositories/write/packages/admin_subscription_mutations'
import CreateCustomSystemRoleCommand from '#modules/admin/permissions/actions/commands/permissions/create_custom_system_role_command'
import DeleteCustomSystemRoleCommand from '#modules/admin/permissions/actions/commands/permissions/delete_custom_system_role_command'
import UpdateCustomSystemRoleCommand from '#modules/admin/permissions/actions/commands/permissions/update_custom_system_role_command'
import { type AdminPermissionActionFactory } from '#modules/admin/permissions/actions/ports/inbound/permissions/admin_permission_action_factory'
import GetCustomSystemRoleQuery from '#modules/admin/permissions/actions/queries/permissions/get_custom_system_role_query'
import GetPermissionMatrixQuery from '#modules/admin/permissions/actions/queries/permissions/get_permission_matrix_query'
import CreateSkillRubricDraftCommand from '#modules/admin/proficiency/actions/commands/proficiency/create_skill_rubric_draft_command'
import PublishSkillRubricVersionCommand from '#modules/admin/proficiency/actions/commands/proficiency/publish_skill_rubric_version_command'
import UpsertSkillRubricLevelCommand from '#modules/admin/proficiency/actions/commands/proficiency/upsert_skill_rubric_level_command'
import { type AdminProficiencyActionFactory } from '#modules/admin/proficiency/actions/ports/inbound/proficiency/admin_proficiency_action_factory'
import GetProficiencyScaleQuery from '#modules/admin/proficiency/actions/queries/proficiency/get_proficiency_scale_query'
import GetSkillRubricQuery from '#modules/admin/proficiency/actions/queries/proficiency/get_skill_rubric_query'
import ListProficiencyCatalogQuery from '#modules/admin/proficiency/actions/queries/proficiency/list_proficiency_catalog_query'
import ResolveFlaggedReviewCommand from '#modules/admin/reviews/actions/commands/reviews/resolve_flagged_review_command'
import { type AdminReviewActionFactory } from '#modules/admin/reviews/actions/ports/inbound/reviews/admin_review_action_factory'
import GetFlaggedReviewDetailQuery from '#modules/admin/reviews/actions/queries/reviews/get_flagged_review_detail_query'
import ListFlaggedReviewsQuery from '#modules/admin/reviews/actions/queries/reviews/list_flagged_reviews_query'
import SuspendUserCommand from '#modules/admin/users/actions/commands/users/suspend_user_command'
import UpdateUserSystemRoleCommand from '#modules/admin/users/actions/commands/users/update_user_system_role_command'
import { type AdminUserActionFactory } from '#modules/admin/users/actions/ports/inbound/users/admin_user_action_factory'
import GetUserDetailsQuery from '#modules/admin/users/actions/queries/users/get_user_details_query'
import ListUsersQuery from '#modules/admin/users/actions/queries/users/list_users_query'

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
