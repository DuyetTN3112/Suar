import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

import { OrganizationUserStatus } from '#modules/organizations/access/public_contracts/organization_constants'
import Organization from '#modules/organizations/directory/infra/models/organization'

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

  @belongsTo(() => Organization, {
    foreignKey: 'organization_id',
  })
  declare organization: BelongsTo<typeof Organization>

  // ===== Instance Helpers =====

  isApproved(): boolean {
    return this.status === OrganizationUserStatus.APPROVED
  }

  isPending(): boolean {
    return this.status === OrganizationUserStatus.PENDING
  }
}

// Tạo alias cho export default để có thể import cả trực tiếp và destructuring
export { OrganizationUser }
