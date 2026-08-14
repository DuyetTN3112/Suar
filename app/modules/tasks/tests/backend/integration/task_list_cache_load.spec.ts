import { test } from '@japa/runner'

import { taskExternalDeps } from '#composition/tasks/task-external-dependencies/task_external_dependencies_composition'
import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import GetTasksListDTO from '#modules/tasks/actions/dtos/request/get_tasks_list_dto'
import GetTasksListQuery from '#modules/tasks/actions/queries/task-reading/get_tasks_list_query'
import { makeSystemTaskActionContext } from '#modules/tasks/actions/task_action_context'
import { LucidTaskReadRepository } from '#modules/tasks/infra/adapters/task-reading/lucid_task_read_repository'
import { TaskCacheInvalidator } from '#modules/tasks/infra/adapters/task-authoring/task_cache_invalidator'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  OrganizationFactory,
  OrganizationUserFactory,
  TaskFactory,
  UserFactory,
} from '#tests/helpers/factories'

const RUN_LOAD_DRILL =
  process.env['CACHE_INTEGRATION_DRIVER'] === 'redis' &&
  process.env['CACHE_TASK_LIST_LOAD_DRILL'] === '1'
const SKIP_REASON =
  'Set CACHE_INTEGRATION_DRIVER=redis and CACHE_TASK_LIST_LOAD_DRILL=1 with dedicated test PostgreSQL and cache Redis'

interface SourceCounters {
  paginate: number
  stats: number
}

function makeObservedQuery(userId: string, counters: SourceCounters): GetTasksListQuery {
  const source = new LucidTaskReadRepository()
  const observed = {
    paginateByOrganization: (...args: Parameters<typeof source.paginateByOrganization>) => {
      counters.paginate++
      return source.paginateByOrganization(...args)
    },
    getListStatsByOrganization: (
      ...args: Parameters<typeof source.getListStatsByOrganization>
    ) => {
      counters.stats++
      return source.getListStatsByOrganization(...args)
    },
  }

  return new GetTasksListQuery(
    makeSystemTaskActionContext(userId),
    taskExternalDeps,
    observed,
    {
      searchCandidateReader: taskExternalDeps.organizationTaskSearchCandidates,
    }
  )
}

test.group('Integration | Task list cache bounded load', (group) => {
  group.setup(async () => {
    if (RUN_LOAD_DRILL) {
      await setupApp()
    }
  })

  group.each.teardown(async () => {
    if (RUN_LOAD_DRILL) {
      await cacheStore.deleteByPattern('tasks:list:v2:*')
      await cleanupTestData()
    }
  })

  group.teardown(async () => {
    if (RUN_LOAD_DRILL) {
      await teardownApp()
    }
  })

  test('coalesces a cold burst and serves the warm burst without another source read', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      title: 'Cold and warm cache load task',
    })
    const counters: SourceCounters = { paginate: 0, stats: 0 }
    const query = makeObservedQuery(owner.id, counters)
    const dto = new GetTasksListDTO({
      organization_id: org.id,
      page: 1,
      limit: 20,
      sort_by: 'created_at',
      sort_order: 'desc',
    })
    const metricsBefore = cacheStore.runtimeMetrics()

    const coldStartedAt = performance.now()
    const coldResults = await Promise.all(Array.from({ length: 64 }, () => query.execute(dto)))
    const coldElapsedMs = performance.now() - coldStartedAt

    assert.lengthOf(coldResults, 64)
    assert.isTrue(
      coldResults.every((result) => result.data.some((record) => record.id === task.id))
    )
    assert.equal(counters.paginate, 1)
    assert.equal(counters.stats, 1)
    assert.isBelow(coldElapsedMs, 5_000)
    const metricsAfterCold = cacheStore.runtimeMetrics()
    assert.equal(metricsAfterCold.reads.misses - metricsBefore.reads.misses, 1)
    assert.equal(
      metricsAfterCold.stampedeProtection.recomputations -
        metricsBefore.stampedeProtection.recomputations,
      1
    )

    const warmStartedAt = performance.now()
    const warmResults = await Promise.all(Array.from({ length: 128 }, () => query.execute(dto)))
    const warmElapsedMs = performance.now() - warmStartedAt

    assert.lengthOf(warmResults, 128)
    assert.equal(counters.paginate, 1)
    assert.equal(counters.stats, 1)
    assert.isBelow(warmElapsedMs, 5_000)
    const metricsAfterWarm = cacheStore.runtimeMetrics()
    const warmCacheHits = metricsAfterWarm.reads.hits - metricsAfterCold.reads.hits
    assert.isAtLeast(warmCacheHits, 1)
    assert.isAtMost(warmCacheHits, 128)
    assert.equal(
      metricsAfterWarm.stampedeProtection.recomputations -
        metricsAfterCold.stampedeProtection.recomputations,
      0
    )
  })
    .timeout(12_000)
    .skip(!RUN_LOAD_DRILL, SKIP_REASON)

  test('isolates owner and member cold bursts and coalesces each scope after invalidation', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const member = await UserFactory.create()
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: member.id,
      org_role: 'org_member',
      status: 'approved',
    })
    const memberTask = await TaskFactory.create({
      organization_id: org.id,
      creator_id: member.id,
      title: 'Member-visible load task',
    })
    const ownerOnlyTask = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      title: 'Owner-only load task',
    })
    const counters: SourceCounters = { paginate: 0, stats: 0 }
    const ownerQuery = makeObservedQuery(owner.id, counters)
    const memberQuery = makeObservedQuery(member.id, counters)
    const dto = new GetTasksListDTO({
      organization_id: org.id,
      page: 1,
      limit: 20,
      sort_by: 'created_at',
      sort_order: 'asc',
    })
    const metricsBefore = cacheStore.runtimeMetrics()

    const firstBurst = await Promise.all([
      ...Array.from({ length: 32 }, () => ownerQuery.execute(dto)),
      ...Array.from({ length: 32 }, () => memberQuery.execute(dto)),
    ])
    const ownerResults = firstBurst.slice(0, 32)
    const memberResults = firstBurst.slice(32)

    assert.equal(counters.paginate, 2)
    assert.equal(counters.stats, 2)
    const metricsAfterFirstBurst = cacheStore.runtimeMetrics()
    assert.equal(
      metricsAfterFirstBurst.stampedeProtection.recomputations -
        metricsBefore.stampedeProtection.recomputations,
      2
    )
    assert.isTrue(
      ownerResults.every((result) => result.data.some((record) => record.id === ownerOnlyTask.id))
    )
    assert.isTrue(
      memberResults.every((result) => result.data.some((record) => record.id === memberTask.id))
    )
    assert.isTrue(
      memberResults.every((result) => !result.data.some((record) => record.id === ownerOnlyTask.id))
    )

    await new TaskCacheInvalidator().invalidateAfterTaskCreated(org.id)
    const secondBurst = await Promise.all([
      ...Array.from({ length: 32 }, () => ownerQuery.execute(dto)),
      ...Array.from({ length: 32 }, () => memberQuery.execute(dto)),
    ])

    assert.lengthOf(secondBurst, 64)
    assert.equal(counters.paginate, 4)
    assert.equal(counters.stats, 4)
    const metricsAfterSecondBurst = cacheStore.runtimeMetrics()
    assert.equal(
      metricsAfterSecondBurst.stampedeProtection.recomputations -
        metricsAfterFirstBurst.stampedeProtection.recomputations,
      2
    )
  })
    .timeout(12_000)
    .skip(!RUN_LOAD_DRILL, SKIP_REASON)
})
