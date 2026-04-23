import type { ApplicationService } from '@adonisjs/core/types'

import { DebugOrganizationInfoReaderAdapter } from '#composition/adapters/observability/debug_organization_info_reader_adapter'
import { TasksOrganizationTaskDetailReaderAdapter } from '#composition/organizations/tasks/adapters/tasks_organization_task_detail_reader_adapter'
import { TasksOrganizationTaskIndexPageReaderAdapter } from '#composition/organizations/tasks/adapters/tasks_organization_task_index_page_reader_adapter'
import { TasksOrganizationTaskStatusCreatorAdapter } from '#composition/adapters/tasks/tasks_organization_task_status_creator_adapter'
import { UsersOrganizationMemberCandidateReaderAdapter } from '#composition/adapters/users/users_organization_member_candidate_reader_adapter'
import { ComposedOrganizationSwitchCommandFactory } from '#composition/organizations/access/factories/organization_access_action_factories'
import {
  ComposedOrganizationDirectoryQueryFactory,
  ComposedOrganizationUpdateCommandFactory,
} from '#composition/organizations/directory/factories/organization_directory_action_factories'
import { ComposedOrganizationMemberCandidateQueryFactory } from '#composition/organizations/members/factories/organization_member_action_factories'
import { ComposedOrganizationProjectCreationCommandFactory } from '#composition/organizations/projects/factories/organization_project_action_factories'
import { ComposedOrganizationTaskQueryFactory } from '#composition/organizations/tasks/factories/organization_task_query_factory'
import { ComposedOrganizationWorkflowCommandFactory } from '#composition/organizations/workflow/factories/organization_workflow_action_factories'
import { organizationRouteAccessReader } from '#composition/organizations/access/organization_access_read_composition'
import {
  organizationAccessActionFactory,
  organizationDashboardQueryFactory,
  organizationInvitationQueryFactory,
  organizationMemberQueryFactory,
  organizationProjectQueryFactory,
  organizationSettingsActionFactory,
  organizationWorkflowQueryFactory,
} from '#composition/organizations/administration/organization_administration_composition'
import { organizationMemberApprovalCommandFactory } from '#composition/organizations/members/organization_member_approval_composition'
import {
  organizationCreationCommandFactory,
  organizationInvitationCommandFactory,
  organizationJoinRequestCommandFactory,
  organizationMemberAdministrationCommandFactory,
  organizationMembershipCommandFactory,
} from '#composition/organizations/members/organization_notification_composition'
import { organizationPortfolioQueryFactory } from '#composition/organizations/dashboard/organization_portfolio_composition'
import { organizationProjectCreator } from '#composition/organizations/projects/organization_project_creator_composition'
import { organizationDeletionCommandFactory } from '#composition/organizations/projects/organization_project_lifecycle_composition'
import {
  organizationMemberSearchCandidateReader,
  organizationProjectSearchCandidateReader,
  organizationSearchCandidateReader,
} from '#composition/organizations/search/organization_search_composition'
import { organizationUserReaderWriter } from '#composition/organizations/directory/organization_user_composition'
import { userAdministrationQueryFactory } from '#composition/users/user-factories/user_action_factory'

