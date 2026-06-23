import { test } from '@japa/runner'

import ForbiddenException from '#modules/http/exceptions/forbidden_exception'
import UpsertTaskSelfAssessmentCommand from '#modules/reviews/actions/commands/upsert_task_self_assessment_command'
import GetTaskSelfAssessmentQuery from '#modules/reviews/actions/queries/get_task_self_assessment_query'
import { makeSystemReviewActionContext } from '#modules/reviews/actions/review_action_context'
import TaskSelfAssessment from '#modules/tasks/infra/models/task_self_assessment'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  OrganizationFactory,
  TaskAssignmentFactory,
  TaskFactory,
  UserFactory,
  ReviewSessionFactory,
} from '#tests/helpers/factories'

async function buildScenario() {
  const { org, owner } = await OrganizationFactory.createWithOwner()
  const reviewee = await UserFactory.create()
  const outsider = await UserFactory.create()
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
    status: 'pending',
  })

  return { owner, reviewee, outsider, assignment, session }
}

test.group('Integration | Review Self Assessment', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('reviewee can read and upsert self-assessment before confirmation', async ({ assert }) => {
    const scenario = await buildScenario()
    const command = new UpsertTaskSelfAssessmentCommand(
      makeSystemReviewActionContext(scenario.reviewee.id)
    )

    await command.handle({
      review_session_id: scenario.session.id,
      overall_satisfaction: 4,
      difficulty_felt: 'as_expected',
      confidence_level: 4,
      what_went_well: 'Kept scope tight',
      what_would_do_different: 'Add more test data',
      blockers_encountered: ['none'],
      skills_felt_lacking: ['architecture'],
      skills_felt_strong: ['typescript'],
    })

    const assessment = await new GetTaskSelfAssessmentQuery(
      makeSystemReviewActionContext(scenario.reviewee.id)
    ).execute(scenario.session.id)

    assert.isNotNull(assessment)
    assert.equal(assessment?.overall_satisfaction, 4)
    assert.equal(assessment?.task_assignment_id, scenario.assignment.id)
  })

  test('outsider cannot read self-assessment', async ({ assert }) => {
    const scenario = await buildScenario()
    await TaskSelfAssessment.create({
      task_assignment_id: scenario.assignment.id,
      user_id: scenario.reviewee.id,
      overall_satisfaction: 5,
      difficulty_felt: 'easier_than_expected',
      confidence_level: 5,
      what_went_well: 'good',
      what_would_do_different: 'none',
      blockers_encountered: [],
      skills_felt_lacking: [],
      skills_felt_strong: ['testing'],
    })

    await assert.rejects(
      () =>
        new GetTaskSelfAssessmentQuery(makeSystemReviewActionContext(scenario.outsider.id)).execute(
          scenario.session.id
        ),
      ForbiddenException
    )
  })

  test('confirmed review blocks self-assessment updates', async ({ assert }) => {
    const scenario = await buildScenario()
    await scenario.session.merge({
      confirmations: [{ user_id: scenario.reviewee.id, action: 'confirmed', created_at: new Date().toISOString() }],
    }).save()

    const command = new UpsertTaskSelfAssessmentCommand(
      makeSystemReviewActionContext(scenario.reviewee.id)
    )

    await assert.rejects(
      () =>
        command.handle({
          review_session_id: scenario.session.id,
          overall_satisfaction: 3,
          difficulty_felt: 'harder_than_expected',
          confidence_level: 2,
          what_went_well: null,
          what_would_do_different: null,
          blockers_encountered: [],
          skills_felt_lacking: [],
          skills_felt_strong: [],
        }),
      Error
    )
  })
})
