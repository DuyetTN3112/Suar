import type { ApplicationService } from '@adonisjs/core/types'

import { DebugOrganizationInfoReaderAdapter } from './adapters/debug_organization_info_reader_adapter.js'
import { TasksOrganizationTaskDetailReaderAdapter } from './adapters/tasks_organization_task_detail_reader_adapter.js'
import { TasksOrganizationTaskIndexPageReaderAdapter } from './adapters/tasks_organization_task_index_page_reader_adapter.js'
import { TasksOrganizationTaskStatusCreatorAdapter } from './adapters/tasks_organization_task_status_creator_adapter.js'
import { UsersOrganizationMemberCandidateReaderAdapter } from './adapters/users_organization_member_candidate_reader_adapter.js'
import { ComposedOrganizationSwitchCommandFactory } from './factories/organization_access_action_factories.js'
import {
  ComposedOrganizationDirectoryQueryFactory,
  ComposedOrganizationUpdateCommandFactory,
} from './factories/organization_directory_action_factories.js'
import { ComposedOrganizationMemberCandidateQueryFactory } from './factories/organization_member_action_factories.js'
import { ComposedOrganizationProjectCreationCommandFactory } from './factories/organization_project_action_factories.js'
import { ComposedOrganizationTaskQueryFactory } from './factories/organization_task_query_factory.js'
import { ComposedOrganizationWorkflowCommandFactory } from './factories/organization_workflow_action_factories.js'
import { organizationRouteAccessReader } from './organization_access_read_composition.js'
import {
  organizationAccessActionFactory,
  organizationDashboardQueryFactory,
  organizationInvitationQueryFactory,
  organizationMemberQueryFactory,
  organizationProjectQueryFactory,
  organizationSettingsActionFactory,
  organizationWorkflowQueryFactory,
} from './organization_administration_composition.js'
import { organizationMemberApprovalCommandFactory } from './organization_member_approval_composition.js'
import {
  organizationCreationCommandFactory,
  organizationInvitationCommandFactory,
  organizationJoinRequestCommandFactory,
  organizationMemberAdministrationCommandFactory,
  organizationMembershipCommandFactory,
} from './organization_notification_composition.js'
import { organizationPortfolioQueryFactory } from './organization_portfolio_composition.js'
import { organizationProjectCreator } from './organization_project_creator_composition.js'
import { organizationDeletionCommandFactory } from './organization_project_lifecycle_composition.js'
import {
  organizationMemberSearchCandidateReader,
  organizationProjectSearchCandidateReader,
  organizationSearchCandidateReader,
} from './organization_search_composition.js'
import { organizationUserReaderWriter } from './organization_user_composition.js'
import { userAdministrationQueryFactory } from './user_action_factory.js'

