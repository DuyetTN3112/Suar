import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { RestartDevelopmentServerCommand } from '#modules/http/actions/commands/restart_development_server_command'

@inject()
export default class DevController {
  constructor(private readonly restartDevelopmentServer: RestartDevelopmentServerCommand) {}

  /**
   * Endpoint để khởi động lại dev server
   * Chỉ có tác dụng trong môi trường development
   */
  restart({ response, logger }: HttpContext) {
    const result = this.restartDevelopmentServer.execute()
    logger.info('Đang khởi động lại dev server...')
    logger.info(`Process ID: ${String(result.processId)}`)

    response.json({
      success: true,
      message: result.message,
    })
  }
}
