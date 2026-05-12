import { randomUUID } from 'node:crypto'

import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import {
  AuditLogRepository,
  type AuditTransaction,
  type AuditLogCreateData,
  type AuditLogQuery,
  type AuditLogRecord,
} from '#modules/audit/actions/ports/outbound/audit_log_repository'
import { computeAuditEventHash } from '#modules/audit/public_contracts/audit_event_hash'
import { toOffset } from '#modules/pagination/public_contracts/pagination_public_api'

interface AuditEventRow {
  id: string
  user_id: string | null
  action: string
  entity_type: string
  entity_id: string | null
  old_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
  ip_address: string | null
  user_agent: string | null
  event_name: string | null
  event_family: string | null
  module: string | null
  subsystem: string | null
  workflow: string | null
  stage: string | null
  severity: string | null
  outcome: string | null
  actor_type: string | null
  actor_user_id: string | null
  actor_org_id: string | null
  actor_role_surface: string | null
  target_type: string | null
  target_id: string | null
  target_org_id: string | null
  request_id: string | null
  trace_id: string | null
  correlation_key: string | null
  retention_class: string | null
  source_occurred_at: Date | null
  redaction_applied: boolean
  schema_version: number
  event_hash: string | null
  prev_hash: string | null
  occurred_at: Date
}

export default class PostgresAuditLogRepository extends AuditLogRepository {
  constructor() {
    super()
  }

  async create(data: AuditLogCreateData, transaction?: AuditTransaction): Promise<void> {
    const trx = transaction as TransactionClientContract | undefined
    try {
      const persist = async (writeTrx: TransactionClientContract): Promise<void> => {
        await writeTrx.rawQuery("SELECT pg_advisory_xact_lock(hashtext('suar_audit_event_chain'))")

        const id = randomUUID()
        const previousHashRow = (await writeTrx
          .from('audit_events')
          .whereNotNull('event_hash')
          .orderBy('occurred_at', 'desc')
          .orderBy('id', 'desc')
          .select('event_hash')
          .first()) as { event_hash?: string | null } | undefined
        const prevHash = data.prev_hash ?? previousHashRow?.event_hash ?? null
        const eventPayload = {
          id,
          user_id: data.user_id,
          action: data.action,
          entity_type: data.entity_type,
          entity_id: data.entity_id ?? null,
          old_values: data.old_values ?? null,
          new_values: data.new_values ?? null,
          ip_address: data.ip_address ?? null,
          user_agent: data.user_agent ?? null,
          event_name: data.event_name ?? data.action,
          event_family: data.event_family ?? null,
          module: data.module ?? null,
          subsystem: data.subsystem ?? null,
          workflow: data.workflow ?? null,
          stage: data.stage ?? null,
          severity: data.severity ?? null,
          outcome: data.outcome ?? null,
          actor_type: data.actor_type ?? null,
          actor_user_id: data.actor_user_id ?? data.user_id,
          actor_org_id: data.actor_org_id ?? null,
          actor_role_surface: data.actor_role_surface ?? null,
          target_type: data.target_type ?? data.entity_type,
          target_id: data.target_id ?? data.entity_id ?? null,
          target_org_id: data.target_org_id ?? null,
          request_id: data.request_id ?? null,
          trace_id: data.trace_id ?? null,
          correlation_key: data.correlation_key ?? null,
          retention_class: data.retention_class ?? null,
          ...(data.source_occurred_at ? { source_occurred_at: data.source_occurred_at } : {}),
          redaction_applied: data.redaction_applied ?? false,
          schema_version: data.schema_version ?? (data.source_occurred_at ? 3 : 2),
          prev_hash: prevHash,
        }
        const eventHash =
          data.event_hash ??
          computeAuditEventHash({
            event: eventPayload,
            prevHash,
          })

        await writeTrx.table('audit_events').insert({
          ...eventPayload,
          event_hash: eventHash,
          occurred_at: writeTrx.raw(
            "GREATEST(clock_timestamp(), COALESCE((SELECT MAX(occurred_at) + INTERVAL '1 microsecond' FROM audit_events), clock_timestamp()))"
          ),
        })

        const scopes = data.scopes ?? [
          { surface: 'system' as const, user_id: null, organization_id: null },
        ]
        if (scopes.length > 0) {
          await writeTrx.table('audit_event_scopes').insert(
            scopes.map((scope) => ({
              event_id: id,
              surface: scope.surface,
              user_id: scope.user_id,
              organization_id: scope.organization_id,
            }))
          )
        }
      }

      if (trx) {
        await persist(trx)
      } else {
        await db.transaction(persist)
      }
    } catch (error) {
      // Repositories never own failure policy. Higher boundaries decide
      // whether an audit is critical or best-effort; swallowing here makes
      // listeners and CreateAuditLog report false success.
      throw error
    }
  }

