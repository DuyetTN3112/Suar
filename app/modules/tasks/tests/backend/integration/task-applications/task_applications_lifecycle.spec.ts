import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'
import { DateTime } from 'luxon'

import {
  applyToTask,
  countAuditEvents,
  createPublicTask,
  expectBusinessRule,
  expectProcessNotFound,
  expectWithdrawNotFound,
  FailingNotificationStager,
  taskEvents,
} from './task_applications_test_support.js'

import { notificationTransactionStager } from '#composition/notifications/notification-feed/notification_composition'
import { taskOrganizationMembershipWriter } from '#composition/organizations/tasks/task_organization_membership_composition'
import { taskExternalDeps } from '#composition/tasks/task-external-dependencies/task_external_dependencies_composition'
import { ForbiddenPolicyViolationException } from '#modules/authorization/public_contracts/policy_violation'
import { buildNotificationEventId } from '#modules/notifications/public_contracts/notification_event_identity'
import * as membershipQueries from '#modules/organizations/infra/repositories/members/organization_user_repository/read/membership_queries'
import ProcessApplicationCommand from '#modules/tasks/actions/commands/task-applications/process_application_command'
import WithdrawApplicationCommand from '#modules/tasks/actions/commands/task-applications/withdraw_application_command'
import {
  ProcessApplicationDTO,
  WithdrawApplicationDTO,
} from '#modules/tasks/actions/dtos/request/task_application_dtos'
import { makeSystemTaskActionContext } from '#modules/tasks/actions/task_action_context'
import { TaskCacheInvalidator } from '#modules/tasks/infra/adapters/task-authoring/task_cache_invalidator'
import TaskApplication from '#modules/tasks/infra/models/task-applications/task_application'
import TaskAssignment from '#modules/tasks/infra/models/task-assignment/task_assignment'
import Task from '#modules/tasks/infra/models/task-authoring/task'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  OrganizationUserFactory,
  TaskApplicationFactory,
  UserFactory,
} from '#tests/helpers/factories'

