import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from './user.js'
import Organization from './organization.js'
import OrganizationRole from './organization_role.js'

// Class chứa thông tin quan hệ giữa User và Organization
export default class OrganizationUser extends BaseModel {
  static override table = 'organization_users'

  // Composite Primary Key
  @column({ isPrimary: true })
  declare organization_id: number

  @column({ isPrimary: true })
  declare user_id: number

  @column()
  declare role_id: number

  @column()
  declare status: 'pending' | 'approved' | 'rejected'

  @column()
  declare invited_by: number | null

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

  @belongsTo(() => OrganizationRole, {
    foreignKey: 'role_id',
  })
  declare organization_role: BelongsTo<typeof OrganizationRole>

  // Helper methods
  isApproved(): boolean {
    return this.status === 'approved'
  }

  isPending(): boolean {
    return this.status === 'pending'
  }

  // Static helper methods for composite key queries
  static async findMembership(organizationId: number, userId: number) {
    return await this.query()
      .where('organization_id', organizationId)
      .where('user_id', userId)
      .first()
  }

  static async findMembershipOrFail(organizationId: number, userId: number) {
    return await this.query()
      .where('organization_id', organizationId)
      .where('user_id', userId)
      .firstOrFail()
  }
}

// Tạo alias cho export default để có thể import cả trực tiếp và destructuring
export { OrganizationUser }
