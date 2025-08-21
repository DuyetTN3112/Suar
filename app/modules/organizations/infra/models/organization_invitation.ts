import { BaseModel, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'


/**
 * Model: OrganizationInvitation
 *
 * Quản lý lời mời tham gia tổ chức.
 * Bảng: organization_invitations
 */
export default class OrganizationInvitation extends BaseModel {
  static override table = 'organization_invitations'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organization_id: string

  @column()
  declare email: string

  @column()
  declare org_role: string

  @column()
  declare invited_by: string

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
}
