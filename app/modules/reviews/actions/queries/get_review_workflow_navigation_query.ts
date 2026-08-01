import type {
  ReviewProjectSummary,
  ReviewWorkflowNavigationReader,
  SprintReverseReviewWorkflowLocation,
  TaskReviewWorkflowLocation,
} from '../ports/outbound/review_workflow_navigation_reader.js'

export default class GetReviewWorkflowNavigationQuery {
  constructor(private readonly reader: ReviewWorkflowNavigationReader) {}

  sprintReverseWorkflow(workflowId: string): Promise<SprintReverseReviewWorkflowLocation> {
    return this.reader.getSprintReverseWorkflowLocation(workflowId)
  }

  taskWorkflow(workflowId: string): Promise<TaskReviewWorkflowLocation> {
    return this.reader.getTaskWorkflowLocation(workflowId)
  }

  taskProjectId(taskId: string): Promise<string | null> {
    return this.reader.getTaskProjectId(taskId)
  }

  projectSummary(projectId: string): Promise<ReviewProjectSummary> {
    return this.reader.getProjectSummary(projectId)
  }

  taskReviewDetail(taskId: string): Promise<Record<string, unknown> | null> {
    return this.reader.getTaskReviewDetail(taskId)
  }
}
