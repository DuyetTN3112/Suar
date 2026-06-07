import type { HttpHealthRuntimeReader } from '#modules/http/actions/ports/outbound/http_health_runtime_reader'

export interface HttpHealthReportProjection {
  isHealthy: boolean
  body: Record<string, unknown>
}

export class GetHealthReportQuery {
  constructor(private readonly runtime: HttpHealthRuntimeReader) {}

  async execute(): Promise<HttpHealthReportProjection> {
    const startedAt = this.runtime.monotonicMilliseconds()
    const report = await this.runtime.runHealthChecks()
    const body = {
      ...report,
      environment: {
        environment: this.runtime.environmentName(),
        serverTime: this.runtime.currentDate().toISOString(),
        executionTime: `${String(this.runtime.monotonicMilliseconds() - startedAt)}ms`,
      },
      runtime: {
        cache: this.runtime.cacheRuntimeMetrics(),
      },
    }

    return {
      isHealthy: report.isHealthy,
      body,
    }
  }
}

export default GetHealthReportQuery
