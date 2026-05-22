import db from '@adonisjs/lucid/services/db'
import type { FilterTransaction } from '#modules/filtering/actions/ports/outbound/filter_transaction_runner'
import { FilterSavedViewRepositoryError } from '#modules/filtering/actions/ports/outbound/saved-filter-views/filter_saved_view_repository'
import type { FilterSavedViewGrant, FilterSavedViewOwner, FilterSavedViewReadOptions, FilterSavedViewRecord, FilterSavedViewRepository } from '#modules/filtering/actions/ports/outbound/saved-filter-views/filter_saved_view_repository'
import {
  createSavedFilterView,
  hashSavedFilterSemanticState,
  parseSavedFilterSemanticState,
} from '#modules/filtering/domain/saved-filter-views/saved_filter_view'
import { NodeFilterHashGenerator } from '#modules/filtering/infra/adapters/filtering-runtime/node_filter_hash_generator'

interface Row {
  id: string
  name: string
  description: string | null
  owner_user_id: string | null
  owner_organization_id: string | null
  visibility: string
  organization_id: string | null
  team_id: string | null
  context_key: string
  context_owner: string
  context_schema_version: number | string
  criteria_payload: unknown
  criteria_checksum: string
  presentation_payload: unknown
  is_default: boolean
  is_pinned: boolean
  alert_status: string
  alert_reason: string | null
  lock_version: number | string
  migration_state: FilterSavedViewRecord['migrationState']
  last_successful_migration_version: number | string
  canonical_payload_bytes: number | string
  created_at: Date | string
  updated_at: Date | string
  deleted_at: Date | string | null
  normalized_name: string
  grantee_type?: FilterSavedViewGrant['target']['type']
  grantee_id?: string
  can_read?: boolean
  can_edit?: boolean
  can_share?: boolean
  can_subscribe?: boolean
}
const json = (value: unknown): any => (typeof value === 'string' ? JSON.parse(value) : value)
const iso = (value: unknown): string | null => value == null ? null : new Date(value as any).toISOString()
const client = (trx?: FilterTransaction): any => trx ?? db
const normalizeName = (value: string): string => value.normalize('NFKC').trim().replace(/\s+/gu, ' ').toLocaleLowerCase()

function mapRow(row: Row): FilterSavedViewRecord {
  try {
    const owner: FilterSavedViewOwner = row.owner_user_id
      ? { type: 'user', id: row.owner_user_id }
      : row.owner_organization_id
        ? { type: 'organization', id: row.owner_organization_id }
        : (() => { throw new FilterSavedViewRepositoryError('INVALID_PERSISTENCE_STATE') })()
    const createdAt = iso(row.created_at) ?? ''
    const semanticState = parseSavedFilterSemanticState(JSON.stringify(json(row.criteria_payload)))
    const expectedChecksum = hashSavedFilterSemanticState(semanticState, new NodeFilterHashGenerator())
    if (expectedChecksum !== row.criteria_checksum) {
      throw new FilterSavedViewRepositoryError('CORRUPTED_PAYLOAD')
    }
    const view = createSavedFilterView({
      id: row.id, name: row.name, description: row.description ?? null, ownerId: owner.id,
      visibility: row.visibility, organizationId: row.organization_id ?? null, teamId: row.team_id ?? null,
      context: { key: row.context_key, owner: row.context_owner, schemaVersion: Number(row.context_schema_version) },
      semanticState,
      presentationState: json(row.presentation_payload) ?? {}, isDefault: Boolean(row.is_default), isPinned: Boolean(row.is_pinned),
      alertState: { status: row.alert_status, reason: row.alert_reason ?? null }, createdAt, updatedAt: iso(row.updated_at) ?? createdAt,
      lastSuccessfulMigrationVersion: Number(row.last_successful_migration_version),
    }, {}, new NodeFilterHashGenerator())
    return { owner, view, normalizedName: row.normalized_name, lockVersion: Number(row.lock_version), migrationState: row.migration_state, deletedAt: iso(row.deleted_at) }
  } catch (error) {
    if (error instanceof FilterSavedViewRepositoryError) throw error
    throw new FilterSavedViewRepositoryError('CORRUPTED_PAYLOAD')
  }
}

function persistenceError(error: any): never {
  const constraint = String(error?.constraint ?? '')
  if (constraint.includes('user_name') || constraint.includes('organization_name')) throw new FilterSavedViewRepositoryError('DUPLICATE_NAME')
  if (constraint.includes('user_default') || constraint.includes('organization_default')) throw new FilterSavedViewRepositoryError('DUPLICATE_DEFAULT')
  throw error
}

