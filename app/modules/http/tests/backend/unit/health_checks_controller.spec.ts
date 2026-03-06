import type { HttpContext } from '@adonisjs/core/http'
import { test } from '@japa/runner'

import HealthChecksController from '#modules/http/controllers/health_checks_controller'
import env from '#start/env'
import { healthChecks } from '#start/health'

function toContext(value: unknown): HttpContext {
  return value as HttpContext
}

function toHealthReport(value: unknown): Awaited<ReturnType<typeof healthChecks.run>> {
  return value as Awaited<ReturnType<typeof healthChecks.run>>
}

test.group('HealthChecksController', () => {
  test('returns health report object directly when runtime is healthy', async ({ assert }) => {
    const originalRun = Reflect.get(healthChecks, 'run')
    const originalEnvGet = env.get.bind(env)
    const healthyReport = toHealthReport({
      isHealthy: true,
      finishedAt: new Date('2026-07-07T00:00:00.000Z'),
      checks: [],
    })

    healthChecks.run = () => Promise.resolve(healthyReport)

    ;env.get = (key: string, fallback?: string) => {
      if (key === 'NODE_ENV') return 'test'
      return fallback as string
    }

    try {
      const controller = new HealthChecksController()
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
      assert.property(result, 'environment')
    } finally {
      healthChecks.run = originalRun
      ;env.get = originalEnvGet
    }
  })

  test('delegates unhealthy report to explicit 503 response handling', async ({ assert }) => {
    const originalRun = Reflect.get(healthChecks, 'run')
    const originalEnvGet = env.get.bind(env)
    const unhealthyReport = toHealthReport({
      isHealthy: false,
      finishedAt: new Date('2026-07-07T00:00:00.000Z'),
      checks: [],
    })

    healthChecks.run = () => Promise.resolve(unhealthyReport)

    ;env.get = (key: string, fallback?: string) => {
      if (key === 'NODE_ENV') return 'test'
      return fallback as string
    }

    try {
      const controller = new HealthChecksController()
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
    } finally {
      healthChecks.run = originalRun
      ;env.get = originalEnvGet
    }
  })
})
