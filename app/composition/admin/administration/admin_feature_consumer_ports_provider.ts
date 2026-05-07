import type { ApplicationService } from '@adonisjs/core/types'

import {
  AdminUserDirectoryAdapter,
  AdminUserLifecycleWriterAdapter,
} from '#composition/adapters/admin/administration/admin_user_administration_adapter'
import { LucidAdminTransactionRunnerAdapter } from '#composition/adapters/admin/administration/lucid_admin_transaction_runner_adapter'
import { SystemAdminMutationIdentityGeneratorAdapter } from '#composition/adapters/admin/administration/system_admin_mutation_identity_generator_adapter'
import { AuthorizationAdminCustomSystemRoleAdapter } from '#composition/adapters/authorization/authorization_admin_custom_system_role_adapter'
import { ReviewsAdminDisputeReadAdapter } from '#composition/adapters/reviews/reviews_admin_dispute_read_adapter'
import {
  SearchAdminOrganizationCandidateReaderAdapter,
  SearchAdminUserCandidateReaderAdapter,
} from '#composition/adapters/search/search_admin_candidate_readers_adapter'
import {
  adminDashboardActionFactory,
  adminOrganizationActionFactory,
  adminPackageActionFactory,
  adminPermissionActionFactory,
  adminProficiencyActionFactory,
  adminSkillRubric,
  adminUserActionFactory,
} from '#composition/admin/administration/admin_action_factory_composition'
import {
  aiDisputeEvaluationSourceReader,
  reviewAdminDisputeReadModel,
  reviewActionFactory,
} from '#composition/reviews/review-core/review_action_factory'
import { searchEngineCapability } from '#composition/search/search-engine/search_engine_composition'
import {
  userAdministrationDirectory,
  userAdministrationLifecycle,
} from '#composition/users/user-application/user_application_composition'
import { userLifecycleEventStager } from '#composition/users/user-persistence/user_persistence_composition'
import { AdminDashboardActionFactory } from '#modules/admin/dashboard/actions/ports/inbound/dashboard/admin_dashboard_action_factory'
import {
  AdminProjectStatsRepository,
  AdminTaskStatsRepository,
} from '#modules/admin/dashboard/actions/ports/outbound/dashboard/admin_operational_repository'
import { AdminUserDirectory as DashboardAdminUserDirectory } from '#modules/admin/dashboard/actions/ports/outbound/dashboard/admin_user_administration'
import { AdminProjectReadOps } from '#modules/admin/dashboard/infra/repositories/read/dashboard/admin_project_queries'
import { AdminTaskReadOps } from '#modules/admin/dashboard/infra/repositories/read/dashboard/admin_task_queries'
import { AdminDisputeActionFactory } from '#modules/admin/disputes/actions/ports/inbound/disputes/admin_dispute_action_factory'
import { ReviewAdminDisputeReadPort } from '#modules/admin/disputes/actions/ports/outbound/disputes/review_admin_dispute_read_port'
import GetAdminDisputeDetailQuery from '#modules/admin/disputes/actions/queries/disputes/get_admin_dispute_detail_query'
import GetAiOperatorOverviewQuery from '#modules/admin/disputes/actions/queries/disputes/get_ai_operator_overview_query'
import ListAdminDisputesQuery from '#modules/admin/disputes/actions/queries/disputes/list_admin_disputes_query'
import { AdminOrganizationActionFactory } from '#modules/admin/organizations/actions/ports/inbound/organizations/admin_organization_action_factory'
import { AdminOrganizationRepository } from '#modules/admin/organizations/actions/ports/outbound/organizations/admin_operational_repository'
import { AdminOrganizationSearchCandidateReader } from '#modules/admin/organizations/actions/ports/outbound/organizations/admin_search_candidate_readers'
import { AdminOrganizationReadOps } from '#modules/admin/organizations/infra/repositories/read/organizations/admin_organization_queries'
import { AdminPackageActionFactory } from '#modules/admin/packages/actions/ports/inbound/packages/admin_package_action_factory'
import {
  AdminSubscriptionRepository,
  AdminSubscriptionWriter,
} from '#modules/admin/packages/actions/ports/outbound/packages/admin_operational_repository'
import { AdminSubscriptionReadOps } from '#modules/admin/packages/infra/repositories/read/packages/admin_subscription_queries'
import { AdminSubscriptionWriteOps } from '#modules/admin/packages/infra/repositories/write/packages/admin_subscription_mutations'
import { AdminPermissionActionFactory } from '#modules/admin/permissions/actions/ports/inbound/permissions/admin_permission_action_factory'
import { AdminCustomSystemRoleGateway } from '#modules/admin/permissions/actions/ports/outbound/permissions/admin_custom_system_role_gateway'
import { AdminProficiencyActionFactory } from '#modules/admin/proficiency/actions/ports/inbound/proficiency/admin_proficiency_action_factory'
import { AdminSkillRubricGateway } from '#modules/admin/proficiency/actions/ports/outbound/proficiency/admin_skill_rubric_gateway'
import { AdminUserActionFactory } from '#modules/admin/users/actions/ports/inbound/users/admin_user_action_factory'
import { AdminMutationIdentityGenerator } from '#modules/admin/users/actions/ports/outbound/users/admin_mutation_identity_generator'
import { AdminUserSearchCandidateReader } from '#modules/admin/users/actions/ports/outbound/users/admin_search_candidate_readers'
import { AdminTransactionRunner } from '#modules/admin/users/actions/ports/outbound/users/admin_transaction_runner'
import {
  AdminUserDirectory,
  AdminUserLifecycleWriter,
} from '#modules/admin/users/actions/ports/outbound/users/admin_user_administration'
import { registerCustomSystemRoleProvider } from '#modules/authorization/public_contracts/custom-system-role/custom_system_role_api'
import GetAdminReviewDisputeAiOperatorOverviewQuery from '#modules/reviews/actions/queries/disputes/get_admin_review_dispute_ai_operator_overview_query'
import type { ReviewAdminDisputeCapability } from '#modules/reviews/public_contracts/admin_review_dispute_capability'

