import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { CreateSavedFilterViewCommand } from '#modules/filtering/actions/commands/saved-filter-views/create_saved_filter_view_command'
import { DeleteSavedFilterViewCommand } from '#modules/filtering/actions/commands/saved-filter-views/delete_saved_filter_view_command'
import { ShareSavedFilterViewCommand } from '#modules/filtering/actions/commands/saved-filter-views/share_saved_filter_view_command'
import { UpdateSavedFilterViewCommand } from '#modules/filtering/actions/commands/saved-filter-views/update_saved_filter_view_command'
import type { FilterSavedViewAuthorization } from '#modules/filtering/actions/ports/outbound/filter_saved_view_authorization'
import { FilterSavedViewAccessError } from '#modules/filtering/actions/ports/outbound/filter_saved_view_authorization'
import type {
  FilterSavedViewGrant,
  FilterSavedViewGrantTarget,
  FilterSavedViewOwner,
} from '#modules/filtering/actions/ports/outbound/filter_saved_view_repository'
import { FilterSavedViewRepositoryError } from '#modules/filtering/actions/ports/outbound/filter_saved_view_repository'
import { ExecuteSavedFilterViewQuery } from '#modules/filtering/actions/queries/saved-filter-views/execute_saved_filter_view_query'
import { GetSavedFilterViewQuery } from '#modules/filtering/actions/queries/saved-filter-views/get_saved_filter_view_query'
import { ListSavedFilterViewsQuery } from '#modules/filtering/actions/queries/saved-filter-views/list_saved_filter_views_query'
import type { FilterContextDefinition } from '#modules/filtering/domain/filtering-core/filter_context_definition'
import type { SavedFilterSemanticState } from '#modules/filtering/domain/saved-filter-views/saved_filter_view'
import { LucidFilterTransactionRunner } from '#modules/filtering/infra/adapters/filtering-runtime/lucid_filter_transaction_runner'
import { NodeFilterHashGenerator } from '#modules/filtering/infra/adapters/filtering-runtime/node_filter_hash_generator'
import { PostgresFilterSavedViewAuthorization } from '#modules/filtering/infra/adapters/saved-filter-views/postgres_filter_saved_view_authorization'
import { PostgresFilterSavedViewRepository } from '#modules/filtering/infra/repositories/saved-filter-views/postgres_filter_saved_view_repository'
import type {
  FilterContextProvider,
  FilterPrincipal,
} from '#modules/filtering/public_contracts/filter_context_provider'
import type {
  QueryCriteriaRequest,
  QueryCriteriaResponse,
} from '#modules/filtering/public_contracts/filter_query'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { testId } from '#tests/helpers/test_utils'

