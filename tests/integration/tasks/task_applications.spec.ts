import { test } from '@japa/runner'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  UserFactory,
  OrganizationFactory,
  OrganizationUserFactory,
  TaskFactory,
  TaskApplicationFactory,
  cleanupTestData,
} from '#tests/helpers/factories'
import ApplyForTaskCommand from '#actions/tasks/commands/apply_for_task_command'
import ProcessApplicationCommand from '#actions/tasks/commands/process_application_command'
import { ApplyForTaskDTO, ProcessApplicationDTO } from '#actions/tasks/dtos/task_application_dtos'
import TaskApplication from '#models/task_application'
import TaskAssignment from '#models/task_assignment'
import Task from '#models/task'
import { ExecutionContext } from '#types/execution_context'
import { HttpContext } from '@adonisjs/core/http'

test.group('Integration | Task Applications', (group) => {
  group.setup(() => setupApp())
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  async function createPublicTask() {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      task_visibility: 'external',
    })
    return { org, owner, task }
  }

  test('freelancer applies for public task successfully', async ({ assert }) => {
    const { task } = await createPublicTask()
    const freelancer = await UserFactory.createFreelancer()

    const ctx = ExecutionContext.system(freelancer.id)
    const command = new ApplyForTaskCommand(ctx)

    const dto = new ApplyForTaskDTO({
      task_id: task.id,
      message: 'I am interested in this task',
      application_source: 'public_listing',
    })

    const result = await command.execute(dto)
    assert.isNotNull(result)
  })

  test('application status is pending after apply', async ({ assert }) => {
    const { task } = await createPublicTask()
    const freelancer = await UserFactory.createFreelancer()

    const ctx = ExecutionContext.system(freelancer.id)
    const command = new ApplyForTaskCommand(ctx)

    const dto = new ApplyForTaskDTO({
      task_id: task.id,
      application_source: 'public_listing',
    })

    await command.execute(dto)

    const apps = await TaskApplication.query()
      .where('task_id', task.id)
      .where('applicant_id', freelancer.id)
    assert.equal(apps.length, 1)
    assert.equal(apps[0].application_status, 'pending')
  })

  test('approve application creates TaskAssignment', async ({ assert }) => {
    const { org, owner, task } = await createPublicTask()
    const freelancer = await UserFactory.createFreelancer()

    const application = await TaskApplicationFactory.create({
      task_id: task.id,
      applicant_id: freelancer.id,
      application_status: 'pending',
      application_source: 'public_listing',
    })

    const ctx = ExecutionContext.system(owner.id)
    const command = new ProcessApplicationCommand(ctx)

    const dto = new ProcessApplicationDTO({
      application_id: application.id,
      action: 'approve',
      assignment_type: 'freelancer',
    })

    await command.execute(dto)

    const updated = await TaskApplication.findOrFail(application.id)
    assert.equal(updated.application_status, 'approved')

    const assignments = await TaskAssignment.query().where('task_id', task.id)
    assert.isAbove(assignments.length, 0)
    assert.equal(assignments[0].assignee_id, freelancer.id)
  })

  test('reject application sets status to rejected with reason', async ({ assert }) => {
    const { owner, task } = await createPublicTask()
    const freelancer = await UserFactory.createFreelancer()

    const application = await TaskApplicationFactory.create({
      task_id: task.id,
      applicant_id: freelancer.id,
      application_status: 'pending',
    })

    const ctx = ExecutionContext.system(owner.id)
    const command = new ProcessApplicationCommand(ctx)

    const dto = new ProcessApplicationDTO({
      application_id: application.id,
      action: 'reject',
      rejection_reason: 'Not enough experience',
    })

    await command.execute(dto)

    const updated = await TaskApplication.findOrFail(application.id)
    assert.equal(updated.application_status, 'rejected')
    assert.equal(updated.rejection_reason, 'Not enough experience')
  })

  test('cannot apply twice for same task', async ({ assert }) => {
    const { task } = await createPublicTask()
    const freelancer = await UserFactory.createFreelancer()

    await TaskApplicationFactory.create({
      task_id: task.id,
      applicant_id: freelancer.id,
      application_status: 'pending',
    })

    const ctx = ExecutionContext.system(freelancer.id)
    const command = new ApplyForTaskCommand(ctx)

    const dto = new ApplyForTaskDTO({
      task_id: task.id,
      application_source: 'public_listing',
    })

    await assert.rejects(() => command.execute(dto))
  })

  test('cannot process already withdrawn application', async ({ assert }) => {
    const { owner, task } = await createPublicTask()
    const freelancer = await UserFactory.createFreelancer()

    const application = await TaskApplicationFactory.create({
      task_id: task.id,
      applicant_id: freelancer.id,
      application_status: 'withdrawn',
    })

    const ctx = ExecutionContext.system(owner.id)
    const command = new ProcessApplicationCommand(ctx)

    const dto = new ProcessApplicationDTO({
      application_id: application.id,
      action: 'approve',
    })

    await assert.rejects(() => command.execute(dto))
  })

  test('external_applications_count increments on apply', async ({ assert }) => {
    const { task } = await createPublicTask()
    const freelancer = await UserFactory.createFreelancer()

    const before = await Task.findOrFail(task.id)
    const countBefore = before.external_applications_count

    const ctx = ExecutionContext.system(freelancer.id)
    const command = new ApplyForTaskCommand(ctx)

    const dto = new ApplyForTaskDTO({
      task_id: task.id,
      application_source: 'public_listing',
    })

    await command.execute(dto)

    const after = await Task.findOrFail(task.id)
    assert.equal(after.external_applications_count, countBefore + 1)
  })

  test('portfolio links stored correctly', async ({ assert }) => {
    const { task } = await createPublicTask()
    const freelancer = await UserFactory.createFreelancer()

    const links = ['https://github.com/test', 'https://portfolio.example.com']

    const ctx = ExecutionContext.system(freelancer.id)
    const command = new ApplyForTaskCommand(ctx)

    const dto = new ApplyForTaskDTO({
      task_id: task.id,
      portfolio_links: links,
      application_source: 'public_listing',
    })

    await command.execute(dto)

    const apps = await TaskApplication.query()
      .where('task_id', task.id)
      .where('applicant_id', freelancer.id)
    assert.deepEqual(apps[0].portfolio_links, links)
  })

  test('approve auto-rejects other pending applications', async ({ assert }) => {
    const { owner, task } = await createPublicTask()
    const freelancer1 = await UserFactory.createFreelancer()
    const freelancer2 = await UserFactory.createFreelancer()

    const app1 = await TaskApplicationFactory.create({
      task_id: task.id,
      applicant_id: freelancer1.id,
      application_status: 'pending',
    })

    const app2 = await TaskApplicationFactory.create({
      task_id: task.id,
      applicant_id: freelancer2.id,
      application_status: 'pending',
    })

    const ctx = ExecutionContext.system(owner.id)
    const command = new ProcessApplicationCommand(ctx)

    const dto = new ProcessApplicationDTO({
      application_id: app1.id,
      action: 'approve',
      assignment_type: 'freelancer',
    })

    await command.execute(dto)

    const updatedApp1 = await TaskApplication.findOrFail(app1.id)
    const updatedApp2 = await TaskApplication.findOrFail(app2.id)
    assert.equal(updatedApp1.application_status, 'approved')
    assert.equal(updatedApp2.application_status, 'rejected')
  })
})