import {
  organizationEventPublisher,
  organizationMembershipRepository,
  organizationReader,
  organizationTransactionRunner,
  organizationWorkHistoryReader,
  organizationWriter,
} from '#composition/organization_persistence_composition'
import {
  taskBoardQueryFactory,
  taskDetailQueryFactory,
  taskStatusDefinitionCommandFactory,
} from '#composition/task_application_composition'
import { DebugOrganizationInfoReader } from '#modules/http/actions/ports/outbound/debug_organization_info_reader'
import GetDebugOrganizationInfoQuery from '#modules/http/actions/queries/get_debug_organization_info_query'
import { OrganizationAccessActionFactory } from '#modules/organizations/access/actions/ports/inbound/organization_access_action_factory'
import { OrganizationRouteAccessReader } from '#modules/organizations/access/actions/ports/inbound/organization_route_access_reader'
import { OrganizationSwitchCommandFactory } from '#modules/organizations/access/actions/ports/inbound/organization_switch_command_factory'
import { OrganizationDashboardQueryFactory } from '#modules/organizations/dashboard/actions/ports/inbound/organization_dashboard_query_factory'
import { OrganizationCreationCommandFactory } from '#modules/organizations/directory/actions/ports/inbound/organization_creation_command_factory'
import { OrganizationDeletionCommandFactory } from '#modules/organizations/directory/actions/ports/inbound/organization_deletion_command_factory'
import { OrganizationDirectoryQueryFactory } from '#modules/organizations/directory/actions/ports/inbound/organization_directory_query_factory'
import { OrganizationPortfolioQueryFactory } from '#modules/organizations/directory/actions/ports/inbound/organization_portfolio_query_factory'
import { OrganizationUpdateCommandFactory } from '#modules/organizations/directory/actions/ports/inbound/organization_update_command_factory'
import { OrganizationEventPublisher } from '#modules/organizations/directory/actions/ports/outbound/organization_event_publisher'
import { OrganizationUserReaderWriter } from '#modules/organizations/directory/actions/ports/outbound/organization_external_dependencies'
import {
  OrganizationMembershipRepository,
  OrganizationReader,
  OrganizationWorkHistoryReader,
  OrganizationWriter,
} from '#modules/organizations/directory/actions/ports/outbound/organization_persistence'
import { OrganizationSearchCandidateReader } from '#modules/organizations/directory/actions/ports/outbound/organization_search_candidate_reader'
import { OrganizationTransactionRunner } from '#modules/organizations/directory/actions/ports/outbound/organization_transaction'
import { OrganizationInvitationCommandFactory } from '#modules/organizations/invitations/actions/ports/inbound/organization_invitation_command_factory'
import { OrganizationInvitationQueryFactory } from '#modules/organizations/invitations/actions/ports/inbound/organization_invitation_query_factory'
import { OrganizationJoinRequestCommandFactory } from '#modules/organizations/invitations/actions/ports/inbound/organization_join_request_command_factory'
import { OrganizationMemberAdministrationCommandFactory } from '#modules/organizations/members/actions/ports/inbound/organization_member_administration_command_factory'
import { OrganizationMemberApprovalCommandFactory } from '#modules/organizations/members/actions/ports/inbound/organization_member_approval_command_factory'
import { OrganizationMemberCandidateQueryFactory } from '#modules/organizations/members/actions/ports/inbound/organization_member_candidate_query_factory'
import { OrganizationMemberQueryFactory } from '#modules/organizations/members/actions/ports/inbound/organization_member_query_factory'
import { OrganizationMembershipCommandFactory } from '#modules/organizations/members/actions/ports/inbound/organization_membership_command_factory'
import { OrganizationMemberCandidateReader } from '#modules/organizations/members/actions/ports/outbound/organization_member_candidate_reader'
import { OrganizationMemberSearchCandidateReader } from '#modules/organizations/members/actions/ports/outbound/organization_member_search_candidate_reader'
import { OrganizationProjectCreationCommandFactory } from '#modules/organizations/projects/actions/ports/inbound/organization_project_creation_command_factory'
import { OrganizationProjectQueryFactory } from '#modules/organizations/projects/actions/ports/inbound/organization_project_query_factory'
import { OrganizationProjectCreator } from '#modules/organizations/projects/actions/ports/outbound/organization_project_creator'
import { OrganizationProjectSearchCandidateReader } from '#modules/organizations/projects/actions/ports/outbound/organization_project_search_candidate_reader'
import { OrganizationSettingsActionFactory } from '#modules/organizations/settings/actions/ports/inbound/organization_settings_action_factory'
import { OrganizationTaskQueryFactory } from '#modules/organizations/tasks/actions/ports/inbound/organization_task_query_factory'
import { OrganizationTaskDetailReader } from '#modules/organizations/tasks/actions/ports/outbound/organization_task_detail_reader'
import { OrganizationTaskIndexPageReader } from '#modules/organizations/tasks/actions/ports/outbound/organization_task_index_page_reader'
import { OrganizationWorkflowCommandFactory } from '#modules/organizations/workflow/actions/ports/inbound/organization_workflow_command_factory'
import { OrganizationWorkflowQueryFactory } from '#modules/organizations/workflow/actions/ports/inbound/organization_workflow_query_factory'
import { OrganizationTaskStatusCreator } from '#modules/organizations/workflow/actions/ports/outbound/organization_task_status_creator'

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
