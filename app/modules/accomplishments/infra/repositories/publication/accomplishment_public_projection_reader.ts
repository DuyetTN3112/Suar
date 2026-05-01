import db from '@adonisjs/lucid/services/db'

import type {
  AccomplishmentPublicProjectionPage,
  AccomplishmentPublicProjectionReader,
} from '#modules/accomplishments/actions/ports/outbound/publication/accomplishment_public_projection_reader'
import {
  parseAccomplishmentPublicProjectionV1,
  type AccomplishmentPublicProjectionV1,
} from '#modules/accomplishments/public_contracts/publication/accomplishment_public_projection_v1'
import PersistedDataIntegrityException from '#modules/errors/public_contracts/persisted_data_integrity_exception'

const TABLE = 'accomplishment_public_projections'
const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100

interface ProjectionRow {
  id: string
  public_payload: unknown
  retired_at: Date | string | null
}

function requireUuid(value: string, field: string): string {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new TypeError(`${field} must be a UUID`)
  }
  return value
}

function limit(value: number | undefined): number {
  const resolved = value ?? DEFAULT_LIMIT
  if (!Number.isSafeInteger(resolved) || resolved < 1 || resolved > MAX_LIMIT) {
    throw new RangeError(`Accomplishment projection limit must be between 1 and ${MAX_LIMIT}`)
  }
  return resolved
}

function cursor(value: string | undefined): number {
  if (value === undefined) return 0
  const parsed = Number(value)
  if (!Number.isSafeInteger(parsed) || parsed < 0) throw new RangeError('Invalid accomplishment cursor')
  return parsed
}

function parseRow(row: ProjectionRow): AccomplishmentPublicProjectionV1 {
  if (row.retired_at !== null) {
    throw new PersistedDataIntegrityException('Retired accomplishment projection was selected', {
      projectionId: row.id,
    })
  }
  const projection = parseAccomplishmentPublicProjectionV1(row.public_payload)
  if (projection.id !== row.id) {
    throw new PersistedDataIntegrityException('Accomplishment projection payload identity mismatch', {
      projectionId: row.id,
    })
  }
  return projection
}

export class AccomplishmentPublicProjectionRepository
  implements AccomplishmentPublicProjectionReader
{
  async findActiveById(id: string): Promise<AccomplishmentPublicProjectionV1 | null> {
    const row = (await db
      .from(TABLE)
      .where('id', requireUuid(id, 'projection id'))
      .whereNull('retired_at')
      .first()) as ProjectionRow | undefined
    return row ? parseRow(row) : null
  }

  async listActiveForUser(input: {
    readonly userId: string
    readonly limit: number
    readonly cursor?: string
  }): Promise<AccomplishmentPublicProjectionPage> {
    const pageSize = limit(input.limit)
    const offset = cursor(input.cursor)
    const rows = (await db
      .from(TABLE)
      .where('user_id', requireUuid(input.userId, 'user id'))
      .whereNull('retired_at')
      .orderBy('published_at', 'desc')
      .orderBy('id', 'desc')
      .offset(offset)
      .limit(pageSize + 1)) as ProjectionRow[]
    const hasMore = rows.length > pageSize
    const items = rows.slice(0, pageSize).map(parseRow)
    return { items, nextCursor: hasMore ? String(offset + pageSize) : null }
  }
}

export const accomplishmentPublicProjectionReader =
  new AccomplishmentPublicProjectionRepository()
