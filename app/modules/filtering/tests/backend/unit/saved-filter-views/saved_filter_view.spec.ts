import { test } from '@japa/runner'

import type { FilterExpression } from '#modules/filtering/domain/filtering-core/filter_expression'
import type { FilterMigrationResult } from '#modules/filtering/domain/filtering-core/filter_migration_result'
import {
  applyFilterMigrationResult as applyFilterMigrationResultWithHash,
  assertUniqueDefaultSavedFilterViews,
  createSavedFilterView as buildSavedFilterView,
  parseSavedFilterSemanticState,
  resolveSavedFilterViewAccess,
  type CreateSavedFilterViewInput,
  type SavedFilterSemanticState,
} from '#modules/filtering/domain/saved-filter-views/saved_filter_view'
import { NodeFilterHashGenerator } from '#modules/filtering/infra/adapters/filtering-runtime/node_filter_hash_generator'

const hashGenerator = new NodeFilterHashGenerator()
const applyFilterMigrationResult = (view: Parameters<typeof applyFilterMigrationResultWithHash>[0], result: Parameters<typeof applyFilterMigrationResultWithHash>[1]) =>
  applyFilterMigrationResultWithHash(view, result, hashGenerator)
const createSavedFilterView = (
  input: CreateSavedFilterViewInput,
  options: Parameters<typeof buildSavedFilterView>[1] = {}
): ReturnType<typeof buildSavedFilterView> =>
  buildSavedFilterView(input, options, hashGenerator)


function condition(field = 'status', value = 'open'): FilterExpression {
  return {
    kind: 'condition',
    field,
    operator: 'eq',
    effect: 'require',
    unknown: 'exclude',
    value: { kind: 'scalar', value },
  }
}

function semanticState(filter: FilterExpression = condition()): SavedFilterSemanticState {
  return {
    filter,
    textQuery: null,
    sort: [],
    projection: [],
  }
}

function savedViewInput(
  overrides: Partial<CreateSavedFilterViewInput> = {}
): CreateSavedFilterViewInput {

  return {
    id: 'view-1',
    name: 'Open work',
    description: null,
    ownerId: 'user-1',
    visibility: 'private',
    organizationId: null,
    teamId: null,
    context: { key: 'work_item.discovery', owner: 'tasks', schemaVersion: 1 },
    semanticState: semanticState(),
    presentationState: { layout: 'table', density: 'compact', columns: ['title', 'status'] },
    isDefault: false,
    isPinned: false,
    alertState: { status: 'active', reason: null },
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    lastSuccessfulMigrationVersion: 1,
    ...overrides,
  }
}

