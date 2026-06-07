import { BaseQuery } from '#modules/http/actions/base_query'
import type {
  HttpCachePrometheusMetrics,
  HttpHealthRuntimeReader,
} from '#modules/http/actions/ports/outbound/http_health_runtime_reader'

export class GetCacheMetricsQuery extends BaseQuery<[], HttpCachePrometheusMetrics> {
  constructor(private readonly runtime: HttpHealthRuntimeReader) {
    super()
  }

  execute(): HttpCachePrometheusMetrics {
    return this.runtime.cachePrometheusMetrics()
  }
}

export default GetCacheMetricsQuery
