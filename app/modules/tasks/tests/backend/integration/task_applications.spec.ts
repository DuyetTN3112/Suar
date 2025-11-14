import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'
import { DateTime } from 'luxon'

import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import ForbiddenException from '#modules/http/exceptions/forbidden_exception'
import NotFoundException from '#modules/http/exceptions/not_found_exception'
import ApplyForTaskCommand from '#modules/tasks/actions/commands/apply_for_task_command'
import ProcessApplicationCommand from '#modules/tasks/actions/commands/process_application_command'
import WithdrawApplicationCommand from '#modules/tasks/actions/commands/withdraw_application_command'
import {
  ApplyForTaskDTO,
  ProcessApplicationDTO,
  WithdrawApplicationDTO,
} from '#modules/tasks/actions/dtos/request/task_application_dtos'
import { makeSystemTaskActionContext } from '#modules/tasks/actions/task_action_context'
import { taskExternalDeps } from '#modules/tasks/bootstrap/task_composition_root'
import { TaskCacheInvalidator } from '#modules/tasks/infra/cache/task_cache_invalidator'
import Task from '#modules/tasks/infra/models/task'
import TaskApplication from '#modules/tasks/infra/models/task_application'
import TaskAssignment from '#modules/tasks/infra/models/task_assignment'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  UserFactory,
  OrganizationFactory,
  OrganizationUserFactory,
  TaskFactory,
  TaskApplicationFactory,
  cleanupTestData,
} from '#tests/helpers/factories'

async function expectBusinessRule(
  assert: {
    fail(message: string): never
    instanceOf(value: unknown, constructor: new (...args: never[]) => unknown): void
    include(haystack: string, needle: string): void
  },
  callback: () => Promise<unknown>,
  reasonPart: string
): Promise<void> {
  try {
    await callback()
    assert.fail('Expected a business rule violation')
  } catch (error) {
    assert.instanceOf(error, BusinessLogicException)
    assert.include((error as BusinessLogicException).message, reasonPart)
  }
}

async function expectWithdrawNotFound(
  assert: {
    fail(message: string): never
    instanceOf(value: unknown, constructor: new (...args: never[]) => unknown): void
    include(haystack: string, needle: string): void
  },
  callback: () => Promise<unknown>
): Promise<void> {
  try {
    await callback()
    assert.fail('Expected withdraw to be unavailable')
  } catch (error) {
    assert.instanceOf(error, NotFoundException)
    assert.include((error as NotFoundException).message, 'không tồn tại hoặc không thể rút')
  }
}

async function expectProcessNotFound(
  assert: {
    fail(message: string): never
    instanceOf(value: unknown, constructor: new (...args: never[]) => unknown): void
    include(haystack: string, needle: string): void
  },
  callback: () => Promise<unknown>
): Promise<void> {
  try {
    await callback()
    assert.fail('Expected process action to be unavailable')
  } catch (error) {
    assert.instanceOf(error, NotFoundException)
    assert.include((error as NotFoundException).message, 'không tồn tại hoặc không còn chờ xử lý')
  }
}

async function countAuditEvents(
  action: string,
  entityType: string,
  entityId: string
): Promise<number> {
  const result = (await db
    .from('audit_events')
    .where('action', action)
    .where('entity_type', entityType)
    .where('entity_id', entityId)
    .count('* as count')) as { count: number | string }[]

  return Number(result[0]?.count ?? 0)
}

