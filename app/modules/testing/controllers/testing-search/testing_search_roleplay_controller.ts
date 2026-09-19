import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'

import { wrapApiV1Data } from '#modules/http/boundary/api_v1_response'
import { SearchAliasIntegrityFaultConflict } from '#modules/search/infra/adapters/search-discovery/search_alias_integrity_fault_controller'
import {
  buildTestingEnumInput,
  buildTestingRequiredStringInput,
  buildTestingSeedRequest,
} from '#modules/testing/controllers/mappers/request/testing-auth/testing_route_request_mapper'
import { readTestingJsonRecord } from '#modules/testing/infra/testing_database_cleaner'
import { testingSearchRoleplayService } from '#modules/testing/infra/testing_search_roleplay_service'
import { hashTestingSemanticState } from '#modules/testing/infra/testing_seed_support'

type TestingTaxonomyRepairViewRow = {
  owner_user_id: string | null
  context_key: string
  context_owner: string
  migration_state: string
  alert_status: string
  criteria_payload: unknown
  presentation_payload: unknown
  lock_version: number | string
}

type TestingTaxonomyRepairAlertRow = {
  id: string
  status: string
  lock_version: number | string
}

export default class TestingSearchRoleplayController {
  async seedSearchAliasIntegrityFaultRoleplay({ request, response }: HttpContext): Promise<void> {
    const input = request.all()
    const { timestamp, nonce } = buildTestingSeedRequest(input, {
      timestamp: Date.now(),
      nonce: crypto.randomUUID().slice(0, 8),
    })
    const operation = buildTestingEnumInput(
      input,
      'operation',
      'enable' as const,
      ['enable', 'restore'] as const
    )
    const ownerToken = `${timestamp}:${nonce}`

    const currentOwner = testingSearchRoleplayService.getAliasFaultOwner()
    if (
      operation === 'restore' &&
      currentOwner !== null &&
      currentOwner !== ownerToken
    ) {
      response
        .status(409)
        .json(wrapApiV1Data({ error: 'Search alias fault is owned by another test token' }))
      return
    }

    try {
      const result =
        operation === 'enable'
          ? await testingSearchRoleplayService.enableAliasFault(ownerToken)
          : await testingSearchRoleplayService.restoreAliasFault()
      response.json(wrapApiV1Data({ ...result, timestamp, nonce }))
    } catch (error) {
      if (error instanceof SearchAliasIntegrityFaultConflict) {
        response.status(409).json(wrapApiV1Data({ error: error.message }))
        return
      }
      throw error
    }
  }

  seedSearchCursorClockRoleplay({ request, response }: HttpContext): void {
    const input = request.all()
    const { timestamp, nonce } = buildTestingSeedRequest(input, {
      timestamp: Date.now(),
      nonce: crypto.randomUUID().slice(0, 8),
    })
    const operation = buildTestingEnumInput(
      input,
      'operation',
      'advance' as const,
      ['advance', 'restore'] as const
    )
    const ownerToken = `${timestamp}:${nonce}`

    const currentOwner = testingSearchRoleplayService.getCursorClockOwner()
    if (currentOwner !== null && currentOwner !== ownerToken) {
      response
        .status(409)
        .json(wrapApiV1Data({ error: 'Search cursor clock is owned by another test token' }))
      return
    }

    if (operation === 'advance') {
      testingSearchRoleplayService.advanceCursorClock(ownerToken)
      response.json(wrapApiV1Data({ operation: 'advanced', timestamp, nonce }))
      return
    }

    testingSearchRoleplayService.restoreCursorClock()
    response.json(wrapApiV1Data({ operation: 'restored', timestamp, nonce }))
  }

  async seedTaxonomyRepairRoleplay({ request, response }: HttpContext): Promise<void> {
    const input = request.all()
    const viewId = buildTestingRequiredStringInput(input, 'viewId')
    const { timestamp, nonce } = buildTestingSeedRequest(input, {
      timestamp: Date.now(),
      nonce: crypto.randomUUID().slice(0, 8),
    })
    const ownerToken = `${timestamp}-${nonce}`
    const now = new Date().toISOString()

    const transitioned = await db.transaction(async (trx) => {
      const view = (await trx
        .from('filter_saved_views')
        .where('id', viewId)
        .whereNull('deleted_at')
        .first()) as unknown as TestingTaxonomyRepairViewRow | undefined
      if (
        !view?.owner_user_id ||
        view.context_key !== 'tasks.discovery.member' ||
        view.context_owner !== 'tasks'
      ) {
        return null
      }

      const owner = (await trx
        .from('users')
        .where('id', view.owner_user_id)
        .select('email')
        .first()) as unknown as { email?: unknown } | undefined
      const ownerEmail = typeof owner?.email === 'string' ? owner.email : ''
      if (!owner || !ownerEmail.includes(ownerToken) || view.migration_state !== 'current') {
        return null
      }

      const alert = (await trx
        .from('filter_alerts')
        .where('saved_view_id', viewId)
        .where('owner_user_id', view.owner_user_id)
        .whereNull('deleted_at')
        .first()) as unknown as TestingTaxonomyRepairAlertRow | undefined
      if (!alert || alert.status !== 'active') {
        return null
      }

      const existing = readTestingJsonRecord(view.criteria_payload)
      const presentationState = readTestingJsonRecord(view.presentation_payload)
      const oldTermId = `rp-fst-07-legacy-${viewId}`
      const replacementTermId = `rp-fst-07-replacement-${viewId}`
      const semanticState = {
        filter: {
          kind: 'condition',
          field: 'taxonomy.requiredSkills',
          operator: 'contains_any',
          effect: 'require',
          unknown: 'exclude',
          value: { kind: 'set', values: [oldTermId] },
        },
        textQuery: typeof existing['textQuery'] === 'string' ? existing['textQuery'] : null,
        sort: Array.isArray(existing['sort']) ? existing['sort'] : [],
        projection: Array.isArray(existing['projection']) ? existing['projection'] : [],
      }
      const criteriaChecksum = hashTestingSemanticState(semanticState)
      const nextViewLockVersion = Number(view.lock_version) + 1
      const canonicalPayloadBytes = Math.max(
        1,
        Buffer.byteLength(JSON.stringify({ semanticState, presentationState }), 'utf8')
      )

      await trx
        .from('filter_saved_views')
        .where('id', viewId)
        .where('lock_version', Number(view.lock_version))
        .update({
          criteria_payload: semanticState,
          criteria_checksum: criteriaChecksum,
          presentation_payload: presentationState,
          migration_state: 'requires_repair',
          alert_status: 'paused',
          alert_reason: 'taxonomy_requires_repair',
          lock_version: nextViewLockVersion,
          canonical_payload_bytes: canonicalPayloadBytes,
          updated_at: now,
        })
      await trx
        .from('filter_alerts')
        .where('id', alert.id)
        .where('lock_version', Number(alert.lock_version))
        .update({
          status: 'paused',
          pause_reason: 'taxonomy_requires_repair',
          saved_view_lock_version: nextViewLockVersion,
          lock_version: Number(alert.lock_version) + 1,
          updated_at: now,
        })

      return { viewId, oldTermId, replacementTermId }
    })

    if (transitioned === null) {
      response
        .status(404)
        .json(wrapApiV1Data({ error: 'Taxonomy repair fixture target was not found' }))
      return
    }

    response.json(wrapApiV1Data(transitioned))
  }
}
