import { test } from '@japa/runner'
import { DateTime } from 'luxon'

import {
  taskReadRepository,
  taskStatusQueryRepository,
} from '#composition/tasks/task-application/task_application_composition'
import { taskExternalDeps } from '#composition/tasks/task-external-dependencies/task_external_dependencies_composition'
import RedisCacheStore from '#modules/cache/infra/adapters/cache-runtime/redis_cache_store'
import {
  CACHE_COLLECTION_GENERATION_NAMESPACES,
  organizationCacheGenerationNamespaces,
  organizationUserCacheGenerationNamespaces,
} from '#modules/cache/public_contracts/cache_contract'
import GetTaskMetadataQuery from '#modules/tasks/actions/queries/task-reading/get_task_metadata_query'
import GetTaskStatisticsQuery from '#modules/tasks/actions/queries/task-reading/get_task_statistics_query'
import GetTasksGroupedQuery from '#modules/tasks/actions/queries/task-reading/get_tasks_grouped_query'
import GetTasksTimelineQuery from '#modules/tasks/actions/queries/task-reading/get_tasks_timeline_query'
import { makeSystemTaskActionContext } from '#modules/tasks/actions/task_action_context'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  OrganizationFactory,
  OrganizationUserFactory,
  TaskFactory,
  UserFactory,
} from '#tests/helpers/factories'

const cacheKeysToDelete = new Set<string>()
type MutableRedisCacheStore = {
  -readonly [Key in keyof typeof RedisCacheStore]: (typeof RedisCacheStore)[Key]
}
const mutableRedisCacheStore = RedisCacheStore as MutableRedisCacheStore

async function resolveOrganizationCacheKey(
  namespace: (typeof CACHE_COLLECTION_GENERATION_NAMESPACES)[keyof typeof CACHE_COLLECTION_GENERATION_NAMESPACES],
  organizationId: string,
  logicalKey: string,
  userId?: string
): Promise<string> {
  const physicalKey = await RedisCacheStore.resolveVersionedKeyBestEffort(
    userId
      ? organizationUserCacheGenerationNamespaces(namespace, organizationId, userId)
      : organizationCacheGenerationNamespaces(namespace, organizationId),
    logicalKey
  )

  if (!physicalKey) {
    throw new Error(`Expected generation key to resolve for ${namespace}`)
  }

  cacheKeysToDelete.add(logicalKey)
  cacheKeysToDelete.add(physicalKey)
  return physicalKey
}

