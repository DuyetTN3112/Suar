export interface HttpHealthCheckReport {
  isHealthy: boolean
  [key: string]: unknown
}

export interface HttpCachePrometheusMetrics {
  contentType: string
  body: string
}

export abstract class HttpHealthRuntimeReader {
  abstract runHealthChecks(): Promise<HttpHealthCheckReport>
  abstract environmentName(): string
  abstract currentDate(): Date
  abstract monotonicMilliseconds(): number
  abstract cacheRuntimeMetrics(): unknown
  abstract cachePrometheusMetrics(): HttpCachePrometheusMetrics
}
