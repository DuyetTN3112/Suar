import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { validationIssue, type ValidationIssue } from '#modules/errors/public_contracts/validation_issue'

export interface TaskAssignmentExpectedSnapshotInput {
  readonly assignmentId: string
  readonly snapshotId: string
  readonly snapshotHash: string
  readonly contractVersionHead: number
  readonly idempotencyKey: string
}

export interface TaskAssignmentClarificationInput extends TaskAssignmentExpectedSnapshotInput {
  readonly reason: string
}

type UnknownRecord = Record<string, unknown>

function record(value: unknown, path: string, issues: ValidationIssue[]): UnknownRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    issues.push(validationIssue(path, 'Value must be an object', 'REQUEST_OBJECT_REQUIRED'))
    return {}
  }
  return value as UnknownRecord
}

function requiredString(value: unknown, path: string, issues: ValidationIssue[]): string {
  if (typeof value !== 'string' || value.trim().length === 0 || value.length > 256) {
    issues.push(validationIssue(path, `${path} is required and must be at most 256 characters`, 'REQUEST_STRING_INVALID'))
    return ''
  }
  return value.trim()
}

function snapshotInput(
  params: unknown,
  payload: unknown,
  existingIssues?: ValidationIssue[]
): TaskAssignmentExpectedSnapshotInput {
  const issues = existingIssues ?? []
  const route = record(params, 'params', issues)
  const body = record(payload, 'body', issues)
  const assignmentId = requiredString(route['assignmentId'], 'assignmentId', issues)
  const bodyAssignmentId = requiredString(body['assignmentId'], 'assignmentId', issues)
  if (assignmentId && bodyAssignmentId && assignmentId !== bodyAssignmentId) {
    issues.push(validationIssue('assignmentId', 'assignmentId does not match the route', 'ROUTE_BODY_MISMATCH'))
  }
  const head = body['contractVersionHead']
  if (typeof head !== 'number' || !Number.isInteger(head) || head < 1) {
    issues.push(validationIssue('contractVersionHead', 'contractVersionHead is invalid', 'NUMBER_INVALID'))
  }
  const result = {
    assignmentId: bodyAssignmentId,
    snapshotId: requiredString(body['snapshotId'], 'snapshotId', issues),
    snapshotHash: requiredString(body['snapshotHash'], 'snapshotHash', issues),
    contractVersionHead: head as number,
    idempotencyKey: requiredString(body['idempotencyKey'], 'idempotencyKey', issues),
  }
  if (!existingIssues && issues.length > 0) throw ValidationException.fromIssues(issues)
  return result
}

export function buildAcknowledgeTaskAssignmentInput(
  params: unknown,
  payload: unknown
): TaskAssignmentExpectedSnapshotInput {
  return snapshotInput(params, payload)
}

export function buildRequestTaskAssignmentClarificationInput(
  params: unknown,
  payload: unknown
): TaskAssignmentClarificationInput {
  const issues: ValidationIssue[] = []
  const body = record(payload, 'body', issues)
  const input = snapshotInput(params, payload, issues)
  const reason = requiredString(body['reason'], 'reason', issues)
  if (issues.length > 0) throw ValidationException.fromIssues(issues)
  return { ...input, reason }
}
