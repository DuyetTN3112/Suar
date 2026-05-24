import ValidationException from '#modules/errors/public_contracts/validation_exception'
import type {
  AdminSearchProjectionActivationApplyInput,
  AdminSearchProjectionCleanupInput,
  AdminSearchProjectionInspectInput,
  AdminSearchProjectionRollbackInput,
} from '#modules/http/public_contracts/admin_search_projection'

function record(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw ValidationException.field('body', 'Request body must be an object')
  }
  return value as Record<string, unknown>
}

function optionalString(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null) return undefined
  if (typeof value !== 'string') throw ValidationException.field(field, `${field} must be a string`)
  return value.trim() || undefined
}

function optionalNumber(value: unknown, field: string): number | undefined {
  if (value === undefined || value === null || value === '') return undefined
  const parsed = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : Number.NaN
  if (!Number.isFinite(parsed)) throw ValidationException.field(field, `${field} must be a finite number`)
  return parsed
}

function requiredString(value: unknown, field: string): string {
  const parsed = optionalString(value, field)
  if (parsed === undefined) throw ValidationException.field(field, `${field} is required`)
  return parsed
}

function optionalBoolean(value: unknown, field: string): boolean | undefined {
  if (value === undefined || value === null || value === '') return undefined
  if (value === true || value === 'true') return true
  if (value === false || value === 'false') return false
  throw ValidationException.field(field, `${field} must be a boolean`)
}

export function buildAdminSearchProjectionInspectRequest(payload: unknown): AdminSearchProjectionInspectInput {
  const input = record(payload)
  const target = optionalString(input['target'], 'target')
  return target === undefined ? {} : { target }
}

export function buildAdminSearchProjectionCleanupPreviewRequest(payload: unknown): AdminSearchProjectionCleanupInput {
  return buildAdminSearchProjectionCleanupApplyRequest(payload)
}

export function buildAdminSearchProjectionRollbackPreviewRequest(payload: unknown): AdminSearchProjectionRollbackInput {
  const input = record(payload)
  return {
    target: requiredString(input['target'], 'target'),
    expectedCurrentIndexName: requiredString(input['expectedCurrentIndexName'], 'expectedCurrentIndexName'),
    rollbackIndexName: requiredString(input['rollbackIndexName'], 'rollbackIndexName'),
    ...(optionalBoolean(input['allowEmpty'], 'allowEmpty') === true ? { allowEmpty: true } : {}),
  }
}

export function buildAdminSearchProjectionActivationPreviewRequest(payload: unknown): { id: string } {
  const input = record(payload)
  return { id: requiredString(input['id'], 'id') }
}

export function buildAdminSearchProjectionReconcileRequest(payload: unknown): { target: string } {
  const input = record(payload)
  return { target: requiredString(input['target'], 'target') }
}

export function buildAdminSearchProjectionCleanupApplyRequest(body: unknown): AdminSearchProjectionCleanupInput {
  const input = record(body)
  const target = optionalString(input['target'], 'target')
  const retainRetired = optionalNumber(input['retainRetired'], 'retainRetired')
  const olderThanHours = optionalNumber(input['olderThanHours'], 'olderThanHours')
  const reason = optionalString(input['reason'], 'reason')
  const confirmation = optionalString(input['confirmation'], 'confirmation')
  const expectedPlanToken = optionalString(input['expectedPlanToken'], 'expectedPlanToken')
  return {
    ...(target === undefined ? {} : { target }),
    ...(retainRetired === undefined ? {} : { retainRetired }),
    ...(olderThanHours === undefined ? {} : { olderThanHours }),
    ...(reason === undefined ? {} : { reason }),
    ...(confirmation === undefined ? {} : { confirmation }),
    ...(expectedPlanToken === undefined ? {} : { expectedPlanToken }),
  }
}

export function buildAdminSearchProjectionRollbackApplyRequest(body: unknown): AdminSearchProjectionRollbackInput {
  const input = record(body)
  const reason = optionalString(input['reason'], 'reason')
  const confirmation = optionalString(input['confirmation'], 'confirmation')
  return {
    target: requiredString(input['target'], 'target'),
    expectedCurrentIndexName: requiredString(input['expectedCurrentIndexName'], 'expectedCurrentIndexName'),
    rollbackIndexName: requiredString(input['rollbackIndexName'], 'rollbackIndexName'),
    ...(input['allowEmpty'] === true ? { allowEmpty: true } : {}),
    ...(reason === undefined ? {} : { reason }),
    ...(confirmation === undefined ? {} : { confirmation }),
  }
}

export function buildAdminSearchProjectionActivationApplyRequest(
  body: unknown
): AdminSearchProjectionActivationApplyInput {
  const input = record(body)
  const expectedCurrentIndexNames = input['expectedCurrentIndexNames']
  if (
    expectedCurrentIndexNames !== undefined &&
    (!Array.isArray(expectedCurrentIndexNames) ||
      expectedCurrentIndexNames.some((value) => typeof value !== 'string'))
  ) {
    throw ValidationException.field(
      'expectedCurrentIndexNames',
      'expectedCurrentIndexNames must be an array of strings'
    )
  }
  const expectedLockVersion = input['expectedLockVersion']
  if (typeof expectedLockVersion !== 'number' || !Number.isSafeInteger(expectedLockVersion)) {
    throw ValidationException.field('expectedLockVersion', 'expectedLockVersion must be an integer')
  }
  return {
    id: requiredString(input['id'], 'id'),
    expectedLockVersion,
    expectedStateToken: requiredString(input['expectedStateToken'], 'expectedStateToken'),
    now: requiredString(input['now'], 'now'),
    ...(expectedCurrentIndexNames === undefined
      ? {}
      : { expectedCurrentIndexNames: expectedCurrentIndexNames as string[] }),
  }
}
