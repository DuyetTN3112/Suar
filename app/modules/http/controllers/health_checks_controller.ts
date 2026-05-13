import type { HttpContext } from '@adonisjs/core/http'

import env from '#start/env'
import { healthChecks } from '#start/health'

/**
 * Controller xử lý các health checks.
 */
export default class HealthChecksController {
  /**
   * Xử lý yêu cầu health check và trả về báo cáo.
   */
  async handle({ response }: HttpContext) {
    const startTime = Date.now()

    const report = await healthChecks.run()
    const environment = {
      environment: env.get('NODE_ENV', 'production'),
      serverTime: new Date().toISOString(),
      executionTime: `${Date.now() - startTime}ms`,
    }
    const fullReport = {
      ...report,
      environment,
    }

    if (report.isHealthy) {
      response.ok(fullReport)
      return
    }
    response.serviceUnavailable(fullReport)
  }
}
