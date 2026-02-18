import type { ApplicationService } from '@adonisjs/core/types'

import {
  AdminUserDirectoryAdapter,
  AdminUserLifecycleWriterAdapter,
} from './adapters/admin_user_administration_adapter.js'
import { AuthorizationAdminCustomSystemRoleAdapter } from './adapters/authorization_admin_custom_system_role_adapter.js'
import { LucidAdminTransactionRunnerAdapter } from './adapters/lucid_admin_transaction_runner_adapter.js'
import { ReviewsAdminDisputeReadAdapter } from './adapters/reviews_admin_dispute_read_adapter.js'
import {
  SearchAdminOrganizationCandidateReaderAdapter,
  SearchAdminUserCandidateReaderAdapter,
} from './adapters/search_admin_candidate_readers_adapter.js'
import { SystemAdminMutationIdentityGeneratorAdapter } from './adapters/system_admin_mutation_identity_generator_adapter.js'
import {
  adminDashboardActionFactory,
  adminOrganizationActionFactory,
  adminPackageActionFactory,
  adminPermissionActionFactory,
  adminProficiencyActionFactory,
  adminSkillRubric,
  adminUserActionFactory,
} from './admin_action_factory_composition.js'
import {
  aiDisputeEvaluationSourceReader,
  reviewAdminDisputeReadModel,
  reviewActionFactory,
} from './review_action_factory.js'
import { searchEngineCapability } from './search_engine_composition.js'
import {
  userAdministrationDirectory,
  userAdministrationLifecycle,
} from './user_application_composition.js'
import { userLifecycleEventStager } from './user_persistence_composition.js'

import { AdminDashboardActionFactory } from '#modules/admin/dashboard/actions/ports/inbound/admin_dashboard_action_factory'
import {
  AdminProjectStatsRepository,
  AdminTaskStatsRepository,
} from '#modules/admin/dashboard/actions/ports/outbound/admin_operational_repository'
import { AdminUserDirectory as DashboardAdminUserDirectory } from '#modules/admin/dashboard/actions/ports/outbound/admin_user_administration'
import { AdminProjectReadOps } from '#modules/admin/dashboard/infra/repositories/read/admin_project_queries'
import { AdminTaskReadOps } from '#modules/admin/dashboard/infra/repositories/read/admin_task_queries'
import { AdminDisputeActionFactory } from '#modules/admin/disputes/actions/ports/inbound/admin_dispute_action_factory'
import { ReviewAdminDisputeReadPort } from '#modules/admin/disputes/actions/ports/outbound/review_admin_dispute_read_port'
import GetAdminDisputeDetailQuery from '#modules/admin/disputes/actions/query/get_admin_dispute_detail_query'
import ListAdminDisputesQuery from '#modules/admin/disputes/actions/query/list_admin_disputes_query'
import { AdminOrganizationActionFactory } from '#modules/admin/organizations/actions/ports/inbound/admin_organization_action_factory'
import { AdminOrganizationRepository } from '#modules/admin/organizations/actions/ports/outbound/admin_operational_repository'
import { AdminOrganizationSearchCandidateReader } from '#modules/admin/organizations/actions/ports/outbound/admin_search_candidate_readers'
import { AdminOrganizationReadOps } from '#modules/admin/organizations/infra/repositories/read/admin_organization_queries'
import { AdminPackageActionFactory } from '#modules/admin/packages/actions/ports/inbound/admin_package_action_factory'
import {
  AdminSubscriptionRepository,
  AdminSubscriptionWriter,
} from '#modules/admin/packages/actions/ports/outbound/admin_operational_repository'
import { AdminSubscriptionReadOps } from '#modules/admin/packages/infra/repositories/read/admin_subscription_queries'
import { AdminSubscriptionWriteOps } from '#modules/admin/packages/infra/repositories/write/admin_subscription_mutations'
import { AdminPermissionActionFactory } from '#modules/admin/permissions/actions/ports/inbound/admin_permission_action_factory'
import { AdminCustomSystemRoleGateway } from '#modules/admin/permissions/actions/ports/outbound/admin_custom_system_role_gateway'
import { AdminProficiencyActionFactory } from '#modules/admin/proficiency/actions/ports/inbound/admin_proficiency_action_factory'
import { AdminSkillRubricGateway } from '#modules/admin/proficiency/actions/ports/outbound/admin_skill_rubric_gateway'
import { AdminUserActionFactory } from '#modules/admin/users/actions/ports/inbound/admin_user_action_factory'
import { AdminMutationIdentityGenerator } from '#modules/admin/users/actions/ports/outbound/admin_mutation_identity_generator'
import { AdminUserSearchCandidateReader } from '#modules/admin/users/actions/ports/outbound/admin_search_candidate_readers'
import { AdminTransactionRunner } from '#modules/admin/users/actions/ports/outbound/admin_transaction_runner'
import {
  AdminUserDirectory,
  AdminUserLifecycleWriter,
} from '#modules/admin/users/actions/ports/outbound/admin_user_administration'
import { registerCustomSystemRoleProvider } from '#modules/authorization/public_contracts/custom_system_role_api'
import GetAdminReviewDisputeAiOperatorOverviewQuery from '#modules/reviews/actions/queries/get_admin_review_dispute_ai_operator_overview_query'
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
