import db from '@adonisjs/lucid/services/db'

import { CreateSavedFilterViewCommand } from '#modules/filtering/actions/commands/saved-filter-views/create_saved_filter_view_command'
import { DeleteSavedFilterViewCommand } from '#modules/filtering/actions/commands/saved-filter-views/delete_saved_filter_view_command'
import { ShareSavedFilterViewCommand } from '#modules/filtering/actions/commands/saved-filter-views/share_saved_filter_view_command'
import { UpdateSavedFilterViewCommand } from '#modules/filtering/actions/commands/saved-filter-views/update_saved_filter_view_command'
import type { FilterSavedViewAuthorization } from '#modules/filtering/actions/ports/outbound/saved-filter-views/filter_saved_view_authorization'
import type {
  FilterSavedViewGrant,
  FilterSavedViewGrantTarget,
  FilterSavedViewOwner,
} from '#modules/filtering/actions/ports/outbound/saved-filter-views/filter_saved_view_repository'
import type { FilterContextDefinition } from '#modules/filtering/domain/filtering-core/filter_context_definition'
import type { SavedFilterSemanticState } from '#modules/filtering/domain/saved-filter-views/saved_filter_view'
import { LucidFilterTransactionRunner } from '#modules/filtering/infra/adapters/filtering-runtime/lucid_filter_transaction_runner'
import { NodeFilterHashGenerator } from '#modules/filtering/infra/adapters/filtering-runtime/node_filter_hash_generator'
import { PostgresFilterSavedViewRepository } from '#modules/filtering/infra/repositories/saved-filter-views/postgres_filter_saved_view_repository'
import type {
  FilterContextProvider,
  FilterPrincipal,
} from '#modules/filtering/public_contracts/filter_context_provider'
import { testId } from '#tests/helpers/test_utils'

export const NOW = '2026-08-01T09:00:00.000Z'
export const LATER = '2026-08-01T10:00:00.000Z'
export const CONTEXT = { key: 'tasks.discovery.public', owner: 'tasks', schemaVersion: 1 } as const
export const ACTOR_ID = testId()
export const ORGANIZATION_ID = testId()
export const READER_ID = testId()
export const principal: FilterPrincipal = {
  kind: 'user',
  id: ACTOR_ID,
  organizationId: ORGANIZATION_ID,
  authorizationVersion: 'membership-7',
}

export function semanticState(status = 'open'): SavedFilterSemanticState {
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

export function contextDefinition(
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

export class MutableContextProvider implements FilterContextProvider {
  definition = contextDefinition()

  getEffectiveDefinition(): Promise<FilterContextDefinition> {
    return Promise.resolve(structuredClone(this.definition))
  }
}

export class MutableAuthorization implements FilterSavedViewAuthorization {
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

export function owner(type: FilterSavedViewOwner['type'] = 'user'): FilterSavedViewOwner {
  return { type, id: type === 'user' ? ACTOR_ID : ORGANIZATION_ID }
}

export function grant(
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

export function commands() {
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

export async function createPrivate(
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

export async function databaseColumns(table: string): Promise<string[]> {
  const rows = (await db
    .from('information_schema.columns')
    .select('column_name')
    .where('table_schema', 'public')
    .where('table_name', table)) as Array<{ column_name: string }>
  return rows.map(({ column_name }) => column_name).sort()
}

export async function captureError(promise: Promise<unknown>): Promise<Error> {
  try {
    await promise
  } catch (error) {
    return error as Error
  }
  throw new Error('Expected promise to reject')
}
