import { test } from '@japa/runner'

import { ComposedOrganizationMemberApprovalCommandFactory } from '#composition/organizations/members/factories/organization_member_action_factories'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import { makeSystemOrganizationActionContext } from '#modules/organizations/actions/action_context'
import ApprovePendingOrganizationMemberCommand from '#modules/organizations/actions/commands/members/approve_pending_organization_member_command'
import type { OrganizationPendingMemberApprovalGateway } from '#modules/organizations/actions/ports/outbound/members/organization_pending_member_approval_gateway'

test.group('Organization pending-member approval command', () => {
  test('delegates the Organizations-owned intent and authenticated actor to its gateway', async ({
    assert,
  }) => {
    const calls: unknown[] = []
    const gateway: OrganizationPendingMemberApprovalGateway = {
      approvePendingMember: (input, context) => {
        calls.push({ input, context })
        return Promise.resolve()
      },
    }
    const context = makeSystemOrganizationActionContext('approver-1')
    const factory = new ComposedOrganizationMemberApprovalCommandFactory(gateway)

    await factory.make(context).execute({
      organizationId: 'organization-1',
      targetUserId: 'user-1',
    })

    assert.deepEqual(calls, [
      {
        input: {
          organizationId: 'organization-1',
          targetUserId: 'user-1',
          approverId: 'approver-1',
        },
        context,
      },
    ])
  })

  test('rejects an unauthenticated approval before calling the gateway', async ({ assert }) => {
    let called = false
    const command = new ApprovePendingOrganizationMemberCommand(
      {
        userId: null,
        organizationId: 'organization-1',
        ip: '127.0.0.1',
        userAgent: 'test',
      },
      {
        approvePendingMember: () => {
          called = true
          return Promise.resolve()
        },
      }
    )

    await assert.rejects(
      () =>
        command.execute({
          organizationId: 'organization-1',
          targetUserId: 'user-1',
        }),
      UnauthorizedException
    )
    assert.isFalse(called)
  })
})
