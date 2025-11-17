import { test } from '@japa/runner'

import GetProfileShowPageQuery from '#modules/users/actions/queries/get_profile_show_page_query'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  OrganizationFactory,
  OrganizationUserFactory,
  ReviewSessionFactory,
  ReverseReviewFactory,
  TaskAssignmentFactory,
  TaskFactory,
  UserFactory,
} from '#tests/helpers/factories'

test.group('Integration | Profile show reverse review summary', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('profile show query includes manager and peer reverse review summary', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const targetUser = await UserFactory.create({ current_organization_id: org.id })
    const reviewee = await UserFactory.create()
    const peerReviewer = await UserFactory.create({ current_organization_id: org.id })

    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: targetUser.id,
      org_role: 'org_member',
      status: 'approved',
    })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: peerReviewer.id,
      org_role: 'org_member',
      status: 'approved',
    })

    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
    })
    const assignment = await TaskAssignmentFactory.create({
      task_id: task.id,
      assignee_id: reviewee.id,
      assigned_by: owner.id,
      assignment_status: 'completed',
    })
    const session = await ReviewSessionFactory.create({
      task_assignment_id: assignment.id,
      reviewee_id: reviewee.id,
      status: 'completed',
    })

    await ReverseReviewFactory.create({
      review_session_id: session.id,
      reviewer_id: reviewee.id,
      target_type: 'manager',
      target_id: owner.id,
      rating: 5,
      comment: 'Manager review',
      is_anonymous: false,
    })
    await ReverseReviewFactory.create({
      review_session_id: session.id,
      reviewer_id: reviewee.id,
      target_type: 'peer',
      target_id: peerReviewer.id,
      rating: 4,
      comment: 'Peer review',
      is_anonymous: true,
    })

    const query = new GetProfileShowPageQuery({
      userId: owner.id,
      organizationId: org.id,
      ip: '0.0.0.0',
      userAgent: 'test',
      requestId: null,
      traceId: null,
      workflowId: null,
    })

    const result = await query.execute({ userId: owner.id })
    const summary = result.user.reverse_review_summary as
      | {
          total_reviews: number
          average_rating: number
          manager_reviews: number
          peer_reviews: number
        }
      | null

    assert.isNotNull(summary)
    assert.properties(result.reviewHistory, ['received', 'sent', 'stats'])
    assert.equal(summary?.total_reviews, 1)
    assert.equal(summary?.manager_reviews, 1)
    assert.equal(summary?.peer_reviews, 0)
    assert.equal(summary?.average_rating, 5)

    const peerQuery = new GetProfileShowPageQuery({
      userId: peerReviewer.id,
      organizationId: org.id,
      ip: '0.0.0.0',
      userAgent: 'test',
      requestId: null,
      traceId: null,
      workflowId: null,
    })
    const peerResult = await peerQuery.execute({ userId: peerReviewer.id })
    const peerSummary = peerResult.user.reverse_review_summary as
      | {
          total_reviews: number
          average_rating: number
          manager_reviews: number
          peer_reviews: number
        }
      | null

    assert.isNotNull(peerSummary)
    assert.equal(peerSummary?.total_reviews, 1)
    assert.equal(peerSummary?.manager_reviews, 0)
    assert.equal(peerSummary?.peer_reviews, 1)
    assert.equal(peerSummary?.average_rating, 4)
  })
})
