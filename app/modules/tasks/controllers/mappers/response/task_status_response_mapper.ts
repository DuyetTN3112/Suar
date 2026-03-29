import {
  mapApiV1TaskStatusResponse,
  mapApiV1WorkflowTransitionResponse,
} from '#modules/http/boundary/api_v1_response'
import type {
  TaskStatusRecord,
  TaskWorkflowTransitionRecord,
} from '#modules/tasks/types/task_records'

export function mapTaskStatusDefinitionApiBody(data: TaskStatusRecord) {
  return {
    data: mapApiV1TaskStatusResponse(data),
  }
}

export function mapTaskStatusCollectionApiBody(data: TaskStatusRecord[]) {
  return {
    data: data.map(mapApiV1TaskStatusResponse),
  }
}

export function mapTaskWorkflowApiBody(data: TaskWorkflowTransitionRecord[]) {
  return {
    data: data.map(mapApiV1WorkflowTransitionResponse),
  }
}

export function mapTaskStatusMutationApiBody(data: TaskStatusRecord) {
  return mapTaskStatusDefinitionApiBody(data)
}

export function mapWorkflowUpdateApiBody(data: TaskWorkflowTransitionRecord[]) {
  return mapTaskWorkflowApiBody(data)
}
