import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { GetCacheMetricsQuery } from '#modules/http/actions/queries/get_cache_metrics_query'
import { GetHealthReportQuery } from '#modules/http/actions/queries/get_health_report_query'

/**
 * Controller xử lý các health checks.
 */
@inject()
export default class HealthChecksController {
  constructor(
    private readonly getHealthReport: GetHealthReportQuery,
    private readonly getCacheMetrics: GetCacheMetricsQuery
  ) {}

  /**
   * Low-cardinality application-cache metrics for an authenticated collector.
   */
  cacheMetrics({ response }: HttpContext) {
    const metrics = this.getCacheMetrics.execute()
    response.header('content-type', metrics.contentType)
    return response.send(metrics.body)
  }

  /**
   * Xử lý yêu cầu health check và trả về báo cáo.
   */
  async handle({ response }: HttpContext) {
    const report = await this.getHealthReport.execute()

    if (report.isHealthy) {
      return report.body
    }

    return response.serviceUnavailable(report.body)
  }
}
