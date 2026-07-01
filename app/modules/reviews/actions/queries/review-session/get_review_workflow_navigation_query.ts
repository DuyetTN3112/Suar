import type {
  ReviewProjectSummary,
  ReviewWorkflowNavigationReader,
  SprintReverseReviewWorkflowLocation,
  TaskReviewWorkflowLocation,
} from '../../ports/outbound/review_workflow_navigation_reader.js'

import { BaseQuery } from '#modules/reviews/actions/base_query'

type ReviewWorkflowNavigationInput =
  | { kind: 'sprintReverseWorkflow'; workflowId: string }
  | { kind: 'taskWorkflow'; workflowId: string }
  | { kind: 'taskProjectId'; taskId: string }
  | { kind: 'projectSummary'; projectId: string }
  | { kind: 'taskReviewDetail'; taskId: string }

type ReviewWorkflowNavigationResult =
  | SprintReverseReviewWorkflowLocation
  | TaskReviewWorkflowLocation
  | string
  | null
  | ReviewProjectSummary
  | Record<string, unknown>

export default class GetReviewWorkflowNavigationQuery extends BaseQuery<
  ReviewWorkflowNavigationInput,
  ReviewWorkflowNavigationResult
> {
  constructor(private readonly reader: ReviewWorkflowNavigationReader) {
    super()
  }

  async handle(input: ReviewWorkflowNavigationInput): Promise<ReviewWorkflowNavigationResult> {
    switch (input.kind) {
      case 'sprintReverseWorkflow':
        return this.reader.getSprintReverseWorkflowLocation(input.workflowId)
      case 'taskWorkflow':
        return this.reader.getTaskWorkflowLocation(input.workflowId)
      case 'taskProjectId':
        return this.reader.getTaskProjectId(input.taskId)
      case 'projectSummary':
        return this.reader.getProjectSummary(input.projectId)
      case 'taskReviewDetail':
        return this.reader.getTaskReviewDetail(input.taskId)
    }
  }

  sprintReverseWorkflow(workflowId: string): Promise<SprintReverseReviewWorkflowLocation> {
    return this.handle({ kind: 'sprintReverseWorkflow', workflowId }) as Promise<SprintReverseReviewWorkflowLocation>
  }

  taskWorkflow(workflowId: string): Promise<TaskReviewWorkflowLocation> {
    return this.handle({ kind: 'taskWorkflow', workflowId }) as Promise<TaskReviewWorkflowLocation>
  }

  taskProjectId(taskId: string): Promise<string | null> {
    return this.handle({ kind: 'taskProjectId', taskId }) as Promise<string | null>
  }

  projectSummary(projectId: string): Promise<ReviewProjectSummary> {
    return this.handle({ kind: 'projectSummary', projectId }) as Promise<ReviewProjectSummary>
  }

  taskReviewDetail(taskId: string): Promise<Record<string, unknown> | null> {
    return this.handle({ kind: 'taskReviewDetail', taskId }) as Promise<Record<string, unknown> | null>
  }
}
