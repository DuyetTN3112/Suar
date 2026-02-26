import CreateOrganizationCommand from '#modules/organizations/directory/actions/command/create_organization_command'
import DeleteOrganizationCommand from '#modules/organizations/directory/actions/command/delete_organization_command'
import UpdateOrganizationCommand from '#modules/organizations/directory/actions/command/update_organization_command'
import type { OrganizationActionContext } from '#modules/organizations/directory/actions/organization_action_context'
import { OrganizationCreationCommandFactory } from '#modules/organizations/directory/actions/ports/inbound/organization_creation_command_factory'
import { OrganizationDeletionCommandFactory } from '#modules/organizations/directory/actions/ports/inbound/organization_deletion_command_factory'
import { OrganizationDirectoryQueryFactory } from '#modules/organizations/directory/actions/ports/inbound/organization_directory_query_factory'
import { OrganizationPortfolioQueryFactory } from '#modules/organizations/directory/actions/ports/inbound/organization_portfolio_query_factory'
import { OrganizationUpdateCommandFactory } from '#modules/organizations/directory/actions/ports/inbound/organization_update_command_factory'
import type { OrganizationEventPublisher } from '#modules/organizations/directory/actions/ports/outbound/organization_event_publisher'
import type { OrganizationUserReaderWriter } from '#modules/organizations/directory/actions/ports/outbound/organization_external_dependencies'
import type { OrganizationNotificationStager } from '#modules/organizations/directory/actions/ports/outbound/organization_notification_stager'
import type {
  OrganizationMembershipRepository,
  OrganizationReader,
  OrganizationWriter,
} from '#modules/organizations/directory/actions/ports/outbound/organization_persistence'
import type { OrganizationPortfolioStatsReader } from '#modules/organizations/directory/actions/ports/outbound/organization_portfolio_stats_reader'
import type { OrganizationProjectLifecycleReader } from '#modules/organizations/directory/actions/ports/outbound/organization_project_lifecycle_reader'
import type { OrganizationReverseReviewReader } from '#modules/organizations/directory/actions/ports/outbound/organization_reverse_review_reader'
import type { OrganizationSearchCandidateReader } from '#modules/organizations/directory/actions/ports/outbound/organization_search_candidate_reader'
import type { OrganizationTaskWorkflowInitializer } from '#modules/organizations/directory/actions/ports/outbound/organization_task_workflow_initializer'
import type { OrganizationTransactionRunner } from '#modules/organizations/directory/actions/ports/outbound/organization_transaction'
import GetAllOrganizationsQuery from '#modules/organizations/directory/actions/query/get_all_organizations_query'
import GetOrganizationDetailQuery from '#modules/organizations/directory/actions/query/get_organization_detail_query'
import GetOrganizationShowPageQuery from '#modules/organizations/directory/actions/query/get_organization_show_page_query'
import GetOrganizationsIndexPageQuery from '#modules/organizations/directory/actions/query/get_organizations_index_page_query'

export class ComposedOrganizationCreationCommandFactory extends OrganizationCreationCommandFactory {
  constructor(
    private readonly notificationStager: OrganizationNotificationStager,
    private readonly users: OrganizationUserReaderWriter,
    private readonly taskWorkflowInitializer: OrganizationTaskWorkflowInitializer,
    private readonly transactions: OrganizationTransactionRunner,
    private readonly organizations: OrganizationReader,
    private readonly organizationWriter: OrganizationWriter,
    private readonly memberships: OrganizationMembershipRepository,
    private readonly events: OrganizationEventPublisher
  ) {
    super()
  }

  make(context: OrganizationActionContext): CreateOrganizationCommand {
    return new CreateOrganizationCommand(
      context,
      this.notificationStager,
      this.users,
      this.taskWorkflowInitializer,
      this.transactions,
      this.organizations,
      this.organizationWriter,
      this.memberships,
      this.events
    )
  }
}

export class ComposedOrganizationDeletionCommandFactory extends OrganizationDeletionCommandFactory {
  constructor(
    private readonly projects: OrganizationProjectLifecycleReader,
    private readonly transactions: OrganizationTransactionRunner,
    private readonly organizations: OrganizationReader,
    private readonly organizationWriter: OrganizationWriter,
    private readonly memberships: OrganizationMembershipRepository,
    private readonly events: OrganizationEventPublisher
  ) {
    super()
  }

  make(context: OrganizationActionContext): DeleteOrganizationCommand {
    return new DeleteOrganizationCommand(
      context,
      this.projects,
      this.transactions,
      this.organizations,
      this.organizationWriter,
      this.memberships,
      this.events
    )
  }
}

export class ComposedOrganizationDirectoryQueryFactory extends OrganizationDirectoryQueryFactory {
  constructor(
    private readonly users: OrganizationUserReaderWriter,
    private readonly organizations: OrganizationReader,
    private readonly memberships: OrganizationMembershipRepository,
    private readonly searchCandidates: OrganizationSearchCandidateReader
  ) {
    super()
  }

  makeAllOrganizationsQuery(): GetAllOrganizationsQuery {
    return new GetAllOrganizationsQuery(
      this.users,
      this.organizations,
      this.memberships,
      { searchCandidateReader: this.searchCandidates }
    )
  }
}

export class ComposedOrganizationPortfolioQueryFactory extends OrganizationPortfolioQueryFactory {
  constructor(
    private readonly portfolioStats: OrganizationPortfolioStatsReader,
    private readonly users: OrganizationUserReaderWriter,
    private readonly organizations: OrganizationReader,
    private readonly memberships: OrganizationMembershipRepository,
    private readonly defaultSearchCandidates: OrganizationSearchCandidateReader,
    private readonly reverseReviews: OrganizationReverseReviewReader
  ) {
    super()
  }

  makeDetail(context: OrganizationActionContext): GetOrganizationDetailQuery {
    return new GetOrganizationDetailQuery(
      context,
      this.portfolioStats,
      this.users,
      this.organizations,
      this.memberships
    )
  }

  makeShowPage(context: OrganizationActionContext): GetOrganizationShowPageQuery {
    return new GetOrganizationShowPageQuery(
      context,
      this.portfolioStats,
      this.users,
      this.organizations,
      this.memberships,
      this.reverseReviews
    )
  }

  makeIndexPage(
    context: OrganizationActionContext,
    searchCandidates: OrganizationSearchCandidateReader = this.defaultSearchCandidates
  ): GetOrganizationsIndexPageQuery {
    return new GetOrganizationsIndexPageQuery(
      context,
      this.portfolioStats,
      this.users,
      this.organizations,
      this.memberships,
      searchCandidates
    )
  }
}

export class ComposedOrganizationUpdateCommandFactory extends OrganizationUpdateCommandFactory {
  constructor(
    private readonly transactions: OrganizationTransactionRunner,
    private readonly organizations: OrganizationReader,
    private readonly organizationWriter: OrganizationWriter,
    private readonly memberships: OrganizationMembershipRepository,
    private readonly events: OrganizationEventPublisher
  ) {
    super()
  }

  make(context: OrganizationActionContext): UpdateOrganizationCommand {
    return new UpdateOrganizationCommand(
      context,
      this.transactions,
      this.organizations,
      this.organizationWriter,
      this.memberships,
      this.events
    )
  }
}
