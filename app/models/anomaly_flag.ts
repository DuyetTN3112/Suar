import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

/**
 * Model: AnomalyFlag
 * Table: anomaly_flags
 * Mô tả: Định nghĩa các loại anomaly cần detect trong reviews
 */
export default class AnomalyFlag extends BaseModel {
    static override table = 'anomaly_flags'

    @column({ isPrimary: true })
    declare id: number

    @column()
    declare flag_type: string // sudden_spike, mutual_high, etc.

    @column()
    declare flag_name: string

    @column()
    declare severity: 'low' | 'medium' | 'high' | 'critical'

    @column()
    declare description: string | null

    @column()
    declare auto_action: string | null // flag_review, notify_admin

    @column.dateTime({ autoCreate: true })
    declare created_at: DateTime
}
