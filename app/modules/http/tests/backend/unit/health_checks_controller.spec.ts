import type { HttpContext } from '@adonisjs/core/http'
import { test } from '@japa/runner'

import { GetCacheMetricsQuery } from '#modules/http/actions/queries/get_cache_metrics_query'
import { GetHealthReportQuery } from '#modules/http/actions/queries/get_health_report_query'
import HealthChecksController from '#modules/http/controllers/health_checks_controller'

function toContext(value: unknown): HttpContext {
  return value as HttpContext
}

function makeController(report: { isHealthy: boolean; [key: string]: unknown }) {
  const runtime = {
    runHealthChecks: () => Promise.resolve(report),
    environmentName: () => 'test',
    currentDate: () => new Date('2026-07-07T00:00:00.000Z'),
    monotonicMilliseconds: () => 1_000,
    cacheRuntimeMetrics: () => ({ reads: 1 }),
    cachePrometheusMetrics: () => ({
      contentType: 'text/plain; version=0.0.4; charset=utf-8',
      body: '# TYPE suar_cache_reads_total counter\nsuar_cache_reads_total 1\n',
    }),
  }
  return new HealthChecksController(
    new GetHealthReportQuery(runtime),
    new GetCacheMetricsQuery(runtime)
  )
}

test.group('HealthChecksController', () => {
  test('serves cache metrics with the Prometheus content type', ({ assert }) => {
    const controller = makeController({ isHealthy: true })
    const headers: Array<[string, string]> = []
    let body = ''

    const result = controller.cacheMetrics(
      toContext({
        response: {
          header: (name: string, value: string) => headers.push([name, value]),
          send: (value: string) => {
            body = value
            return 'metrics-sent'
          },
        },
      })
    )

    assert.equal(result, 'metrics-sent')
    assert.deepEqual(headers, [['content-type', 'text/plain; version=0.0.4; charset=utf-8']])
    assert.include(body, '# TYPE suar_cache_reads_total counter')
    assert.notInclude(body, 'cache_key')
  })

  test('returns warning report directly when runtime remains healthy', async ({ assert }) => {
    const healthyReport = {
      isHealthy: true,
      status: 'warning',
      finishedAt: new Date('2026-07-07T00:00:00.000Z'),
      checks: [
        {
          isCached: false,
          name: 'optional cache',
          message: 'Optional cache is degraded',
          status: 'warning',
          finishedAt: new Date('2026-07-07T00:00:00.000Z'),
        },
      ],
    }

    const controller = makeController(healthyReport)
    const result = await controller.handle(
      toContext({
        response: {
          serviceUnavailable: () => {
            throw new Error('serviceUnavailable should not be called for healthy report')
          },
        },
      })
    )

    assert.equal((result as { isHealthy: boolean }).isHealthy, true)
    assert.equal(
      (result as { environment: { environment: string } }).environment.environment,
      'test'
    )
    if (!result) {
      throw new Error('Expected a healthy report payload')
    }
    assert.property(result, 'environment')
    assert.property(result, 'runtime')
    assert.property(result['runtime'], 'cache')
  })

  test('delegates unhealthy report to explicit 503 response handling', async ({ assert }) => {
    const unhealthyReport = {
      isHealthy: false,
      finishedAt: new Date('2026-07-07T00:00:00.000Z'),
      checks: [],
    }

    const controller = makeController(unhealthyReport)
    const calls: Array<{ isHealthy: boolean }> = []

    const result = await controller.handle(
      toContext({
        response: {
          serviceUnavailable: (payload: { isHealthy: boolean }) => {
            calls.push(payload)
            return '503-sent'
          },
        },
      })
    )

    assert.equal(result, '503-sent')
    assert.lengthOf(calls, 1)
    assert.isFalse(calls[0]?.isHealthy ?? true)
  })
})
