import emitter from '@adonisjs/core/services/emitter'

import type { AuditActionContext } from '#modules/audit/actions/audit_action_context'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import loggerService from '#modules/logger/public_contracts/logger_service'
import type { UserLoginEvent, UserLogoutEvent } from '#modules/users/events/user_events'

emitter.on('user:login', async (event: UserLoginEvent) => {
  try {
    const execCtx: AuditActionContext = {
      userId: event.userId,
      ip: event.ip,
      userAgent: event.userAgent,
      organizationId: null,
    }

    await auditPublicApi.write(execCtx, {
      action: 'login',
      entity_type: 'user',
      entity_id: event.userId,
      user_id: event.userId,
      new_values: { method: event.method },
    })
  } catch (error) {
    loggerService.error('Audit listener: login event failed', {
      userId: event.userId,
      error: error instanceof Error ? error.message : String(error),
    })
  }
})

emitter.on('user:logout', async (event: UserLogoutEvent) => {
  try {
    const execCtx: AuditActionContext = {
      userId: event.userId,
      ip: event.ip,
      userAgent: '',
      organizationId: null,
    }

    await auditPublicApi.write(execCtx, {
      action: 'logout',
      entity_type: 'user',
      entity_id: event.userId,
      user_id: event.userId,
    })
  } catch (error) {
    loggerService.error('Audit listener: logout event failed', {
      userId: event.userId,
      error: error instanceof Error ? error.message : String(error),
    })
  }
})
