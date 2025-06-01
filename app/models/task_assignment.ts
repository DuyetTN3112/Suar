import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { DatabaseId } from '#types/database'
import { ProjectRole } from '#constants/project_constants'
import Task from './task.js'
import User from './user.js'

/**
 * TaskAssignment Model
 *
 * Represents task assignments to users.
 *
 * Assignment types:
 * - member: Organization member
 * - freelancer: External hired freelancer
 * - volunteer: Volunteer contributor
 */
export default class TaskAssignment extends BaseModel {
  static override table = 'task_assignments'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare task_id: string

  @column()
  declare assignee_id: string

  @column()
  declare assigned_by: string

  @column()
  declare assignment_type: 'member' | 'freelancer' | 'volunteer'

  @column()
  declare assignment_status: 'active' | 'completed' | 'cancelled'

  @column()
  declare estimated_hours: number | null

  @column()
  declare actual_hours: number | null

  @column()
  declare progress_percentage: number

  @column()
  declare completion_notes: string | null

  @column()
  declare verified_by: string | null

  @column.dateTime()
  declare verified_at: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare assigned_at: DateTime

  @column.dateTime()
  declare completed_at: DateTime | null

  // Relationships
  @belongsTo(() => Task, { foreignKey: 'task_id' })
  declare task: BelongsTo<typeof Task>

  @belongsTo(() => User, { foreignKey: 'assignee_id' })
  declare assignee: BelongsTo<typeof User>

  @belongsTo(() => User, { foreignKey: 'assigned_by' })
  declare assigner: BelongsTo<typeof User>

  @belongsTo(() => User, { foreignKey: 'verified_by' })
  declare verifier: BelongsTo<typeof User>

  // ===== Static Methods (Fat Model) =====

  /**
   * Tìm assignment active với details (task + assignee info)
   * Thay thế: trx.from('task_assignments').join('tasks', ...).join('users', ...).where(...)
   */
  static async findActiveWithDetails(assignmentId: DatabaseId, trx?: TransactionClientContract) {
    const query = trx ? this.query({ client: trx }) : this.query()
    return query.where('id', assignmentId).preload('task').preload('assignee').forUpdate().first()
  }

  /**
   * Hủy assignment (update status to cancelled)
   */
  static async cancelAssignment(
    assignmentId: DatabaseId,
    notes: string,
    trx?: TransactionClientContract
  ): Promise<void> {
    const query = trx ? this.query({ client: trx }) : this.query()
    await query.where('id', assignmentId).update({
      assignment_status: 'cancelled',
      completion_notes: notes,
    })
  }

  /**
   * Tìm tất cả project managers/owners cho notifications
   */
  static async findProjectManagerIds(
    projectId: DatabaseId,
    excludeUserId?: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<string[]> {
    const ProjectMember = (await import('./project_member.js')).default
    const query = trx ? ProjectMember.query({ client: trx }) : ProjectMember.query()
    let q = query.where('project_id', projectId)

    if (excludeUserId) {
      q = q.whereNot('user_id', excludeUserId)
    }

    const members = await q
    // v3: project_role is an inline string column, no preload needed
    return members
      .filter((m) => [ProjectRole.OWNER, ProjectRole.MANAGER].includes(m.project_role as ProjectRole))
      .map((m) => String(m.user_id))
  }
}
