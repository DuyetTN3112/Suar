import { test } from '@japa/runner'

import {
  ComposedOrganizationCreationCommandFactory,
  ComposedOrganizationDeletionCommandFactory,
} from '#composition/factories/organization_directory_action_factories'
import { ComposedOrganizationInvitationCommandFactory } from '#composition/factories/organization_invitation_action_factories'
import { ComposedOrganizationMemberAdministrationCommandFactory } from '#composition/factories/organization_member_action_factories'
import { organizationCacheInvalidator } from '#composition/organization_cache_composition'
import {
  organizationEventPublisher,
  organizationMembershipRepository,
  organizationReader,
  organizationTransactionRunner,
  organizationWriter,
} from '#composition/organization_persistence_composition'
import CreateOrganizationCommand from '#modules/organizations/directory/actions/command/create_organization_command'
import DeleteOrganizationCommand from '#modules/organizations/directory/actions/command/delete_organization_command'
import type { OrganizationActionContext } from '#modules/organizations/directory/actions/organization_action_context'
import type { OrganizationUserReaderWriter } from '#modules/organizations/directory/actions/ports/outbound/organization_external_dependencies'
import type { OrganizationNotificationStager } from '#modules/organizations/directory/actions/ports/outbound/organization_notification_stager'
import type { OrganizationProjectLifecycleReader } from '#modules/organizations/directory/actions/ports/outbound/organization_project_lifecycle_reader'
import type { OrganizationTaskWorkflowInitializer } from '#modules/organizations/directory/actions/ports/outbound/organization_task_workflow_initializer'
import AcceptOrganizationInvitationCommand from '#modules/organizations/invitations/actions/command/accept_organization_invitation_command'
import InviteUserCommand from '#modules/organizations/invitations/actions/command/invite_user_command'
import ProcessJoinRequestCommand from '#modules/organizations/invitations/actions/command/process_join_request_command'
import RejectOrganizationInvitationCommand from '#modules/organizations/invitations/actions/command/reject_organization_invitation_command'
import RemoveMemberCommand from '#modules/organizations/members/actions/command/remove_member_command'
import UpdateMemberRoleCommand from '#modules/organizations/members/actions/command/update_member_role_command'
import type { OrganizationMemberProjectOffboarding } from '#modules/organizations/members/actions/ports/outbound/organization_member_project_offboarding'

const context: OrganizationActionContext = {
  userId: 'user-1',
  organizationId: 'organization-1',
  ip: '127.0.0.1',
  userAgent: 'test-agent',
}

const notifications: OrganizationNotificationStager = {
  stage: () => Promise.resolve(undefined),
}

const users: OrganizationUserReaderWriter = {
  findOwnerNamesByIds: () => Promise.resolve([]),
  findUserIdentity: () => Promise.resolve(null),
  findUserByEmail: () => Promise.resolve(null),
  isActiveUser: () => Promise.resolve(true),
  isSystemSuperadmin: () => Promise.resolve(false),
  updateCurrentOrganization: () => Promise.resolve(undefined),
  loadDebugOrganizations: () =>
    Promise.resolve({
      id: 'user-1',
      username: 'user',
      currentOrganizationId: 'organization-1',
      organizations: [],
    }),
}

const offboarding: OrganizationMemberProjectOffboarding = {
  offboardMember: () => Promise.resolve(undefined),
}

const projects: OrganizationProjectLifecycleReader = {
  countNonDeletedProjects: () => Promise.resolve(0),
  countRetainedProjects: () => Promise.resolve(0),
}

const taskWorkflow: OrganizationTaskWorkflowInitializer = {
  seedDefaultStatusesForOrganization: () => Promise.resolve(undefined),
}

test.group('Organization command factories', () => {
  test('creation factory creates fresh creation commands', ({ assert }) => {
    const factory = new ComposedOrganizationCreationCommandFactory(
      notifications,
      users,
      taskWorkflow,
      organizationTransactionRunner,
      organizationReader,
      organizationWriter,
      organizationMembershipRepository,
      organizationEventPublisher
    )
    const first = factory.make(context)
    const second = factory.make(context)

    assert.instanceOf(first, CreateOrganizationCommand)
    assert.notStrictEqual(first, second)
  })

  test('invitation factory exposes only invitation and join-request use cases', ({ assert }) => {
    const factory = new ComposedOrganizationInvitationCommandFactory(
      notifications,
      users,
      organizationTransactionRunner,
      organizationReader,
      organizationMembershipRepository,
      organizationEventPublisher,
      organizationCacheInvalidator
    )

    assert.instanceOf(factory.makeInvite(context), InviteUserCommand)
    assert.instanceOf(factory.makeProcessJoinRequest(context), ProcessJoinRequestCommand)
    assert.instanceOf(factory.makeAccept(context), AcceptOrganizationInvitationCommand)
    assert.instanceOf(factory.makeReject(context), RejectOrganizationInvitationCommand)
  })

  test('member administration factory exposes removal and role changes', ({ assert }) => {
    const factory = new ComposedOrganizationMemberAdministrationCommandFactory(
      notifications,
      offboarding,
      organizationTransactionRunner,
      organizationReader,
      organizationMembershipRepository,
      organizationEventPublisher
    )

    assert.instanceOf(factory.makeRemove(context), RemoveMemberCommand)
    assert.instanceOf(factory.makeUpdateRole(context), UpdateMemberRoleCommand)
  })

  test('deletion factory creates project-aware deletion commands', ({ assert }) => {
    const factory = new ComposedOrganizationDeletionCommandFactory(
      projects,
      organizationTransactionRunner,
      organizationReader,
      organizationWriter,
      organizationMembershipRepository,
      organizationEventPublisher
    )
    const first = factory.make(context)
    const second = factory.make(context)

    assert.instanceOf(first, DeleteOrganizationCommand)
    assert.notStrictEqual(first, second)
  })
})
