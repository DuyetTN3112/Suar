import { OrganizationMemberProjectOffboardingAdapter } from './adapters/organization_member_project_offboarding_adapter.js'
import { OrganizationTaskWorkflowInitializerAdapter } from './adapters/organization_task_workflow_initializer_adapter.js'
import { ComposedOrganizationCreationCommandFactory } from './factories/organization_directory_action_factories.js'
import {
  ComposedOrganizationInvitationCommandFactory,
  ComposedOrganizationJoinRequestCommandFactory,
} from './factories/organization_invitation_action_factories.js'
import {
  ComposedOrganizationMemberAdministrationCommandFactory,
  ComposedOrganizationMembershipCommandFactory,
} from './factories/organization_member_action_factories.js'
import { notificationTransactionStager } from './notification_composition.js'
import { organizationCacheInvalidator } from './organization_cache_composition.js'
import {
  organizationEventPublisher,
  organizationMembershipRepository,
  organizationReader,
  organizationTransactionRunner,
  organizationWriter,
} from './organization_persistence_composition.js'
import { organizationUserReaderWriter } from './organization_user_composition.js'

import type { OrganizationActionContext } from '#modules/organizations/directory/actions/organization_action_context'
import type { OrganizationNotificationStager } from '#modules/organizations/directory/actions/ports/outbound/organization_notification_stager'
import type { OrganizationMemberProjectOffboarding } from '#modules/organizations/members/actions/ports/outbound/organization_member_project_offboarding'

export const organizationMemberProjectOffboarding =
  new OrganizationMemberProjectOffboardingAdapter()
export const organizationTaskWorkflowInitializer = new OrganizationTaskWorkflowInitializerAdapter()
export const organizationCreationCommandFactory = new ComposedOrganizationCreationCommandFactory(
  notificationTransactionStager,
  organizationUserReaderWriter,
  organizationTaskWorkflowInitializer,
  organizationTransactionRunner,
  organizationReader,
  organizationWriter,
  organizationMembershipRepository,
  organizationEventPublisher
)
export const organizationInvitationCommandFactory =
  new ComposedOrganizationInvitationCommandFactory(
    notificationTransactionStager,
    organizationUserReaderWriter,
    organizationTransactionRunner,
    organizationReader,
    organizationMembershipRepository,
    organizationEventPublisher,
    organizationCacheInvalidator
  )
export const organizationMemberAdministrationCommandFactory =
  new ComposedOrganizationMemberAdministrationCommandFactory(
    notificationTransactionStager,
    organizationMemberProjectOffboarding,
    organizationTransactionRunner,
    organizationReader,
    organizationMembershipRepository,
    organizationEventPublisher
  )
export const organizationMembershipCommandFactory =
  new ComposedOrganizationMembershipCommandFactory(
    notificationTransactionStager,
    organizationUserReaderWriter,
    organizationTransactionRunner,
    organizationMembershipRepository,
    organizationEventPublisher
  )
export const organizationJoinRequestCommandFactory =
  new ComposedOrganizationJoinRequestCommandFactory(
    organizationUserReaderWriter,
    notificationTransactionStager,
    organizationTransactionRunner,
    organizationReader,
    organizationMembershipRepository
  )

export const makeCreateOrganizationCommand = (context: OrganizationActionContext) =>
  organizationCreationCommandFactory.make(context)
export const makeInviteUserCommand = (context: OrganizationActionContext) =>
  organizationInvitationCommandFactory.makeInvite(context)
export const makeRemoveMemberCommand = (
  context: OrganizationActionContext,
  notificationStager: OrganizationNotificationStager = notificationTransactionStager,
  projectOffboarding: OrganizationMemberProjectOffboarding = organizationMemberProjectOffboarding
) =>
  organizationMemberAdministrationCommandFactory.makeRemove(
    context,
    notificationStager,
    projectOffboarding
  )
export const makeUpdateMemberRoleCommand = (context: OrganizationActionContext) =>
  organizationMemberAdministrationCommandFactory.makeUpdateRole(context)
export const makeProcessJoinRequestCommand = (context: OrganizationActionContext) =>
  organizationInvitationCommandFactory.makeProcessJoinRequest(context)

export function acceptOrganizationInvitation(
  organizationId: string,
  context: OrganizationActionContext
): Promise<void> {
  return organizationInvitationCommandFactory.makeAccept(context).execute(organizationId)
}

export function rejectOrganizationInvitation(
  organizationId: string,
  context: OrganizationActionContext
): Promise<void> {
  return organizationInvitationCommandFactory.makeReject(context).execute(organizationId)
}
