import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from './user.js'

/**
 * Model: PublicProfileSetting
 * Table: public_profile_settings
 * Mô tả: Cài đặt public profile của user
 */
export default class PublicProfileSetting extends BaseModel {
    static override table = 'public_profile_settings'

    @column({ isPrimary: true })
    declare id: number

    @column()
    declare user_id: number

    @column()
    declare is_searchable: boolean

    @column()
    declare show_contact_info: boolean

    @column()
    declare show_organizations: boolean

    @column()
    declare show_projects: boolean

    @column()
    declare show_spider_chart: boolean

    @column()
    declare show_technical_skills: boolean

    @column()
    declare custom_headline: string | null

    @column()
    declare preferred_job_types: string | null // JSON array

    @column()
    declare preferred_locations: string | null // JSON array

    @column()
    declare min_salary_expectation: number | null

    @column()
    declare salary_currency: string | null

    @column.date()
    declare available_from: DateTime | null

    @column.dateTime({ autoCreate: true })
    declare created_at: DateTime

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    declare updated_at: DateTime

    // Relations
    @belongsTo(() => User, { foreignKey: 'user_id' })
    declare user: BelongsTo<typeof User>
}
