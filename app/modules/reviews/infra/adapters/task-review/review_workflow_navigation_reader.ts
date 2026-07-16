import db from '@adonisjs/lucid/services/db'

import type {
  ReviewProjectSummary,
  ReviewWorkflowNavigationReader as ReviewWorkflowNavigationReaderPort,
  SprintReverseReviewWorkflowLocation,
  TaskReviewWorkflowLocation,
} from '#modules/reviews/actions/ports/outbound/review_workflow_navigation_reader'
import { getTaskReviewDetailByTask } from '#modules/reviews/infra/repositories/read/task_review_board_queries'

export default class ReviewWorkflowNavigationReader implements ReviewWorkflowNavigationReaderPort {
  async getSprintReverseWorkflowLocation(
    workflowId: string
  ): Promise<SprintReverseReviewWorkflowLocation> {
    const workflow = (await db
      .from('sprint_reverse_review_workflows')
      .where('id', workflowId)
      .select('sprint_id', 'project_id', 'target_type')
      .firstOrFail()) as {
      sprint_id: string
      project_id: string
      target_type: string
    }

    return {
      sprintId: workflow.sprint_id,
      projectId: workflow.project_id,
      targetType: workflow.target_type,
    }
  }

  async getTaskWorkflowLocation(workflowId: string): Promise<TaskReviewWorkflowLocation> {
    const workflow = (await db
      .from('task_review_workflows')
      .where('id', workflowId)
      .select('project_id', 'task_id')
      .firstOrFail()) as {
      project_id: string
      task_id: string
    }

    return { projectId: workflow.project_id, taskId: workflow.task_id }
  }

  async getTaskProjectId(taskId: string): Promise<string | null> {
    const detail = await getTaskReviewDetailByTask(taskId)
    const task = detail?.['task']
    const projectId =
      task && typeof task === 'object' && 'project_id' in task
        ? (task as { project_id?: unknown }).project_id
        : null

    return typeof projectId === 'string' ? projectId : null
  }

  async getProjectSummary(projectId: string): Promise<ReviewProjectSummary> {
    return db
      .from('projects')
      .where('id', projectId)
      .whereNull('deleted_at')
      .select('id', 'name')
      .firstOrFail() as Promise<ReviewProjectSummary>
  }

  getTaskReviewDetail(taskId: string): Promise<Record<string, unknown> | null> {
    return getTaskReviewDetailByTask(taskId)
  }
}
