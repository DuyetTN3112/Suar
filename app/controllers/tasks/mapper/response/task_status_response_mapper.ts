import type { ResponseRecord, SerializableResponseRecord } from './shared.js'
import { serializeForResponse } from './shared.js'

export function mapTaskStatusDefinitionApiBody(data: SerializableResponseRecord | ResponseRecord) {
  return {
    success: true,
    data: serializeForResponse(data),
  }
}

export function mapTaskWorkflowApiBody<T>(data: T) {
  return {
    success: true,
    data,
  }
}

export function mapTaskStatusSuccessApiBody(message?: string) {
  return message ? { success: true, message } : { success: true }
}

export function mapTaskStatusMutationApiBody(data: SerializableResponseRecord | ResponseRecord) {
  return mapTaskStatusDefinitionApiBody(data)
}

export function mapTaskStatusDeleteApiBody(message?: string) {
  return mapTaskStatusSuccessApiBody(message)
}

export function mapWorkflowUpdateApiBody<T>(data: T) {
  return mapTaskWorkflowApiBody(data)
}
