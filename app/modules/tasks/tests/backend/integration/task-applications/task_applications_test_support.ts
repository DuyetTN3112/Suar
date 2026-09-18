import db from '@adonisjs/lucid/services/db'
import type { DateTime } from 'luxon'

import { notificationTransactionStager } from '#composition/notifications/notification-feed/notification_composition'
import { taskExternalDeps } from '#composition/tasks/task-external-dependencies/task_external_dependencies_composition'
import { BusinessPolicyViolationException } from '#modules/authorization/public_contracts/policy_violation'
import RedisCacheStore from '#modules/cache/infra/adapters/cache-runtime/redis_cache_store'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import ApplyForTaskCommand from '#modules/tasks/actions/commands/task-applications/apply_for_task_command'
import { ApplyForTaskDTO } from '#modules/tasks/actions/dtos/request/task_application_dtos'
import type { TaskNotificationStager as NotificationStager } from '#modules/tasks/actions/ports/outbound/task_notification_stager'
import { makeSystemTaskActionContext } from '#modules/tasks/actions/task_action_context'
import { InProcessTaskEventPublisher } from '#modules/tasks/infra/adapters/task-authoring/in_process_task_event_publisher'
import { TaskCacheInvalidator } from '#modules/tasks/infra/adapters/task-authoring/task_cache_invalidator'
import { OrganizationFactory, ProjectFactory, TaskFactory } from '#tests/helpers/factories'

export const taskEvents = new InProcessTaskEventPublisher()

export class FailingNotificationStager implements NotificationStager {
  public calls = 0

  public stage(): Promise<never> {
    this.calls += 1
    return Promise.reject(new Error('task application notification staging failed'))
  }
}

export async function expectBusinessRule(
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

export async function expectWithdrawNotFound(
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

export async function expectProcessNotFound(
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

export async function countAuditEvents(
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

export async function resolveGenerationKey(
  namespaces: readonly string[],
  logicalKey: string
): Promise<string> {
  const physicalKey = await RedisCacheStore.resolveVersionedKeyBestEffort(namespaces, logicalKey)
  if (!physicalKey) {
    throw new Error(`Expected cache generation key to resolve for ${logicalKey}`)
  }
  return physicalKey
}

export async function createPublicTask(
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

export async function applyToTask(
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