test.group('Integration | Task Applications', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  async function createPublicTask(
    overrides: Partial<{
      task_visibility: string
      assigned_to: string | null
      application_deadline: DateTime | null
    }> = {}
  ) {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      task_visibility: 'external',
      ...overrides,
    })
    return { org, owner, task }
  }

  async function applyToTask(
    taskId: string,
    applicantId: string,
    overrides: Partial<{
      message: string | null
      portfolio_links: string[] | null
      application_source: 'public_listing' | 'invitation' | 'referral'
    }> = {}
  ) {
    const ctx = makeSystemTaskActionContext(applicantId)
    const command = new ApplyForTaskCommand(ctx, taskExternalDeps, new TaskCacheInvalidator())
    const dto = new ApplyForTaskDTO({
      task_id: taskId,
      message: overrides.message ?? null,
      portfolio_links: overrides.portfolio_links ?? null,
      application_source: overrides.application_source ?? 'public_listing',
    })

    return command.handle(dto)
  }

  test('applying creates one pending marketplace application and increments the public count', async ({
    assert,
  }) => {
    const { task } = await createPublicTask()
    const applicant = await UserFactory.createExternalContributor()
    const before = await Task.findOrFail(task.id)
    const links = ['https://github.com/test', 'https://portfolio.example.com']

    const created = await applyToTask(task.id, applicant.id, {
      message: 'I am interested in this task',
      portfolio_links: links,
      application_source: 'public_listing',
    })

    const stored = await TaskApplication.findOrFail(created.id)
    const after = await Task.findOrFail(task.id)

    assert.equal(stored.task_id, task.id)
    assert.equal(stored.applicant_id, applicant.id)
    assert.equal(stored.application_status, 'pending')
    assert.equal(stored.message, 'I am interested in this task')
    assert.deepEqual(stored.portfolio_links, links)
    assert.equal(after.external_applications_count, before.external_applications_count + 1)
    assert.equal(
      await countAuditEvents('task.application.submitted', 'task_application', created.id),
      1
    )
  })

  test('apply command rejects duplicate applications, already-assigned tasks, and expired application windows', async ({
    assert,
  }) => {
    const duplicateApplicant = await UserFactory.createExternalContributor()
    const { task: duplicateTask } = await createPublicTask()
    await TaskApplicationFactory.create({
      task_id: duplicateTask.id,
      applicant_id: duplicateApplicant.id,
      application_status: 'pending',
    })

    await expectBusinessRule(
      assert,
      () => applyToTask(duplicateTask.id, duplicateApplicant.id),
      'đã gửi đề xuất tham gia'
    )

    const currentAssignee = await UserFactory.createExternalContributor()
    const { task: assignedTask } = await createPublicTask({
      assigned_to: currentAssignee.id,
    })
    const assignedApplicant = await UserFactory.createExternalContributor()

    await expectBusinessRule(
      assert,
      () => applyToTask(assignedTask.id, assignedApplicant.id),
      'đã được giao'
    )

    const { task: expiredTask } = await createPublicTask({
      application_deadline: DateTime.now().minus({ minutes: 1 }),
    })
    const lateApplicant = await UserFactory.createExternalContributor()

    await expectBusinessRule(assert, () => applyToTask(expiredTask.id, lateApplicant.id), 'quá hạn')
  })

  test('apply command rejects the task creator without creating an application', async ({ assert }) => {
    const { owner, task } = await createPublicTask()
    const before = await Task.findOrFail(task.id)

    await expectBusinessRule(assert, () => applyToTask(task.id, owner.id), 'chính mình')

    const applications = await TaskApplication.query().where('task_id', task.id)
    const after = await Task.findOrFail(task.id)

    assert.lengthOf(applications, 0)
    assert.equal(after.external_applications_count, before.external_applications_count)
  })

  test('apply command handles double submit by keeping one application and one count increment', async ({
    assert,
  }) => {
    const { task } = await createPublicTask()
    const applicant = await UserFactory.createExternalContributor()
    const before = await Task.findOrFail(task.id)

    const results = await Promise.allSettled([
      applyToTask(task.id, applicant.id, { message: 'First double submit attempt' }),
      applyToTask(task.id, applicant.id, { message: 'Second double submit attempt' }),
    ])

    const applications = await TaskApplication.query()
      .where('task_id', task.id)
      .where('applicant_id', applicant.id)
    const after = await Task.findOrFail(task.id)

    assert.lengthOf(results.filter((result) => result.status === 'fulfilled'), 1)
    assert.lengthOf(applications, 1)
    assert.equal(after.external_applications_count, before.external_applications_count + 1)
  })

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
    const command = new ProcessApplicationCommand(ctx, new TaskCacheInvalidator())
    const dto = new ProcessApplicationDTO({
      application_id: selected.id,
      action: 'approve',
      assignment_type: 'external_contributor',
    })

    await command.handle(dto)

    const approved = await TaskApplication.findOrFail(selected.id)
    const rejected = await TaskApplication.findOrFail(other.id)
    const assignment = await TaskAssignment.query().where('task_id', task.id).firstOrFail()
    const updatedTask = await Task.findOrFail(task.id)

    assert.equal(approved.application_status, 'approved')
    assert.equal(approved.reviewed_by, owner.id)
    assert.equal(assignment.assignee_id, selectedApplicant.id)
    assert.equal(assignment.assignment_status, 'active')
    assert.equal(assignment.assignment_type, 'external_contributor')
    assert.equal(updatedTask.assigned_to, selectedApplicant.id)
    assert.equal(rejected.application_status, 'rejected')
    assert.equal(rejected.rejection_reason, 'Another applicant was selected')
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
    const command = new ProcessApplicationCommand(ctx, new TaskCacheInvalidator())
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
    const command = new ProcessApplicationCommand(ctx, new TaskCacheInvalidator())
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
      new TaskCacheInvalidator()
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
      new TaskCacheInvalidator()
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
      new TaskCacheInvalidator()
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
      ForbiddenException
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
      new TaskCacheInvalidator()
    )
    await command.handle(new WithdrawApplicationDTO(application.id))

    const withdrawn = await TaskApplication.findOrFail(application.id)
    const updatedTask = await Task.findOrFail(task.id)

    assert.equal(withdrawn.application_status, 'withdrawn')
    assert.isNotNull(withdrawn.reviewed_at)
    assert.equal(updatedTask.external_applications_count, 0)
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
      new TaskCacheInvalidator()
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
      new TaskCacheInvalidator()
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
      new TaskCacheInvalidator()
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
      new TaskCacheInvalidator()
    )

    await command.handle(new WithdrawApplicationDTO(application.id))

    const withdrawn = await TaskApplication.findOrFail(application.id)
    const updatedTask = await Task.findOrFail(task.id)

    assert.equal(withdrawn.application_status, 'withdrawn')
    assert.equal(updatedTask.assigned_to, assignee.id)
    assert.equal(updatedTask.external_applications_count, 0)
  })
})
