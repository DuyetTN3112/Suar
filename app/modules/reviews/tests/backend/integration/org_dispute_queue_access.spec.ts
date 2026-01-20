import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { reviewOrgDisputeReader } from '#composition/review_action_factory'
import { reviewExternalDependencies } from '#composition/review_external_dependencies_composition'
import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import ListOrgReviewDisputesQuery from '#modules/reviews/actions/queries/list_org_review_disputes_query'
import { makeSystemReviewActionContext } from '#modules/reviews/actions/review_action_context'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  OrganizationFactory,
  ProjectFactory,
  TaskFactory,
} from '#tests/helpers/factories'
import { testId } from '#tests/helpers/test_utils'

function makeReviewActionContext(userId: string, organizationId: string | null): ReviewActionContext {
  return {
    ...makeSystemReviewActionContext(userId),
    organizationId,
  }
}

test.group('Integration | Org Dispute Queue Access', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('org approved member can access their organization disputes query', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
    })
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      project_id: project.id,
    })

    const disputeId = testId()
    await db.table('review_disputes').insert({
      id: disputeId,
      review_session_id: testId(),
      task_assignment_id: testId(),
      task_id: task.id,
      reviewee_id: owner.id,
      opened_by: owner.id,
      status: 'pending',
      dispute_reason: 'I deserve a higher score on code quality',
      requested_outcome: 'adjust_score',
      disputed_dimensions: JSON.stringify({ quality: true }),
      disputed_skill_reviews: JSON.stringify([]),
    })

    const ctx = makeReviewActionContext(owner.id, org.id)
    const query = new ListOrgReviewDisputesQuery(
      ctx,
      reviewExternalDependencies.organization,
      reviewOrgDisputeReader
    )
    const result = await query.execute({ page: 1, perPage: 10 })

    assert.isArray(result.data)
    assert.equal(result.data.length, 1)
    const [firstDispute] = result.data
    if (firstDispute === undefined) {
      throw new Error('Expected dispute result for organization owner')
    }
    assert.equal(firstDispute.id, disputeId)
    assert.equal(firstDispute.task_title, task.title)
  })

  test('user from another organization is rejected', async ({ assert }) => {
    const { org } = await OrganizationFactory.createWithOwner()
    const { owner: otherOwner } = await OrganizationFactory.createWithOwner()

    const ctx = makeReviewActionContext(otherOwner.id, org.id)
    const query = new ListOrgReviewDisputesQuery(
      ctx,
      reviewExternalDependencies.organization,
      reviewOrgDisputeReader
    )

    await assert.rejects(
      () => query.execute({ page: 1, perPage: 10 }),
      ForbiddenException
    )
  })

  test('unauthenticated user is rejected', async ({ assert }) => {
    const { org } = await OrganizationFactory.createWithOwner()
    const ctx = makeReviewActionContext('', org.id)
    const query = new ListOrgReviewDisputesQuery(
      ctx,
      reviewExternalDependencies.organization,
      reviewOrgDisputeReader
    )

    await assert.rejects(
      () => query.execute({ page: 1, perPage: 10 }),
      UnauthorizedException
    )
  })

  test('org disputes query only returns disputes from the active organization', async ({ assert }) => {
    const { org: orgA, owner: ownerA } = await OrganizationFactory.createWithOwner()
    const { org: orgB, owner: ownerB } = await OrganizationFactory.createWithOwner()

    const projectA = await ProjectFactory.create({
      organization_id: orgA.id,
      creator_id: ownerA.id,
      owner_id: ownerA.id,
    })
    const taskA = await TaskFactory.create({
      organization_id: orgA.id,
      creator_id: ownerA.id,
      project_id: projectA.id,
    })

    const projectB = await ProjectFactory.create({
      organization_id: orgB.id,
      creator_id: ownerB.id,
      owner_id: ownerB.id,
    })
    const taskB = await TaskFactory.create({
      organization_id: orgB.id,
      creator_id: ownerB.id,
      project_id: projectB.id,
    })

    const disputeA = testId()
    await db.table('review_disputes').insert({
      id: disputeA,
      review_session_id: testId(),
      task_assignment_id: testId(),
      task_id: taskA.id,
      reviewee_id: ownerA.id,
      opened_by: ownerA.id,
      status: 'pending',
      dispute_reason: 'Org A dispute',
      requested_outcome: 'adjust_score',
      disputed_dimensions: JSON.stringify({ quality: true }),
      disputed_skill_reviews: JSON.stringify([]),
    })

    const disputeB = testId()
    await db.table('review_disputes').insert({
      id: disputeB,
      review_session_id: testId(),
      task_assignment_id: testId(),
      task_id: taskB.id,
      reviewee_id: ownerB.id,
      opened_by: ownerB.id,
      status: 'pending',
      dispute_reason: 'Org B dispute',
      requested_outcome: 'adjust_score',
      disputed_dimensions: JSON.stringify({ quality: true }),
      disputed_skill_reviews: JSON.stringify([]),
    })

    const ctx = makeReviewActionContext(ownerA.id, orgA.id)
    const query = new ListOrgReviewDisputesQuery(
      ctx,
      reviewExternalDependencies.organization,
      reviewOrgDisputeReader
    )
    const result = await query.execute({ page: 1, perPage: 10 })

    assert.isArray(result.data)
    assert.equal(result.data.length, 1)
    const [firstDispute] = result.data
    if (firstDispute === undefined) {
      throw new Error('Expected dispute result for active organization')
    }
    assert.equal(firstDispute.id, disputeA)
  })

  test('org disputes query accepts non-uuid search text without crashing', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
    })
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      project_id: project.id,
      title: 'Quarterly review calibration',
    })

    await db.table('review_disputes').insert({
      id: testId(),
      review_session_id: testId(),
      task_assignment_id: testId(),
      task_id: task.id,
      reviewee_id: owner.id,
      opened_by: owner.id,
      status: 'pending',
      dispute_reason: 'Calibration mismatch',
      requested_outcome: 'adjust_score',
      disputed_dimensions: JSON.stringify({ quality: true }),
      disputed_skill_reviews: JSON.stringify([]),
    })

    const ctx = makeReviewActionContext(owner.id, org.id)
    const query = new ListOrgReviewDisputesQuery(
      ctx,
      reviewExternalDependencies.organization,
      reviewOrgDisputeReader
    )

    const result = await query.execute({
      page: 1,
      perPage: 10,
      search: 'ZZZZNONEXISTENT_USER_12345',
    })

    assert.isArray(result.data)
    assert.equal(result.data.length, 0)
    assert.equal(result.meta.total, 0)
  })

  test('org disputes query supports cursor pagination without overlapping windows', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
    })
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      project_id: project.id,
      title: 'Cursor dispute queue task',
    })

    const disputeIds: string[] = []
    for (let index = 0; index < 4; index++) {
      const disputeId = testId()
      disputeIds.push(disputeId)
      await db.table('review_disputes').insert({
        id: disputeId,
        review_session_id: testId(),
        task_assignment_id: testId(),
        task_id: task.id,
        reviewee_id: owner.id,
        opened_by: owner.id,
        status: 'pending',
        dispute_reason: `Cursor dispute ${index}`,
        requested_outcome: 'adjust_score',
        disputed_dimensions: JSON.stringify({ quality: true }),
        disputed_skill_reviews: JSON.stringify([]),
        created_at: new Date(Date.now() - index * 60_000).toISOString(),
        updated_at: new Date(Date.now() - index * 60_000).toISOString(),
      })
    }

    const ctx = makeReviewActionContext(owner.id, org.id)
    const query = new ListOrgReviewDisputesQuery(
      ctx,
      reviewExternalDependencies.organization,
      reviewOrgDisputeReader
    )
    const firstWindow = await query.execute({ page: 1, perPage: 2 })

    assert.deepEqual(
      firstWindow.data.map((item) => item.id),
      disputeIds.slice(0, 2)
    )
    assert.isTrue(firstWindow.meta.cursor.has_next_page)
    assert.isFalse(firstWindow.meta.cursor.has_previous_page)

    const secondWindow = await query.execute({
      page: 1,
      perPage: 2,
      after: firstWindow.meta.cursor.next_cursor,
    })

    assert.deepEqual(
      secondWindow.data.map((item) => item.id),
      disputeIds.slice(2, 4)
    )
    assert.isTrue(secondWindow.meta.cursor.has_previous_page)
    assert.isFalse(secondWindow.meta.cursor.has_next_page)
    assert.equal(
      secondWindow.data.filter((item) => firstWindow.data.some((first) => first.id === item.id))
        .length,
      0
    )

    const newerWindow = await query.execute({
      page: 1,
      perPage: 2,
      before: secondWindow.meta.cursor.previous_cursor,
    })

    assert.deepEqual(
      newerWindow.data.map((item) => item.id),
      disputeIds.slice(0, 2)
    )
    assert.isFalse(newerWindow.meta.cursor.has_previous_page)
    assert.isTrue(newerWindow.meta.cursor.has_next_page)
  })
})