export class PostgresFilterSavedViewRepository implements FilterSavedViewRepository {
  async create(input: { owner: FilterSavedViewOwner; view: any }, trx: FilterTransaction): Promise<FilterSavedViewRecord> {
    const v = input.view
    try {
      const [row] = await client(trx).table('filter_saved_views').insert({
        id: v.id, name: v.name, normalized_name: normalizeName(v.name), description: v.description,
        owner_user_id: input.owner.type === 'user' ? input.owner.id : null, owner_organization_id: input.owner.type === 'organization' ? input.owner.id : null,
        visibility: v.visibility, organization_id: v.organizationId, team_id: v.teamId, context_key: v.context.key, context_owner: v.context.owner,
        context_schema_version: v.context.schemaVersion, criteria_payload: v.semanticState, criteria_checksum: v.semanticChecksum,
        presentation_payload: v.presentationState, is_default: v.isDefault, is_pinned: v.isPinned, alert_status: v.alertState.status, alert_reason: v.alertState.reason,
        last_successful_migration_version: v.lastSuccessfulMigrationVersion, canonical_payload_bytes: v.canonicalPayloadBytes, created_at: v.createdAt, updated_at: v.updatedAt,
      }).returning('*')
      return mapRow(row)
    } catch (error) { return persistenceError(error) }
  }

  async findById(id: string, trx?: FilterTransaction, options?: FilterSavedViewReadOptions): Promise<FilterSavedViewRecord | null> {
    const query = client(trx).from('filter_saved_views').where('id', id).whereNull('deleted_at')
    if (trx && options?.lock === 'for_update') await query.forUpdate()
    const row = await query.first()
    return row ? mapRow(row) : null
  }

  async listByIds(input: { viewIds: readonly string[]; context: string }, trx?: FilterTransaction): Promise<readonly FilterSavedViewRecord[]> {
    if (!input.viewIds.length) return []
    const rows = await client(trx).from('filter_saved_views').whereIn('id', [...input.viewIds]).where('context_key', input.context).whereNull('deleted_at').orderBy('updated_at', 'desc').orderBy('id')
    return rows.map(mapRow)
  }

  async update(input: { record: FilterSavedViewRecord; expectedLockVersion: number }, trx: FilterTransaction): Promise<FilterSavedViewRecord | null> {
    const v: any = input.record.view
    try {
      const rows = await client(trx).from('filter_saved_views').where('id', v.id).where('lock_version', input.expectedLockVersion).whereNull('deleted_at').update({
        name: v.name, normalized_name: normalizeName(v.name), description: v.description, visibility: v.visibility,
        organization_id: v.organizationId, team_id: v.teamId, context_key: v.context.key, context_owner: v.context.owner, context_schema_version: v.context.schemaVersion,
        criteria_payload: v.semanticState, criteria_checksum: v.semanticChecksum, presentation_payload: v.presentationState, is_default: v.isDefault, is_pinned: v.isPinned,
        alert_status: v.alertState.status, alert_reason: v.alertState.reason, migration_state: input.record.migrationState,
        last_successful_migration_version: v.lastSuccessfulMigrationVersion, canonical_payload_bytes: v.canonicalPayloadBytes, lock_version: input.expectedLockVersion + 1, updated_at: v.updatedAt,
      }, ['*'])
      return rows?.[0] ? mapRow(rows[0]) : null
    } catch (error) { return persistenceError(error) }
  }

  async softDelete(input: { viewId: string; expectedLockVersion: number; deletedAt: string }, trx: FilterTransaction): Promise<boolean> {
    const count = await client(trx).from('filter_saved_views').where('id', input.viewId).where('lock_version', input.expectedLockVersion).whereNull('deleted_at').update({ deleted_at: input.deletedAt, updated_at: input.deletedAt, lock_version: input.expectedLockVersion + 1 })
    return Number(count) > 0
  }

  async replaceGrants(input: { viewId: string; grants: readonly FilterSavedViewGrant[]; actorId: string; occurredAt: string }, trx: FilterTransaction): Promise<void> {
    await client(trx).from('filter_saved_view_grants').where('saved_view_id', input.viewId).whereNull('revoked_at').update({ revoked_at: input.occurredAt, updated_at: input.occurredAt })
    if (!input.grants.length) return
    await client(trx).table('filter_saved_view_grants').insert(input.grants.map((grant) => ({ saved_view_id: input.viewId, grantee_type: grant.target.type, grantee_id: grant.target.id, can_read: grant.read, can_edit: grant.edit, can_share: grant.share, can_subscribe: grant.subscribe, created_by: input.actorId, created_at: input.occurredAt, updated_at: input.occurredAt })))
  }

  async listGrants(id: string, trx?: FilterTransaction): Promise<readonly FilterSavedViewGrant[]> {
    const rows = await client(trx).from('filter_saved_view_grants').where('saved_view_id', id).whereNull('revoked_at')
    return rows.map((row: Row) => ({ target: { type: row.grantee_type as FilterSavedViewGrant['target']['type'], id: row.grantee_id as string }, read: Boolean(row.can_read), edit: Boolean(row.can_edit), share: Boolean(row.can_share), subscribe: Boolean(row.can_subscribe) }))
  }
}
