import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'
import { DateTime } from 'luxon'

import { notificationTransactionStager } from '#composition/notifications/notification-feed/notification_composition'
import { taskOrganizationMembershipWriter } from '#composition/organizations/tasks/task_organization_membership_composition'
import { taskExternalDeps } from '#composition/tasks/task-external-dependencies/task_external_dependencies_composition'
import {
  BusinessPolicyViolationException,
  ForbiddenPolicyViolationException,
} from '#modules/authorization/public_contracts/policy_violation'
import RedisCacheStore from '#modules/cache/infra/adapters/cache-runtime/redis_cache_store'
import {
  CACHE_COLLECTION_GENERATION_NAMESPACES,
  entityCacheGenerationNamespaces,
  globalCacheGenerationNamespaces,
  organizationUserCacheGenerationNamespaces,
  taskListCacheGenerationNamespaces,
} from '#modules/cache/public_contracts/cache_contract'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { buildNotificationEventId } from '#modules/notifications/public_contracts/notification_event_identity'
import * as membershipQueries from '#modules/organizations/infra/repositories/members/organization_user_repository/read/membership_queries'
import ApplyForTaskCommand from '#modules/tasks/actions/commands/task-applications/apply_for_task_command'
import ProcessApplicationCommand from '#modules/tasks/actions/commands/task-applications/process_application_command'
import WithdrawApplicationCommand from '#modules/tasks/actions/commands/task-applications/withdraw_application_command'
import {
  ApplyForTaskDTO,
  ProcessApplicationDTO,
  WithdrawApplicationDTO,
} from '#modules/tasks/actions/dtos/request/task_application_dtos'
import type { TaskNotificationStager as NotificationStager } from '#modules/tasks/actions/ports/outbound/task_notification_stager'
import { makeSystemTaskActionContext } from '#modules/tasks/actions/task_action_context'
import { InProcessTaskEventPublisher } from '#modules/tasks/infra/adapters/task-authoring/in_process_task_event_publisher'
import { TaskCacheInvalidator } from '#modules/tasks/infra/adapters/task-authoring/task_cache_invalidator'
import TaskApplication from '#modules/tasks/infra/models/task-applications/task_application'
import TaskAssignment from '#modules/tasks/infra/models/task-assignment/task_assignment'
import Task from '#modules/tasks/infra/models/task-authoring/task'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  UserFactory,
  OrganizationFactory,
  OrganizationUserFactory,
  ProjectFactory,
  SkillFactory,
  TaskFactory,
  TaskApplicationFactory,
  cleanupTestData,
} from '#tests/helpers/factories'
import { testId } from '#tests/helpers/test_utils'

const taskEvents = new InProcessTaskEventPublisher()

class FailingNotificationStager implements NotificationStager {
  public calls = 0

  public stage(): Promise<never> {
    this.calls += 1
    return Promise.reject(new Error('task application notification staging failed'))
  }
}

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
    assert.instanceOf(error, BusinessPolicyViolationException)
    assert.include((error as BusinessPolicyViolationException).reason, reasonPart)
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

async function resolveGenerationKey(
  namespaces: readonly string[],
  logicalKey: string
): Promise<string> {
  const physicalKey = await RedisCacheStore.resolveVersionedKeyBestEffort(namespaces, logicalKey)
  if (!physicalKey) {
    throw new Error(`Expected cache generation key to resolve for ${logicalKey}`)
  }
  return physicalKey
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
    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
      visibility: 'public',
      allow_external_contributors: true,
    })
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      project_id: project.id,
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
    const command = new ApplyForTaskCommand(
      ctx,
      taskExternalDeps,
      new TaskCacheInvalidator(),
      taskEvents,
      notificationTransactionStager
    )
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
