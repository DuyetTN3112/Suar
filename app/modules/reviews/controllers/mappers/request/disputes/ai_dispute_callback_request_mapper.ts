import ValidationException from '#modules/errors/public_contracts/validation_exception'
import type { ProcessAiDisputeCallbackDTO } from '#modules/reviews/actions/commands/disputes/process_ai_dispute_callback_command'

type CallbackTransport = {
  body?: unknown
  headers?: Record<string, unknown>
}

type JsonRecord = Record<string, unknown>

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function firstValue(body: JsonRecord, ...keys: string[]): unknown {
  for (const key of keys) {
    if (body[key] !== undefined) return body[key]
  }
  return undefined
}

function requiredString(
  value: unknown,
  field: string,
  errors: Record<string, string>,
  trim = false
): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    errors[field] = `${field} is required`
    return ''
  }
  return trim ? value.trim() : value
}

function optionalString(value: unknown, field: string, errors: Record<string, string>): string | undefined {
  if (value === undefined || value === null) return undefined
  if (typeof value !== 'string' || value.trim().length === 0) {
    errors[field] = `${field} must be a string`
    return undefined
  }
  return value
}

function normalizeActionItemAliases(record: JsonRecord): JsonRecord {
  const normalized = { ...record }
  if (normalized['action_items'] === undefined && normalized['actionItems'] !== undefined) {
    normalized['action_items'] = normalized['actionItems']
  }
  if (normalized['actionItems'] === undefined && normalized['action_items'] !== undefined) {
    normalized['actionItems'] = normalized['action_items']
  }
  return normalized
}

function normalizeResponsePayload(value: unknown, errors: Record<string, string>): JsonRecord | undefined {
  if (value === undefined || value === null) return undefined
  if (!isRecord(value)) {
    errors['responsePayload'] = 'responsePayload must be an object'
    return undefined
  }
  const normalized = normalizeActionItemAliases(value)
  for (const key of ['verdict', 'result', 'ai_target']) {
    if (isRecord(normalized[key])) normalized[key] = normalizeActionItemAliases(normalized[key])
  }
  return normalized
}

function header(headers: Record<string, unknown> | undefined, name: string): unknown {
  if (!headers) return undefined
  return Object.entries(headers).find(([key]) => key.toLowerCase() === name.toLowerCase())?.[1]
}

export function buildAiDisputeCallbackRequest(transport: CallbackTransport): ProcessAiDisputeCallbackDTO {
  const errors: Record<string, string> = {}
  const body = isRecord(transport.body) ? transport.body : {}
  const evaluationId = requiredString(
    firstValue(body, 'evaluationId', 'evaluation_id', 'disputeId'),
    'evaluationId',
    errors
  )
  const reviewDisputeId = optionalString(firstValue(body, 'reviewDisputeId', 'review_dispute_id'), 'reviewDisputeId', errors)
  const caseFileId = optionalString(firstValue(body, 'caseFileId', 'case_file_id'), 'caseFileId', errors)
  const sourceId = optionalString(
    firstValue(body, 'sourceId', 'source_id', 'sprintReviewDisputeId', 'sprint_review_dispute_id', 'sprintReverseReviewWorkflowId', 'sprint_reverse_review_workflow_id', 'taskReviewWorkflowId', 'task_review_workflow_id'),
    'sourceId',
    errors
  )
  const status = requiredString(firstValue(body, 'status'), 'status', errors, true)
  if (status && status !== 'completed' && status !== 'failed') errors['status'] = 'status must be completed or failed'

  const timestampValue = header(transport.headers, 'X-Timestamp') ?? header(transport.headers, 'X-AI-Timestamp') ?? firstValue(body, 'timestamp')
  const timestamp = typeof timestampValue === 'number' || typeof timestampValue === 'string' ? Number(timestampValue) : Number.NaN
  if (!Number.isFinite(timestamp)) errors['timestamp'] = 'timestamp is required'
  const signatureValue = header(transport.headers, 'X-Signature') ?? header(transport.headers, 'X-AI-Signature') ?? firstValue(body, 'signature')
  const signature = requiredString(signatureValue, 'signature', errors)

  const confidenceValue = firstValue(body, 'confidenceScore', 'confidence_score')
  let confidenceScore: number | undefined
  if (confidenceValue !== undefined) {
    confidenceScore = Number(confidenceValue)
    if (!Number.isFinite(confidenceScore) || confidenceScore < 0 || confidenceScore > 1) {
      errors['confidenceScore'] = 'confidenceScore must be between 0 and 1'
      confidenceScore = undefined
    }
  }
  const recommendation = optionalString(firstValue(body, 'recommendation'), 'recommendation', errors)
  const summary = optionalString(firstValue(body, 'summary'), 'summary', errors)
  const errorMessage = optionalString(firstValue(body, 'errorMessage', 'error_message'), 'errorMessage', errors)
  const responsePayload = normalizeResponsePayload(firstValue(body, 'responsePayload', 'response_payload'), errors)

  if (errors['reviewDisputeId'] && typeof firstValue(body, 'reviewDisputeId', 'review_dispute_id') === 'object') {
    errors['reviewDisputeId'] = 'reviewDisputeId must be a string'
  }
  if (errors['sourceId'] && typeof firstValue(body, 'sourceId', 'source_id') !== 'string') {
    errors['sourceId'] = 'sourceId must be a string'
  }
  if (Object.keys(errors).length > 0) throw ValidationException.fields(errors)

  return {
    evaluation_id: evaluationId,
    ...(reviewDisputeId !== undefined ? { review_dispute_id: reviewDisputeId } : {}),
    ...(caseFileId !== undefined ? { case_file_id: caseFileId } : {}),
    ...(sourceId !== undefined ? { source_id: sourceId } : {}),
    status,
    timestamp,
    signature,
    ...(confidenceScore !== undefined ? { confidence_score: confidenceScore } : {}),
    ...(recommendation !== undefined ? { recommendation } : {}),
    ...(summary !== undefined ? { summary } : {}),
    ...(errorMessage !== undefined ? { error_message: errorMessage } : {}),
    ...(responsePayload !== undefined ? { response_payload: responsePayload } : {}),
  }
}
