import { test } from '@japa/runner'

import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import { Result } from '#modules/errors/public_contracts/result'
import type { OrganizationInvitationQueryFactory } from '#modules/organizations/actions/ports/inbound/invitations/organization_invitation_query_factory'
import ListInvitationsController from '#modules/organizations/controllers/invitations/list_invitations_controller'
import type { OrganizationMemberQueryFactory } from '#modules/organizations/actions/ports/inbound/members/organization_member_query_factory'
import ListMembersController from '#modules/organizations/controllers/members/list_members_controller'

const makePageContext = () => ({
  auth: { user: { id: 'user-1' } },
  currentOrganizationId: 'org-1',
  request: {
    input: (_key: string, fallback?: unknown) => fallback,
    qs: () => ({}),
    ip: () => '127.0.0.1',
    header: () => 'unit-test',
  },
  session: { get: () => undefined },
  inertia: { render: () => undefined },
})

test.group('Organization page query Result boundaries', () => {
  test('invitations page controller unwraps the query Result contract', async ({ assert }) => {
    const failure = new ForbiddenException('Cannot view invitations')
    const queries = {
      makeInvitationsIndexPage: () => ({
        executeAndWrap: () => Promise.resolve(Result.fail(failure)),
        execute: () => Promise.reject(new Error('controller must use wrapped execution')),
      }),
    } as unknown as OrganizationInvitationQueryFactory

    let thrown: unknown
    try {
      await new ListInvitationsController(queries).handle(makePageContext() as never)
    } catch (error: unknown) {
      thrown = error
    }

    assert.strictEqual(thrown, failure)
  })

  test('members page controller unwraps the query Result contract', async ({ assert }) => {
    const failure = new ForbiddenException('Cannot view members')
    const queries = {
      makeMembersIndexPage: () => ({
        executeAndWrap: () => Promise.resolve(Result.fail(failure)),
        execute: () => Promise.reject(new Error('controller must use wrapped execution')),
      }),
    } as unknown as OrganizationMemberQueryFactory

    let thrown: unknown
    try {
      await new ListMembersController(queries).handle(makePageContext() as never)
    } catch (error: unknown) {
      thrown = error
    }

    assert.strictEqual(thrown, failure)
  })
})
