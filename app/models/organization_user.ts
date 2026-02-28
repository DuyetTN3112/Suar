import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { DatabaseId } from '#types/database'
import { OrganizationRole, OrganizationUserStatus } from '#constants/organization_constants'
import User from './user.js'
import Organization from './organization.js'

// Class chứa thông tin quan hệ giữa User và Organization
export default class OrganizationUser extends BaseModel {
  static override table = 'organization_users'

  // Composite Primary Key
  @column({ isPrimary: true })
  declare organization_id: string

  @column({ isPrimary: true })
  declare user_id: string

  /**
   * v3.0: Inline org_role VARCHAR — replaces role_id UUID → organization_roles table
   * CHECK: 'org_owner', 'org_admin', 'org_member'
   */
  @column()
  declare org_role: string

  @column()
  declare status: OrganizationUserStatus

  @column()
  declare invited_by: string | null

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updated_at: DateTime

  @belongsTo(() => User, {
    foreignKey: 'user_id',
  })
  declare user: BelongsTo<typeof User>

  @belongsTo(() => Organization, {
    foreignKey: 'organization_id',
  })
  declare organization: BelongsTo<typeof Organization>

  @belongsTo(() => User, {
    foreignKey: 'invited_by',
  })
  declare inviter: BelongsTo<typeof User>

  // ===== Instance Helpers =====

  isApproved(): boolean {
    return this.status === 'approved'
  }

  isPending(): boolean {
    return this.status === 'pending'
  }

  // ===== Static Methods (Fat Model) =====

  /**
   * Tìm membership giữa user và organization
   */
  static async findMembership(
    organizationId: DatabaseId,
    userId: DatabaseId,
    trx?: TransactionClientContract
  ) {
    const query = trx ? this.query({ client: trx }) : this.query()
    return query.where('organization_id', organizationId).where('user_id', userId).first()
  }

  /**
   * Tìm membership hoặc throw error
   */
  static async findMembershipOrFail(
    organizationId: DatabaseId,
    userId: DatabaseId,
    trx?: TransactionClientContract
  ) {
    const query = trx ? this.query({ client: trx }) : this.query()
    return query.where('organization_id', organizationId).where('user_id', userId).firstOrFail()
  }

