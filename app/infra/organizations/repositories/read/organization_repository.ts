import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import NotFoundException from '#exceptions/not_found_exception'
import { OrganizationInfraMapper } from '#infra/organizations/mapper/organization_infra_mapper'
import Organization from '#infra/organizations/models/organization'
import type { DatabaseId } from '#types/database'
import type { OrganizationRecord } from '#types/organization_records'

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null
}

const toNullableString = (value: unknown): string | null => {
  return typeof value === 'string' ? value : null
}

const toDateValue = (value: unknown): Date => {
  if (value instanceof Date) {
    return value
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? new Date(0) : date
  }
  return new Date(0)
}

/**
 * OrganizationRepository
 *
 * Data access for organizations.
 * Extracted from Organization model static methods.
 */
export default class OrganizationRepository {
  // Keep one instance member so this is not a static-only utility class.
  isReady(): true {
    return true
  }

  static async findActiveOrFail(orgId: DatabaseId, trx?: TransactionClientContract) {
    const query = trx ? Organization.query({ client: trx }) : Organization.query()
    const org = await query.where('id', orgId).whereNull('deleted_at').first()

    if (!org) {
      throw new NotFoundException('Organization không tồn tại')
    }
    return org
  }

  static async findActiveOrFailRecord(
    orgId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<OrganizationRecord> {
    const organization = await this.findActiveOrFail(orgId, trx)
    return OrganizationInfraMapper.toRecord(organization)
  }

  static async existsActive(orgId: DatabaseId, trx?: TransactionClientContract): Promise<boolean> {
    try {
      await this.findActiveOrFail(orgId, trx)
      return true
    } catch {
      return false
    }
  }

  static async slugExists(slug: string, trx?: TransactionClientContract): Promise<boolean> {
    const query = trx ? Organization.query({ client: trx }) : Organization.query()
    const org = await query.where('slug', slug).whereNull('deleted_at').first()
    return !!org
  }

  static async findById(
    orgId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<Organization | null> {
    if (trx) {
      return Organization.query({ client: trx }).where('id', orgId).first()
    }
    return Organization.find(orgId)
  }

  static async findAllActive(trx?: TransactionClientContract): Promise<Organization[]> {
    const query = trx ? Organization.query({ client: trx }) : Organization.query()
    return query.whereNull('deleted_at').orderBy('id', 'asc')
  }

  static async findBasicInfo(
    orgId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<Organization | null> {
    const query = trx ? Organization.query({ client: trx }) : Organization.query()
    return query.where('id', orgId).whereNull('deleted_at').select('id', 'name').first()
  }

  static async findAllActiveBasicList(trx?: TransactionClientContract): Promise<Organization[]> {
    const query = trx ? Organization.query({ client: trx }) : Organization.query()
    return query
      .whereNull('deleted_at')
      .orderBy('id', 'asc')
      .select('id', 'name', 'description', 'logo', 'website')
  }

  static async findActiveByIds(
    orgIds: DatabaseId[],
    columns: string[] = ['id', 'name'],
    trx?: TransactionClientContract
  ): Promise<Organization[]> {
    if (orgIds.length === 0) return []
    const query = trx ? Organization.query({ client: trx }) : Organization.query()
    return query.whereIn('id', orgIds).whereNull('deleted_at').select(columns)
  }

  static async hasAnyActivePartnerByIds(
    orgIds: DatabaseId[],
    trx?: TransactionClientContract
  ): Promise<boolean> {
    if (orgIds.length === 0) {
      return false
    }

    const query = trx ? Organization.query({ client: trx }) : Organization.query()
    const organization = await query.whereIn('id', orgIds).where('partner_is_active', true).first()

    return !!organization
  }

  static async paginateByUser(
    userId: DatabaseId,
    options: {
      page: number
      limit: number
      search?: string
      sortColumn?: string
      sortDirection?: 'asc' | 'desc'
    },
    trx?: TransactionClientContract
  ): Promise<{
    data: {
      id: string
      name: string
      slug: string
      description: string | null
      logo: string | null
      website: string | null
      owner_id: string
      created_at: Date
      updated_at: Date
    }[]
    total: number
  }> {
    const dbModule = await import('@adonisjs/lucid/services/db')
    const db = dbModule.default
    const baseDb = trx ?? db

    const query = baseDb
      .from('organizations as o')
      .join('organization_users as ou', 'o.id', 'ou.organization_id')
      .where('ou.user_id', userId)
      .whereNull('o.deleted_at')

    if (options.search) {
      const search = options.search
      void query.where((builder) => {
        void builder
          .where('o.name', 'like', `%${search}%`)
          .orWhere('o.description', 'like', `%${search}%`)
      })
    }

    const countQuery = query.clone().clearSelect().count('* as total')
    const countResult = (await countQuery.first()) as {
      total?: number | string
    } | null
    const total = Number(countResult?.total ?? 0)

    const sortColumn = options.sortColumn ?? 'o.created_at'
    const sortDirection = options.sortDirection ?? 'desc'
    const offset = (options.page - 1) * options.limit

    const organizationsRaw = (await query
      .select(
        'o.id',
        'o.name',
        'o.slug',
        'o.description',
        'o.logo',
        'o.website',
        'o.owner_id',
        'o.created_at',
        'o.updated_at'
      )
      .orderBy(sortColumn, sortDirection)
      .limit(options.limit)
      .offset(offset)) as unknown

    const organizations = Array.isArray(organizationsRaw)
      ? organizationsRaw.filter(isRecord).map((row) => ({
          id: typeof row.id === 'string' ? row.id : '',
          name: typeof row.name === 'string' ? row.name : '',
          slug: typeof row.slug === 'string' ? row.slug : '',
          description: toNullableString(row.description),
          logo: toNullableString(row.logo),
          website: toNullableString(row.website),
          owner_id: typeof row.owner_id === 'string' ? row.owner_id : '',
          created_at: toDateValue(row.created_at),
          updated_at: toDateValue(row.updated_at),
        }))
      : []

    return { data: organizations, total }
  }
}
