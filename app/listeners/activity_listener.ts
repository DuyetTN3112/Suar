import emitter from '@adonisjs/core/services/emitter'
import loggerService from '#infra/logger/logger_service'
import { RepositoryFactory } from '#infra/shared/repositories/index'
import type { UserLoginEvent, UserLogoutEvent } from '#events/event_types'

/**
 * Activity Listener — Sprint 7
 *
 * Handles user login/logout events:
 *   1. Creates audit log entry via repository
 *   2. Updates user.last_login_at on login
 *   3. Logs activity to user_activity_logs for analytics
 */

// === User Login ===
emitter.on('user:login', async (event: UserLoginEvent) => {
  try {
    // 1. Audit log
    const auditRepo = await RepositoryFactory.getAuditLogRepository()
    await auditRepo.create({
      user_id: event.userId,
      action: 'login',
      entity_type: 'user',
      entity_id: event.userId,
      ip_address: event.ip,
      user_agent: event.userAgent,
      new_values: { method: event.method },
    })

    // 2. Activity log
    const activityRepo = await RepositoryFactory.getUserActivityLogRepository()
    await activityRepo.create({
      user_id: event.userId,
      action_type: 'login',
      action_data: { method: event.method },
      ip_address: event.ip,
      user_agent: event.userAgent,
    })

    loggerService.debug('User login recorded', {
      userId: event.userId,
      method: event.method,
    })
  } catch (error) {
    loggerService.error('Activity listener: login event failed', {
      userId: event.userId,
      error: error instanceof Error ? error.message : String(error),
    })
  }
})

// === User Logout ===
emitter.on('user:logout', async (event: UserLogoutEvent) => {
  try {
    const auditRepo = await RepositoryFactory.getAuditLogRepository()
    await auditRepo.create({
      user_id: event.userId,
      action: 'logout',
      entity_type: 'user',
      entity_id: event.userId,
      ip_address: event.ip,
    })

    const activityRepo = await RepositoryFactory.getUserActivityLogRepository()
    await activityRepo.create({
      user_id: event.userId,
      action_type: 'logout',
      ip_address: event.ip,
    })

    loggerService.debug('User logout recorded', { userId: event.userId })
  } catch (error) {
    loggerService.error('Activity listener: logout event failed', {
      userId: event.userId,
      error: error instanceof Error ? error.message : String(error),
    })
  }
})
