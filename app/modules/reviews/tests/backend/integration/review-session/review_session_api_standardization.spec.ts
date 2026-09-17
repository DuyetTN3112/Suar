import { test } from '@japa/runner'

import ReviewSession from '#modules/reviews/infra/models/review-session/review_session'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  OrganizationFactory,
  TaskAssignmentFactory,
  TaskFactory,
  UserFactory,
} from '#tests/helpers/factories'

async function createAssignmentScenario() {
  const { org, owner } = await OrganizationFactory.createWithOwner()
  const reviewee = await UserFactory.create()
  const task = await TaskFactory.create({
    organization_id: org.id,
    creator_id: owner.id,
    assigned_to: reviewee.id,
    title: 'Review session API standardization task',
  })
  const assignment = await TaskAssignmentFactory.create({
    task_id: task.id,
    assignee_id: reviewee.id,
    assigned_by: owner.id,
    assignment_status: 'completed',
  })

  return { owner, reviewee, assignment }
}

test.group('Integration | Review session API standardization', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('create review session accepts camelCase request body and returns wrapped camelCase data', async ({
    assert,
    client,
  }) => {
    const { owner, reviewee, assignment } = await createAssignmentScenario()

    const response = await client
      .post('/api/reviews/sessions')
      .loginAs(owner)
      .json({
        taskAssignmentId: assignment.id,
        revieweeId: reviewee.id,
        requiredPeerReviews: 4,
      })

    response.assertStatus(201)

    const body = response.body() as {
      data: {
        id: string
        taskAssignmentId: string
        revieweeId: string
        status: string
        managerReviewCompleted: boolean
        peerReviewsCount: number
        requiredPeerReviews: number
        createdAt: string
        updatedAt: string
      }
    }

    assert.notProperty(body, 'success')
    assert.equal(body.data.taskAssignmentId, assignment.id)
    assert.equal(body.data.revieweeId, reviewee.id)
    assert.equal(body.data.status, 'pending')
    assert.isFalse(body.data.managerReviewCompleted)
    assert.equal(body.data.peerReviewsCount, 0)
    assert.equal(body.data.requiredPeerReviews, 4)
    assert.property(body.data, 'createdAt')
    assert.property(body.data, 'updatedAt')

    const storedSession = await ReviewSession.findOrFail(body.data.id)
    assert.equal(storedSession.task_assignment_id, assignment.id)
    assert.equal(storedSession.reviewee_id, reviewee.id)
    assert.equal(storedSession.required_peer_reviews, 4)
  })

  test('canonical v1 create review session preserves legacy wrapped camelCase contract', async ({
    assert,
    client,
  }) => {
    const { owner, reviewee, assignment } = await createAssignmentScenario()

    const response = await client
      .post('/api/v1/reviews/sessions')
      .loginAs(owner)
      .json({
        taskAssignmentId: assignment.id,
        revieweeId: reviewee.id,
        requiredPeerReviews: 2,
      })

    response.assertStatus(201)

    const body = response.body() as {
      data: {
        id: string
        taskAssignmentId: string
        revieweeId: string
        status: string
        managerReviewCompleted: boolean
        peerReviewsCount: number
        requiredPeerReviews: number
      }
    }

    assert.notProperty(body, 'success')
    assert.equal(body.data.taskAssignmentId, assignment.id)
    assert.equal(body.data.revieweeId, reviewee.id)
    assert.equal(body.data.status, 'pending')
    assert.equal(body.data.requiredPeerReviews, 2)
  })
})
