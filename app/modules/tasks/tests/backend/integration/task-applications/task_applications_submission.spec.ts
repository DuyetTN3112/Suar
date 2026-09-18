import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'
import { DateTime } from 'luxon'

import {
  applyToTask,
  countAuditEvents,
  createPublicTask,
  expectBusinessRule,
  FailingNotificationStager,
  resolveGenerationKey,
  taskEvents,
} from './task_applications_test_support.js'

import { taskExternalDeps } from '#composition/tasks/task-external-dependencies/task_external_dependencies_composition'
import RedisCacheStore from '#modules/cache/infra/adapters/cache-runtime/redis_cache_store'
import {
  CACHE_COLLECTION_GENERATION_NAMESPACES,
  entityCacheGenerationNamespaces,
  globalCacheGenerationNamespaces,
  organizationUserCacheGenerationNamespaces,
  taskListCacheGenerationNamespaces,
} from '#modules/cache/public_contracts/cache_contract'
import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { buildNotificationEventId } from '#modules/notifications/public_contracts/notification_event_identity'
import ApplyForTaskCommand from '#modules/tasks/actions/commands/task-applications/apply_for_task_command'
import { ApplyForTaskDTO } from '#modules/tasks/actions/dtos/request/task_application_dtos'
import { makeSystemTaskActionContext } from '#modules/tasks/actions/task_action_context'
import { TaskCacheInvalidator } from '#modules/tasks/infra/adapters/task-authoring/task_cache_invalidator'
import TaskApplication from '#modules/tasks/infra/models/task-applications/task_application'
import Task from '#modules/tasks/infra/models/task-authoring/task'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  SkillFactory,
  TaskApplicationFactory,
  UserFactory,
} from '#tests/helpers/factories'
import { testId } from '#tests/helpers/test_utils'

