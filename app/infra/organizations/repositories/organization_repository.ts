import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { DatabaseId } from '#types/database'
import Organization from '#models/organization'
import NotFoundException from '#exceptions/not_found_exception'

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

  static async findActiveForUpdate(orgId: DatabaseId, trx: TransactionClientContract) {
    return Organization.query({ client: trx })
      .where('id', orgId)
      .whereNull('deleted_at')
      .forUpdate()
      .firstOrFail()
  }

  static async create(
    data: Partial<Organization>,
    trx?: TransactionClientContract
  ): Promise<Organization> {
    return Organization.create(data, trx ? { client: trx } : undefined)
  }

  static async save(
    organization: Organization,
    trx?: TransactionClientContract
  ): Promise<Organization> {
    if (trx) {
      organization.useTransaction(trx)
    }
    await organization.save()
    return organization
  }

  static async hardDelete(
    organization: Organization,
    trx?: TransactionClientContract
  ): Promise<void> {
    if (trx) {
      organization.useTransaction(trx)
    }
    await organization.delete()
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

  /**
   * Generate a unique slug by appending incrementing counter.
   * Contains business logic (loop + exception throwing).
   */
  static async getUniqueSlug(baseSlug: string, trx?: TransactionClientContract): Promise<string> {
    let slug = baseSlug

    for (let counter = 1; counter <= 1000; counter++) {
      const exists = await this.slugExists(slug, trx)
      if (!exists) return slug
      slug = `${baseSlug}-${String(counter)}`
    }

    const exceptionModule = await import('#exceptions/business_logic_exception')
    const BusinessLogicException = exceptionModule.default
    throw new BusinessLogicException('Không thể tạo slug unique')
  }

  /**
   * Count active projects in an organization.
   * Cross-model query (reads Project).
   */
  static async countActiveProjects(
    organizationId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<number> {
    const projectModule = await import('#models/project')
    const ProjectModel = projectModule.default
    const query = trx ? ProjectModel.query({ client: trx }) : ProjectModel.query()
    const result = await query
      .where('organization_id', organizationId)
      .whereNull('deleted_at')
      .count('* as total')
    const firstResult = result[0] as unknown
    if (!isRecord(firstResult) || !isRecord(firstResult.$extras)) {
      return 0
    }
    return toNumberValue(firstResult.$extras.total)
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
      .select('id', 'name', 'description', 'logo', 'website', 'plan')
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
    const organization = await query
      .whereIn('id', orgIds)
      .where('partner_is_active', true)
      .first()

    return !!organization
  }

  static async paginateByUser(
    userId: DatabaseId,
    options: {
      page: number
      limit: number
      search?: string
      plan?: string
      sortColumn?: string
      sortDirection?: 'asc' | 'desc'
    },
    trx?: TransactionClientContract
  ): Promise<{
    data: Array<{
      id: string
      name: string
      slug: string
      description: string | null
      logo: string | null
      website: string | null
      plan: string
      owner_id: string
      created_at: Date
      updated_at: Date
    }>
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

    if (options.plan) {
      void query.where('o.plan', options.plan)
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
        'o.plan',
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
          plan: typeof row.plan === 'string' ? row.plan : 'free',
          owner_id: typeof row.owner_id === 'string' ? row.owner_id : '',
          created_at: toDateValue(row.created_at),
          updated_at: toDateValue(row.updated_at),
        }))
      : []

    return { data: organizations, total }
  }
}
