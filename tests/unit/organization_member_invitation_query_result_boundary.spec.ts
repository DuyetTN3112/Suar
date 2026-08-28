import { test } from '@japa/runner'

import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import { Result } from '#modules/errors/public_contracts/result'
import type { OrganizationInvitationQueryFactory } from '#modules/organizations/actions/ports/inbound/invitations/organization_invitation_query_factory'
import ListJoinRequestsController from '#modules/organizations/controllers/invitations/list_join_requests_controller'
import type { OrganizationMemberCandidateQueryFactory } from '#modules/organizations/actions/ports/inbound/members/organization_member_candidate_query_factory'
import ListMemberCandidatesController from '#modules/organizations/controllers/members/list_member_candidates_controller'

const failureAction = () => {
  const failure = new NotFoundException('Organization data not found')
  return {
    failure,
    action: {
      executeAndWrap: () => Promise.resolve(Result.fail(failure)),
      handle: () => Promise.reject(new Error('controller must use executeAndWrap')),
    },
  }
}

test.group('Organization member/invitation query Result boundaries', () => {
  test('member candidates controller preserves expected query failures', async ({ assert }) => {
    const { failure, action } = failureAction()
    const actions = { make: () => action } as unknown as OrganizationMemberCandidateQueryFactory
    const ctx = {
      auth: { user: { id: 'user-1' } },
      currentOrganizationId: 'org-1',
      request: {
        input: () => undefined,
        ip: () => '127.0.0.1',
        header: () => 'unit-test',
      },
      response: { ok: () => undefined },
    }

    let thrown: unknown
    try {
      await new ListMemberCandidatesController(actions).handle(ctx as never)
    } catch (error: unknown) {
      thrown = error
    }

    assert.strictEqual(thrown, failure)
  })

  test('join requests controller preserves expected query failures', async ({ assert }) => {
    const { failure, action } = failureAction()
    const actions = {
      makeListJoinRequests: () => action,
    } as unknown as OrganizationInvitationQueryFactory
    const ctx = {
      auth: { user: { id: 'user-1' } },
      currentOrganizationId: 'org-1',
      request: {
        input: () => undefined,
        ip: () => '127.0.0.1',
        header: () => 'unit-test',
      },
      inertia: { render: () => undefined },
    }

    let thrown: unknown
    try {
      await new ListJoinRequestsController(actions).handle(ctx as never)
    } catch (error: unknown) {
      thrown = error
    }

    assert.strictEqual(thrown, failure)
  })
})
