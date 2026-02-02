export interface SprintReverseReviewWorkflowLocation {
  sprintId: string
  projectId: string
  targetType: string
}

export interface TaskReviewWorkflowLocation {
  projectId: string
  taskId: string
}

export interface ReviewProjectSummary {
  id: string
  name: string
}

export interface ReviewWorkflowNavigationReader {
  getSprintReverseWorkflowLocation(workflowId: string): Promise<SprintReverseReviewWorkflowLocation>

  getTaskWorkflowLocation(workflowId: string): Promise<TaskReviewWorkflowLocation>

  getTaskProjectId(taskId: string): Promise<string | null>

  getProjectSummary(projectId: string): Promise<ReviewProjectSummary>

  getTaskReviewDetail(taskId: string): Promise<Record<string, unknown> | null>
}
