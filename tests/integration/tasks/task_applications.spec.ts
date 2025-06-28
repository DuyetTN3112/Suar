import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  UserFactory,
  OrganizationFactory,
  TaskFactory,
  TaskApplicationFactory,
  cleanupTestData,
} from '#tests/helpers/factories'
import ApplyForTaskCommand from '#actions/tasks/commands/apply_for_task_command'
import ProcessApplicationCommand from '#actions/tasks/commands/process_application_command'
import {
  ApplyForTaskDTO,
  ProcessApplicationDTO,
} from '#actions/tasks/dtos/request/task_application_dtos'
import TaskApplication from '#models/task_application'
import TaskAssignment from '#models/task_assignment'
import Task from '#models/task'
import BusinessLogicException from '#exceptions/business_logic_exception'
import { ExecutionContext } from '#types/execution_context'

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
      expected_rate: number | null
      portfolio_links: string[] | null
      application_source: 'public_listing' | 'invitation' | 'referral'
    }> = {}
  ) {
    const ctx = ExecutionContext.system(applicantId)
    const command = new ApplyForTaskCommand(ctx)
    const dto = new ApplyForTaskDTO({
      task_id: taskId,
      message: overrides.message ?? null,
      expected_rate: overrides.expected_rate ?? null,
      portfolio_links: overrides.portfolio_links ?? null,
      application_source: overrides.application_source ?? 'public_listing',
    })

    return command.handle(dto)
  }

  test('applying creates one pending marketplace application and increments the public count', async ({
    assert,
  }) => {
    const { task } = await createPublicTask()
    const applicant = await UserFactory.createFreelancer()
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
  })

  test('apply command rejects duplicate applications, already-assigned tasks, and expired application windows', async ({
    assert,
  }) => {
    const duplicateApplicant = await UserFactory.createFreelancer()
    const { task: duplicateTask } = await createPublicTask()
    await TaskApplicationFactory.create({
      task_id: duplicateTask.id,
      applicant_id: duplicateApplicant.id,
      application_status: 'pending',
    })

    await expectBusinessRule(
      assert,
      () => applyToTask(duplicateTask.id, duplicateApplicant.id),
      'đã ứng tuyển'
    )

    const currentAssignee = await UserFactory.createFreelancer()
    const { task: assignedTask } = await createPublicTask({
      assigned_to: currentAssignee.id,
    })
    const assignedApplicant = await UserFactory.createFreelancer()

    await expectBusinessRule(
      assert,
      () => applyToTask(assignedTask.id, assignedApplicant.id),
      'đã được giao'
    )

    const { task: expiredTask } = await createPublicTask({
      application_deadline: DateTime.now().minus({ minutes: 1 }),
    })
    const lateApplicant = await UserFactory.createFreelancer()

    await expectBusinessRule(assert, () => applyToTask(expiredTask.id, lateApplicant.id), 'quá hạn')
  })

  test('approving a pending application assigns the task and auto-rejects the remaining applicants', async ({
    assert,
  }) => {
    const { owner, task } = await createPublicTask()
    const selectedApplicant = await UserFactory.createFreelancer()
    const otherApplicant = await UserFactory.createFreelancer()

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

    const ctx = ExecutionContext.system(owner.id)
    const command = new ProcessApplicationCommand(ctx)
    const dto = new ProcessApplicationDTO({
      application_id: selected.id,
      action: 'approve',
      assignment_type: 'freelancer',
    })

    await command.handle(dto)

    const approved = await TaskApplication.findOrFail(selected.id)
    const rejected = await TaskApplication.findOrFail(other.id)
    const assignment = await TaskAssignment.query().where('task_id', task.id).firstOrFail()
    const updatedTask = await Task.findOrFail(task.id)

    assert.equal(approved.application_status, 'approved')
    assert.equal(approved.reviewed_by, owner.id)
    assert.equal(assignment.assignee_id, selectedApplicant.id)
    assert.equal(updatedTask.assigned_to, selectedApplicant.id)
    assert.equal(rejected.application_status, 'rejected')
    assert.equal(rejected.rejection_reason, 'Another applicant was selected')
  })

  test('rejecting a pending application stores the reviewer decision and reason', async ({
    assert,
  }) => {
    const { owner, task } = await createPublicTask()
    const applicant = await UserFactory.createFreelancer()
    const application = await TaskApplicationFactory.create({
      task_id: task.id,
      applicant_id: applicant.id,
      application_status: 'pending',
    })

    const ctx = ExecutionContext.system(owner.id)
    const command = new ProcessApplicationCommand(ctx)
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
    const applicant = await UserFactory.createFreelancer()
    const currentAssignee = await UserFactory.createFreelancer()
    const application = await TaskApplicationFactory.create({
      task_id: task.id,
      applicant_id: applicant.id,
      application_status: 'pending',
    })

    task.assigned_to = currentAssignee.id
    await task.save()

    const ctx = ExecutionContext.system(owner.id)
    const command = new ProcessApplicationCommand(ctx)
    const dto = new ProcessApplicationDTO({
      application_id: application.id,
      action: 'approve',
      assignment_type: 'freelancer',
    })

    await expectBusinessRule(assert, () => command.handle(dto), 'không thể duyệt thêm')
  })
})
