import { test } from '@japa/runner'

import { hashSavedFilterSemanticState } from '#modules/filtering/domain/saved-filter-views/saved_filter_view'
import { NodeFilterHashGenerator } from '#modules/filtering/infra/adapters/filtering-runtime/node_filter_hash_generator'
import { PostgresFilterSavedViewRepository } from '#modules/filtering/infra/repositories/saved-filter-views/postgres_filter_saved_view_repository'

test.group('PostgresFilterSavedViewRepository', () => {
  test('preserves invalid persistence state while mapping a saved-view row', async ({ assert }) => {
    const transaction = {
      from: () => ({
        where: () => ({
          whereNull: () => ({
            first: async () => ({
              id: 'view-1',
              name: 'Broken view',
              description: null,
              owner_user_id: null,
              owner_organization_id: null,
              visibility: 'private',
              organization_id: null,
              team_id: null,
              context_key: 'tasks.discovery.public',
              context_owner: 'tasks',
              context_schema_version: 1,
              criteria_payload: {},
              criteria_checksum: 'invalid',
              presentation_payload: {},
              is_default: false,
              is_pinned: false,
              alert_status: 'disabled',
              alert_reason: null,
              lock_version: 1,
              migration_state: 'current',
              last_successful_migration_version: 1,
              canonical_payload_bytes: 0,
              created_at: '2026-08-09T00:00:00.000Z',
              updated_at: '2026-08-09T00:00:00.000Z',
              deleted_at: null,
              normalized_name: 'broken view',
            }),
          }),
        }),
      }),
    }

    let error: unknown
    try {
      await new PostgresFilterSavedViewRepository().findById('view-1', transaction as never)
    } catch (caught) {
      error = caught
    }

    assert.isDefined(error)
    assert.equal((error as { code?: string }).code, 'INVALID_PERSISTENCE_STATE')
  })

  test('locks a transaction-scoped read when requested by taxonomy coordination', async ({ assert }) => {
    const semanticState = { filter: null, textQuery: null, sort: [], projection: [] }
    let lockRequested = false
    let firstCalled = false
    const transaction = {
      from: () => {
        const query = {
          where: () => query,
          whereNull: () => query,
          forUpdate: () => {
            lockRequested = true
            return query
          },
          first: async () => {
            firstCalled = true
            return {
              id: 'view-1',
              name: 'Locked view',
              description: null,
              owner_user_id: 'user-1',
              owner_organization_id: null,
              visibility: 'private',
              organization_id: null,
              team_id: null,
              context_key: 'tasks.discovery.public',
              context_owner: 'tasks',
              context_schema_version: 1,
              criteria_payload: semanticState,
              criteria_checksum: hashSavedFilterSemanticState(semanticState, new NodeFilterHashGenerator()),
              presentation_payload: {},
              is_default: false,
              is_pinned: false,
              alert_status: 'disabled',
              alert_reason: null,
              lock_version: 1,
              migration_state: 'current',
              last_successful_migration_version: 1,
              canonical_payload_bytes: 0,
              created_at: '2026-08-09T00:00:00.000Z',
              updated_at: '2026-08-09T00:00:00.000Z',
              deleted_at: null,
              normalized_name: 'locked view',
            }
          },
        }
        return query
      },
    }

    const result = await new PostgresFilterSavedViewRepository().findById(
      'view-1',
      transaction as never,
      { lock: 'for_update' }
    )

    assert.isTrue(firstCalled)
    assert.isTrue(lockRequested)
    assert.equal(result?.view.id, 'view-1')
  })
})