test.group('Integration | Saved filter views', (group) => {

const NOW = '2026-08-01T09:00:00.000Z'
const LATER = '2026-08-01T10:00:00.000Z'
const CONTEXT = { key: 'tasks.discovery.public', owner: 'tasks', schemaVersion: 1 } as const
const ACTOR_ID = testId()
const ORGANIZATION_ID = testId()
const READER_ID = testId()
const principal: FilterPrincipal = {
  kind: 'user',
  id: ACTOR_ID,
  organizationId: ORGANIZATION_ID,
  authorizationVersion: 'membership-7',
}

function semanticState(status = 'open'): SavedFilterSemanticState {
  return {
    filter: {
      kind: 'condition',
      field: 'task.applicationState',
      operator: 'eq',
      effect: 'require',
      value: { kind: 'scalar', value: status },
      unknown: 'exclude',
    },
    textQuery: null,
    sort: [{ field: 'task.updatedAt', direction: 'desc' }],
    projection: ['task.updatedAt'],
  }
}

function contextDefinition(
  overrides: Partial<FilterContextDefinition> = {}
): FilterContextDefinition {

  return {
    key: CONTEXT.key,
    version: 1,
    resource: 'task',
    ownerModule: 'tasks',
    capabilities: {
      text: true,
      facets: true,
      nestedGroups: true,
      preferences: true,
      relativeTime: true,
      savedViews: true,
      sharedViews: true,
      alerts: true,
      emptyRequest: true,
      pagination: 'cursor',
      maxDepth: 5,
      maxConditions: 30,
    },
    fields: [],
    sorts: [{ field: 'task.updatedAt', directions: ['asc', 'desc'] }],
    defaultSort: [{ field: 'task.updatedAt', direction: 'desc' }],
    executionProfile: 'fake-search',
    degradationPolicy: 'fail_closed',
    limits: {
      maxPageSize: 50,
      maxFacetRequests: 10,
      maxProjectionFields: 10,
      maxSorts: 2,
      maxSetValues: 100,
      maxTextLength: 512,
      maxRelationDepth: 0,
      maxCost: 200,
    },
    ...overrides,
  }
}

class MutableContextProvider implements FilterContextProvider {
  definition = contextDefinition()

  getEffectiveDefinition(): Promise<FilterContextDefinition> {
    return Promise.resolve(structuredClone(this.definition))
  }
}

class MutableAuthorization implements FilterSavedViewAuthorization {
  ownerActive = true
  createAllowed = true
  allowedActions = new Set(['read', 'edit', 'delete', 'share', 'subscribe'])
  readableIds: string[] = []
  deniedTargetIds = new Set<string>()

  canCreate(): Promise<boolean> {
    return Promise.resolve(this.ownerActive && this.createAllowed)
  }

  canPerform(input: { action: string }): Promise<boolean> {
    return Promise.resolve(this.ownerActive && this.allowedActions.has(input.action))
  }

  canShareWith(input: { target: FilterSavedViewGrantTarget }): Promise<boolean> {
    return Promise.resolve(this.ownerActive && !this.deniedTargetIds.has(input.target.id))
  }

  listAuthorizedViewIds(): Promise<readonly string[]> {
    return Promise.resolve([...this.readableIds])
  }
}

function owner(type: FilterSavedViewOwner['type'] = 'user'): FilterSavedViewOwner {
  return { type, id: type === 'user' ? ACTOR_ID : ORGANIZATION_ID }
}

function grant(
  target: FilterSavedViewGrantTarget,
  permissions: Partial<Omit<FilterSavedViewGrant, 'target'>> = {}
): FilterSavedViewGrant {

  return {
    target,
    read: false,
    edit: false,
    share: false,
    subscribe: false,
    ...permissions,
  }
}

function commands() {
  const repository = new PostgresFilterSavedViewRepository()
  const transactions = new LucidFilterTransactionRunner()
  const authorization = new MutableAuthorization()
  const contexts = new MutableContextProvider()
  return {
    repository,
    transactions,
    authorization,
    contexts,
    create: new CreateSavedFilterViewCommand(
      transactions,
      repository,
      authorization,
      contexts,
      new NodeFilterHashGenerator(),
      () => NOW,
      testId
    ),
    update: new UpdateSavedFilterViewCommand(
      transactions,
      repository,
      authorization,
      contexts,
      new NodeFilterHashGenerator(),
      () => LATER
    ),
    remove: new DeleteSavedFilterViewCommand(transactions, repository, authorization, () => LATER),
    share: new ShareSavedFilterViewCommand(
      transactions,
      repository,
      authorization,
      contexts,
      new NodeFilterHashGenerator(),
      () => LATER
    ),
  }
}

async function createPrivate(
  input: {
    name?: string
    isDefault?: boolean
    presentationState?: Readonly<Record<string, string | number | boolean | null>>
  } = {}
): Promise<ReturnType<typeof commands> & { record: Awaited<ReturnType<ReturnType<typeof commands>['create']['handle']>> }> {

  const fixture = commands()
  const record = await fixture.create.handle({
    principal,
    owner: owner(),
    name: input.name ?? 'Open task opportunities',
    description: null,
    visibility: 'private',
    organizationId: null,
    teamId: null,
    context: CONTEXT,
    semanticState: semanticState(),
    presentationState: input.presentationState ?? { layout: 'list' },
    isDefault: input.isDefault ?? false,
    isPinned: input.isDefault ?? true,
    alertState: { status: 'disabled', reason: null },
  })
  fixture.authorization.readableIds = [record.view.id]
  return { ...fixture, record }
}

async function databaseColumns(table: string): Promise<string[]> {
  const rows = (await db
    .from('information_schema.columns')
    .select('column_name')
    .where('table_schema', 'public')
    .where('table_name', table)) as Array<{ column_name: string }>
  return rows.map(({ column_name }) => column_name).sort()
}

async function captureError(promise: Promise<unknown>): Promise<Error> {
  try {
    await promise
  } catch (error) {
    return error as Error
  }
  throw new Error('Expected promise to reject')
}


  group.setup(async () => {
    await setupApp()
  })
  group.each.teardown(async () => {
    await db.from('filter_saved_view_migration_runs').delete()
    await db.from('filter_saved_view_grants').delete()
    await db.from('filter_saved_views').delete()
  })
  group.teardown(async () => teardownApp())

  test('migration creates bounded semantic/presentation storage, XOR owners, grants, migration runs, and no result snapshot', async ({
    assert,
  }) => {
    const viewColumns = await databaseColumns('filter_saved_views')
    assert.includeMembers(viewColumns, [
      'owner_user_id',
      'owner_organization_id',
      'context_key',
      'context_owner',
      'context_schema_version',
      'criteria_payload',
      'criteria_checksum',
      'presentation_payload',
      'lock_version',
      'migration_state',
      'last_successful_migration_version',
      'deleted_at',
    ])
    assert.notInclude(viewColumns, 'result_snapshot')
    assert.notInclude(viewColumns, 'provider_dsl')
    assert.includeMembers(await databaseColumns('filter_saved_view_grants'), [
      'can_read',
      'can_edit',
      'can_share',
      'can_subscribe',
    ])
    assert.includeMembers(await databaseColumns('filter_saved_view_migration_runs'), [
      'migration_id',
      'input_checksum',
      'output_checksum',
      'outcome',
    ])
    assert.includeMembers(await databaseColumns('filter_taxonomy_migration_runs'), [
      'status',
      'completed_item_ids',
      'next_cursor',
      'lock_version',
      'diagnostic_code',
    ])

    const invalidOwnerInsert = db.table('filter_saved_views').insert({
      id: testId(),
      name: 'Invalid owner',
      normalized_name: 'invalid owner',
      owner_user_id: null,
      owner_organization_id: null,
      context_key: CONTEXT.key,
      context_owner: CONTEXT.owner,
      context_schema_version: 1,
      criteria_payload: semanticState(),
      criteria_checksum: 'a'.repeat(64),
      presentation_payload: {},
      last_successful_migration_version: 1,
      canonical_payload_bytes: 100,
    })
    const invalidOwnerError = await captureError(invalidOwnerInsert)
    assert.match(invalidOwnerError.message, /owner_xor/iu)

    const oversizedInsert = db.table('filter_saved_views').insert({
      id: testId(),
      name: 'Oversized',
      normalized_name: 'oversized',
      owner_user_id: testId(),
      context_key: CONTEXT.key,
      context_owner: CONTEXT.owner,
      context_schema_version: 1,
      criteria_payload: semanticState(),
      criteria_checksum: 'a'.repeat(64),
      presentation_payload: { oversized: 'x'.repeat(70_000) },
      last_successful_migration_version: 1,
      canonical_payload_bytes: 100,
    })
    const oversizedError = await captureError(oversizedInsert)
    assert.match(oversizedError.message, /presentation_payload_size/iu)
  })

  test('normalizes names and lets unique indexes serialize concurrent defaults per owner/context', async ({
    assert,
  }) => {
    const first = await createPrivate({ name: 'Caf\u00e9   Board' })
    const duplicateNameError = await captureError(
      first.create.handle({
        principal,
        owner: owner(),
        name: '  Cafe\u0301 Board  ',
        description: null,
        visibility: 'private',
        organizationId: null,
        teamId: null,
        context: CONTEXT,
        semanticState: semanticState(),
        presentationState: {},
        isDefault: false,
        isPinned: false,
        alertState: { status: 'disabled', reason: null },
      })
    )
    assert.instanceOf(duplicateNameError, FilterSavedViewRepositoryError)
    assert.equal((duplicateNameError as FilterSavedViewRepositoryError).code, 'DUPLICATE_NAME')

    await db.from('filter_saved_views').delete()
    const fixture = commands()
    const createDefault = (name: string) =>
      fixture.create.handle({
        principal,
        owner: owner(),
        name,
        description: null,
        visibility: 'private',
        organizationId: null,
        teamId: null,
        context: CONTEXT,
        semanticState: semanticState(),
        presentationState: {},
        isDefault: true,
        isPinned: true,
        alertState: { status: 'disabled', reason: null },
      })
    const results = await Promise.allSettled([
      createDefault('Default A'),
      createDefault('Default B'),
    ])
    assert.equal(results.filter(({ status }) => status === 'fulfilled').length, 1)
    const rejected = results.find(({ status }) => status === 'rejected') as PromiseRejectedResult
    const rejectionError = rejected.reason as unknown
    assert.instanceOf(rejectionError, FilterSavedViewRepositoryError)
    assert.equal((rejectionError as FilterSavedViewRepositoryError).code, 'DUPLICATE_DEFAULT')
  })

  test('persists organization ownership as the opposite side of the owner XOR', async ({
    assert,
  }) => {
    const fixture = commands()
    const record = await fixture.create.handle({
      principal,
      owner: owner('organization'),
      name: 'Organization task discovery',
      description: null,
      visibility: 'organization',
      organizationId: ORGANIZATION_ID,
      teamId: null,
      context: CONTEXT,
      semanticState: semanticState(),
      presentationState: {},
      isDefault: false,
      isPinned: true,
      alertState: { status: 'disabled', reason: null },
    })

    assert.deepEqual(record.owner, { type: 'organization', id: ORGANIZATION_ID })
    const row = (await db
      .from('filter_saved_views')
      .select('owner_user_id', 'owner_organization_id')
      .where('id', record.view.id)
      .first()) as
      | { owner_user_id: string | null; owner_organization_id: string | null }
      | undefined
    assert.isNull(row?.owner_user_id)
    assert.equal(row?.owner_organization_id, ORGANIZATION_ID)
  })

  test('optimistic locking rejects lost updates and semantic/presentation patches remain independent', async ({
    assert,
  }) => {
    const fixture = await createPrivate({
      presentationState: { layout: 'list', density: 'compact' },
    })
    const expected = fixture.record.lockVersion
    const semanticUpdate = fixture.update.handle({
      principal,
      viewId: fixture.record.view.id,
      expectedLockVersion: expected,
      patch: { semanticState: semanticState('closed') },
    })
    const presentationUpdate = fixture.update.handle({
      principal,
      viewId: fixture.record.view.id,
      expectedLockVersion: expected,
      patch: { presentationState: { layout: 'grid' } },
    })
    const results = await Promise.allSettled([semanticUpdate, presentationUpdate])
    assert.equal(results.filter(({ status }) => status === 'fulfilled').length, 1)
    const rejected = results.find(({ status }) => status === 'rejected') as PromiseRejectedResult
    const rejectionError = rejected.reason as unknown
    assert.instanceOf(rejectionError, FilterSavedViewRepositoryError)
    assert.equal((rejectionError as FilterSavedViewRepositoryError).code, 'OPTIMISTIC_CONFLICT')

    const persisted = await fixture.repository.findById(fixture.record.view.id)
    assert.equal(persisted?.lockVersion, expected + 1)
    if (persisted?.view.semanticState.filter && results[0].status === 'fulfilled') {
      assert.deepEqual(persisted.view.presentationState, { density: 'compact', layout: 'list' })
      assert.deepEqual((persisted.view.semanticState.filter as { value?: unknown }).value, {
        kind: 'scalar',
        value: 'closed',
      })
    } else {
      assert.deepEqual(persisted?.view.presentationState, { layout: 'grid' })
      assert.deepEqual((persisted?.view.semanticState.filter as { value?: unknown }).value, {
        kind: 'scalar',
        value: 'open',
      })
    }
  })

  test('shares independent grants transactionally and re-evaluates edit/share permission on every mutation', async ({
    assert,
  }) => {
    const fixture = await createPrivate()
    const orgTarget: FilterSavedViewGrantTarget = {
      type: 'organization',
      id: ORGANIZATION_ID,
    }
    const userTarget: FilterSavedViewGrantTarget = { type: 'user', id: READER_ID }
    const teamTarget: FilterSavedViewGrantTarget = { type: 'team', id: testId() }
    const subscriberTarget: FilterSavedViewGrantTarget = { type: 'user', id: testId() }
    const shared = await fixture.share.handle({
      principal,
      viewId: fixture.record.view.id,
      expectedLockVersion: fixture.record.lockVersion,
      visibility: 'organization',
      organizationId: ORGANIZATION_ID,
      teamId: null,
      grants: [
        grant(orgTarget, { read: true }),
        grant(userTarget, { edit: true }),
        grant(teamTarget, { share: true }),
        grant(subscriberTarget, { subscribe: true }),
      ],
    })
    const grants = await fixture.repository.listGrants(shared.view.id)
    const byTarget = new Map(
      grants.map((savedGrant) => [`${savedGrant.target.type}:${savedGrant.target.id}`, savedGrant])
    )
    assert.deepEqual(byTarget.get(`organization:${orgTarget.id}`), grant(orgTarget, { read: true }))
    assert.deepEqual(byTarget.get(`user:${userTarget.id}`), grant(userTarget, { edit: true }))
    assert.deepEqual(byTarget.get(`team:${teamTarget.id}`), grant(teamTarget, { share: true }))
    assert.deepEqual(
      byTarget.get(`user:${subscriberTarget.id}`),
      grant(subscriberTarget, { subscribe: true })
    )

    fixture.authorization.allowedActions.delete('edit')
    await assert.rejects(
      () =>
        fixture.update.handle({
          principal,
          viewId: shared.view.id,
          expectedLockVersion: shared.lockVersion,
          patch: { name: 'Denied late edit' },
        }),
      FilterSavedViewAccessError
    )

    fixture.authorization.allowedActions.delete('delete')
    await assert.rejects(
      () =>
        fixture.remove.handle({
          principal,
          viewId: shared.view.id,
          expectedLockVersion: shared.lockVersion,
        }),
      FilterSavedViewAccessError
    )

    fixture.authorization.allowedActions.add('edit')
    const otherOrganizationId = testId()
    fixture.authorization.deniedTargetIds.add(otherOrganizationId)
    await assert.rejects(
      () =>
        fixture.share.handle({
          principal,
          viewId: shared.view.id,
          expectedLockVersion: shared.lockVersion,
          visibility: 'organization',
          organizationId: ORGANIZATION_ID,
          teamId: null,
          grants: [grant({ type: 'organization', id: otherOrganizationId }, { read: true })],
        }),
      FilterSavedViewAccessError
    )
  })

  test('fails closed when the principal no longer carries current organization membership', async ({ assert }) => {
    const fixture = commands()
    const record = await fixture.create.handle({
      principal,
      owner: owner('organization'),
      name: 'Organization membership probe',
      description: null,
      visibility: 'organization',
      organizationId: ORGANIZATION_ID,
      teamId: null,
      context: CONTEXT,
      semanticState: semanticState(),
      presentationState: {},
      isDefault: false,
      isPinned: true,
      alertState: { status: 'disabled', reason: null },
    })
    await db.table('filter_saved_view_grants').insert({
      saved_view_id: record.view.id,
      grantee_type: 'organization',
      grantee_id: ORGANIZATION_ID,
      can_read: true,
      can_edit: false,
      can_share: false,
      can_subscribe: false,
      created_by: ACTOR_ID,
      revoked_at: null,
    })

    const allowed = await new PostgresFilterSavedViewAuthorization().canPerform({
      principal: { kind: 'user' as const, id: ACTOR_ID, authorizationVersion: 'membership-8' },
      action: 'read',
      record: record,
    })

    assert.isFalse(allowed)
  })

  test('fails closed for disabled contexts, deactivated owners, soft deletion, and corrupted checksums', async ({
    assert,
  }) => {
    const disabled = commands()
    disabled.contexts.definition = contextDefinition({
      capabilities: { ...contextDefinition().capabilities, savedViews: false },
    })
    await assert.rejects(
      () =>
        disabled.create.handle({
          principal,
          owner: owner(),
          name: 'Disabled context',
          description: null,
          visibility: 'private',
          organizationId: null,
          teamId: null,
          context: CONTEXT,
          semanticState: semanticState(),
          presentationState: {},
          isDefault: false,
          isPinned: false,
          alertState: { status: 'disabled', reason: null },
        }),
      FilterSavedViewAccessError
    )

    const fixture = await createPrivate({ isDefault: true })
    const get = new GetSavedFilterViewQuery(fixture.repository, fixture.authorization)
    fixture.authorization.ownerActive = false
    await assert.rejects(
      () => get.execute({ principal, viewId: fixture.record.view.id }),
      FilterSavedViewAccessError
    )
    fixture.authorization.ownerActive = true
    await fixture.remove.handle({
      principal,
      viewId: fixture.record.view.id,
      expectedLockVersion: fixture.record.lockVersion,
    })
    await assert.rejects(
      () => get.execute({ principal, viewId: fixture.record.view.id }),
      FilterSavedViewAccessError
    )
    const replacementDefault = await fixture.create.handle({
      principal,
      owner: owner(),
      name: 'Replacement default after soft delete',
      description: null,
      visibility: 'private',
      organizationId: null,
      teamId: null,
      context: CONTEXT,
      semanticState: semanticState(),
      presentationState: {},
      isDefault: true,
      isPinned: true,
      alertState: { status: 'disabled', reason: null },
    })
    assert.isTrue(replacementDefault.view.isDefault)

    const corrupt = await createPrivate({ name: 'Checksum corruption case' })
    await db
      .from('filter_saved_views')
      .where('id', corrupt.record.view.id)
      .update({ criteria_checksum: 'f'.repeat(64) })
    const corruptError = await captureError(corrupt.repository.findById(corrupt.record.view.id))
    assert.instanceOf(corruptError, FilterSavedViewRepositoryError)
    assert.equal((corruptError as FilterSavedViewRepositoryError).code, 'CORRUPTED_PAYLOAD')
  })

  test('lists only live-authorized IDs and executes canonical criteria through current data permission flow', async ({
    assert,
  }) => {
    const fixture = await createPrivate()
    const criteriaInputs: Array<{
      criteria: QueryCriteriaRequest
      principal: FilterPrincipal
      requestId: string
    }> = []
    const criteriaExecutor = {
      execute: <T>(input: {
        criteria: QueryCriteriaRequest
        principal: FilterPrincipal
        requestId: string
      }): Promise<QueryCriteriaResponse<T>> => {
        criteriaInputs.push(input)
        return Promise.resolve({
          context: input.criteria.context,
          schemaVersion: input.criteria.schemaVersion,
          canonicalCriteria: input.criteria,
          hits: [] as T[],
          total: { value: 0, relation: 'eq' },
          facets: [],
          suggestions: [],
          diagnostics: [],
          page: {},
          execution: {
            provider: 'fake-search',
            degraded: false,
            partial: false,
            requestId: input.requestId,
          },
        })
      },
    }
    const list = new ListSavedFilterViewsQuery(fixture.repository, fixture.authorization)
    const execute = new ExecuteSavedFilterViewQuery(
      fixture.repository,
      fixture.authorization,
      fixture.contexts,
      criteriaExecutor
    )

    const listed = await list.execute({ principal, context: CONTEXT.key })
    assert.deepEqual(
      listed.map(({ view }: { view: typeof fixture.record.view }) => view.id),
      [fixture.record.view.id]
    )
    await execute.execute({
      principal,
      viewId: fixture.record.view.id,
      requestId: 'saved-view-request-1',
      page: { size: 20 },
    })
    assert.equal(criteriaInputs.length, 1)
    assert.deepEqual(criteriaInputs[0]?.criteria, {
      context: CONTEXT.key,
      schemaVersion: 1,
      filter: semanticState().filter,
      sort: semanticState().sort,
      projection: semanticState().projection,
      page: { size: 20 },
    })

    fixture.contexts.definition = contextDefinition({ version: 2 })
    await assert.rejects(
      () =>
        execute.execute({
          principal,
          viewId: fixture.record.view.id,
          requestId: 'saved-view-request-version-retired',
          page: { size: 20 },
        }),
      FilterSavedViewAccessError
    )
    fixture.contexts.definition = contextDefinition()
    fixture.authorization.allowedActions.delete('read')
    await assert.rejects(
      () =>
        execute.execute({
          principal,
          viewId: fixture.record.view.id,
          requestId: 'saved-view-request-2',
          page: { size: 20 },
        }),
      FilterSavedViewAccessError
    )
    assert.equal(criteriaInputs.length, 1)
    assert.deepEqual(await list.execute({ principal, context: CONTEXT.key }), [])
  })
})