import {
  organizationEventPublisher,
  organizationMembershipRepository,
  organizationReader,
  organizationTransactionRunner,
  organizationWorkHistoryReader,
  organizationWriter,
} from '#composition/organizations/persistence/organization_persistence_composition'
import {
  taskBoardQueryFactory,
  taskDetailQueryFactory,
  taskStatusDefinitionCommandFactory,
} from '#composition/tasks/task-application/task_application_composition'
import { DebugOrganizationInfoReader } from '#modules/http/actions/ports/outbound/debug_organization_info_reader'
import GetDebugOrganizationInfoQuery from '#modules/http/actions/queries/runtime/get_debug_organization_info_query'
import { OrganizationAccessActionFactory } from '#modules/organizations/actions/ports/inbound/access/organization_access_action_factory'
import { OrganizationRouteAccessReader } from '#modules/organizations/actions/ports/inbound/access/organization_route_access_reader'
import { OrganizationSwitchCommandFactory } from '#modules/organizations/actions/ports/inbound/access/organization_switch_command_factory'
import { OrganizationDashboardQueryFactory } from '#modules/organizations/actions/ports/inbound/dashboard/organization_dashboard_query_factory'
import { OrganizationCreationCommandFactory } from '#modules/organizations/actions/ports/inbound/directory/organization_creation_command_factory'
import { OrganizationDeletionCommandFactory } from '#modules/organizations/actions/ports/inbound/directory/organization_deletion_command_factory'
import { OrganizationDirectoryQueryFactory } from '#modules/organizations/actions/ports/inbound/directory/organization_directory_query_factory'
import { OrganizationPortfolioQueryFactory } from '#modules/organizations/actions/ports/inbound/directory/organization_portfolio_query_factory'
import { OrganizationUpdateCommandFactory } from '#modules/organizations/actions/ports/inbound/directory/organization_update_command_factory'
import { OrganizationEventPublisher } from '#modules/organizations/actions/ports/outbound/directory/organization_event_publisher'
import { OrganizationUserReaderWriter as AccessOrganizationUserReaderWriter } from '#modules/organizations/actions/ports/outbound/access/organization_external_dependencies'
import { OrganizationUserReaderWriter } from '#modules/organizations/actions/ports/outbound/directory/organization_external_dependencies'
import {
  OrganizationMembershipRepository,
  OrganizationReader,
  OrganizationWorkHistoryReader,
  OrganizationWriter,
} from '#modules/organizations/actions/ports/outbound/directory/organization_persistence'
import { OrganizationSearchCandidateReader } from '#modules/organizations/actions/ports/outbound/directory/organization_search_candidate_reader'
import { OrganizationTransactionRunner } from '#modules/organizations/actions/ports/outbound/organization_transaction'
import { OrganizationInvitationCommandFactory } from '#modules/organizations/actions/ports/inbound/invitations/organization_invitation_command_factory'
import { OrganizationInvitationQueryFactory } from '#modules/organizations/actions/ports/inbound/invitations/organization_invitation_query_factory'
import { OrganizationJoinRequestCommandFactory } from '#modules/organizations/actions/ports/inbound/invitations/organization_join_request_command_factory'
import { OrganizationMemberAdministrationCommandFactory } from '#modules/organizations/actions/ports/inbound/members/organization_member_administration_command_factory'
import { OrganizationMemberApprovalCommandFactory } from '#modules/organizations/actions/ports/inbound/members/organization_member_approval_command_factory'
import { OrganizationMemberCandidateQueryFactory } from '#modules/organizations/actions/ports/inbound/members/organization_member_candidate_query_factory'
import { OrganizationMemberQueryFactory } from '#modules/organizations/actions/ports/inbound/members/organization_member_query_factory'
import { OrganizationMembershipCommandFactory } from '#modules/organizations/actions/ports/inbound/members/organization_membership_command_factory'
import { OrganizationMemberCandidateReader } from '#modules/organizations/actions/ports/outbound/members/organization_member_candidate_reader'
import { OrganizationMemberSearchCandidateReader } from '#modules/organizations/actions/ports/outbound/members/organization_member_search_candidate_reader'
import { OrganizationProjectCreationCommandFactory } from '#modules/organizations/actions/ports/inbound/projects/organization_project_creation_command_factory'
import { OrganizationProjectQueryFactory } from '#modules/organizations/actions/ports/inbound/projects/organization_project_query_factory'
import { OrganizationProjectCreator } from '#modules/organizations/actions/ports/outbound/projects/organization_project_creator'
import { OrganizationProjectSearchCandidateReader } from '#modules/organizations/actions/ports/outbound/projects/organization_project_search_candidate_reader'
import { OrganizationSettingsActionFactory } from '#modules/organizations/actions/ports/inbound/settings/organization_settings_action_factory'
import { OrganizationTaskQueryFactory } from '#modules/organizations/actions/ports/inbound/tasks/organization_task_query_factory'
import { OrganizationTaskDetailReader } from '#modules/organizations/actions/ports/outbound/tasks/organization_task_detail_reader'
import { OrganizationTaskIndexPageReader } from '#modules/organizations/actions/ports/outbound/tasks/organization_task_index_page_reader'
import { OrganizationWorkflowCommandFactory } from '#modules/organizations/actions/ports/inbound/workflow/organization_workflow_command_factory'
import { OrganizationWorkflowQueryFactory } from '#modules/organizations/actions/ports/inbound/workflow/organization_workflow_query_factory'
import { OrganizationTaskStatusCreator } from '#modules/organizations/actions/ports/outbound/workflow/organization_task_status_creator'

export default class OrganizationConsumerPortsProvider {
  constructor(private readonly app: ApplicationService) {}

