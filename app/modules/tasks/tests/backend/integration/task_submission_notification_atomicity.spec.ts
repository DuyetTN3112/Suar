import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { taskExternalDeps } from '#composition/tasks/task-external-dependencies/task_external_dependencies_composition'
import type { NotificationFanoutStagerContract } from '#modules/notifications/public_contracts/notification_fanout'
import { notificationFanoutPublicApi } from '#modules/notifications/public_contracts/notification_fanout'
import SubmitTaskSubmissionCommand from '#modules/tasks/actions/commands/task-submissions/submit_task_submission_command'
import { makeSystemTaskActionContext } from '#modules/tasks/actions/task_action_context'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  OrganizationFactory,
  OrganizationUserFactory,
  TaskAssignmentFactory,
  TaskFactory,
  UserFactory,
} from '#tests/helpers/factories'

const reviewGovernance = {
  ensureSession: () => Promise.resolve('review-session-atomicity'),
  loadNotificationAudience: () => Promise.resolve(null),
}

test.group('Integration | Task Submission Notification Atomicity', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('rolls submission workflow back when durable fanout staging fails', async ({
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
      title: 'Atomic submission fanout',
    })
    await TaskAssignmentFactory.create({
      task_id: task.id,
      assignee_id: assignee.id,
      assigned_by: owner.id,
      assignment_status: 'active',
    })
    const failingFanout: NotificationFanoutStagerContract = {
      stage: () => Promise.reject(new Error('simulated submission fanout failure')),
    }

    await assert.rejects(
      () =>
        new SubmitTaskSubmissionCommand(
          makeSystemTaskActionContext(assignee.id),
          reviewGovernance,
          taskExternalDeps,
          failingFanout
        ).execute({
          task_id: task.id,
          summary: 'Ready for review',
          submit: true,
          evidences: [
            {
              evidence_type: 'pull_request',
              url: 'https://example.com/pr/atomic-submission',
            },
          ],
        }),
      /simulated submission fanout failure/
    )

    const submission = (await db
      .from('task_submissions')
      .where('task_id', task.id)
      .first()) as Record<string, unknown> | null
    const persistedTask = (await db
      .from('tasks')
      .where('id', task.id)
      .select('status')
      .first()) as { status: string }
    assert.isNull(submission)
    assert.notEqual(persistedTask.status, 'in_review')
    assert.equal(
      Number(
        (
          (await db.from('review_sessions').count('* as count').first()) as {
            count: number | string
          }
        ).count
      ),
      0
    )
  })

  test('successful submission does not move the task into a hidden in-review status', async ({
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
      title: 'Submission keeps board status',
    })
    await TaskAssignmentFactory.create({
      task_id: task.id,
      assignee_id: assignee.id,
      assigned_by: owner.id,
      assignment_status: 'active',
    })

    const beforeTask = (await db
      .from('tasks')
      .where('id', task.id)
      .select('status', 'task_status_id')
      .first()) as { status: string; task_status_id: string | null } | null

    await new SubmitTaskSubmissionCommand(
      makeSystemTaskActionContext(assignee.id),
      reviewGovernance,
      taskExternalDeps,
      notificationFanoutPublicApi
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
          url: 'https://example.com/pr/submission-keeps-board-status',
        },
      ],
    })

    const afterTask = (await db
      .from('tasks')
      .where('id', task.id)
      .select('status', 'task_status_id')
      .first()) as { status: string; task_status_id: string | null } | null

    assert.deepEqual(afterTask, beforeTask)
  })
})
