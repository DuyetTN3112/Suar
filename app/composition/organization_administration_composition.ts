import { OrganizationMemberInsightsReaderAdapter } from './adapters/organization_member_insights_reader_adapter.js'
import { OrganizationPortfolioStatsAdapter } from './adapters/organization_portfolio_stats_adapter.js'
import { OrganizationProjectListReaderAdapter } from './adapters/organization_project_list_reader_adapter.js'
import { OrganizationTaskStatusReaderAdapter } from './adapters/organization_task_status_reader_adapter.js'
import { ComposedOrganizationAccessActionFactory } from './factories/organization_access_action_factories.js'
import { ComposedOrganizationDashboardQueryFactory } from './factories/organization_dashboard_query_factory.js'
import { ComposedOrganizationInvitationQueryFactory } from './factories/organization_invitation_action_factories.js'
import { ComposedOrganizationMemberQueryFactory } from './factories/organization_member_action_factories.js'
import { ComposedOrganizationProjectQueryFactory } from './factories/organization_project_action_factories.js'
import { ComposedOrganizationSettingsActionFactory } from './factories/organization_settings_action_factory.js'
import { ComposedOrganizationWorkflowQueryFactory } from './factories/organization_workflow_action_factories.js'
import {
  organizationAdministrationRepository,
  organizationMembershipRepository,
  organizationReader,
  organizationTransactionRunner,
  organizationWriter,
} from './organization_persistence_composition.js'
import { organizationMemberSearchCandidateReader } from './organization_search_composition.js'
import { activeReviewDisputeMemberIdsQuery } from './review_organization_insights_composition.js'
import { userSkillSourceInsightsQuery } from './user_application_composition.js'

export const organizationMemberInsightsReader = new OrganizationMemberInsightsReaderAdapter(
  userSkillSourceInsightsQuery,
  activeReviewDisputeMemberIdsQuery
)

export const organizationAccessActionFactory = new ComposedOrganizationAccessActionFactory(
  organizationAdministrationRepository,
  organizationReader,
  organizationWriter,
  organizationMembershipRepository,
  organizationTransactionRunner
)

export const organizationDashboardQueryFactory = new ComposedOrganizationDashboardQueryFactory(
  organizationAdministrationRepository,
  new OrganizationPortfolioStatsAdapter(),
  organizationMembershipRepository,
  organizationMemberInsightsReader
)

export const organizationInvitationQueryFactory = new ComposedOrganizationInvitationQueryFactory(
  organizationAdministrationRepository,
  organizationMembershipRepository,
  organizationReader
)

export const organizationMemberQueryFactory = new ComposedOrganizationMemberQueryFactory(
  organizationAdministrationRepository,
  organizationMemberSearchCandidateReader,
  organizationReader
)

export const organizationProjectQueryFactory = new ComposedOrganizationProjectQueryFactory(
  new OrganizationProjectListReaderAdapter()
)

export const organizationSettingsActionFactory = new ComposedOrganizationSettingsActionFactory(
  organizationReader,
  organizationWriter,
  organizationMembershipRepository,
  organizationTransactionRunner
)

export const organizationWorkflowQueryFactory = new ComposedOrganizationWorkflowQueryFactory(
  new OrganizationTaskStatusReaderAdapter()
)
