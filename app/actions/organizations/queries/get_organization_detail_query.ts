import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import redis from '@adonisjs/redis/services/main'
import Organization from '#models/organization'
import type { GetOrganizationDetailDTO } from '../dtos/get_organization_detail_dto.js'

/**
 * Query: Get Organization Detail
 *
 * Pattern: Detail query with optional includes (learned from Projects module)
 * Features:
 * - Permission check (user must be member)
 * - Optional includes: owner, stats, members_preview
 * - Redis caching (2-5 min TTL based on includes)
 *
 * @example
 * const query = new GetOrganizationDetailQuery(ctx)
 * const org = await query.execute(dto)
 */
export default class GetOrganizationDetailQuery {
  constructor(protected ctx: HttpContext) {}

  /**
   * Execute query: Get organization detail
   *
   * Steps:
   * 1. Check user is member
   * 2. Try Redis cache
   * 3. Get organization
   * 4. Load optional includes
   * 5. Cache result
   * 6. Return result
   */
  async execute(dto: GetOrganizationDetailDTO): Promise<unknown> {
    const user = this.ctx.auth.user!

    // 1. Check user is member of organization
    await this.checkMembership(dto.organizationId, user.id)

    // 2. Try cache first
    const cacheKey = dto.getCacheKey()
    const cached = await redis.get(cacheKey)
    if (cached) {
      return JSON.parse(cached)
    }

    // 3. Get organization
    const organization = await Organization.find(dto.organizationId)
    if (!organization) {
      throw new Error(`Organization with ID ${dto.organizationId} not found`)
    }

    const result: unknown = organization.toJSON()

    // 4. Load optional includes
    if (dto.includeOwner) {
      result.owner = await this.getOwner(organization.owner_id)
    }

    if (dto.includeStats) {
      result.stats = await this.getStats(dto.organizationId)
    }

    if (dto.includeMembersPreview) {
      result.members_preview = await this.getMembersPreview(
        dto.organizationId,
        dto.getMembersPreviewLimit()
      )
    }

    // 5. Cache result with dynamic TTL
    const cacheTTL = dto.getCacheTTL()
    await redis.setex(cacheKey, cacheTTL, JSON.stringify(result))

    return result
  }

  /**
   * Helper: Check if user is member of organization
   */
  private async checkMembership(organizationId: number, userId: number): Promise<void> {
    const membership = await db
      .from('organization_users')
      .where('organization_id', organizationId)
      .where('user_id', userId)
      .first()

    if (!membership) {
      throw new Error('You do not have permission to view this organization')
    }
  }

  /**
   * Helper: Get owner details
   */
  private async getOwner(ownerId: number): Promise<unknown> {
    const owner = await db.from('users').where('id', ownerId).select('id', 'email').first()

    return owner || null
  }

  /**
   * Helper: Get organization stats
   */
  private async getStats(organizationId: number): Promise<{
    member_count: number
    project_count: number
    task_count: number
  }> {
    const [memberCount, projectCount, taskCount] = await Promise.all([
      // Member count
      db
        .from('organization_users')
        .where('organization_id', organizationId)
        .count('* as count')
        .first(),
      // Project count
      db
        .from('projects')
        .where('organization_id', organizationId)
        .whereNull('deleted_at')
        .count('* as count')
        .first(),
      // Task count (from projects in this organization)
      db
        .from('tasks as t')
        .join('projects as p', 't.project_id', 'p.id')
        .where('p.organization_id', organizationId)
        .whereNull('t.deleted_at')
        .whereNull('p.deleted_at')
        .count('* as count')
        .first(),
    ])

    return {
      member_count: Number(memberCount?.count || 0),
      project_count: Number(projectCount?.count || 0),
      task_count: Number(taskCount?.count || 0),
    }
  }

  /**
   * Helper: Get members preview (first N members)
   */
  private async getMembersPreview(organizationId: number, limit: number): Promise<unknown[]> {
    const members = await db
      .from('organization_users as ou')
      .join('users as u', 'ou.user_id', 'u.id')
      .where('ou.organization_id', organizationId)
      .select('u.id', 'u.email', 'ou.role_id', 'ou.created_at as joined_at')
      .orderBy('ou.role_id', 'asc') // Owner first
      .limit(limit)

    return members
  }
}
