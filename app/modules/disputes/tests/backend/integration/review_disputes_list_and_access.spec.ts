import { test } from '@japa/runner'

import {
  configureReviewDisputesTestGroup,
  createDisputeScenario,
  db,
  UserFactory,
} from './support/review_disputes_test_support.js'

test.group('Integration | Review disputes list and access control', (group) => {
  configureReviewDisputesTestGroup(group)

  test('admin disputes list API returns wrapped list with pagination and camelCase fields', async ({
    assert,
    client,
  }) => {
    const { superadmin, disputeId, reviewee } = await createDisputeScenario()
    await superadmin.refresh()
    await db.from('review_disputes').where('id', disputeId).update({
      status: 'admin_reviewing',
      reported_to_admin_at: new Date().toISOString(),
      reported_to_admin_by: reviewee.id,
    })

    const response = await client.get('/api/admin/reviews/disputes').loginAs(superadmin)
    response.assertStatus(200)

    const body = response.body() as {
      data: Array<{
        id: string
        reviewSessionId: string
        taskAssignmentId: string
        taskId: string
        revieweeId: string
        openedBy: string
        disputeReason: string
        requestedOutcome: string
        finalDecision: string | null
        finalRationale: string | null
        createdAt: string
        resolvedAt: string | null
        taskTitle: string | null
        revieweeUsername: string | null
        reviewSessionStatus: string | null
        commentsCount: number
        evidencesCount: number
        latestCaseVersion: number | null
        aiEvaluationsCount: number
      }>
      pagination: {
        page: number
        perPage: number
        total: number
        hasNextPage: boolean
        nextCursor: string | null
        previousCursor: string | null
        hasPreviousPage: boolean
      }
    }

    assert.notProperty(body, 'success')
    assert.equal(body.data[0]?.id, disputeId)
    assert.property(body.data[0] ?? {}, 'reviewSessionId')
    assert.property(body.data[0] ?? {}, 'taskAssignmentId')
    assert.property(body.data[0] ?? {}, 'taskId')
    assert.property(body.data[0] ?? {}, 'revieweeId')
    assert.property(body.data[0] ?? {}, 'openedBy')
    assert.property(body.data[0] ?? {}, 'disputeReason')
    assert.property(body.data[0] ?? {}, 'requestedOutcome')
    assert.property(body.data[0] ?? {}, 'createdAt')
    assert.property(body.data[0] ?? {}, 'resolvedAt')
    assert.property(body.data[0] ?? {}, 'taskTitle')
    assert.property(body.data[0] ?? {}, 'revieweeUsername')
    assert.property(body.data[0] ?? {}, 'reviewSessionStatus')
    assert.property(body.data[0] ?? {}, 'commentsCount')
    assert.property(body.data[0] ?? {}, 'evidencesCount')
    assert.property(body.data[0] ?? {}, 'latestCaseVersion')
    assert.property(body.data[0] ?? {}, 'aiEvaluationsCount')
    assert.deepInclude(body.pagination, {
      page: 1,
      perPage: 20,
      nextCursor: null,
      previousCursor: null,
      hasPreviousPage: false,
    })
  })

  test('admin disputes list hides unreported classic review disputes', async ({ assert, client }) => {
    const { superadmin, disputeId } = await createDisputeScenario()
    await superadmin.refresh()

    const response = await client.get('/api/admin/reviews/disputes').loginAs(superadmin)
    response.assertStatus(200)
    const body = response.body() as { data: Array<{ id: string }> }
    assert.notInclude(
      body.data.map((item) => item.id),
      disputeId
    )
  })

  test('admin dispute APIs deny non-admin and guest access without leaking or mutating disputes', async ({
    assert,
    client,
  }) => {
    const regularUser = await UserFactory.create({ system_role: 'registered_user' })
    const { disputeId } = await createDisputeScenario()
    const sentinelBody = `forbidden_dispute_mutation_${Date.now()}`

    const listRegularResponse = await client
      .get('/api/admin/reviews/disputes')
      .loginAs(regularUser)
    const listGuestResponse = await client.get('/api/admin/reviews/disputes')
    const resolveRegularResponse = await client
      .post(`/api/admin/reviews/disputes/${disputeId}/resolve`)
      .loginAs(regularUser)
      .json({
        decision: 'rejected',
        notes: sentinelBody,
      })
    const resolveGuestResponse = await client
      .post(`/api/admin/reviews/disputes/${disputeId}/resolve`)
      .json({
        decision: 'rejected',
        notes: sentinelBody,
      })

    listRegularResponse.assertStatus(403)
    listGuestResponse.assertStatus(401)
    resolveRegularResponse.assertStatus(403)
    resolveGuestResponse.assertStatus(401)

    for (const response of [
      listRegularResponse,
      listGuestResponse,
      resolveRegularResponse,
      resolveGuestResponse,
    ]) {
      assert.notInclude(response.text(), disputeId)
      assert.notInclude(response.text(), sentinelBody)
      assert.notInclude(response.text(), 'E_INTERNAL_ERROR')
    }

    const dispute = (await db
      .from('review_disputes')
      .where('id', disputeId)
      .select('status', 'resolved_at')
      .first()) as { status: string; resolved_at: unknown }
    assert.equal(dispute.status, 'pending')
    assert.isNull(dispute.resolved_at)
  })

  test('org disputes list API returns wrapped list with pagination and camelCase fields', async ({
    assert,
    client,
  }) => {
    const { owner, disputeId } = await createDisputeScenario()
    await owner.refresh()

    const response = await client.get('/api/org/reviews/disputes').loginAs(owner)
    response.assertStatus(200)

    const body = response.body() as {
      data: Array<{
        id: string
        reviewSessionId: string
        taskAssignmentId: string
        taskId: string
        revieweeId: string
        openedBy: string
        disputeReason: string
        requestedOutcome: string
        finalDecision: string | null
        finalRationale: string | null
        createdAt: string
        resolvedAt: string | null
        taskTitle: string | null
        revieweeUsername: string | null
        reviewSessionStatus: string | null
        commentsCount: number
        evidencesCount: number
      }>
      pagination: {
        page: number
        perPage: number
        total: number
        hasNextPage: boolean
        nextCursor: string | null
        previousCursor: string | null
        hasPreviousPage: boolean
      }
    }

    assert.notProperty(body, 'success')
    assert.equal(body.data[0]?.id, disputeId)
    assert.property(body.data[0] ?? {}, 'reviewSessionId')
    assert.property(body.data[0] ?? {}, 'taskAssignmentId')
    assert.property(body.data[0] ?? {}, 'taskId')
    assert.property(body.data[0] ?? {}, 'revieweeId')
    assert.property(body.data[0] ?? {}, 'openedBy')
    assert.property(body.data[0] ?? {}, 'disputeReason')
    assert.property(body.data[0] ?? {}, 'requestedOutcome')
    assert.property(body.data[0] ?? {}, 'createdAt')
    assert.property(body.data[0] ?? {}, 'resolvedAt')
    assert.property(body.data[0] ?? {}, 'taskTitle')
    assert.property(body.data[0] ?? {}, 'revieweeUsername')
    assert.property(body.data[0] ?? {}, 'reviewSessionStatus')
    assert.property(body.data[0] ?? {}, 'commentsCount')
    assert.property(body.data[0] ?? {}, 'evidencesCount')
    assert.deepInclude(body.pagination, {
      page: 1,
      perPage: 20,
      nextCursor: null,
      previousCursor: null,
      hasPreviousPage: false,
    })
  })

  test('canonical v1 org disputes list API preserves legacy wrapped contract', async ({
    assert,
    client,
  }) => {
    const { owner, disputeId } = await createDisputeScenario()
    await owner.refresh()

    const response = await client
      .get('/api/v1/me/organizations/current/reviews/disputes?page=1&perPage=20')
      .loginAs(owner)

    response.assertStatus(200)

    const body = response.body() as {
      data: Array<{ id: string }>
      pagination: { page: number; perPage: number }
    }

    assert.notProperty(body, 'success')
    assert.lengthOf(body.data, 1)
    assert.equal(body.data[0]?.id, disputeId)
    assert.deepInclude(body.pagination, { page: 1, perPage: 20 })
  })
})
