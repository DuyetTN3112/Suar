import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { DatabaseId } from '#types/database'
import { OrganizationUserStatus } from '#constants/organization_constants'
import User from '#models/user'
import Organization from '#models/organization'

/**
 * Model: OrganizationJoinRequest
 *
 * Quản lý yêu cầu tham gia tổ chức.
 * Bảng: organization_join_requests
 */
export default class OrganizationJoinRequest extends BaseModel {
  static override table = 'organization_join_requests'

  @column({ isPrimary: true })
  declare id: DatabaseId

  @column()
  declare organization_id: DatabaseId

  @column()
  declare user_id: DatabaseId

  @column()
  declare message: string

  @column()
  declare status: OrganizationUserStatus

  @column()
  declare processed_by: DatabaseId | null

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updated_at: DateTime

  @column.dateTime()
  declare deleted_at: DateTime | null

  @belongsTo(() => User, {
    foreignKey: 'user_id',
  })
  declare user: BelongsTo<typeof User>

  @belongsTo(() => Organization, {
    foreignKey: 'organization_id',
  })
  declare organization: BelongsTo<typeof Organization>

  // ─── Static Methods ──────────────────────────────────────

  /**
   * Tìm join request theo ID
   */
  static async findByIdOrFail(
    requestId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<OrganizationJoinRequest> {
    const query = trx ? this.query({ client: trx }) : this.query()
    const request = await query.where('id', requestId).first()
    if (!request) {
      const mod = await import('#exceptions/not_found_exception')
      throw mod.default.resource('Yêu cầu tham gia', requestId)
    }
    return request
  }

  /**
   * Kiểm tra đã tồn tại pending request chưa
   */
  static async hasPendingRequest(
    organizationId: DatabaseId,
    userId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<boolean> {
    const query = trx ? this.query({ client: trx }) : this.query()
    const request = await query
      .where('organization_id', organizationId)
      .where('user_id', userId)
      .where('status', OrganizationUserStatus.PENDING)
      .first()
    return !!request
  }

  /**
   * Tạo join request mới
   */
  static async createRequest(
    data: {
      organization_id: DatabaseId
      user_id: DatabaseId
      message?: string
    },
    trx?: TransactionClientContract
  ): Promise<OrganizationJoinRequest> {
    const createData = {
      organization_id: String(data.organization_id),
      user_id: String(data.user_id),
      message: data.message ?? '',
      status: OrganizationUserStatus.PENDING,
    }
    if (trx) {
      return this.create(createData, { client: trx })
    }
    return this.create(createData)
  }

  /**
   * Cập nhật status của join request
   */
  static async updateStatus(
    requestId: DatabaseId,
    updateData: Record<string, unknown>,
    trx?: TransactionClientContract
  ): Promise<void> {
    const query = trx ? this.query({ client: trx }) : this.query()
    await query.where('id', requestId).update({
      ...updateData,
      updated_at: new Date(),
    })
  }

  /**
   * Lấy danh sách pending requests cho organization (kèm user info)
   */
  static async getPendingByOrganization(
    organizationId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<OrganizationJoinRequest[]> {
    const query = trx ? this.query({ client: trx }) : this.query()
    return query
      .where('organization_id', organizationId)
      .where('status', OrganizationUserStatus.PENDING)
      .whereNull('deleted_at')
      .preload('user', (q) => {
        void q.select(['id', 'username', 'email'])
      })
      .preload('organization', (q) => {
        void q.select(['id', 'name'])
      })
      .orderBy('created_at', 'desc')
  }
}