  /**
   * Kiểm tra user có phải là approved member của org không
   */
  static async isApprovedMember(
    userId: DatabaseId,
    organizationId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<boolean> {
    const query = trx ? this.query({ client: trx }) : this.query()
    const membership = await query
      .where('organization_id', organizationId)
      .where('user_id', userId)
      .where('status', 'approved')
      .first()
    return !!membership
  }

  /**
   * v3.0: Check org_role directly — no preload needed
   */
  static async isOrgAdminOrOwner(
    userId: DatabaseId,
    organizationId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<boolean> {
    const query = trx ? this.query({ client: trx }) : this.query()
    const membership = await query
      .where('organization_id', organizationId)
      .where('user_id', userId)
      .where('status', 'approved')
      .whereIn('org_role', [OrganizationRole.OWNER, OrganizationRole.ADMIN])
      .first()

    return !!membership
  }

  /**
   * Validate tất cả userIds đều là approved members của org
   * Trả về true nếu tất cả đều hợp lệ
   */
  static async validateAllApprovedMembers(
    userIds: DatabaseId[],
    organizationId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<boolean> {
    if (userIds.length === 0) return true
    const query = trx ? this.query({ client: trx }) : this.query()
    const members = await query
      .whereIn('user_id', userIds)
      .where('organization_id', organizationId)
      .where('status', 'approved')
      .select('user_id')
    return members.length === userIds.length
  }

  /**
   * Tìm approved member hoặc throw error
   */
  static async findApprovedMemberOrFail(
    organizationId: DatabaseId,
    userId: DatabaseId,
    trx?: TransactionClientContract
  ) {
    const query = trx ? this.query({ client: trx }) : this.query()
    const membership = await query
      .where('organization_id', organizationId)
      .where('user_id', userId)
      .where('status', 'approved')
      .first()
    if (!membership) {
      const mod = await import('#exceptions/business_logic_exception')
      throw new mod.default('Thành viên không thuộc tổ chức hoặc chưa được duyệt')
    }
    return membership
  }

  /**
   * Kiểm tra user có membership trong org không (bất kể status)
   */
  static async hasMembership(
    organizationId: DatabaseId,
    userId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<boolean> {
    const query = trx ? this.query({ client: trx }) : this.query()
    const membership = await query
      .where('organization_id', organizationId)
      .where('user_id', userId)
      .first()
    return !!membership
  }

  /**
   * v3.0: Cập nhật org_role của user trong org
   */
  static async updateRole(
    organizationId: DatabaseId,
    userId: DatabaseId,
    orgRole: string,
    trx?: TransactionClientContract
  ): Promise<void> {
    const query = trx ? this.query({ client: trx }) : this.query()
    await query
      .where('organization_id', organizationId)
      .where('user_id', userId)
      .update({ org_role: orgRole, updated_at: new Date() })
  }

  /**
   * v3.0: Get org_role directly — no preload needed
   */
  static async getMemberRoleName(
    organizationId: DatabaseId,
    userId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<string | null> {
    const query = trx ? this.query({ client: trx }) : this.query()
    const membership = await query
      .where('organization_id', organizationId)
      .where('user_id', userId)
      .where('status', 'approved')
      .first()
    return membership?.org_role ?? null
  }

  /**
   * Kiểm tra user có là member của org không (bất kể status, whereNull deleted_at)
   * Dùng cho các query check quyền cơ bản
   */
  static async isMember(
    userId: DatabaseId,
    organizationId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<boolean> {
    const query = trx ? this.query({ client: trx }) : this.query()
    const membership = await query
      .where('organization_id', organizationId)
      .where('user_id', userId)
      .first()
    return !!membership
  }

  /**
   * v3.0: Check admin/owner by org_role string
   */
  static async isAdminOrOwnerByRoleId(
    userId: DatabaseId,
    organizationId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<boolean> {
    const query = trx ? this.query({ client: trx }) : this.query()
    const membership = await query
      .where('organization_id', organizationId)
      .where('user_id', userId)
      .whereIn('org_role', [OrganizationRole.OWNER, OrganizationRole.ADMIN])
      .first()
    return !!membership
  }

  /**
   * v3.0: Get org_role of user in org (null nếu không là member)
   */
  static async getOrgRole(
    userId: DatabaseId,
    organizationId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<string | null> {
    const query = trx ? this.query({ client: trx }) : this.query()
    const membership = await query
      .where('organization_id', organizationId)
      .where('user_id', userId)
      .first()
    return membership?.org_role ?? null
  }

  /**
   * Xóa member khỏi organization
   */
  static async deleteMember(
    organizationId: DatabaseId,
    userId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<void> {
    const query = trx ? this.query({ client: trx }) : this.query()
    await query.where('organization_id', organizationId).where('user_id', userId).delete()
  }

  /**
   * Cập nhật status của membership
   */
  static async updateStatus(
    organizationId: DatabaseId,
    userId: DatabaseId,
    status: 'pending' | 'approved' | 'rejected',
    trx?: TransactionClientContract
  ): Promise<number> {
    const query = trx ? this.query({ client: trx }) : this.query()
    const result = await query
      .where('organization_id', organizationId)
      .where('user_id', userId)
      .update({ status, updated_at: new Date() })
    return Array.isArray(result) ? result.length : Number(result)
  }

  /**
   * Đếm số members trong organization
   */
  static async countMembers(
    organizationId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<number> {
    const query = trx ? this.query({ client: trx }) : this.query()
    const result = await query.where('organization_id', organizationId).count('* as total')
    return Number((result[0] as any)?.$extras?.total ?? 0)
  }

  /**
   * Lấy danh sách members preview (top N members) với user info
   */
  static async getMembersPreview(
    organizationId: DatabaseId,
    limit: number,
    trx?: TransactionClientContract
  ): Promise<OrganizationUser[]> {
    const query = trx ? this.query({ client: trx }) : this.query()
    return query
      .where('organization_id', organizationId)
      .preload('user', (q) => {
        void q.select(['id', 'email'])
      })
      .orderByRaw(`CASE org_role WHEN '${OrganizationRole.OWNER}' THEN 1 WHEN '${OrganizationRole.ADMIN}' THEN 2 ELSE 3 END ASC`)
      .limit(limit)
  }

  /**
   * Đếm members theo nhiều org IDs (batch count)
   * Return: Map<orgId, count>
   */
  static async countMembersByOrgIds(
    orgIds: DatabaseId[],
    trx?: TransactionClientContract
  ): Promise<Map<string, number>> {
    if (orgIds.length === 0) return new Map()
    const query = trx ? this.query({ client: trx }) : this.query()
    const results = await query
      .whereIn('organization_id', orgIds)
      .select('organization_id')
      .count('* as total')
      .groupBy('organization_id')
    const map = new Map<string, number>()
    for (const row of results) {
      map.set(String(row.organization_id), Number((row as any).$extras?.total ?? 0))
    }
    return map
  }

  /**
   * v3.0: Thêm member vào organization — dùng org_role string
   */
  static async addMember(
    data: {
      organization_id: DatabaseId
      user_id: DatabaseId
      org_role: string
      status?: OrganizationUserStatus
    },
    trx?: TransactionClientContract
  ): Promise<OrganizationUser> {
    return this.create(
      {
        organization_id: String(data.organization_id),
        user_id: String(data.user_id),
        org_role: data.org_role,
        status: data.status ?? OrganizationUserStatus.APPROVED,
      },
      trx ? { client: trx } : undefined
    )
  }

  /**
   * v3.0: Paginate members — no JOIN to roles table, read org_role directly
   */
  static async paginateMembers(
    organizationId: DatabaseId,
    options: {
      page: number
      limit: number
      orgRole?: string
      search?: string
    },
    trx?: TransactionClientContract
  ): Promise<{
    data: Array<{
      user_id: string
      org_role: string
      status: string
      created_at: DateTime
      user: {
        id: string
        username: string
        email: string | null
        status: string
      }
    }>
    total: number
  }> {
    const db = (await import('@adonisjs/lucid/services/db')).default
    const baseDb = trx ?? db

    const query = baseDb
      .from('organization_users as ou')
      .where('ou.organization_id', organizationId)
      .join('users as u', 'ou.user_id', 'u.id')
      .select(
        'ou.user_id',
        'ou.org_role',
        'ou.status',
        'ou.created_at',
        'u.username',
        'u.email',
        'u.status as user_status'
      )

    // Apply filters
    if (options.orgRole) {
      void query.where('ou.org_role', options.orgRole)
    }

    if (options.search) {
      const searchTerm = options.search
      void query.where((searchQuery) => {
        void searchQuery
          .whereILike('u.username', `%${searchTerm}%`)
          .orWhereILike('u.email', `%${searchTerm}%`)
      })
    }

    // Count total
    const countQuery = query.clone()
    const countResult = await countQuery.count('* as count')
    const total = Number(countResult[0]?.count ?? 0)

    // Apply pagination with org_role ordering
    const offset = (options.page - 1) * options.limit
    void query
      .orderByRaw(`CASE ou.org_role WHEN '${OrganizationRole.OWNER}' THEN 1 WHEN '${OrganizationRole.ADMIN}' THEN 2 ELSE 3 END ASC`)
      .limit(options.limit)
      .offset(offset)

    const members = await query

    return {
      data: members.map((m: any) => ({
        user_id: m.user_id,
        org_role: m.org_role,
        status: m.status,
        created_at: m.created_at,
        user: {
          id: m.user_id,
          username: m.username,
          email: m.email,
          status: m.user_status,
        },
      })),
      total,
    }
  }
}

// Tạo alias cho export default để có thể import cả trực tiếp và destructuring
export { OrganizationUser }
