import axios from 'axios'

export interface WorkflowStatusDefinition {
  id: string
  name: string
  category: string
  color: string
}

export interface WorkflowTransitionInput {
  fromStatusId: string
  toStatusId: string
  conditions: Record<string, unknown>
}

interface CollectionResponse<T> {
  data?: T[]
}

export async function loadWorkflowConfiguration(): Promise<{
  statuses: WorkflowStatusDefinition[]
  transitions: WorkflowTransitionInput[]
}> {
  const [statusesResponse, workflowResponse] = await Promise.all([
    axios.get<CollectionResponse<WorkflowStatusDefinition>>('/api/v1/task-statuses'),
    axios.get<CollectionResponse<WorkflowTransitionInput>>('/api/v1/workflow'),
  ])

  return {
    statuses: statusesResponse.data.data ?? [],
    transitions: workflowResponse.data.data ?? [],
  }
}

export async function replaceWorkflowTransitions(transitions: WorkflowTransitionInput[]) {
  await axios.put('/api/v1/workflow', { transitions })
}