test.group('Integration | Task collection generation cache readers', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(async () => {
    await Promise.all([...cacheKeysToDelete].map((key) => RedisCacheStore.deleteBestEffort(key)))
    cacheKeysToDelete.clear()
    await cleanupTestData()
  })

  test('reads grouped, timeline, statistics, and metadata from organization generation keys', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const actionContext = makeSystemTaskActionContext(owner.id)

    const groupedLogicalKey = `tasks:grouped:org:${org.id}:scope:all:user:${owner.id}`
    const timelineLogicalKey = `tasks:timeline:org:${org.id}:scope:all:user:${owner.id}`
    const statisticsLogicalKey = `task:stats:org:${org.id}:scope:all:user:${owner.id}`
    const metadataLogicalKey = `task:metadata:v3:org:${org.id}`

    const [groupedPhysicalKey, timelinePhysicalKey, statisticsPhysicalKey, metadataPhysicalKey] =
      await Promise.all([
        resolveOrganizationCacheKey(
          CACHE_COLLECTION_GENERATION_NAMESPACES.groupedTasks,
          org.id,
          groupedLogicalKey,
          owner.id
        ),
        resolveOrganizationCacheKey(
          CACHE_COLLECTION_GENERATION_NAMESPACES.timelineTasks,
          org.id,
          timelineLogicalKey,
          owner.id
        ),
        resolveOrganizationCacheKey(
          CACHE_COLLECTION_GENERATION_NAMESPACES.taskStatistics,
          org.id,
          statisticsLogicalKey,
          owner.id
        ),
        resolveOrganizationCacheKey(
          CACHE_COLLECTION_GENERATION_NAMESPACES.taskMetadata,
          org.id,
          metadataLogicalKey
        ),
      ])

    const groupedCached = { cached_status: [{ id: 'grouped-generation-hit' }] }
    const timelineCached = [{ id: 'timeline-generation-hit' }]
    const statisticsCached = {
      total: 731,
      byStatus: { cached: 731 },
      byPriority: {},
      byLabel: {},
      overdue: 0,
      completedThisWeek: 0,
      completedThisMonth: 0,
      avgCompletionDays: null,
      timeTracking: {
        tasksWithEstimate: 0,
        tasksWithActual: 0,
        totalEstimated: 0,
        totalActual: 0,
        avgEstimated: 0,
        avgActual: 0,
        efficiency: null,
      },
    }
    const metadataCached = {
      statuses: [],
      labels: [],
      priorities: [],
      users: [],
      parentTasks: [],
      availableSkills: [],
      projects: [],
      proficiencyLevels: [{ value: 'generation-hit', label: 'Generation hit' }],
    }

    await Promise.all([
      RedisCacheStore.set(groupedLogicalKey, { legacy: true }),
      RedisCacheStore.set(timelineLogicalKey, { legacy: true }),
      RedisCacheStore.set(statisticsLogicalKey, { legacy: true }),
      RedisCacheStore.set(metadataLogicalKey, { legacy: true }),
      RedisCacheStore.set(groupedPhysicalKey, groupedCached),
      RedisCacheStore.set(timelinePhysicalKey, timelineCached),
      RedisCacheStore.set(statisticsPhysicalKey, statisticsCached),
      RedisCacheStore.set(metadataPhysicalKey, metadataCached),
    ])

    const [groupedResult, timelineResult, statisticsResult, metadataResult] = await Promise.all([
      new GetTasksGroupedQuery(
        actionContext,
        taskExternalDeps,
        taskReadRepository,
        taskStatusQueryRepository
      ).execute(org.id),
      new GetTasksTimelineQuery(actionContext, taskExternalDeps, taskReadRepository).execute(
        org.id
      ),
      new GetTaskStatisticsQuery(actionContext, taskExternalDeps, taskReadRepository).execute(
        org.id
      ),
      new GetTaskMetadataQuery(
        actionContext,
        taskExternalDeps,
        taskReadRepository,
        taskStatusQueryRepository
      ).execute(org.id),
    ])

    assert.deepEqual(groupedResult, groupedCached)
    assert.deepEqual(timelineResult, timelineCached)
    assert.deepEqual(statisticsResult, statisticsCached)
    assert.deepEqual(metadataResult, metadataCached)
  })

  test('queries the source and skips cache writes when generation resolution is unavailable', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
    })
    const originalResolveVersionedKey = mutableRedisCacheStore.resolveVersionedKeyBestEffort
    const originalGet = mutableRedisCacheStore.get
    const originalSetBestEffort = mutableRedisCacheStore.setBestEffort
    let cacheReads = 0
    let cacheWrites = 0

    mutableRedisCacheStore.resolveVersionedKeyBestEffort = () => Promise.resolve(null)
    mutableRedisCacheStore.get = <T>() => {
      cacheReads += 1
      return Promise.resolve([{ id: 'stale-cache-value' }] as T)
    }
    mutableRedisCacheStore.setBestEffort = () => {
      cacheWrites += 1
      return Promise.resolve(true)
    }

    try {
      const result = await new GetTasksTimelineQuery(
        makeSystemTaskActionContext(owner.id),
        taskExternalDeps,
        taskReadRepository
      ).execute(org.id)

      assert.isTrue(result.some((candidate) => candidate.id === task.id))
      assert.equal(cacheReads, 0)
      assert.equal(cacheWrites, 0)
    } finally {
      mutableRedisCacheStore.resolveVersionedKeyBestEffort = originalResolveVersionedKey
      mutableRedisCacheStore.get = originalGet
      mutableRedisCacheStore.setBestEffort = originalSetBestEffort
    }
  })

  test('never reuses an admin task collection after the actor is downgraded', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const admin = await UserFactory.create()
    const membership = await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: admin.id,
      org_role: 'org_admin',
      status: 'approved',
    })
    const ownTask = await TaskFactory.create({
      organization_id: org.id,
      creator_id: admin.id,
      title: 'Visible after downgrade',
      due_date: DateTime.now().plus({ days: 3 }),
    })
    const ownerTask = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      title: 'Admin-only task',
      due_date: DateTime.now().plus({ days: 4 }),
    })
    const context = makeSystemTaskActionContext(admin.id)

    const [warmGrouped, warmTimeline, warmStatistics] = await Promise.all([
      new GetTasksGroupedQuery(
        context,
        taskExternalDeps,
        taskReadRepository,
        taskStatusQueryRepository
      ).execute(org.id),
      new GetTasksTimelineQuery(context, taskExternalDeps, taskReadRepository).execute(org.id),
      new GetTaskStatisticsQuery(context, taskExternalDeps, taskReadRepository).execute(org.id),
    ])
    assert.include(
      Object.values(warmGrouped)
        .flat()
        .map((task) => task.id),
      ownerTask.id
    )
    assert.include(
      warmTimeline.map((task) => task.id),
      ownerTask.id
    )
    assert.isAtLeast(warmStatistics.total, 2)

    await membership.merge({ org_role: 'org_member' }).save()

    const [memberGrouped, memberTimeline, memberStatistics] = await Promise.all([
      new GetTasksGroupedQuery(
        context,
        taskExternalDeps,
        taskReadRepository,
        taskStatusQueryRepository
      ).execute(org.id),
      new GetTasksTimelineQuery(context, taskExternalDeps, taskReadRepository).execute(org.id),
      new GetTaskStatisticsQuery(context, taskExternalDeps, taskReadRepository).execute(org.id),
    ])
    const groupedIds = Object.values(memberGrouped)
      .flat()
      .map((task) => task.id)
    const timelineIds = memberTimeline.map((task) => task.id)

    assert.include(groupedIds, ownTask.id)
    assert.notInclude(groupedIds, ownerTask.id)
    assert.include(timelineIds, ownTask.id)
    assert.notInclude(timelineIds, ownerTask.id)
    assert.equal(memberStatistics.total, 1)
  })
})
