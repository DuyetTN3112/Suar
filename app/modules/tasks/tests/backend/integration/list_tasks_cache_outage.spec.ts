import { test } from '@japa/runner'

import { taskExternalDeps } from '#composition/tasks/task-external-dependencies/task_external_dependencies_composition'
import GetTasksListDTO from '#modules/tasks/actions/dtos/request/get_tasks_list_dto'
import GetTasksListQuery from '#modules/tasks/actions/queries/task-reading/get_tasks_list_query'
import { makeSystemTaskActionContext } from '#modules/tasks/actions/task_action_context'
import { LucidTaskReadRepository } from '#modules/tasks/infra/adapters/task-reading/lucid_task_read_repository'
import env from '#start/env'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { cleanupTestData, OrganizationFactory, TaskFactory } from '#tests/helpers/factories'

const RUN_CACHE_OUTAGE_FLOW = process.env['CACHE_OUTAGE_FLOW'] === '1'
const SKIP_REASON =
  'Set CACHE_INTEGRATION_DRIVER=redis and CACHE_OUTAGE_FLOW=1 while the configured cache Redis is unavailable'

test.group('Integration | List tasks during cache outage', (group) => {
  group.setup(async () => {
    if (RUN_CACHE_OUTAGE_FLOW) {
      await setupApp()
    }
  })

  group.teardown(async () => {
    if (RUN_CACHE_OUTAGE_FLOW) {
      await cleanupTestData()
      await teardownApp()
    }
  })

  test('serves the authorized PostgreSQL result within the fallback deadline', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      title: 'Cache outage fallback task',
    })
    let paginateCalls = 0
    let statsCalls = 0
    const source = new LucidTaskReadRepository()
    const query = new GetTasksListQuery(makeSystemTaskActionContext(owner.id), taskExternalDeps, {
      paginateByOrganization: (...args) => {
        paginateCalls++
        return source.paginateByOrganization(...args)
      },
      getListStatsByOrganization: (...args) => {
        statsCalls++
        return source.getListStatsByOrganization(...args)
      },
    }, {
      searchCandidateReader: taskExternalDeps.organizationTaskSearchCandidates,
    })
    const dto = new GetTasksListDTO({
      organization_id: org.id,
      page: 1,
      limit: 20,
      sort_by: 'created_at',
      sort_order: 'desc',
    })
    const startedAt = performance.now()

    const results = await Promise.all(Array.from({ length: 50 }, () => query.execute(dto)))

    assert.isTrue(results.every((result) => result.data.some((record) => record.id === task.id)))
    assert.equal(paginateCalls, 1)
    assert.equal(statsCalls, 1)
    assert.isBelow(
      performance.now() - startedAt,
      1_500,
      'an unavailable cache burst must not consume the request deadline'
    )
  })
    .timeout(5_000)
    .skip(!RUN_CACHE_OUTAGE_FLOW, SKIP_REASON)

  test('keeps authenticated application-cache telemetry available', async ({ assert, client }) => {
    const originalGet = env.get.bind(env)
    const collectorKey = 'cache-outage-metrics-collector'
    env.get = (key: string, defaultValue?: unknown) => {
      if (key === 'METRICS_API_KEY') return collectorKey
      return originalGet(key as never, defaultValue as never)
    }

    try {
      const response = await client.get('/metrics/cache').header('x-api-key', collectorKey)

      response.assertStatus(200)
      assert.include(response.text(), '# TYPE suar_cache_reads_total counter')
      assert.include(response.text(), 'suar_cache_operation_errors_total')
    } finally {
      env.get = originalGet
    }
  }).skip(!RUN_CACHE_OUTAGE_FLOW, SKIP_REASON)

  test('reports an optional cache outage as warnings without making cache a readiness gate', async ({
    assert,
    client,
  }) => {
    const originalGet = env.get.bind(env)
    const healthKey = 'cache-outage-health-probe'
    env.get = (key: string, defaultValue?: unknown) => {
      if (key === 'HEALTH_CHECK_API_KEY') return healthKey
      return originalGet(key as never, defaultValue as never)
    }

    try {
      const response = await client.get('/health').header('x-api-key', healthKey)
      const report = response.body() as {
        isHealthy: boolean
        checks: Array<{
          name: string
          status: string
          meta?: Record<string, unknown>
        }>
      }
      const optionalCacheChecks = report.checks.filter(
        (check) => check.meta?.['dependency_class'] === 'optional'
      )
      const requiredFailures = report.checks.filter(
        (check) => check.status === 'error' && check.meta?.['dependency_class'] !== 'optional'
      )

      assert.isAtLeast(optionalCacheChecks.length, 2)
      assert.isTrue(optionalCacheChecks.every((check) => check.status === 'warning'))
      assert.isTrue(
        optionalCacheChecks.every((check) => check.meta?.['readiness_impact'] === 'degraded')
      )
      assert.equal(report.isHealthy, requiredFailures.length === 0)
      assert.equal(
        response.status(),
        requiredFailures.length === 0 ? 200 : 503,
        JSON.stringify({ optionalCacheChecks, requiredFailures })
      )
    } finally {
      env.get = originalGet
    }
  }).skip(!RUN_CACHE_OUTAGE_FLOW, SKIP_REASON)
})
