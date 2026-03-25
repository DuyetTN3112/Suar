import db from '@adonisjs/lucid/services/db'

import type {
  ReviewTaskBoardAccess,
  ReviewTaskBoardReader,
} from '#modules/reviews/actions/ports/outbound/review_task_board_reader'
import type { TaskReviewBoardResult } from '#modules/reviews/domain/task_review_workflow'
import { getTaskReviewBoardByProject } from '#modules/reviews/infra/repositories/read/task_review_board_queries'

export class LucidReviewTaskBoardReader implements ReviewTaskBoardReader {
  async findAccess(projectId: string, actorId: string): Promise<ReviewTaskBoardAccess> {
    const project = (await db
      .from('projects')
      .where('id', projectId)
      .whereNull('deleted_at')
      .select('id', 'organization_id', 'owner_id', 'creator_id')
      .first()) as
      | {
          id: string
          organization_id: string
          owner_id: string | null
          creator_id: string | null
        }
      | undefined

    if (!project) {
      return { projectExists: false, canRead: false }
    }

    if (project.owner_id === actorId || project.creator_id === actorId) {
      return { projectExists: true, canRead: true }
    }

    const projectMember = (await db
      .from('project_members')
      .where('project_id', project.id)
      .where('user_id', actorId)
      .select('project_id')
      .first()) as { project_id: string } | undefined
    if (projectMember) {
      return { projectExists: true, canRead: true }
    }

    const orgMember = (await db
      .from('organization_users')
      .where('organization_id', project.organization_id)
      .where('user_id', actorId)
      .where('status', 'approved')
      .select('org_role')
      .first()) as { org_role: string | null } | undefined

    return {
      projectExists: true,
      canRead: Boolean(orgMember && ['org_owner', 'org_admin'].includes(orgMember.org_role ?? '')),
    }
  }

  loadBoard(projectId: string, actorId: string): Promise<TaskReviewBoardResult> {
    return getTaskReviewBoardByProject(projectId, actorId)
  }
}
