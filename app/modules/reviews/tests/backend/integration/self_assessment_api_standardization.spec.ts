import { test } from '@japa/runner'

import TaskSelfAssessment from '#modules/reviews/infra/models/task_self_assessment'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  OrganizationFactory,
  OrganizationUserFactory,
  ReviewSessionFactory,
  TaskAssignmentFactory,
  TaskFactory,
  UserFactory,
  cleanupTestData,
} from '#tests/helpers/factories'

async function buildHttpScenario() {
  const { org, owner } = await OrganizationFactory.createWithOwner()
  const reviewee = await UserFactory.create({ current_organization_id: org.id })
  await OrganizationUserFactory.create({
    organization_id: org.id,
    user_id: reviewee.id,
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
    status: 'pending',
  })

  return { org, reviewee, assignment, session }
}

test.group('Integration | Review self-assessment API standardization', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('GET self-assessment returns wrapped camelCase payload without success envelope', async ({
    assert,
    client,
  }) => {
    const scenario = await buildHttpScenario()

    await TaskSelfAssessment.create({
      task_assignment_id: scenario.assignment.id,
      user_id: scenario.reviewee.id,
      overall_satisfaction: 5,
      difficulty_felt: 'as_expected',
      confidence_level: 4,
      what_went_well: 'Clear scope',
      what_would_do_different: 'Add benchmarks',
      blockers_encountered: ['none'],
      skills_felt_lacking: ['design'],
      skills_felt_strong: ['typescript'],
    })

    const response = await client
      .get(`/reviews/${scenario.session.id}/self-assessment`)
      .loginAs(scenario.reviewee)
      .header('accept', 'application/json')

    response.assertStatus(200)

    const body = response.body() as {
      data: {
        taskAssignmentId: string
        userId: string
        overallSatisfaction: number
        difficultyFelt: string
        confidenceLevel: number
        whatWentWell: string
        whatWouldDoDifferent: string
        blockersEncountered: string[]
        skillsFeltLacking: string[]
        skillsFeltStrong: string[]
      } | null
    }

    assert.notProperty(body, 'success')
    assert.isNotNull(body.data)
    assert.equal(body.data?.taskAssignmentId, scenario.assignment.id)
    assert.equal(body.data?.userId, scenario.reviewee.id)
    assert.equal(body.data?.overallSatisfaction, 5)
    assert.equal(body.data?.difficultyFelt, 'as_expected')
    assert.equal(body.data?.confidenceLevel, 4)
    assert.equal(body.data?.whatWentWell, 'Clear scope')
    assert.equal(body.data?.whatWouldDoDifferent, 'Add benchmarks')
    assert.deepEqual(body.data?.blockersEncountered, ['none'])
    assert.deepEqual(body.data?.skillsFeltLacking, ['design'])
    assert.deepEqual(body.data?.skillsFeltStrong, ['typescript'])
  })

  test('POST self-assessment accepts camelCase and returns wrapped camelCase payload', async ({
    assert,
    client,
  }) => {
    const scenario = await buildHttpScenario()

    const response = await client
      .post(`/reviews/${scenario.session.id}/self-assessment`)
      .loginAs(scenario.reviewee)
      .header('accept', 'application/json')
      .json({
        overallSatisfaction: 4,
        difficultyFelt: 'harder_than_expected',
        confidenceLevel: 3,
        whatWentWell: 'Kept quality high',
        whatWouldDoDifferent: 'Ask for review sooner',
        blockersEncountered: ['dependency drift'],
        skillsFeltLacking: ['ops'],
        skillsFeltStrong: ['debugging'],
      })

    response.assertStatus(200)

    const body = response.body() as {
      data: {
        taskAssignmentId: string
        userId: string
        overallSatisfaction: number
        difficultyFelt: string
        confidenceLevel: number
      }
    }

    assert.notProperty(body, 'success')
    assert.equal(body.data.taskAssignmentId, scenario.assignment.id)
    assert.equal(body.data.userId, scenario.reviewee.id)
    assert.equal(body.data.overallSatisfaction, 4)
    assert.equal(body.data.difficultyFelt, 'harder_than_expected')
    assert.equal(body.data.confidenceLevel, 3)
  })

  test('POST self-assessment legacy snake_case payload still works', async ({
    assert,
    client,
  }) => {
    const scenario = await buildHttpScenario()

    const response = await client
      .post(`/reviews/${scenario.session.id}/self-assessment`)
      .loginAs(scenario.reviewee)
      .header('accept', 'application/json')
      .json({
        overall_satisfaction: 3,
        difficulty_felt: 'as_expected',
        confidence_level: 2,
        what_went_well: 'Stayed organized',
        what_would_do_different: 'Communicate earlier',
        blockers_encountered: ['handoff'],
        skills_felt_lacking: ['planning'],
        skills_felt_strong: ['delivery'],
      })

    response.assertStatus(200)

    const body = response.body() as {
      data: {
        overallSatisfaction: number
        confidenceLevel: number
      }
    }

    assert.notProperty(body, 'success')
    assert.equal(body.data.overallSatisfaction, 3)
    assert.equal(body.data.confidenceLevel, 2)
  })
})
