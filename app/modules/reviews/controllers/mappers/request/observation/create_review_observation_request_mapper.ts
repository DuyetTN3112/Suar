import type { HttpContext } from '@adonisjs/core/http'

import type { ReviewObservationV1 } from '#modules/reviews/public_contracts/observation/completion_review_contracts'
import { isReviewObservationV1 } from '#modules/tasks/public_contracts/task-authoring/validators'
import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { validationIssue, type ValidationIssue } from '#modules/errors/public_contracts/validation_issue'
import type { CreateReviewObservationDTO } from '#modules/reviews/actions/commands/observation/create_review_observation_command'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const EVIDENCE_SUFFICIENCY = new Set(['pending', 'adequate', 'governed_exception', 'inadequate'])
const RATIONALE_CLASSIFICATIONS = new Set(['private', 'internal', 'confidential'])
const RELATIONS = new Set(['supports', 'contradicts', 'context'])

function record(value: unknown, path: string, issues: ValidationIssue[]): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    issues.push(validationIssue(path, 'Value must be an object', 'REQUEST_OBJECT_REQUIRED'))
    return undefined
  }
  return value as Record<string, unknown>
}

function requiredString(value: unknown, path: string, issues: ValidationIssue[]): string | undefined {
  if (typeof value !== 'string' || value.trim().length === 0) {
    issues.push(validationIssue(path, `${path} is required`, 'REQUEST_STRING_REQUIRED'))
    return undefined
  }
  return value.trim()
}

export function buildCreateReviewObservationDTO(ctx: HttpContext): CreateReviewObservationDTO {
  const issues: ValidationIssue[] = []
  const body = record(ctx.request.all(), 'body', issues)
  if (!body) throw ValidationException.fromIssues(issues)

  const observationRecord = record(body['observation'], 'observation', issues)
  if (observationRecord && observationRecord['schemaVersion'] !== 'suar.review_observation.v1') {
    issues.push(
      validationIssue(
        'observation.schemaVersion',
        'Observation schema version is invalid',
        'OBSERVATION_SCHEMA_INVALID'
      )
    )
  }
  if (observationRecord && !isReviewObservationV1(observationRecord)) {
    issues.push(
      validationIssue(
        'observation',
        'Observation does not match the suar.review_observation.v1 contract',
        'OBSERVATION_SHAPE_INVALID'
      )
    )
  }
  const observation = observationRecord as unknown as ReviewObservationV1

  const rawRelations = body['evidenceRelations']
  if (!Array.isArray(rawRelations)) {
    issues.push(
      validationIssue(
        'evidenceRelations',
        'evidenceRelations must be an array',
        'REQUEST_ARRAY_REQUIRED'
      )
    )
  }
  const evidenceRelations = (Array.isArray(rawRelations) ? rawRelations : []).map((entry, index) => {
    const relation = record(entry, `evidenceRelations.${index}`, issues) ?? {}
    const relationValue = requiredString(
      relation['relation'],
      `evidenceRelations.${index}.relation`,
      issues
    )
    if (relationValue !== undefined && !RELATIONS.has(relationValue)) {
      issues.push(
        validationIssue(
          `evidenceRelations.${index}.relation`,
          'Evidence relation is invalid',
          'EVIDENCE_RELATION_INVALID'
        )
      )
    }
    return {
      evidenceId:
        requiredString(relation['evidenceId'], `evidenceRelations.${index}.evidenceId`, issues) ?? '',
      relation: relationValue as 'supports' | 'contradicts' | 'context',
    }
  })

  const completionClaimId = body['completionClaimId']
  if (
    completionClaimId !== null &&
    completionClaimId !== undefined &&
    (typeof completionClaimId !== 'string' || !UUID_PATTERN.test(completionClaimId))
  ) {
    issues.push(
      validationIssue(
        'completionClaimId',
        'completionClaimId must be a UUID or null',
        'UUID_INVALID'
      )
    )
  }

  const idempotencyKey = requiredString(body['idempotencyKey'], 'idempotencyKey', issues)
  const completionReportId = requiredString(body['completionReportId'], 'completionReportId', issues)
  if (completionReportId !== undefined && !UUID_PATTERN.test(completionReportId)) {
    issues.push(validationIssue('completionReportId', 'completionReportId must be a UUID', 'UUID_INVALID'))
  }
  const evidenceSufficiency = requiredString(body['evidenceSufficiency'], 'evidenceSufficiency', issues)
  if (evidenceSufficiency !== undefined && !EVIDENCE_SUFFICIENCY.has(evidenceSufficiency)) {
    issues.push(
      validationIssue(
        'evidenceSufficiency',
        'Evidence sufficiency is invalid',
        'EVIDENCE_SUFFICIENCY_INVALID'
      )
    )
  }
  const rationaleClassification = requiredString(
    body['rationaleClassification'],
    'rationaleClassification',
    issues
  )
  if (rationaleClassification !== undefined && !RATIONALE_CLASSIFICATIONS.has(rationaleClassification)) {
    issues.push(
      validationIssue(
        'rationaleClassification',
        'Rationale classification is invalid',
        'RATIONALE_CLASSIFICATION_INVALID'
      )
    )
  }

  if (issues.length > 0) throw ValidationException.fromIssues(issues)
  return {
    idempotencyKey: idempotencyKey as string,
    completionReportId: completionReportId as string,
    completionClaimId:
      completionClaimId === undefined || completionClaimId === null
        ? null
        : (completionClaimId as string),
    observation,
    evidenceSufficiency: evidenceSufficiency as
      | 'pending'
      | 'adequate'
      | 'governed_exception'
      | 'inadequate',
    rationaleClassification: rationaleClassification as 'private' | 'internal' | 'confidential',
    evidenceRelations,
  }
}

export function buildCreateReviewObservationNavigationRequest(ctx: HttpContext): {
  projectId?: string
  taskId?: string
  redirectTo?: string
} {
  const issues: ValidationIssue[] = []
  const projectId = optionalNavigationString(ctx.request.input('project_id'), 'project_id', issues)
  const taskId = optionalNavigationString(ctx.request.input('task_id'), 'task_id', issues)
  const redirectTo = optionalNavigationString(ctx.request.input('redirect_to'), 'redirect_to', issues)
  if (redirectTo !== undefined && redirectTo.length > 1000) {
    issues.push(validationIssue('redirect_to', 'redirect_to must be no longer than 1000 characters', 'REQUEST_STRING_TOO_LONG'))
  }
  if (issues.length > 0) throw ValidationException.fromIssues(issues)
  return {
    ...(projectId === undefined ? {} : { projectId }),
    ...(taskId === undefined ? {} : { taskId }),
    ...(redirectTo === undefined ? {} : { redirectTo }),
  }
}

function optionalNavigationString(
  value: unknown,
  path: string,
  issues: ValidationIssue[]
): string | undefined {
  if (value === undefined || value === null || value === '') return undefined
  if (typeof value !== 'string' || value.trim().length === 0) {
    issues.push(validationIssue(path, `${path} must be a non-empty string`, 'REQUEST_STRING_INVALID'))
    return undefined
  }
  return value.trim()
}
