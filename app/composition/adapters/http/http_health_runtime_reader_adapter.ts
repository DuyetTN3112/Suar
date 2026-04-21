import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import {
  HttpHealthRuntimeReader,
  type HttpHealthCheckReport,
} from '#modules/http/actions/ports/outbound/http_health_runtime_reader'
import env from '#start/env'

export class HttpHealthRuntimeReaderAdapter extends HttpHealthRuntimeReader {
  async runHealthChecks(): Promise<HttpHealthCheckReport> {
    const { healthChecks } = await import('#start/health')
    return (await healthChecks.run())
  }

  environmentName(): string {
    return env.get('NODE_ENV', 'production')
  }

  currentDate(): Date {
    return new Date()
  }

  monotonicMilliseconds(): number {
    return Date.now()
  }

  cacheRuntimeMetrics(): unknown {
    return cacheStore.runtimeMetrics()
  }

  cachePrometheusMetrics() {
    return cacheStore.prometheusMetrics()
  }
}
