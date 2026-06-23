import { test } from '@japa/runner'

import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import SubmitReverseReviewCommand from '#modules/reviews/actions/commands/submit_reverse_review_command'
import { makeSystemReviewActionContext } from '#modules/reviews/actions/review_action_context'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  OrganizationFactory,
  OrganizationUserFactory,
  ProjectMemberFactory,
  ReviewSessionFactory,
  TaskAssignmentFactory,
  TaskFactory,
  UserFactory,
} from '#tests/helpers/factories'

async function buildScenario() {
  const { org, owner } = await OrganizationFactory.createWithOwner()
  const reviewee = await UserFactory.create()
  const peer = await UserFactory.create()
  const outsider = await UserFactory.create()
  const task = await TaskFactory.create({
    organization_id: org.id,
    creator_id: owner.id,
  })
  if (!task.project_id) {
    throw new Error('TaskFactory must create a task with project_id')
  }
  const projectId = task.project_id
  await OrganizationUserFactory.create({
    organization_id: org.id,
    user_id: peer.id,
    org_role: 'org_member',
    status: 'approved',
  })
    await ProjectMemberFactory.create({
      project_id: projectId,
      user_id: peer.id,
      project_role: 'project_member',
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
    manager_review_completed: true,
    peer_reviews_count: 1,
    required_peer_reviews: 1,
  })

  return { org, owner, reviewee, peer, outsider, task, session, projectId }
}

test.group('Integration | Reverse Review Target Guards', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('valid manager and project targets are accepted', async ({ assert }) => {
    const scenario = await buildScenario()
    const command = new SubmitReverseReviewCommand(
      makeSystemReviewActionContext(scenario.reviewee.id)
    )

    const managerReview = await command.handle({
      review_session_id: scenario.session.id,
      target_type: 'manager',
      target_id: scenario.owner.id,
      rating: 5,
      comment: 'Helpful guidance',
      is_anonymous: false,
    })

    const projectReview = await command.handle({
      review_session_id: scenario.session.id,
      target_type: 'project',
      target_id: scenario.projectId,
      rating: 4,
      comment: 'Project context accurate',
      is_anonymous: true,
    })

    assert.equal(managerReview.target_id, scenario.owner.id)
    assert.equal(projectReview.target_id, scenario.projectId)
  })

  test('arbitrary user and mismatched target type are rejected', async ({ assert }) => {
    const scenario = await buildScenario()
    const command = new SubmitReverseReviewCommand(
      makeSystemReviewActionContext(scenario.reviewee.id)
    )

    await assert.rejects(
      () =>
        command.handle({
          review_session_id: scenario.session.id,
          target_type: 'peer',
          target_id: scenario.outsider.id,
          rating: 2,
          comment: 'Not part of session',
          is_anonymous: false,
        }),
      BusinessLogicException
    )

    await assert.rejects(
      () =>
        command.handle({
          review_session_id: scenario.session.id,
          target_type: 'manager',
          target_id: scenario.projectId,
          rating: 2,
          comment: 'Wrong type',
          is_anonymous: false,
        }),
      BusinessLogicException
    )
  })
})