export default class AdminFeatureConsumerPortsProvider {
  constructor(private readonly app: ApplicationService) {}

  register(): void {
    const customSystemRoles = new AuthorizationAdminCustomSystemRoleAdapter()
    const userDirectory = new AdminUserDirectoryAdapter(userAdministrationDirectory)
    const reviewAdminDisputes: ReviewAdminDisputeCapability = {
      list: (input, context) =>
        reviewActionFactory.makeListAdminReviewDisputesQuery(context).execute(input),
      getDetail: (input, context) =>
        reviewActionFactory.makeGetAdminReviewDisputeDetailQuery(context).execute(input),
      getAiOperatorOverview: (input, context) =>
        new GetAdminReviewDisputeAiOperatorOverviewQuery(
          context,
          aiDisputeEvaluationSourceReader,
          reviewAdminDisputeReadModel
        ).execute(input),
    }
    const reviewAdminDisputeReadAdapter = new ReviewsAdminDisputeReadAdapter(reviewAdminDisputes)
    const adminDisputeActionFactory: AdminDisputeActionFactory = {
      makeListAdminDisputesQuery: (execCtx) =>
        new ListAdminDisputesQuery(execCtx, reviewAdminDisputeReadAdapter),
      makeGetAdminDisputeDetailQuery: (execCtx) =>
        new GetAdminDisputeDetailQuery(execCtx, reviewAdminDisputeReadAdapter),
      makeGetAiOperatorOverviewQuery: (execCtx) =>
        new GetAiOperatorOverviewQuery(execCtx, reviewAdminDisputeReadAdapter),
    }
    registerCustomSystemRoleProvider(customSystemRoles)
    this.app.container.singleton(AdminDashboardActionFactory, () => adminDashboardActionFactory)
    this.app.container.singleton(
      AdminOrganizationActionFactory,
      () => adminOrganizationActionFactory
    )
    this.app.container.singleton(AdminDisputeActionFactory, () => adminDisputeActionFactory)
    this.app.container.singleton(AdminPackageActionFactory, () => adminPackageActionFactory)
    this.app.container.singleton(AdminPermissionActionFactory, () => adminPermissionActionFactory)
    this.app.container.singleton(AdminProficiencyActionFactory, () => adminProficiencyActionFactory)
    this.app.container.singleton(AdminUserActionFactory, () => adminUserActionFactory)
    this.app.container.singleton(
      AdminUserSearchCandidateReader,
      () => new SearchAdminUserCandidateReaderAdapter(searchEngineCapability)
    )
    this.app.container.singleton(
      AdminOrganizationSearchCandidateReader,
      () => new SearchAdminOrganizationCandidateReaderAdapter(searchEngineCapability)
    )
    this.app.container.singleton(AdminUserDirectory, () => userDirectory)
    this.app.container.singleton(DashboardAdminUserDirectory, () => userDirectory)
    this.app.container.singleton(AdminOrganizationRepository, () => AdminOrganizationReadOps)
    this.app.container.singleton(AdminProjectStatsRepository, () => AdminProjectReadOps)
    this.app.container.singleton(AdminTaskStatsRepository, () => AdminTaskReadOps)
    this.app.container.singleton(AdminSubscriptionRepository, () => AdminSubscriptionReadOps)
    this.app.container.singleton(AdminSubscriptionWriter, () => AdminSubscriptionWriteOps)
    this.app.container.singleton(AdminCustomSystemRoleGateway, () => customSystemRoles)
    this.app.container.singleton(AdminSkillRubricGateway, () => adminSkillRubric)
    this.app.container.singleton(
      AdminUserLifecycleWriter,
      () =>
        new AdminUserLifecycleWriterAdapter(userAdministrationLifecycle, userLifecycleEventStager)
    )
    this.app.container.singleton(
      AdminTransactionRunner,
      () => new LucidAdminTransactionRunnerAdapter()
    )
    this.app.container.singleton(
      AdminMutationIdentityGenerator,
      () => new SystemAdminMutationIdentityGeneratorAdapter()
    )
    this.app.container.singleton(ReviewAdminDisputeReadPort, () => reviewAdminDisputeReadAdapter)
  }
}
