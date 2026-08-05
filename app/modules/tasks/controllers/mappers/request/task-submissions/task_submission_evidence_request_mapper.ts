import {
  readOptionalTaskSubmissionString,
  readRequiredTaskSubmissionString,
  requireTaskSubmissionEvidenceType,
} from './task_submission_request.js'

import ValidationException from '#modules/errors/public_contracts/validation_exception'
import type { TaskSubmissionEvidenceType } from '#modules/tasks/domain/task-submissions/task_submission_rules'


function routeId(params: unknown, field: string): string {
  const value = params && typeof params === 'object' && !Array.isArray(params) ? (params as Record<string, unknown>)[field] : undefined
  if (typeof value !== 'string' || value.trim().length === 0) throw ValidationException.field(field, `${field} is required`)
  return value.trim()
}

export function buildAddTaskSubmissionEvidenceRequest(params: unknown, body: unknown): {
  readonly submission_id: string
  readonly evidence_type: TaskSubmissionEvidenceType
  readonly url: string
  readonly title: string | null
  readonly description: string | null
} {
  const input = body && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>) : {}
  const submissionId = routeId(params, 'submissionId')
  return {
    submission_id: submissionId,
    evidence_type: requireTaskSubmissionEvidenceType(input['evidenceType'] ?? input['evidence_type'], 'evidence_type'),
    url: readRequiredTaskSubmissionString(input['url'], 'url'),
    title: readOptionalTaskSubmissionString(input['title'], 'title'),
    description: readOptionalTaskSubmissionString(input['description'], 'description'),
  }
}

export function buildDeleteTaskSubmissionEvidenceRequest(params: unknown): { readonly evidence_id: string } {
  routeId(params, 'submissionId')
  return { evidence_id: routeId(params, 'evidenceId') }
}

export function buildListTaskSubmissionEvidenceRequest(params: unknown): {
  readonly submissionId: string
} {
  return { submissionId: routeId(params, 'submissionId') }
}
