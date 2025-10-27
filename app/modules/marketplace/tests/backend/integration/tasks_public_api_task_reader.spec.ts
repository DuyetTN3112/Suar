import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { TaskApplication } from '#modules/marketplace/domain/task_application'
import { TasksPublicApiTaskReader } from '#modules/marketplace/infra/adapters/tasks_public_api_task_reader'
import { LucidTaskApplicationRepository } from '#modules/marketplace/infra/repositories/lucid_task_application_repository'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  OrganizationFactory,
  TaskFactory,
  UserFactory,
} from '#tests/helpers/factories'

test.group('Integration | Marketplace task reader', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('returns only marketplace-visible task details', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const externalTask = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      task_visibility: 'external',
      title: 'External Task',
      description: 'Visible in marketplace',
    })
    const internalTask = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      ...(externalTask.project_id !== null ? { project_id: externalTask.project_id } : {}),
      task_visibility: 'internal',
      title: 'Internal Task',
    })

    const reader = new TasksPublicApiTaskReader()

    const visible = await reader.getMarketplaceTaskDetails(externalTask.id)
    const hidden = await reader.getMarketplaceTaskDetails(internalTask.id)

    assert.isNotNull(visible)
    assert.equal(visible?.id, externalTask.id)
    assert.equal(visible?.title, 'External Task')
    assert.equal(visible?.projectId, externalTask.project_id)
    assert.equal(visible?.visibility, 'external')
    assert.isNull(hidden)
  })

  test('eligible task list excludes internal tasks', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const externalTask = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      task_visibility: 'external',
      title: 'Marketplace Task',
    })
    await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      ...(externalTask.project_id !== null ? { project_id: externalTask.project_id } : {}),
      task_visibility: 'internal',
      title: 'Hidden Internal Task',
    })

    const reader = new TasksPublicApiTaskReader()

    const tasks = await reader.listEligibleTasks({
      viewerId: owner.id,
      limit: 20,
      offset: 0,
    })

    assert.includeDeepMembers(tasks.data, [
      { id: externalTask.id, title: 'Marketplace Task', projectId: externalTask.project_id ?? '' },
    ])
    assert.isFalse(tasks.data.some((task) => task.title === 'Hidden Internal Task'))
    assert.deepInclude(tasks.pagination, {
      mode: 'offset',
      page: 1,
      perPage: 20,
      hasPreviousPage: false,
    })
  })

  test('task reader keeps all visibility instead of collapsing marketplace visibility to public', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      task_visibility: 'all',
      title: 'All visibility marketplace task',
      description: 'Visible to org and external contributors',
    })

    const reader = new TasksPublicApiTaskReader()

    const visible = await reader.getMarketplaceTaskDetails(task.id)

    assert.isNotNull(visible)
    assert.equal(visible?.visibility, 'all')
  })

  test('marketplace application repository uses task_applications as phase 1 source of truth', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const applicant = await UserFactory.create()
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      task_visibility: 'external',
      title: 'Single source application task',
    })
    const repository = new LucidTaskApplicationRepository()
    const application = TaskApplication.create({
      taskId: task.id,
      projectId: task.project_id ?? '',
      applicantId: applicant.id,
      message: 'Ready to help',
      evidenceLinks: ['https://example.com/work'],
    })

    await repository.save(application)

    const taskApplication: unknown = await db
      .from('task_applications')
      .where('id', application.id)
      .first()
    const marketplaceApplication: unknown = await db
      .from('marketplace_applications')
      .where('id', application.id)
      .first()
    const found = await repository.findByTaskAndApplicant(task.id, applicant.id)

    assert.exists(taskApplication)
    assert.notExists(marketplaceApplication)
    assert.equal(found?.id, application.id)
    assert.equal(found?.projectId, task.project_id)
    assert.equal(found?.message, 'Ready to help')
    assert.deepEqual(found?.evidenceLinks, ['https://example.com/work'])
  })
})
