import { HealthChecks, Result } from '@adonisjs/core/health'
import type {
  HealthCheckContract,
  HealthCheckResult,
} from '@adonisjs/core/types/health'
import { test } from '@japa/runner'

import { DegradedDependencyHealthCheck } from '#modules/http/health_checks/degraded_dependency_health_check'

function delegate(run: () => Promise<HealthCheckResult>): HealthCheckContract {
  return {
    name: 'optional dependency',
    run,
  }
}

function optionalCheck(run: () => Promise<HealthCheckResult>) {
  return new DegradedDependencyHealthCheck(delegate(run), {
    degradedMessage: 'Optional dependency is degraded',
  })
}

test.group('DegradedDependencyHealthCheck', () => {
  test('preserves an ok status and only exposes allowlisted metadata', async ({ assert }) => {
    const finishedAt = new Date('2026-07-24T00:00:00.000Z')
    const result = await optionalCheck(() =>
      Promise.resolve(
        Result.ok('Dependency is available')
          .setFinishedAt(finishedAt)
          .setMetaData({
            connection: { name: 'cache', status: 'ready', password: 'secret' },
            internalEndpoint: 'redis://secret@internal:6379',
          })
          .toJSON()
      )
    ).run()

    assert.equal(result.status, 'ok')
    assert.equal(result.message, 'Dependency is available')
    assert.equal(result.finishedAt, finishedAt)
    assert.deepEqual(result.meta?.['connection'], { name: 'cache', status: 'ready' })
    assert.equal(result.meta?.['dependency_class'], 'optional')
    assert.equal(result.meta?.['readiness_impact'], 'degraded')
    assert.equal(result.meta?.['underlying_status'], 'ok')
    assert.notInclude(JSON.stringify(result), 'secret')
  })

  test('downgrades warning and error results to sanitized warnings', async ({ assert }) => {
    for (const underlying of [
      Result.warning('token=warning-secret'),
      Result.failed('password=error-secret'),
    ]) {
      const result = await optionalCheck(() =>
        Promise.resolve(
          underlying
            .setMetaData({
              connection: { name: 'cache', status: 'reconnecting' },
              memoryInBytes: {
                used: 250,
                warningThreshold: 200,
                failureThreshold: 240,
                diagnostic: 'secret',
              },
              error: 'secret',
            })
            .toJSON()
        )
      ).run()

      assert.equal(result.status, 'warning')
      assert.equal(result.message, 'Optional dependency is degraded')
      assert.equal(result.meta?.['underlying_status'], underlying.status)
      assert.deepEqual(result.meta?.['memoryInBytes'], {
        used: 250,
        warningThreshold: 200,
        failureThreshold: 240,
      })
      assert.notInclude(JSON.stringify(result), 'secret')
    }
  })

  test('downgrades thrown dependency diagnostics without reflecting them', async ({ assert }) => {
    const result = await optionalCheck(() =>
      Promise.reject(new Error('redis://operator:secret@internal:6379'))
    ).run()

    assert.equal(result.status, 'warning')
    assert.equal(result.meta?.['underlying_status'], 'error')
    assert.notInclude(JSON.stringify(result), 'secret')
  })

  test('keeps optional failures ready while critical failures remain unhealthy', async ({
    assert,
  }) => {
    const optionalFailure = optionalCheck(() =>
      Promise.resolve(Result.failed('Optional dependency failed').toJSON())
    )
    const criticalFailure = delegate(() =>
      Promise.resolve(Result.failed('Critical dependency failed').toJSON())
    )

    const degradedReport = await new HealthChecks().register([optionalFailure]).run()
    const criticalReport = await new HealthChecks()
      .register([optionalFailure, criticalFailure])
      .run()

    assert.isTrue(degradedReport.isHealthy)
    assert.equal(degradedReport.status, 'warning')
    assert.isFalse(criticalReport.isHealthy)
    assert.equal(criticalReport.status, 'error')
  })
})
