/**
 * Cross-domain admin aggregation boundary.
 *
 * This file may compose admin read models across domains, but it must not import
 * module-private infra paths. Prefer module public APIs or SQL projections for
 * joined dashboard reads.
 */
import db from '@adonisjs/lucid/services/db'

import type {
  AdminOrganizationFilters,
  AdminOrganizationRecord,
  AdminOrganizationRepository,
  AdminOrganizationStats,
} from '#modules/admin/organizations/actions/ports/outbound/admin_operational_repository'

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null
}

const toNumberValue = (value: unknown): number => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0
  }
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

const toIsoTimestamp = (value: unknown): string => {
  if (value instanceof Date) {
    return value.toISOString()
  }
  if (typeof value === 'string') {
    const parsed = new Date(value)
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString()
    }
  }
  return new Date(0).toISOString()
}

const toOrganizationProjection = (value: unknown): AdminOrganizationRecord | null => {
  if (!isRecord(value)) {
    return null
  }

  const ownerId = value['owner_user_id']
  const ownerUsername = value['owner_username']
  const ownerEmail = value['owner_email']

  if (
    typeof value['id'] !== 'string' ||
    typeof value['name'] !== 'string' ||
    typeof value['slug'] !== 'string' ||
    typeof value['owner_id'] !== 'string' ||
    typeof ownerId !== 'string' ||
    typeof ownerUsername !== 'string' ||
    (typeof ownerEmail !== 'string' && ownerEmail !== null)
  ) {
    return null
  }

  const description = value['description']
  const partnerType = value['partner_type']
  const partnerIsActive = value['partner_is_active']

  return {
    id: value['id'],
    name: value['name'],
    slug: value['slug'],
    description: typeof description === 'string' ? description : null,
    ownerId: value['owner_id'],
    owner: {
      id: ownerId,
      username: ownerUsername,
      email: ownerEmail,
    },
    partnerType: typeof partnerType === 'string' ? partnerType : null,
    partnerIsActive: typeof partnerIsActive === 'boolean' ? partnerIsActive : false,
    createdAt: toIsoTimestamp(value['created_at']),
    updatedAt: toIsoTimestamp(value['updated_at']),
    usersCount: toNumberValue(value['users_count']),
    projectsCount: toNumberValue(value['projects_count']),
  }
}

const organizationProjectionQuery = () => {
  return db
    .from('organizations as organization')
    .leftJoin('users as owner', 'owner.id', 'organization.owner_id')
    .select(
      'organization.id',
      'organization.name',
      'organization.slug',
      'organization.description',
      'organization.owner_id',
      'organization.partner_type',
      'organization.partner_is_active',
      'organization.created_at',
      'organization.updated_at',
      'owner.id as owner_user_id',
      'owner.username as owner_username',
      'owner.email as owner_email',
      db.raw(
        '(SELECT COUNT(*) FROM organization_users AS member WHERE member.organization_id = organization.id) AS users_count'
      ),
      db.raw(
        '(SELECT COUNT(*) FROM projects AS project WHERE project.organization_id = organization.id) AS projects_count'
      )
    )
}

export const AdminOrganizationReadOps: AdminOrganizationRepository = {
  async listOrganizations(
    filters: AdminOrganizationFilters,
    page: number,
    perPage: number
  ) {
    const query = organizationProjectionQuery()

    const search = filters.search
    if (search) {
      void query.where((q) => {
        void q
          .where('organization.name', 'ilike', `%${search}%`)
          .orWhere('organization.slug', 'ilike', `%${search}%`)
      })
    }

    if (filters.partnerType) {
      void query.where('organization.partner_type', filters.partnerType)
    }

    if (filters.organizationIds && filters.organizationIds.length > 0) {
      void query.whereIn('organization.id', filters.organizationIds)
      const rankByOrganizationId = filters.organizationIds
        .map(
          (organizationId, index) =>
            `WHEN organization.id = '${organizationId}' THEN ${String(index)}`
        )
        .join(' ')
      void query.orderByRaw(
        `CASE ${rankByOrganizationId} ELSE ${String(filters.organizationIds.length)} END ASC`
      )
    } else {
      void query.orderBy('organization.created_at', 'desc')
      void query.orderBy('organization.id', 'desc')
    }
    const result = await query.paginate(page, perPage)
    const rowsRaw: unknown = result.all()
    const organizations = Array.isArray(rowsRaw)
      ? rowsRaw
          .map((row) => toOrganizationProjection(row))
          .filter((row): row is AdminOrganizationRecord => row !== null)
      : []

    return {
      organizations,
      total: result.total,
    }
  },

  async getOrganizationStats(): Promise<AdminOrganizationStats> {
    const now = new Date()
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const statsResults = (await Promise.all([
      db.from('organizations').count('* as total').whereNull('deleted_at').first(),
      db
        .from('organizations')
        .count('* as total')
        .where('created_at', '>=', firstDayOfMonth)
        .whereNull('deleted_at')
        .first(),
    ])) as unknown[]

    const total = statsResults[0]
    const newThisMonth = statsResults[1]

    return {
      total: isRecord(total) ? toNumberValue(total['total']) : 0,
      newThisMonth: isRecord(newThisMonth) ? toNumberValue(newThisMonth['total']) : 0,
    }
  },

  async findById(orgId: string): Promise<AdminOrganizationRecord | null> {
    const rowRaw: unknown = await organizationProjectionQuery()
      .where('organization.id', orgId)
      .first()
    return toOrganizationProjection(rowRaw)
  },
}
