import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import { BACKEND_NOTIFICATION_TYPES } from '#modules/notifications/public_contracts/notification_constants'
import { notificationPublicApi } from '#modules/notifications/public_contracts/notification_creator'
import SubmitTaskSubmissionCommand from '#modules/tasks/actions/commands/submit_task_submission_command'
import { makeSystemTaskActionContext } from '#modules/tasks/actions/task_action_context'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  OrganizationFactory,
  OrganizationUserFactory,
  ProjectMemberFactory,
  TaskAssignmentFactory,
  TaskFactory,
  UserFactory,
} from '#tests/helpers/factories'

interface CountRow {
  total: number | string
}

test.group('Integration | Task submission duplicate guard', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('duplicate submitted package is rejected without duplicate review session or notifications', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const assignee = await UserFactory.create({ current_organization_id: org.id })
    const peerReviewer = await UserFactory.create({ current_organization_id: org.id })

    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: assignee.id,
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
      assigned_to: assignee.id,
      title: 'Duplicate submission guard task',
    })
    if (!task.project_id) {
      throw new Error('Expected task.project_id for duplicate submission scenario')
    }

    await ProjectMemberFactory.create({
      project_id: task.project_id,
      user_id: peerReviewer.id,
      project_role: 'project_member',
    })

    const assignment = await TaskAssignmentFactory.create({
      task_id: task.id,
      assignee_id: assignee.id,
      assigned_by: owner.id,
      assignment_status: 'active',
    })
    const command = new SubmitTaskSubmissionCommand(
      makeSystemTaskActionContext(assignee.id),
      notificationPublicApi
    )
    const payload = {
      task_id: task.id,
      summary: 'Ready for review',
      implementation_notes: 'Implementation is complete',
      known_limitations: null,
      test_notes: 'Tests pass',
      demo_url: null,
      repository_url: null,
      pull_request_url: null,
      submit: true,
      evidences: [
        {
          evidence_type: 'pull_request' as const,
          url: 'https://example.com/pr/duplicate-guard',
          title: 'PR',
        },
      ],
    }

    await command.execute(payload)
    const reviewSessionsBefore = (await db
      .from('review_sessions')
      .where('task_assignment_id', assignment.id)
      .count('* as total')
      .first()) as CountRow | null
    const notificationsBefore = (await db
      .from('notifications')
      .whereIn('user_id', [owner.id, peerReviewer.id])
      .where('type', BACKEND_NOTIFICATION_TYPES.REVIEW_REQUESTED)
      .count('* as total')
      .first()) as CountRow | null

    await assert.rejects(
      () => command.execute(payload),
      BusinessLogicException,
      'Task submission is already submitted'
    )

    const reviewSessionsAfter = (await db
      .from('review_sessions')
      .where('task_assignment_id', assignment.id)
      .count('* as total')
      .first()) as CountRow | null
    const notificationsAfter = (await db
      .from('notifications')
      .whereIn('user_id', [owner.id, peerReviewer.id])
      .where('type', BACKEND_NOTIFICATION_TYPES.REVIEW_REQUESTED)
      .count('* as total')
      .first()) as CountRow | null

    assert.equal(Number(reviewSessionsBefore?.total ?? 0), 1)
    assert.equal(Number(reviewSessionsAfter?.total ?? 0), 1)
    assert.equal(
      Number(notificationsAfter?.total ?? 0),
      Number(notificationsBefore?.total ?? 0)
    )
  })

  test('invalid evidence URL is rejected without submission or evidence rows', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const assignee = await UserFactory.create({ current_organization_id: org.id })

    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: assignee.id,
      org_role: 'org_member',
      status: 'approved',
    })

    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      assigned_to: assignee.id,
      title: 'Invalid evidence URL guard task',
    })
    await TaskAssignmentFactory.create({
      task_id: task.id,
      assignee_id: assignee.id,
      assigned_by: owner.id,
      assignment_status: 'active',
    })

    await assert.rejects(
      () =>
        new SubmitTaskSubmissionCommand(
          makeSystemTaskActionContext(assignee.id),
          notificationPublicApi
        ).execute({
          task_id: task.id,
          summary: 'Ready for review',
          implementation_notes: null,
          known_limitations: null,
          test_notes: null,
          demo_url: null,
          repository_url: null,
          pull_request_url: null,
          submit: true,
          evidences: [
            {
              evidence_type: 'pull_request',
              url: 'ftp://example.com/not-allowed',
              title: 'Unsupported URL',
            },
          ],
        }),
      BusinessLogicException,
      'Task submission evidence URL must be HTTP or HTTPS'
    )

    const submission = (await db
      .from('task_submissions')
      .where('task_id', task.id)
      .first()) as { id: string } | null
    const evidence = (await db
      .from('task_submission_evidences')
      .where('url', 'ftp://example.com/not-allowed')
      .first()) as { id: string } | null

    assert.isNull(submission)
    assert.isNull(evidence)
  })
})
