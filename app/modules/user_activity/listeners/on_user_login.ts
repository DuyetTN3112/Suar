import emitter from '@adonisjs/core/services/emitter'

import loggerService from '#modules/logger/public_contracts/logger_service'
import { userActivityPublicApi } from '#modules/user_activity/actions/public_api'
import type { UserLoginEvent, UserLogoutEvent } from '#modules/users/events/user_events'

emitter.on('user:login', async (event: UserLoginEvent) => {
  try {
    await userActivityPublicApi.create({
      user_id: event.userId,
      action_type: 'login',
      action_data: { method: event.method },
      ip_address: event.ip,
      user_agent: event.userAgent,
    })

    loggerService.debug('User login activity recorded', {
      userId: event.userId,
      method: event.method,
    })
  } catch (error) {
    loggerService.error('User activity listener: login event failed', {
      userId: event.userId,
      error: error instanceof Error ? error.message : String(error),
    })
  }
})

emitter.on('user:logout', async (event: UserLogoutEvent) => {
  try {
    await userActivityPublicApi.create({
      user_id: event.userId,
      action_type: 'logout',
      ip_address: event.ip,
    })

    loggerService.debug('User logout activity recorded', { userId: event.userId })
  } catch (error) {
    loggerService.error('User activity listener: logout event failed', {
      userId: event.userId,
      error: error instanceof Error ? error.message : String(error),
    })
  }
})
