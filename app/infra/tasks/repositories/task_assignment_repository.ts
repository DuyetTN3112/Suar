import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { DatabaseId } from '#types/database'
import { ProjectRole } from '#constants/project_constants'
import { AssignmentStatus } from '#constants/task_constants'
import TaskAssignment from '#models/task_assignment'

/**
 * TaskAssignmentRepository
 *
 * Data access for task assignments.
 * Extracted from TaskAssignment model static methods.
 */
export default class TaskAssignmentRepository {
  private readonly __instanceMarker = true

  static {
    void new TaskAssignmentRepository().__instanceMarker
  }

  static async findActiveWithDetails(assignmentId: DatabaseId, trx?: TransactionClientContract) {
    const query = trx ? TaskAssignment.query({ client: trx }) : TaskAssignment.query()
    return query.where('id', assignmentId).preload('task').preload('assignee').forUpdate().first()
  }

  static async cancelAssignment(
    assignmentId: DatabaseId,
    notes: string,
    trx?: TransactionClientContract
  ): Promise<void> {
    const query = trx ? TaskAssignment.query({ client: trx }) : TaskAssignment.query()
    await query.where('id', assignmentId).update({
      assignment_status: AssignmentStatus.CANCELLED,
      completion_notes: notes,
    })
  }

  /**
   * Find project manager/owner user IDs for a project.
   * Uses ProjectMember model (cross-model query).
   */
  static async findProjectManagerIds(
    projectId: DatabaseId,
    excludeUserId?: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<string[]> {
    const projectMemberModule = await import('#models/project_member')
    const ProjectMember = projectMemberModule.default
    const query = trx ? ProjectMember.query({ client: trx }) : ProjectMember.query()
    let q = query.where('project_id', projectId)

    if (excludeUserId) {
      q = q.whereNot('user_id', excludeUserId)
    }

    const members = await q
    return members
      .filter((m) =>
        [ProjectRole.OWNER, ProjectRole.MANAGER].includes(m.project_role as ProjectRole)
      )
      .map((m) => m.user_id)
  }
}