test.group('Unit | Saved filter view domain', () => {
  test('enforces private, team, and organization visibility scopes and current membership', ({
    assert,
  }) => {
    const privateView = createSavedFilterView(savedViewInput())
    const teamView = createSavedFilterView(
      savedViewInput({
        id: 'view-team',
        visibility: 'team',
        organizationId: 'org-1',
        teamId: 'team-1',
      })
    )
    const organizationView = createSavedFilterView(
      savedViewInput({
        id: 'view-org',
        visibility: 'organization',
        organizationId: 'org-1',
      })
    )

    assert.equal(
      resolveSavedFilterViewAccess(privateView, {
        actorId: 'user-1',
        ownerExists: true,
        organizationIds: [],
        teamIds: [],
      }),
      'owner'
    )
    assert.equal(
      resolveSavedFilterViewAccess(privateView, {
        actorId: 'user-2',
        ownerExists: true,
        organizationIds: ['org-1'],
        teamIds: ['team-1'],
      }),
      'denied'
    )
    assert.equal(
      resolveSavedFilterViewAccess(teamView, {
        actorId: 'user-2',
        ownerExists: true,
        organizationIds: ['org-1'],
        teamIds: ['team-1'],
      }),
      'viewer'
    )
    assert.equal(
      resolveSavedFilterViewAccess(teamView, {
        actorId: 'user-2',
        ownerExists: true,
        organizationIds: ['org-1'],
        teamIds: [],
      }),
      'denied'
    )
    assert.equal(
      resolveSavedFilterViewAccess(organizationView, {
        actorId: 'user-2',
        ownerExists: true,
        organizationIds: ['org-1'],
        teamIds: [],
      }),
      'viewer'
    )

    assert.throws(
      () =>
        createSavedFilterView(
          savedViewInput({ visibility: 'team', organizationId: null, teamId: 'team-1' })
        ),
      /invalid_visibility_scope/
    )
    assert.throws(
      () =>
        createSavedFilterView(
          savedViewInput({ visibility: 'organization', organizationId: 'org-1', teamId: 'team-1' })
        ),
      /invalid_visibility_scope/
    )
    assert.throws(
      () =>
        createSavedFilterView(
          savedViewInput({ visibility: 'team', organizationId: ' ', teamId: 'team-1' })
        ),
      /invalid_visibility_scope/
    )
  })
})

  test('reports deleted owners and revoked memberships explicitly', ({ assert }) => {
    const view = createSavedFilterView(
      savedViewInput({ visibility: 'organization', organizationId: 'org-1' })
    )

    assert.equal(
      resolveSavedFilterViewAccess(view, {
        actorId: 'user-1',
        ownerExists: false,
        organizationIds: ['org-1'],
        teamIds: [],
      }),
      'owner_missing'
    )
    assert.equal(
      resolveSavedFilterViewAccess(view, {
        actorId: 'former-member',
        ownerExists: true,
        organizationIds: [],
        teamIds: [],
      }),
      'denied'
    )
    assert.equal(
      resolveSavedFilterViewAccess(view, {
        actorId: 'user-1',
        ownerExists: true,
        organizationIds: [],
        teamIds: [],
      }),
      'denied'
    )
  })

  test('binds the saved definition to a valid context and owning schema', ({ assert }) => {
    assert.throws(
      () =>
        createSavedFilterView(
          savedViewInput({ context: { key: '', owner: 'tasks', schemaVersion: 1 } })
        ),
      /invalid_context_key/
    )
    assert.throws(
      () =>
        createSavedFilterView(
          savedViewInput({ context: { key: 'work_item.discovery', owner: '', schemaVersion: 1 } })
        ),
      /invalid_context_owner/
    )
    assert.throws(
      () =>
        createSavedFilterView(
          savedViewInput({
            context: { key: 'work_item.discovery', owner: 'tasks', schemaVersion: 0 },
          })
        ),
      /invalid_schema_version/
    )
  })

  test('validates timestamps, visibility, alert state, and runtime input envelopes', ({
    assert,
  }) => {
    const invalidAlertState: unknown = { status: 'running', reason: null }
    assert.throws(
      () => createSavedFilterView(savedViewInput({ createdAt: 'not-a-timestamp' })),
      /invalid_created_at/
    )
    assert.throws(
      () => createSavedFilterView(savedViewInput({ createdAt: '2026-02-30T00:00:00.000Z' })),
      /invalid_created_at/
    )
    assert.throws(
      () =>
        createSavedFilterView(
          savedViewInput({
            createdAt: '2026-08-02T00:00:00.000Z',
            updatedAt: '2026-08-01T00:00:00.000Z',
          })
        ),
      /invalid_timestamp_order/
    )
    assert.throws(
      () =>
        createSavedFilterView(
          savedViewInput({ visibility: 'public' as CreateSavedFilterViewInput['visibility'] })
        ),
      /invalid_visibility/
    )
    assert.throws(
      () =>
        createSavedFilterView(
          savedViewInput({
            alertState: invalidAlertState as CreateSavedFilterViewInput['alertState'],
          })
        ),
      /invalid_alert_state/
    )
    assert.throws(
      () =>
        createSavedFilterView(savedViewInput({ alertState: { status: 'paused', reason: ' ' } })),
      /invalid_alert_reason/
    )
    assert.throws(
      () =>
        createSavedFilterView(
          savedViewInput({
            semanticState: {
              filter: null,
              textQuery: null,
              sort: 'not-an-array',
              projection: [],
            } as unknown as SavedFilterSemanticState,
          })
        ),
      /corrupt_semantic_payload/
    )
    assert.throws(
      () =>
        createSavedFilterView(
          savedViewInput({
            presentationState: [] as unknown as CreateSavedFilterViewInput['presentationState'],
          })
        ),
      /invalid_presentation_state/
    )
  })

  test('rejects unknown semantic keys instead of silently dropping future criteria', ({
    assert,
  }) => {
    const topLevelExtra = JSON.stringify({
      filter: null,
      textQuery: null,
      sort: [],
      projection: [],
      futureEligibility: { field: 'secret' },
    })
    const conditionExtra = JSON.stringify({
      filter: {
        ...condition(),
        providerDsl: { term: { confidential: true } },
      },
      textQuery: null,
      sort: [],
      projection: [],
    })

    assert.throws(() => parseSavedFilterSemanticState(topLevelExtra), /corrupt_semantic_payload/)
    assert.throws(() => parseSavedFilterSemanticState(conditionExtra), /corrupt_semantic_payload/)
  })

  test('bounds presentation traversal before deeply nested input can overflow the stack', ({
    assert,
  }) => {
    let nested: unknown = 'leaf'
    for (let depth = 0; depth < 2_000; depth += 1) nested = [nested]

    assert.throws(
      () =>
        createSavedFilterView(
          savedViewInput({
            presentationState: {
              nested: nested as CreateSavedFilterViewInput['presentationState'][string],
            },
          })
        ),
      /presentation_depth_exceeded/
    )
  })

  test('keeps semantic and presentation state separate', ({ assert }) => {
    const list = createSavedFilterView(
      savedViewInput({
        semanticState: semanticState(condition(' status ', 'open')),
        presentationState: { layout: 'list', expanded: false },
      })
    )
    const grid = createSavedFilterView(
      savedViewInput({
        id: 'view-grid',
        semanticState: semanticState(condition('status', 'open')),
        presentationState: { layout: 'grid', expanded: true },
      })
    )

    assert.equal(list.semanticChecksum, grid.semanticChecksum)
    assert.notDeepEqual(list.presentationState, grid.presentationState)
    assert.equal(list.semanticState.filter?.kind, 'condition')
    if (list.semanticState.filter?.kind === 'condition') {
      assert.equal(list.semanticState.filter.field, 'status')
    }
  })

  test('requires personal defaults to be pinned and unique per owner/context', ({ assert }) => {
    assert.throws(
      () => createSavedFilterView(savedViewInput({ isDefault: true, isPinned: false })),
      /default_must_be_pinned/
    )
    assert.throws(
      () =>
        createSavedFilterView(
          savedViewInput({
            visibility: 'team',
            organizationId: 'org-1',
            teamId: 'team-1',
            isDefault: true,
            isPinned: true,
          })
        ),
      /shared_view_cannot_be_default/
    )

    const first = createSavedFilterView(savedViewInput({ isDefault: true, isPinned: true }))
    const second = createSavedFilterView(
      savedViewInput({ id: 'view-2', isDefault: true, isPinned: true })
    )
    assert.throws(() => assertUniqueDefaultSavedFilterViews([first, second]), /multiple_defaults/)

    assert.doesNotThrow(() =>
      assertUniqueDefaultSavedFilterViews([
        first,
        createSavedFilterView(
          savedViewInput({
            id: 'view-other-context',
            context: { key: 'work_item.reporting', owner: 'tasks', schemaVersion: 1 },
            isDefault: true,
            isPinned: true,
          })
        ),
      ])
    )
  })

  test('enforces the exact canonical payload byte bound without truncating criteria', ({
    assert,
  }) => {
    const input = savedViewInput({
      presentationState: { layout: 'table', columns: ['x'.repeat(512)] },
    })
    const measured = createSavedFilterView(input)

    assert.equal(
      createSavedFilterView(input, {
        maxCanonicalPayloadBytes: measured.canonicalPayloadBytes,
      }).canonicalPayloadBytes,
      measured.canonicalPayloadBytes
    )
    assert.throws(
      () =>
        createSavedFilterView(input, {
          maxCanonicalPayloadBytes: measured.canonicalPayloadBytes - 1,
        }),
      /canonical_payload_too_large/
    )
  })

  test('does not advance schema state or semantic payload when migration lacks an atomic payload', ({
    assert,
  }) => {
    const view = createSavedFilterView(savedViewInput())
    const blocked: FilterMigrationResult = {
      outcome: 'blocked',
      contextKey: view.context.key,
      contextOwner: view.context.owner,
      fromVersion: 1,
      requestedToVersion: 2,
      effectiveVersion: 1,
      readerVersion: null,
      inputChecksum: view.semanticChecksum,
      migrationReceipts: [],
      diagnostics: [
        {
          code: 'missing_migration_hop',
          path: null,
          message: 'No migration from version 1',
        },
      ],
      alertDisposition: 'pause_blocked',
      atomicPayload: null,
      preservedPayloadJson: JSON.stringify(view.semanticState),
    }

    const unchanged = applyFilterMigrationResult(view, blocked)
    assert.equal(unchanged.context.schemaVersion, 1)
    assert.equal(unchanged.semanticChecksum, view.semanticChecksum)
    assert.deepEqual(unchanged.semanticState, view.semanticState)
    assert.deepEqual(unchanged.alertState, {
      status: 'paused',
      reason: 'migration_blocked',
    })
  })

  test('rejects a forged successful result that advances beyond the requested target', ({
    assert,
  }) => {
    const view = createSavedFilterView(savedViewInput())
    const payloadJson = JSON.stringify(view.semanticState)
    const forged: FilterMigrationResult = {
      outcome: 'migrated',
      contextKey: view.context.key,
      contextOwner: view.context.owner,
      fromVersion: 1,
      requestedToVersion: 2,
      effectiveVersion: 999,
      readerVersion: null,
      inputChecksum: view.semanticChecksum,
      migrationReceipts: [],
      diagnostics: [],
      alertDisposition: 'unchanged',
      atomicPayload: {
        contextKey: view.context.key,
        contextOwner: view.context.owner,
        schemaVersion: 999,
        payloadJson,
        checksum: view.semanticChecksum,
      },
      preservedPayloadJson: null,
    }

    assert.throws(
      () => applyFilterMigrationResult(view, forged),
      /migration_result_version_mismatch/
    )
  })