test.group('Integration | Task Applications — Lifecycle', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('approving a pending application assigns the task and auto-rejects the remaining applicants', async ({
    assert,
  }) => {
    const { owner, task } = await createPublicTask()
    const selectedApplicant = await UserFactory.createExternalContributor()
    const otherApplicant = await UserFactory.createExternalContributor()

    const selected = await TaskApplicationFactory.create({
      task_id: task.id,
      applicant_id: selectedApplicant.id,
      application_status: 'pending',
      application_source: 'public_listing',
    })
    const other = await TaskApplicationFactory.create({
      task_id: task.id,
      applicant_id: otherApplicant.id,
      application_status: 'pending',
      application_source: 'public_listing',
    })

    const ctx = makeSystemTaskActionContext(owner.id)
    const command = new ProcessApplicationCommand(
      ctx,
      new TaskCacheInvalidator(),
      taskEvents,
      notificationTransactionStager,
      taskOrganizationMembershipWriter,
      taskExternalDeps.permission,
      taskExternalDeps
    )
    const dto = new ProcessApplicationDTO({
      application_id: selected.id,
      action: 'approve',
      assignment_type: 'external_contributor',
      estimated_hours: 12,
    })

    await command.handle(dto)

    const approved = await TaskApplication.findOrFail(selected.id)
    const rejected = await TaskApplication.findOrFail(other.id)
    const assignment = await TaskAssignment.query().where('task_id', task.id).firstOrFail()
    const updatedTask = await Task.findOrFail(task.id)
    const membership = await membershipQueries.findMembership(
      task.organization_id,
      selectedApplicant.id
    )

    assert.equal(approved.application_status, 'approved')
    assert.equal(approved.reviewed_by, owner.id)
    assert.equal(assignment.assignee_id, selectedApplicant.id)
    assert.equal(assignment.assignment_status, 'active')
    assert.equal(assignment.assignment_type, 'external_contributor')
    assert.equal(assignment.estimated_hours, 12)
    assert.equal(updatedTask.assigned_to, selectedApplicant.id)
    assert.equal(rejected.application_status, 'rejected')
    assert.equal(rejected.rejection_reason, 'Another applicant was selected')
    assert.exists(membership)
    assert.equal(membership?.status, 'approved')
    assert.equal(membership?.org_role, 'org_member')
  })

  test('rejecting a pending application stores the reviewer decision and reason', async ({
    assert,
  }) => {
    const { owner, task } = await createPublicTask()
    const applicant = await UserFactory.createExternalContributor()
    const application = await TaskApplicationFactory.create({
      task_id: task.id,
      applicant_id: applicant.id,
      application_status: 'pending',
    })

    const ctx = makeSystemTaskActionContext(owner.id)
    const command = new ProcessApplicationCommand(
      ctx,
      new TaskCacheInvalidator(),
      taskEvents,
      notificationTransactionStager,
      taskOrganizationMembershipWriter,
      taskExternalDeps.permission,
      taskExternalDeps
    )
    const dto = new ProcessApplicationDTO({
      application_id: application.id,
      action: 'reject',
      rejection_reason: 'Not enough experience',
    })

    await command.handle(dto)

    const updated = await TaskApplication.findOrFail(application.id)
    assert.equal(updated.application_status, 'rejected')
    assert.equal(updated.rejection_reason, 'Not enough experience')
    assert.equal(updated.reviewed_by, owner.id)

    const notification = (await db
      .from('notifications')
      .select('event_id', 'category', 'title', 'action')
      .where('user_id', applicant.id)
      .where('type', 'task_application_review')
      .where('related_entity_id', application.id)
      .first()) as {
      event_id: string
      category: string
      title: string
      action: { routeName?: string } | null
    } | null
    const occurredAt = updated.reviewed_at?.toUTC().toISO() ?? null
    assert.isNotNull(notification)
    assert.isNotNull(occurredAt)
    if (notification && occurredAt) {
      assert.equal(
        notification.event_id,
        buildNotificationEventId({
          eventName: 'task.application_reviewed',
          businessEventId: `${application.id}:rejected:${occurredAt}`,
          recipientId: applicant.id,
        })
      )
      assert.equal(notification.category, 'task')
      assert.equal(notification.title, 'Yêu cầu bị từ chối')
      assert.equal(notification.action?.routeName, 'task_applications.show')
      assert.lengthOf(
        await db.from('notification_outbox').where('source_event_id', notification.event_id),
        2
      )
    }
  })

  test('review notification staging failure restores pending decision and audit', async ({
    assert,
  }) => {
    const { owner, task } = await createPublicTask()
    const applicant = await UserFactory.createExternalContributor()
    const application = await TaskApplicationFactory.create({
      task_id: task.id,
      applicant_id: applicant.id,
      application_status: 'pending',
    })
    const notification = new FailingNotificationStager()
    const command = new ProcessApplicationCommand(
      makeSystemTaskActionContext(owner.id),
      new TaskCacheInvalidator(),
      taskEvents,
      notification,
      taskOrganizationMembershipWriter,
      taskExternalDeps.permission,
      taskExternalDeps
    )

    await assert.rejects(
      () =>
        command.handle(
          new ProcessApplicationDTO({
            application_id: application.id,
            action: 'reject',
            rejection_reason: 'Not a fit',
          })
        ),
      'task application notification staging failed'
    )

    const unchanged = await TaskApplication.findOrFail(application.id)
    const auditCount = await countAuditEvents(
      'process_application',
      'task_application',
      application.id
    )
    assert.equal(notification.calls, 1)
    assert.equal(unchanged.application_status, 'pending')
    assert.isNull(unchanged.reviewed_by)
    assert.equal(auditCount, 0)
  })

  test('approve is rejected once the task is already assigned', async ({ assert }) => {
    const { owner, task } = await createPublicTask()
    const applicant = await UserFactory.createExternalContributor()
    const currentAssignee = await UserFactory.createExternalContributor()
    const application = await TaskApplicationFactory.create({
      task_id: task.id,
      applicant_id: applicant.id,
      application_status: 'pending',
    })

    task.assigned_to = currentAssignee.id
    await task.save()

    const ctx = makeSystemTaskActionContext(owner.id)
    const command = new ProcessApplicationCommand(
      ctx,
      new TaskCacheInvalidator(),
      taskEvents,
      notificationTransactionStager,
      taskOrganizationMembershipWriter,
      taskExternalDeps.permission,
      taskExternalDeps
    )
    const dto = new ProcessApplicationDTO({
      application_id: application.id,
      action: 'approve',
      assignment_type: 'external_contributor',
    })

    await expectBusinessRule(assert, () => command.handle(dto), 'không thể duyệt thêm')
  })

  test('approving an already approved application is rejected without duplicate assignment', async ({
    assert,
  }) => {
    const { owner, task } = await createPublicTask()
    const applicant = await UserFactory.createExternalContributor()
    const application = await TaskApplicationFactory.create({
      task_id: task.id,
      applicant_id: applicant.id,
      application_status: 'approved',
    })

    const command = new ProcessApplicationCommand(
      makeSystemTaskActionContext(owner.id),
      new TaskCacheInvalidator(),
      taskEvents,
      notificationTransactionStager,
      taskOrganizationMembershipWriter,
      taskExternalDeps.permission,
      taskExternalDeps
    )

    await expectProcessNotFound(assert, () =>
      command.handle(
        new ProcessApplicationDTO({
          application_id: application.id,
          action: 'approve',
          assignment_type: 'external_contributor',
        })
      )
    )

    const unchanged = await TaskApplication.findOrFail(application.id)
    const assignments = await TaskAssignment.query().where('task_id', task.id)

    assert.equal(unchanged.application_status, 'approved')
    assert.lengthOf(assignments, 0)
  })

  test('rejecting an approved application is rejected and leaves review state unchanged', async ({
    assert,
  }) => {
    const { owner, task } = await createPublicTask()
    const applicant = await UserFactory.createExternalContributor()
    const application = await TaskApplicationFactory.create({
      task_id: task.id,
      applicant_id: applicant.id,
      application_status: 'approved',
      rejection_reason: null,
    })

    const command = new ProcessApplicationCommand(
      makeSystemTaskActionContext(owner.id),
      new TaskCacheInvalidator(),
      taskEvents,
      notificationTransactionStager,
      taskOrganizationMembershipWriter,
      taskExternalDeps.permission,
      taskExternalDeps
    )

    await expectProcessNotFound(assert, () =>
      command.handle(
        new ProcessApplicationDTO({
          application_id: application.id,
          action: 'reject',
          rejection_reason: 'Too late',
        })
      )
    )

    const unchanged = await TaskApplication.findOrFail(application.id)
    assert.equal(unchanged.application_status, 'approved')
    assert.isNull(unchanged.rejection_reason)
  })

  test('plain organization members cannot process applications', async ({ assert }) => {
    const { org, task } = await createPublicTask()
    const member = await UserFactory.create()
    const applicant = await UserFactory.createExternalContributor()
    const application = await TaskApplicationFactory.create({
      task_id: task.id,
      applicant_id: applicant.id,
      application_status: 'pending',
    })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: member.id,
      org_role: 'org_member',
      status: 'approved',
    })

    const command = new ProcessApplicationCommand(
      makeSystemTaskActionContext(member.id),
      new TaskCacheInvalidator(),
      taskEvents,
      notificationTransactionStager,
      taskOrganizationMembershipWriter,
      taskExternalDeps.permission,
      taskExternalDeps
    )

    await assert.rejects(
      () =>
        command.handle(
          new ProcessApplicationDTO({
            application_id: application.id,
            action: 'reject',
            rejection_reason: 'No access',
          })
        ),
      ForbiddenPolicyViolationException
    )

    const unchanged = await TaskApplication.findOrFail(application.id)
    assert.equal(unchanged.application_status, 'pending')
    assert.isNull(unchanged.rejection_reason)
  })

  test('withdraw command marks the application as withdrawn and decrements the public application count', async ({
    assert,
  }) => {
    const { task } = await createPublicTask()
    const applicant = await UserFactory.createExternalContributor()
    const application = await TaskApplicationFactory.create({
      task_id: task.id,
      applicant_id: applicant.id,
      application_status: 'pending',
    })

    task.external_applications_count = 1
    await task.save()

    const command = new WithdrawApplicationCommand(
      makeSystemTaskActionContext(applicant.id),
      new TaskCacheInvalidator(),
      taskExternalDeps
    )
    await command.handle(new WithdrawApplicationDTO(application.id))

    const withdrawn = await TaskApplication.findOrFail(application.id)
    const updatedTask = await Task.findOrFail(task.id)

    assert.equal(withdrawn.application_status, 'withdrawn')
    assert.isNotNull(withdrawn.reviewed_at)
    assert.equal(updatedTask.external_applications_count, 0)
  })

  test('withdrawn applications can be submitted again without creating duplicates or leaking SQL errors', async ({
    assert,
  }) => {
    const { task } = await createPublicTask()
    const applicant = await UserFactory.createExternalContributor()
    const application = await TaskApplicationFactory.create({
      task_id: task.id,
      applicant_id: applicant.id,
      application_status: 'withdrawn',
      application_source: 'public_listing',
      message: 'Old withdrawn application',
      reviewed_at: DateTime.now().minus({ minutes: 5 }),
    })

    task.external_applications_count = 0
    await task.save()

    const revived = await applyToTask(task.id, applicant.id, {
      message: 'I want to try again',
      portfolio_links: ['https://portfolio.example.com/retry'],
    })
    const applications = await TaskApplication.query()
      .where('task_id', task.id)
      .where('applicant_id', applicant.id)
    const stored = await TaskApplication.findOrFail(application.id)
    const updatedTask = await Task.findOrFail(task.id)

    assert.equal(revived.id, application.id)
    assert.lengthOf(applications, 1)
    assert.equal(stored.application_status, 'pending')
    assert.equal(stored.message, 'I want to try again')
    assert.deepEqual(stored.portfolio_links, ['https://portfolio.example.com/retry'])
    assert.isNull(stored.reviewed_at)
    assert.equal(updatedTask.external_applications_count, 1)
  })

  test('withdraw command rejects a pending application owned by another applicant', async ({
    assert,
  }) => {
    const { task } = await createPublicTask()
    const ownerApplicant = await UserFactory.createExternalContributor()
    const otherApplicant = await UserFactory.createExternalContributor()
    const application = await TaskApplicationFactory.create({
      task_id: task.id,
      applicant_id: ownerApplicant.id,
      application_status: 'pending',
    })

    task.external_applications_count = 1
    await task.save()

    const command = new WithdrawApplicationCommand(
      makeSystemTaskActionContext(otherApplicant.id),
      new TaskCacheInvalidator(),
      taskExternalDeps
    )

    await expectWithdrawNotFound(assert, () =>
      command.handle(new WithdrawApplicationDTO(application.id))
    )

    const unchanged = await TaskApplication.findOrFail(application.id)
    const updatedTask = await Task.findOrFail(task.id)

    assert.equal(unchanged.application_status, 'pending')
    assert.equal(updatedTask.external_applications_count, 1)
  })

  test('withdraw command rejects an approved application and leaves task count unchanged', async ({
    assert,
  }) => {
    const { task } = await createPublicTask()
    const applicant = await UserFactory.createExternalContributor()
    const application = await TaskApplicationFactory.create({
      task_id: task.id,
      applicant_id: applicant.id,
      application_status: 'approved',
    })

    task.external_applications_count = 1
    await task.save()

    const command = new WithdrawApplicationCommand(
      makeSystemTaskActionContext(applicant.id),
      new TaskCacheInvalidator(),
      taskExternalDeps
    )

    await expectWithdrawNotFound(assert, () =>
      command.handle(new WithdrawApplicationDTO(application.id))
    )

    const unchanged = await TaskApplication.findOrFail(application.id)
    const updatedTask = await Task.findOrFail(task.id)

    assert.equal(unchanged.application_status, 'approved')
    assert.equal(updatedTask.external_applications_count, 1)
  })

  test('withdraw command rejects a rejected application and leaves task count unchanged', async ({
    assert,
  }) => {
    const { task } = await createPublicTask()
    const applicant = await UserFactory.createExternalContributor()
    const application = await TaskApplicationFactory.create({
      task_id: task.id,
      applicant_id: applicant.id,
      application_status: 'rejected',
      rejection_reason: 'Not a fit',
    })

    task.external_applications_count = 1
    await task.save()

    const command = new WithdrawApplicationCommand(
      makeSystemTaskActionContext(applicant.id),
      new TaskCacheInvalidator(),
      taskExternalDeps
    )

    await expectWithdrawNotFound(assert, () =>
      command.handle(new WithdrawApplicationDTO(application.id))
    )

    const unchanged = await TaskApplication.findOrFail(application.id)
    const updatedTask = await Task.findOrFail(task.id)

    assert.equal(unchanged.application_status, 'rejected')
    assert.equal(unchanged.rejection_reason, 'Not a fit')
    assert.equal(updatedTask.external_applications_count, 1)
  })

  test('withdraw command allows own pending application after task assignment and decrements count', async ({
    assert,
  }) => {
    const assignee = await UserFactory.createExternalContributor()
    const { task } = await createPublicTask({ assigned_to: assignee.id })
    const applicant = await UserFactory.createExternalContributor()
    const application = await TaskApplicationFactory.create({
      task_id: task.id,
      applicant_id: applicant.id,
      application_status: 'pending',
    })

    task.external_applications_count = 1
    await task.save()

    const command = new WithdrawApplicationCommand(
      makeSystemTaskActionContext(applicant.id),
      new TaskCacheInvalidator(),
      taskExternalDeps
    )

    await command.handle(new WithdrawApplicationDTO(application.id))

    const withdrawn = await TaskApplication.findOrFail(application.id)
    const updatedTask = await Task.findOrFail(task.id)

    assert.equal(withdrawn.application_status, 'withdrawn')
    assert.equal(updatedTask.assigned_to, assignee.id)
    assert.equal(updatedTask.external_applications_count, 0)
  })
})