  register(): void {
    const memberCandidateReader = new UsersOrganizationMemberCandidateReaderAdapter(
      userAdministrationQueryFactory
    )
    const taskIndexPageReader = new TasksOrganizationTaskIndexPageReaderAdapter(
      taskBoardQueryFactory
    )
    const taskDetailReader = new TasksOrganizationTaskDetailReaderAdapter(taskDetailQueryFactory)
    const taskStatusCreator = new TasksOrganizationTaskStatusCreatorAdapter(
      taskStatusDefinitionCommandFactory
    )
    const debugOrganizationInfoReader = new DebugOrganizationInfoReaderAdapter()
    const switchCommandFactory = new ComposedOrganizationSwitchCommandFactory(
      organizationUserReaderWriter,
      organizationTransactionRunner,
      organizationReader,
      organizationMembershipRepository
    )
    const directoryQueryFactory = new ComposedOrganizationDirectoryQueryFactory(
      organizationUserReaderWriter,
      organizationReader,
      organizationMembershipRepository,
      organizationSearchCandidateReader
    )
    const updateCommandFactory = new ComposedOrganizationUpdateCommandFactory(
      organizationTransactionRunner,
      organizationReader,
      organizationWriter,
      organizationMembershipRepository,
      organizationEventPublisher
    )
    const memberCandidateQueryFactory = new ComposedOrganizationMemberCandidateQueryFactory(
      memberCandidateReader
    )
    const projectCreationCommandFactory = new ComposedOrganizationProjectCreationCommandFactory(
      organizationProjectCreator
    )
    const taskQueryFactory = new ComposedOrganizationTaskQueryFactory(
      taskIndexPageReader,
      taskDetailReader
    )
    const workflowCommandFactory = new ComposedOrganizationWorkflowCommandFactory(taskStatusCreator)

    this.app.container.singleton(OrganizationReader, () => organizationReader)
    this.app.container.singleton(OrganizationWriter, () => organizationWriter)
    this.app.container.singleton(
      OrganizationMembershipRepository,
      () => organizationMembershipRepository
    )
    this.app.container.singleton(OrganizationWorkHistoryReader, () => organizationWorkHistoryReader)
    this.app.container.singleton(OrganizationTransactionRunner, () => organizationTransactionRunner)
    this.app.container.singleton(OrganizationEventPublisher, () => organizationEventPublisher)
    this.app.container.singleton(OrganizationRouteAccessReader, () => organizationRouteAccessReader)
    this.app.container.singleton(DebugOrganizationInfoReader, () => debugOrganizationInfoReader)
    this.app.container.singleton(
      GetDebugOrganizationInfoQuery,
      () => new GetDebugOrganizationInfoQuery(debugOrganizationInfoReader)
    )
    this.app.container.singleton(OrganizationUserReaderWriter, () => organizationUserReaderWriter)
    this.app.container.singleton(
      AccessOrganizationUserReaderWriter,
      () => organizationUserReaderWriter
    )
    this.app.container.singleton(
      OrganizationSearchCandidateReader,
      () => organizationSearchCandidateReader
    )
    this.app.container.singleton(
      OrganizationMemberSearchCandidateReader,
      () => organizationMemberSearchCandidateReader
    )
    this.app.container.singleton(OrganizationMemberCandidateReader, () => memberCandidateReader)
    this.app.container.singleton(
      OrganizationProjectSearchCandidateReader,
      () => organizationProjectSearchCandidateReader
    )
    this.app.container.singleton(OrganizationProjectCreator, () => organizationProjectCreator)
    this.app.container.singleton(
      OrganizationPortfolioQueryFactory,
      () => organizationPortfolioQueryFactory
    )
    this.app.container.singleton(
      OrganizationCreationCommandFactory,
      () => organizationCreationCommandFactory
    )
    this.app.container.singleton(
      OrganizationAccessActionFactory,
      () => organizationAccessActionFactory
    )
    this.app.container.singleton(OrganizationSwitchCommandFactory, () => switchCommandFactory)
    this.app.container.singleton(OrganizationDirectoryQueryFactory, () => directoryQueryFactory)
    this.app.container.singleton(OrganizationUpdateCommandFactory, () => updateCommandFactory)
    this.app.container.singleton(
      OrganizationDashboardQueryFactory,
      () => organizationDashboardQueryFactory
    )
    this.app.container.singleton(
      OrganizationInvitationQueryFactory,
      () => organizationInvitationQueryFactory
    )
    this.app.container.singleton(
      OrganizationMemberQueryFactory,
      () => organizationMemberQueryFactory
    )
    this.app.container.singleton(
      OrganizationMemberCandidateQueryFactory,
      () => memberCandidateQueryFactory
    )
    this.app.container.singleton(
      OrganizationProjectCreationCommandFactory,
      () => projectCreationCommandFactory
    )
    this.app.container.singleton(
      OrganizationProjectQueryFactory,
      () => organizationProjectQueryFactory
    )
    this.app.container.singleton(
      OrganizationSettingsActionFactory,
      () => organizationSettingsActionFactory
    )
    this.app.container.singleton(
      OrganizationWorkflowQueryFactory,
      () => organizationWorkflowQueryFactory
    )
    this.app.container.singleton(OrganizationWorkflowCommandFactory, () => workflowCommandFactory)
    this.app.container.singleton(OrganizationTaskQueryFactory, () => taskQueryFactory)
    this.app.container.singleton(
      OrganizationInvitationCommandFactory,
      () => organizationInvitationCommandFactory
    )
    this.app.container.singleton(
      OrganizationJoinRequestCommandFactory,
      () => organizationJoinRequestCommandFactory
    )
    this.app.container.singleton(
      OrganizationMemberAdministrationCommandFactory,
      () => organizationMemberAdministrationCommandFactory
    )
    this.app.container.singleton(
      OrganizationMembershipCommandFactory,
      () => organizationMembershipCommandFactory
    )
    this.app.container.singleton(
      OrganizationMemberApprovalCommandFactory,
      () => organizationMemberApprovalCommandFactory
    )
    this.app.container.singleton(
      OrganizationDeletionCommandFactory,
      () => organizationDeletionCommandFactory
    )
    this.app.container.singleton(OrganizationTaskIndexPageReader, () => taskIndexPageReader)
    this.app.container.singleton(OrganizationTaskDetailReader, () => taskDetailReader)
    this.app.container.singleton(OrganizationTaskStatusCreator, () => taskStatusCreator)
  }
}
