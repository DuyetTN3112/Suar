import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Organization from './organization.js'

export default class TaskStatus extends BaseModel {
  static override table = 'task_statuses'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organization_id: string

  @column()
  declare name: string

  @column()
  declare slug: string

  /** System-fixed category: todo | in_progress | done | cancelled */
  @column()
  declare category: string

  @column()
  declare color: string

  @column()
  declare icon: string | null

  @column()
  declare description: string | null

  @column()
  declare sort_order: number

  /** Whether this is the default status for new tasks */
  @column()
  declare is_default: boolean

  /** System statuses cannot be deleted or have category changed */
  @column()
  declare is_system: boolean

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updated_at: DateTime

  @column.dateTime()
  declare deleted_at: DateTime | null

  // ===== Relationships =====

  @belongsTo(() => Organization, { foreignKey: 'organization_id' })
  declare organization: BelongsTo<typeof Organization>

  // Note: outgoing/incoming transitions queried via TaskWorkflowTransitionRepository.
  // All query methods have been moved to app/repositories/task_status_repository.ts.
}
