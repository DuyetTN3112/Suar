import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'

import { makeTestingDomainEventOutboxWorker } from '#composition/command_support/domain_event_outbox_testing'
import { wrapApiV1Data } from '#modules/http/boundary/api_v1_response'
import {
  buildTestingCleanupRequest,
  buildTestingRequiredStringInput,
  buildTestingSeedRequest,
} from '#modules/testing/controllers/mappers/request/testing-auth/testing_route_request_mapper'
import {
  readRawRows,
  testingDatabaseCleaner,
} from '#modules/testing/infra/testing_database_cleaner'

export default class TestingMaintenanceController {
  async health({ response }: HttpContext): Promise<void> {
    const result = (await db.rawQuery('select current_database() as database')) as unknown
    const databaseValue = readRawRows<{ database?: unknown }>(result)[0]?.database
    const database = typeof databaseValue === 'string' ? databaseValue : null
    response.json(wrapApiV1Data({ status: 'ok', database }))
  }

  async authState({ auth, response, session }: HttpContext): Promise<void> {
    await auth.check()

    response.json(
      wrapApiV1Data({
        authenticated: !!auth.user,
        email: auth.user?.email ?? null,
        currentOrganizationId: auth.user?.current_organization_id ?? null,
        sessionOrganizationId:
          (session.get('current_organization_id') as string | undefined) ?? null,
        systemRole: auth.user?.system_role ?? null,
      })
    )
  }

  async seedCleanup({ request, response }: HttpContext): Promise<void> {
    const tokens = buildTestingCleanupRequest(request.all())
    const stats = await testingDatabaseCleaner.cleanupTestingSeedData(tokens)
    response.json(wrapApiV1Data({ tokens, deleted: stats }))
  }

  async drainDomainEventOutbox({ response }: HttpContext): Promise<void> {
    try {
      const worker = makeTestingDomainEventOutboxWorker('testing-outbox-drain')
      const result = {
        batches: 0,
        claimed: 0,
        processed: 0,
        retried: 0,
        deadLettered: 0,
        leaseLost: 0,
      }
      for (let attempt = 0; attempt < 20; attempt += 1) {
        const current = await worker.runOnce()
        result.batches += 1
        result.claimed += current.claimed
        result.processed += current.processed
        result.retried += current.retried
        result.deadLettered += current.deadLettered
        result.leaseLost += current.leaseLost
        if (current.claimed === 0) break
      }
      response.json(wrapApiV1Data(result))
    } catch {
      response.status(500).json(
        wrapApiV1Data({
          error: 'Failed to drain domain event outbox',
        })
      )
    }
  }

  async revokeSavedViewRoleplayMembership({ request, response }: HttpContext): Promise<void> {
    const input = request.all() as Record<string, unknown>
    const organizationId = buildTestingRequiredStringInput(input, 'organizationId')
    const userId = buildTestingRequiredStringInput(input, 'userId')
    const timestamp = buildTestingSeedRequest(input, {
      timestamp: Date.now(),
      nonce: 'saved-view-revoke',
    }).timestamp

    const membership = (await db
      .from('organization_users')
      .where('organization_id', organizationId)
      .where('user_id', userId)
      .where('status', 'approved')
      .first()) as { id?: string } | null

    if (!membership) {
      response.status(404).json({ errors: [{ message: 'Testing membership was not found' }] })
      return
    }

    await db
      .from('organization_users')
      .where('organization_id', organizationId)
      .where('user_id', userId)
      .update({ status: 'rejected' })
    await db
      .from('users')
      .where('id', userId)
      .where('current_organization_id', organizationId)
      .update({ current_organization_id: null })

    response.json(
      wrapApiV1Data({
        acknowledged: true,
        organizationId,
        userId,
        timestamp,
      })
    )
  }
}
