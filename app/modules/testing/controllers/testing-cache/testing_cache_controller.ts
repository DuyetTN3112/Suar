import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'

import {
  privateCacheKeyDigest,
  taskListCacheGenerationNamespaces,
} from '#modules/cache/public_contracts/cache_contract'
import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import { wrapApiV1Data } from '#modules/http/boundary/api_v1_response'
import {
  buildTestingCacheStatusRequest,
  buildTestingRequiredStringInput,
  buildTestingSeedRequest,
  buildTestingStringArrayInput,
} from '#modules/testing/controllers/mappers/request/testing-auth/testing_route_request_mapper'
import {
  escapeLikePattern,
  testingDatabaseCleaner,
  type CleanupStats,
  type RawWhereBuilder,
} from '#modules/testing/infra/testing_database_cleaner'
import {
  OrganizationFactory,
  OrganizationUserFactory,
  ProjectFactory,
  ProjectMemberFactory,
  TaskFactory,
  UserFactory,
} from '#tests/helpers/factories'

export default class TestingCacheController {
  async seedCacheTaskFlow({ request, response }: HttpContext): Promise<void> {
    const { timestamp, seedKey } = buildTestingSeedRequest(request.all(), {
      timestamp: Date.now(),
      nonce: crypto.randomUUID().slice(0, 8),
    })
    const ownerEmail = `seed-cache-owner-${seedKey}@test.com`
    const memberEmail = `seed-cache-member-${seedKey}@test.com`

    const { org, owner } = await OrganizationFactory.createWithOwner(
      {
        name: `Seed Cache Org ${seedKey}`,
        slug: `seed-cache-org-${seedKey}`,
      },
      {
        email: ownerEmail,
        username: `seed_cache_owner_${seedKey.replace(/-/g, '_')}`,
      }
    )
    const member = await UserFactory.create({
      email: memberEmail,
      username: `seed_cache_member_${seedKey.replace(/-/g, '_')}`,
      currentOrganizationId: org.id,
    })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: member.id,
      org_role: 'org_member',
      status: 'approved',
    })

    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
      name: `Seed Cache Project ${seedKey}`,
    })
    await ProjectMemberFactory.create({
      project_id: project.id,
      user_id: owner.id,
      project_role: 'project_owner',
    })
    await ProjectMemberFactory.create({
      project_id: project.id,
      user_id: member.id,
      project_role: 'project_member',
    })

    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      project_id: project.id,
      status: 'todo',
      title: `Seed Cache Task ${seedKey}`,
    })

    response.status(201).json(
      wrapApiV1Data({
        organizationId: org.id,
        projectId: project.id,
        taskId: task.id,
        ownerEmail,
        memberEmail,
        ownerId: owner.id,
        memberId: member.id,
        timestamp,
      })
    )
  }

  async taskListGeneration({ request, response }: HttpContext): Promise<void> {
    const organizationId = buildTestingRequiredStringInput(request.all(), 'organizationId')

    const physicalKey = await cacheStore.resolveVersionedKeyBestEffort(
      taskListCacheGenerationNamespaces(organizationId),
      `testing:task-list-generation:${organizationId}`
    )
    if (!physicalKey) {
      response.status(503).json({
        errors: [{ message: 'Cache generation is unavailable' }],
      })
      return
    }

    response.json(
      wrapApiV1Data({
        organizationId,
        generationDigest: privateCacheKeyDigest(physicalKey),
      })
    )
  }

  async invalidationStatus({ request, response }: HttpContext): Promise<void> {
    const { taskId, operation } = buildTestingCacheStatusRequest(request.all())

    const outbox = (await db
      .from('cache_invalidation_outbox')
      .select('status')
      .where('source_table', 'tasks')
      .where('source_operation', operation)
      .where('source_primary_key', taskId)
      .orderBy('sequence', 'desc')
      .first()) as { status?: string } | undefined

    response.json(
      wrapApiV1Data({
        taskId,
        status: outbox?.status ?? null,
      })
    )
  }

  async invalidationScopeStatus({ request, response }: HttpContext): Promise<void> {
    const scopeIds = buildTestingStringArrayInput(request.all(), 'scopeIds', {
      minLength: 1,
      maxLength: 32,
      itemMaxLength: 128,
    })

    const rows = (await db
      .from('cache_invalidation_outbox')
      .select('status')
      .count('* as count')
      .where((scopeQuery) => {
        const rawQuery = scopeQuery as unknown as RawWhereBuilder
        for (const scopeId of scopeIds) {
          rawQuery.orWhereRaw("(source_primary_key = ? OR patterns::text LIKE ? ESCAPE '\\')", [
            scopeId,
            `%${escapeLikePattern(scopeId)}%`,
          ])
        }
      })
      .groupBy('status')) as Array<{ status: string; count: string | number }>
    const counts = {
      pending: 0,
      leased: 0,
      processed: 0,
      deadLetter: 0,
    }
    for (const row of rows) {
      const count = Number(row.count)
      if (row.status === 'pending') counts.pending = count
      if (row.status === 'leased') counts.leased = count
      if (row.status === 'processed') counts.processed = count
      if (row.status === 'dead_letter') counts.deadLetter = count
    }

    response.json(wrapApiV1Data({ scopeIds, counts }))
  }

  async invalidationScopeCleanup({ request, response }: HttpContext): Promise<void> {
    const scopeIds = buildTestingStringArrayInput(request.all(), 'scopeIds', {
      minLength: 1,
      maxLength: 32,
      itemMaxLength: 128,
    })

    const stats: CleanupStats = {}
    await testingDatabaseCleaner.deleteCacheInvalidationOutboxForScopes(scopeIds, stats)
    response.json(wrapApiV1Data({ scopeIds, deleted: stats }))
  }
}
