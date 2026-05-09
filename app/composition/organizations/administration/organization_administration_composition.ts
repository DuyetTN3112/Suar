import { OrganizationMemberInsightsReaderAdapter } from '#composition/organizations/dashboard/adapters/organization_member_insights_reader_adapter'
import { OrganizationPortfolioStatsAdapter } from '#composition/organizations/dashboard/adapters/organization_portfolio_stats_adapter'
import { OrganizationProjectListReaderAdapter } from '#composition/organizations/projects/adapters/organization_project_list_reader_adapter'
import { OrganizationTaskStatusReaderAdapter } from '#composition/organizations/workflow/adapters/organization_task_status_reader_adapter'
import { ComposedOrganizationAccessActionFactory } from '#composition/organizations/access/factories/organization_access_action_factories'
import { ComposedOrganizationDashboardQueryFactory } from '#composition/organizations/dashboard/factories/organization_dashboard_query_factory'
import { ComposedOrganizationInvitationQueryFactory } from '#composition/organizations/invitations/factories/organization_invitation_action_factories'
import { ComposedOrganizationMemberQueryFactory } from '#composition/organizations/members/factories/organization_member_action_factories'
import { ComposedOrganizationProjectQueryFactory } from '#composition/organizations/projects/factories/organization_project_action_factories'
import { ComposedOrganizationSettingsActionFactory } from '#composition/organizations/settings/factories/organization_settings_action_factory'
import { ComposedOrganizationWorkflowQueryFactory } from '#composition/organizations/workflow/factories/organization_workflow_action_factories'
import {
  organizationAdministrationRepository,
  organizationMembershipRepository,
  organizationReader,
  organizationTransactionRunner,
  organizationWriter,
} from '#composition/organizations/persistence/organization_persistence_composition'
import { organizationMemberSearchCandidateReader } from '#composition/organizations/search/organization_search_composition'
import { activeReviewDisputeMemberIdsQuery } from '#composition/reviews/organization-insights/review_organization_insights_composition'
import { userSkillSourceInsightsQuery } from '#composition/users/user-application/user_application_composition'

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
