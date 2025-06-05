import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { DatabaseId } from '#types/database'
import Organization from '#models/organization'
import NotFoundException from '#exceptions/not_found_exception'

/**
 * OrganizationRepository
 *
 * Data access for organizations.
 * Extracted from Organization model static methods.
 */
export default class OrganizationRepository {
  static async findActiveOrFail(orgId: DatabaseId, trx?: TransactionClientContract) {
    const query = trx ? Organization.query({ client: trx }) : Organization.query()
    const org = await query.where('id', orgId).whereNull('deleted_at').first()

    if (!org) {
      throw new NotFoundException('Organization không tồn tại')
    }
    return org
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

    const BusinessLogicException = (await import('#exceptions/business_logic_exception')).default
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
    const ProjectModel = (await import('#models/project')).default
    const query = trx ? ProjectModel.query({ client: trx }) : ProjectModel.query()
    const result = await query
      .where('organization_id', organizationId)
      .whereNull('deleted_at')
      .count('* as total')
    return Number((result[0] as any)?.$extras?.total ?? 0)
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

  static async findAllActiveBasicList(
    trx?: TransactionClientContract
  ): Promise<Organization[]> {
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
    const db = (await import('@adonisjs/lucid/services/db')).default
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

    const organizations = await query
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
      .offset(offset)

    return { data: organizations, total }
  }
}
