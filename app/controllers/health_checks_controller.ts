import type { HttpContext } from '@adonisjs/core/http'

import env from '#start/env'
import { healthChecks } from '#start/health'

/**
 * Controller xử lý các health checks
 */
export default class HealthChecksController {
  /**
   * Xử lý yêu cầu health check và trả về báo cáo
   */
  async handle({
    response,
    //  request
  }: HttpContext) {
    // Theo dõi thời gian thực hiện
    const startTime = Date.now()

    // Thực hiện health check
    const report = await healthChecks.run()

    // Thêm thông tin môi trường nếu cần
    const environment = {
      environment: env.get('NODE_ENV', 'production'),
      serverTime: new Date().toISOString(),
      executionTime: `${Date.now() - startTime}ms`,
    }
    const fullReport = {
      ...report,
      environment,
    }
    // Trả về trạng thái dựa trên sức khỏe của hệ thống
    if (report.isHealthy) {
      response.ok(fullReport)
      return
    }
    response.serviceUnavailable(fullReport)
  }
}
