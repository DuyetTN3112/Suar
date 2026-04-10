import emitter from '@adonisjs/core/services/emitter'
import cacheService from '#infra/cache/cache_service'
import loggerService from '#infra/logger/logger_service'
import type { CacheInvalidationEvent } from '#events/event_types'
import * as CachedPermissionService from '#services/cached_permission_service'

/**
 * Cache Invalidation Listener — tự động xóa cache khi data thay đổi.
 *
 * Pattern: Event-driven invalidation
 * Khi entity bị mutate → emit 'cache:invalidate' event → listener xóa cache liên quan.
 */

// === Centralized cache invalidation ===
emitter.on('cache:invalidate', async (event: CacheInvalidationEvent) => {
  try {
    // Xóa theo entity cụ thể
    if (event.entityId) {
      await cacheService.invalidateEntity(event.entityType, event.entityId)
    }

    // Xóa theo entity type (tất cả instances)
    if (!event.entityId) {
      await cacheService.invalidateEntityType(event.entityType)
    }

    // Xóa theo patterns tùy chỉnh
    if (event.patterns) {
      for (const pattern of event.patterns) {
        await cacheService.deleteByPattern(pattern)
      }
    }

    loggerService.debug('Cache invalidated', {
      entityType: event.entityType,
      entityId: event.entityId,
      patterns: event.patterns,
    })
  } catch (error) {
    loggerService.error('Cache invalidation failed', {
      entityType: event.entityType,
      error: error instanceof Error ? error.message : String(error),
    })
  }
})

// === Auto-invalidate cache cho các mutation events ===

// Organization mutations
emitter.on('organization:created', async (event) => {
  await cacheService.invalidateEntityType('organization')
  await cacheService.deleteByPattern(`*org:${event.organization.id}*`)
})

emitter.on('organization:updated', async (event) => {
  await cacheService.invalidateEntity('organization', event.organization.id)
  await cacheService.deleteByPattern(`*org:${event.organization.id}*`)
})

emitter.on('organization:deleted', async (event) => {
  await cacheService.invalidateEntity('organization', event.organizationId)
  await cacheService.deleteByPattern(`*org:${event.organizationId}*`)
})

// Project mutations
emitter.on('project:created', async (event) => {
  await cacheService.invalidateEntityType('project')
  await cacheService.deleteByPattern(`*org:${event.organizationId}:project*`)
})

emitter.on('project:updated', async (event) => {
  await cacheService.invalidateEntity('project', event.project.id)
})

emitter.on('project:deleted', async (event) => {
  await cacheService.invalidateEntity('project', event.projectId)
  await cacheService.deleteByPattern(`*org:${event.organizationId}:project*`)
})

// Task mutations
emitter.on('task:created', async (event) => {
  await cacheService.invalidateEntityType('task')
  if (event.projectId) {
    await cacheService.deleteByPattern(`*project:${event.projectId}:task*`)
  }
})

emitter.on('task:updated', async (event) => {
  await cacheService.invalidateEntity('task', event.task.id)
})

emitter.on('task:status:changed', async (event) => {
  await cacheService.invalidateEntity('task', event.task.id)
  await cacheService.deleteByPattern(`*task:${event.task.id}*`)
})

emitter.on('task:assigned', async (event) => {
  await cacheService.invalidateEntity('task', event.taskId)
  await cacheService.deleteByPattern(`*task:${event.taskId}*`)
})

// Task access revoked — assignee loses permissions
emitter.on('task:access:revoked', async (event) => {
  await cacheService.invalidateEntity('task', event.taskId)
  await cacheService.deleteByPattern(`*task:${event.taskId}*`)
})

// Member mutations (org + project)
// FIX Sprint 6: Also invalidate permission cache (perm:*) keys
// Previously only entity cache was cleared, stale permissions could be served for up to 5 min
emitter.on('organization:member:added', async (event) => {
  await cacheService.deleteByPattern(`*org:${event.organizationId}:member*`)
  await cacheService.deleteByPattern(`*user:${event.userId}:org*`)
  await CachedPermissionService.invalidateUserPermissions(event.userId)
  await CachedPermissionService.invalidateOrgPermissions(event.organizationId)
})

emitter.on('organization:member:removed', async (event) => {
  await cacheService.deleteByPattern(`*org:${event.organizationId}:member*`)
  await cacheService.deleteByPattern(`*user:${event.userId}:org*`)
  await CachedPermissionService.invalidateUserPermissions(event.userId)
  await CachedPermissionService.invalidateOrgPermissions(event.organizationId)
})

// Role change — most critical for permission staleness
emitter.on('organization:member:role_changed', async (event) => {
  await cacheService.deleteByPattern(`*org:${event.organizationId}:member*`)
  await cacheService.deleteByPattern(`*user:${event.userId}:org*`)
  await CachedPermissionService.invalidateUserPermissions(event.userId)
  await CachedPermissionService.invalidateOrgPermissions(event.organizationId)
})

emitter.on('project:member:added', async (event) => {
  await cacheService.deleteByPattern(`*project:${event.projectId}:member*`)
  await cacheService.deleteByPattern(`*user:${event.userId}:project*`)
  await CachedPermissionService.invalidateUserPermissions(event.userId)
  await CachedPermissionService.invalidateProjectPermissions(event.projectId)
})

emitter.on('project:member:removed', async (event) => {
  await cacheService.deleteByPattern(`*project:${event.projectId}:member*`)
  await cacheService.deleteByPattern(`*user:${event.userId}:project*`)
  await CachedPermissionService.invalidateUserPermissions(event.userId)
  await CachedPermissionService.invalidateProjectPermissions(event.projectId)
})

// Project ownership transfer — new owner gains permissions, old owner loses them
emitter.on('project:ownership:transferred', async (event) => {
  await cacheService.invalidateEntity('project', event.projectId)
  await CachedPermissionService.invalidateUserPermissions(event.fromUserId)
  await CachedPermissionService.invalidateUserPermissions(event.toUserId)
  await CachedPermissionService.invalidateProjectPermissions(event.projectId)
})
