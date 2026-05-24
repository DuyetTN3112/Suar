import type {
  HttpCachePrometheusMetrics,
  HttpHealthRuntimeReader,
} from '#modules/http/actions/ports/outbound/http_health_runtime_reader'

export class GetCacheMetricsQuery {
  constructor(private readonly runtime: HttpHealthRuntimeReader) {}

  execute(): HttpCachePrometheusMetrics {
    return this.runtime.cachePrometheusMetrics()
  }
}