test.group('Integration | Task Applications — Submission', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('applying creates one pending marketplace application and increments the public count', async ({
    assert,
    cleanup,
  }) => {
    const { owner, task } = await createPublicTask()
    const applicant = await UserFactory.createExternalContributor()
    const before = await Task.findOrFail(task.id)
    const links = ['https://github.com/test', 'https://portfolio.example.com']
    const generationEntries = [
      {
        logicalKey: `task:audit:${task.id}:viewer:${owner.id}:limit:20`,
        namespaces: entityCacheGenerationNamespaces(
          CACHE_COLLECTION_GENERATION_NAMESPACES.taskAudit,
          'task',
          task.id
        ),
      },
      {
        logicalKey: `tasks:list:v2:org:${task.organization_id}:scope:all:query:application-test`,
        namespaces: taskListCacheGenerationNamespaces(task.organization_id),
      },
      {
        logicalKey: `tasks:public:v2:query:application-test`,
        namespaces: globalCacheGenerationNamespaces(
          CACHE_COLLECTION_GENERATION_NAMESPACES.publicTasks
        ),
      },
      {
        logicalKey: `task:user:user:${applicant.id}:org:${task.organization_id}:page:1`,
        namespaces: organizationUserCacheGenerationNamespaces(
          CACHE_COLLECTION_GENERATION_NAMESPACES.userTasks,
          task.organization_id,
          applicant.id
        ),
      },
      {
        logicalKey: `tasks:grouped:org:${task.organization_id}:user:${applicant.id}`,
        namespaces: organizationUserCacheGenerationNamespaces(
          CACHE_COLLECTION_GENERATION_NAMESPACES.groupedTasks,
          task.organization_id,
          applicant.id
        ),
      },
      {
        logicalKey: `tasks:timeline:org:${task.organization_id}:user:${applicant.id}`,
        namespaces: organizationUserCacheGenerationNamespaces(
          CACHE_COLLECTION_GENERATION_NAMESPACES.timelineTasks,
          task.organization_id,
          applicant.id
        ),
      },
      {
        logicalKey: `task:stats:org:${task.organization_id}:user:${applicant.id}`,
        namespaces: organizationUserCacheGenerationNamespaces(
          CACHE_COLLECTION_GENERATION_NAMESPACES.taskStatistics,
          task.organization_id,
          applicant.id
        ),
      },
      {
        logicalKey: `task:applications:page:1:taskId:${task.id}:userId:${owner.id}`,
        namespaces: entityCacheGenerationNamespaces(
          CACHE_COLLECTION_GENERATION_NAMESPACES.taskApplications,
          'task',
          task.id
        ),
      },
      {
        logicalKey: `user:applications:page:1:userId:${applicant.id}`,
        namespaces: entityCacheGenerationNamespaces(
          CACHE_COLLECTION_GENERATION_NAMESPACES.userApplications,
          'user',
          applicant.id
        ),
      },
    ] as const
    const oldGenerationKeys = await Promise.all(
      generationEntries.map(({ namespaces, logicalKey }) =>
        resolveGenerationKey(namespaces, logicalKey)
      )
    )
    await Promise.all([
      ...oldGenerationKeys.map((key) => RedisCacheStore.set(key, { stale: true })),
    ])

    const created = await applyToTask(task.id, applicant.id, {
      message: 'I am interested in this task',
      portfolio_links: links,
      application_source: 'public_listing',
    })
    const nextGenerationKeys = await Promise.all(
      generationEntries.map(({ namespaces, logicalKey }) =>
        resolveGenerationKey(namespaces, logicalKey)
      )
    )
    cleanup(async () => {
      await Promise.all(
        [...oldGenerationKeys, ...nextGenerationKeys].map((key) =>
          RedisCacheStore.deleteBestEffort(key)
        )
      )
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
    const notification = (await db
      .from('notifications')
      .select('event_id', 'category', 'action')
      .where('user_id', owner.id)
      .where('type', 'task_application')
      .where('related_entity_id', created.id)
      .first()) as {
      event_id: string
      category: string
      action: { routeName?: string } | null
    } | null
    assert.isNotNull(notification)
    if (notification) {
      assert.equal(
        notification.event_id,
        buildNotificationEventId({
          eventName: 'task.application_submitted',
          businessEventId: created.id,
          recipientId: owner.id,
        })
      )
      assert.equal(notification.category, 'task')
      assert.equal(notification.action?.routeName, 'task_applications.show')
      assert.lengthOf(
        await db.from('notification_outbox').where('source_event_id', notification.event_id),
        2
      )
    }
    for (const [index, nextKey] of nextGenerationKeys.entries()) {
      const oldKey = oldGenerationKeys[index]
      assert.notEqual(nextKey, oldKey)
      assert.isNull(await RedisCacheStore.get(nextKey))
      assert.deepEqual(await RedisCacheStore.get(oldKey ?? ''), { stale: true })
    }
  })

  test('submitted notification staging failure rolls application, count, and audit back', async ({
    assert,
  }) => {
    const { task } = await createPublicTask()
    const applicant = await UserFactory.createExternalContributor()
    const notification = new FailingNotificationStager()
    const before = await Task.findOrFail(task.id)
    const command = new ApplyForTaskCommand(
      makeSystemTaskActionContext(applicant.id),
      taskExternalDeps,
      new TaskCacheInvalidator(),
      taskEvents,
      notification
    )

    await assert.rejects(
      () =>
        command.handle(
          new ApplyForTaskDTO({
            task_id: task.id,
            message: null,
            portfolio_links: null,
            application_source: 'public_listing',
          })
        ),
      'task application notification staging failed'
    )

    const application = await TaskApplication.query()
      .where('task_id', task.id)
      .where('applicant_id', applicant.id)
      .first()
    const after = await Task.findOrFail(task.id)
    assert.equal(notification.calls, 1)
    assert.isNull(application)
    assert.equal(after.external_applications_count, before.external_applications_count)
  })

  test('rejects an application below a mandatory task skill minimum before creating an application', async ({
    assert,
  }) => {
    const { task } = await createPublicTask()
    const applicant = await UserFactory.createExternalContributor()
    const skill = await SkillFactory.create({ skill_name: 'Mandatory eligibility skill' })

    await db.table('task_required_skills').insert({
      id: testId(),
      task_id: task.id,
      skill_id: skill.id,
      required_public_proficiency_code: 'l4',
      is_mandatory: true,
      importance: 'critical',
      weight: 1,
      requirement_source: 'manual',
      requirement_notes: null,
      proficiency_level_id: null,
      minimum_level_id: null,
      target_level_id: null,
      assessment_ceiling_level_id: null,
      project_skill_id: null,
      rubric_version_id: null,
      source_project_professional_role_id: null,
      source_role_skill_id: null,
    })

    await assert.rejects(() => applyToTask(task.id, applicant.id), ValidationException)

    const application = await TaskApplication.query()
      .where('task_id', task.id)
      .where('applicant_id', applicant.id)
      .first()
    assert.isNull(application)
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

  test('apply command rejects the task creator without creating an application', async ({
    assert,
  }) => {
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

    assert.lengthOf(
      results.filter((result) => result.status === 'fulfilled'),
      1
    )
    assert.lengthOf(applications, 1)
    assert.equal(after.external_applications_count, before.external_applications_count + 1)
  })
})
