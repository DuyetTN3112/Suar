import { BaseModel, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { DatabaseId } from '#types/database'
import { OrganizationRole, OrganizationUserStatus } from '#constants/organization_constants'

/**
 * Model: OrganizationInvitation
 *
 * Quản lý lời mời tham gia tổ chức.
 * Bảng: organization_invitations
 */
export default class OrganizationInvitation extends BaseModel {
  static override table = 'organization_invitations'

  @column({ isPrimary: true })
  declare id: DatabaseId

  @column()
  declare organization_id: DatabaseId

  @column()
  declare email: string

  @column()
  declare org_role: string

  @column()
  declare invited_by: DatabaseId

  @column()
  declare token: string

  @column()
  declare status: string

  @column.dateTime()
  declare expires_at: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updated_at: DateTime

  // ─── Static Methods ──────────────────────────────────────

  /**
   * Kiểm tra đã tồn tại pending invitation chưa (chưa hết hạn)
   */
  static async hasPendingInvitation(
    organizationId: DatabaseId,
    email: string,
    trx?: TransactionClientContract
  ): Promise<boolean> {
    const query = trx ? this.query({ client: trx }) : this.query()
    const invitation = await query
      .where('organization_id', organizationId)
      .where('email', email)
      .where('status', OrganizationUserStatus.PENDING)
      .where('expires_at', '>', new Date())
      .first()
    return !!invitation
  }

  /**
   * Tạo invitation mới
   */
  static async createInvitation(
    data: {
      organization_id: DatabaseId
      email: string
      org_role?: string
      token?: string
      invited_by: DatabaseId
      expires_at?: Date
    },
    trx?: TransactionClientContract
  ): Promise<OrganizationInvitation> {
    const createData = {
      organization_id: String(data.organization_id),
      email: data.email,
      org_role: data.org_role ?? OrganizationRole.MEMBER,
      token: data.token ?? '',
      invited_by: String(data.invited_by),
      status: OrganizationUserStatus.PENDING,
    }
    if (trx) {
      return this.create(createData, { client: trx })
    }
    return this.create(createData)
  }
}
