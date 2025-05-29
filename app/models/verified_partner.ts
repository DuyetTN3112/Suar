import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Organization from './organization.js'
import User from './user.js'

/**
 * Model: VerifiedPartner
 * Table: verified_partners
 * Mô tả: Organizations đã được verify là Partner
 */
export default class VerifiedPartner extends BaseModel {
    static override table = 'verified_partners'

    @column({ isPrimary: true })
    declare id: number

    @column()
    declare organization_id: number

    @column()
    declare partner_type: 'gold' | 'silver' | 'bronze'

    @column.dateTime()
    declare verified_at: DateTime | null

    @column()
    declare verified_by: number // Admin đã verify

    @column()
    declare verification_proof: string | null

    @column.dateTime()
    declare expires_at: DateTime | null

    @column()
    declare is_active: boolean

    @column.dateTime({ autoCreate: true })
    declare created_at: DateTime

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    declare updated_at: DateTime

    // Relations
    @belongsTo(() => Organization, { foreignKey: 'organization_id' })
    declare organization: BelongsTo<typeof Organization>

    @belongsTo(() => User, { foreignKey: 'verified_by' })
    declare verifiedByUser: BelongsTo<typeof User>
}