  async findMany(query: AuditLogQuery): Promise<{ data: AuditLogRecord[]; total: number }> {
    const page = query.page ?? 1
    const limit = query.limit ?? 50
    const offset = toOffset(page, limit)
    const baseQuery = this.applyFilter(db.from('audit_events'), query)

    const rows = (await baseQuery
      .clone()
      .orderBy('occurred_at', 'desc')
      .offset(offset)
      .limit(limit)) as AuditEventRow[]
    const totalResult = (await baseQuery.clone().count('* as count').first()) as
      | { count?: number | string }
      | undefined

    return {
      data: rows.map((row) => this.toRecord(row)),
      total: Number(totalResult?.count ?? 0),
    }
  }

  async count(query: AuditLogQuery): Promise<number> {
    const result = (await this.applyFilter(db.from('audit_events'), query)
      .count('* as count')
      .first()) as { count?: number | string } | undefined
    return Number(result?.count ?? 0)
  }

  async getLastActivityByUsers(
    entityType: string,
    entityId: string,
    userIds: string[]
  ): Promise<Map<string, Date | null>> {
    const result = new Map<string, Date | null>()
    if (userIds.length === 0) {
      return result
    }

    const rows = (await db
      .from('audit_events')
      .where('entity_type', entityType)
      .where('entity_id', entityId)
      .whereIn('user_id', userIds)
      .whereNotNull('user_id')
      .groupBy('user_id')
      .select('user_id')
      .max('occurred_at as last_active')) as {
      user_id: string
      last_active: Date | string | null
    }[]

    for (const row of rows) {
      result.set(row.user_id, row.last_active ? new Date(row.last_active) : null)
    }

    return result
  }

  private applyFilter(queryBuilder: ReturnType<typeof db.from>, query: AuditLogQuery) {
    let builder = queryBuilder

    if (query.user_id !== undefined) {
      builder = builder.where('user_id', query.user_id)
    }
    if (query.entity_type !== undefined) {
      builder = builder.where('entity_type', query.entity_type)
    }
    if (query.entity_id !== undefined) {
      builder = builder.where('entity_id', query.entity_id)
    }
    if (query.action !== undefined) {
      builder = builder.where('action', query.action)
    }
    if (query.from) {
      builder = builder.where('occurred_at', '>=', query.from)
    }
    if (query.to) {
      builder = builder.where('occurred_at', '<=', query.to)
    }

    return builder
  }

  private toRecord(row: AuditEventRow): AuditLogRecord {
    return {
      id: row.id,
      user_id: row.user_id,
      action: row.action,
      entity_type: row.entity_type,
      entity_id: row.entity_id,
      old_values: row.old_values,
      new_values: row.new_values,
      ip_address: row.ip_address,
      user_agent: row.user_agent,
      event_name: row.event_name,
      event_family: row.event_family,
      module: row.module,
      subsystem: row.subsystem,
      workflow: row.workflow,
      stage: row.stage,
      severity: row.severity,
      outcome: row.outcome,
      actor_type: row.actor_type,
      actor_user_id: row.actor_user_id,
      actor_org_id: row.actor_org_id,
      actor_role_surface: row.actor_role_surface,
      target_type: row.target_type,
      target_id: row.target_id,
      target_org_id: row.target_org_id,
      request_id: row.request_id,
      trace_id: row.trace_id,
      correlation_key: row.correlation_key,
      retention_class: row.retention_class,
      source_occurred_at: row.source_occurred_at ? new Date(row.source_occurred_at) : null,
      redaction_applied: row.redaction_applied,
      schema_version: row.schema_version,
      event_hash: row.event_hash,
      prev_hash: row.prev_hash,
      created_at: new Date(row.occurred_at),
    }
  }
}

