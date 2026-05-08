import emitter from '@adonisjs/core/services/emitter'

import { organizationCacheInvalidator } from '#composition/organizations/access/organization_cache_composition'
import type { CacheInvalidationEvent } from '#modules/cache/events/invalidation-outbox/cache_events'
import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import loggerService from '#modules/logger/public_contracts/application_logger'
import {
  invalidateProjectCaches,
  invalidateProjectCollectionCaches,
  invalidateProjectMembershipCaches,
} from '#modules/projects/infra/adapters/project-context/project_cache_invalidator'
import { TaskCacheInvalidator } from '#modules/tasks/infra/adapters/task-authoring/task_cache_invalidator'

const taskCache = new TaskCacheInvalidator()

emitter.on('cache:invalidate', async (event: CacheInvalidationEvent) => {
  try {
    const outcomes: boolean[] = []
    for (const pattern of event.patterns ?? []) {
      outcomes.push(await cacheStore.deleteByPatternBestEffort(pattern))
    }

    const failed = outcomes.filter((outcome) => !outcome).length
    if (failed > 0) {
      loggerService.warn('Synchronous cache invalidation deferred to durable outbox', {
        entityType: event.entityType,
        attempted: outcomes.length,
        failed,
      })
    } else {
      loggerService.debug('Cache invalidated', {
        entityType: event.entityType,
        attempted: outcomes.length,
      })
    }
  } catch (error) {
    loggerService.error('Cache invalidation failed', {
      entityType: event.entityType,
      error: error instanceof Error ? error.message : String(error),
    })
  }
})

for (const eventName of [
  'organization:created',
  'organization:updated',
  'organization:deleted',
] as const) {
  emitter.on(eventName, async (event) => {
    await Promise.all([
      organizationCacheInvalidator.invalidateOrganization(event.organizationId),
      organizationCacheInvalidator.invalidateAllOrganizationLists(),
    ])
  })
}

emitter.on('project:created', async (event) => {
  await Promise.all([
    invalidateProjectCollectionCaches(),
    organizationCacheInvalidator.invalidateOrganization(event.organizationId),
  ])
})

emitter.on('project:updated', async (event) => {
  await Promise.all([invalidateProjectCaches(event.projectId), invalidateProjectCollectionCaches()])
})

emitter.on('project:deleted', async (event) => {
  await Promise.all([
    invalidateProjectCaches(event.projectId),
    invalidateProjectCollectionCaches(),
    organizationCacheInvalidator.invalidateOrganization(event.organizationId),
  ])
})

emitter.on('task:created', async (event) => {
  await taskCache.invalidateAfterTaskCreated(event.organizationId)
  if (event.projectId) {
    await invalidateProjectCaches(event.projectId)
  }
})

for (const eventName of ['task:updated', 'task:status:changed'] as const) {
  emitter.on(eventName, async (event) => {
    await taskCache.invalidateAfterTaskUpdated(event.taskId, event.organizationId)
  })
}

emitter.on('task:assigned', async (event) => {
  await taskCache.invalidateAfterTaskAssigned(event.taskId, event.organizationId)
})

emitter.on('task:access:revoked', async (event) => {
  await taskCache.invalidateAfterTaskAccessChanged(event.taskId, event.organizationId)
})

for (const eventName of [
  'organization:member:added',
  'organization:member:removed',
  'organization:member:role_changed',
  'organization:member:approved',
] as const) {
  emitter.on(eventName, async (event) => {
    await organizationCacheInvalidator.invalidateMembership({
      organizationId: event.organizationId,
      userIds: [event.userId],
    })
  })
}

for (const eventName of ['project:member:added', 'project:member:removed'] as const) {
  emitter.on(eventName, async (event) => {
    await invalidateProjectMembershipCaches(event.projectId, event.userId)
  })
}

emitter.on('project:ownership:transferred', async (event) => {
  await Promise.all([
    invalidateProjectMembershipCaches(event.projectId, event.fromUserId),
    invalidateProjectMembershipCaches(event.projectId, event.toUserId),
    invalidateProjectCollectionCaches(),
  ])
})
