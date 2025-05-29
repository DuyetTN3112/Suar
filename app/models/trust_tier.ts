import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

/**
 * Model: TrustTier
 * Table: trust_tiers
 * Mô tả: 3 cấp độ Trust: Community, Organization, Partner
 */
export default class TrustTier extends BaseModel {
    static override table = 'trust_tiers'

    @column({ isPrimary: true })
    declare id: number

    @column()
    declare tier_code: string // community, organization, partner

    @column()
    declare tier_name: string

    @column()
    declare tier_name_vi: string

    @column()
    declare trust_weight: number // 0.50, 0.80, 1.00

    @column()
    declare description: string | null

    @column()
    declare badge_icon: string | null

    @column()
    declare sort_order: number

    @column.dateTime({ autoCreate: true })
    declare created_at: DateTime
}
