import type { SubmitTaskSubmissionDTO } from '#modules/tasks/actions/commands/task-submissions/submit_task_submission_command'
import type { HttpContext } from '@adonisjs/core/http'

import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { buildRequiredTaskRouteRequest } from '#modules/tasks/controllers/mappers/request/task-requirements/task_requirement_route_request_mapper'
import {
  isTaskSubmissionEvidenceType,
  type TaskSubmissionEvidenceType,
} from '#modules/tasks/domain/task-submissions/task_submission_rules'

interface SubmissionBody extends Record<string, unknown> {
  evidences?: unknown
}
interface SubmissionEvidenceInput {
  evidence_type: TaskSubmissionEvidenceType
  url: string
  title: string | null
  description: string | null
}
const MAX_SUBMISSION_SUMMARY_LENGTH = 4000
const MAX_SUBMISSION_OPTIONAL_TEXT_LENGTH = 8000
const MAX_SUBMISSION_EVIDENCES = 25
const MAX_SUBMISSION_EVIDENCE_URL_LENGTH = 2000
const MAX_SUBMISSION_EVIDENCE_TITLE_LENGTH = 500
const MAX_SUBMISSION_EVIDENCE_DESCRIPTION_LENGTH = 2000

function readSubmissionValue(
  body: SubmissionBody,
  camelCaseKey: string,
  snakeCaseKey: string
): unknown {
  return body[camelCaseKey] ?? body[snakeCaseKey]


}
function enforceMaxLength(value: string, field: string, maxLength: number): string {
  if (value.length > maxLength) {
    throw ValidationException.field(field, `${field} cannot exceed ${maxLength} characters`)
  }

  return value
}

export function requireTaskSubmissionEvidenceType(
  value: unknown,
  field: string
): TaskSubmissionEvidenceType {
  if (!isTaskSubmissionEvidenceType(value)) {
    throw ValidationException.field(field, 'Unsupported task submission evidence type')
  }
  return value
}

export function readOptionalTaskSubmissionString(value: unknown, field: string): string | null {
  if (value === undefined || value === null) return null
  if (typeof value === 'string') {
    return enforceMaxLength(value, field, MAX_SUBMISSION_OPTIONAL_TEXT_LENGTH)
  }

  throw ValidationException.field(field, `${field} must be a string`)
}

export function readRequiredTaskSubmissionString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw ValidationException.field(field, `${field} is required`)
  }

  return value
}

function readSummaryString(value: unknown): string {
  return enforceMaxLength(readRequiredTaskSubmissionString(value, 'summary'), 'summary', MAX_SUBMISSION_SUMMARY_LENGTH)
}

function readLimitedOptionalTaskSubmissionString(
  value: unknown,
  field: string,
  maxLength: number
): string | null {
  const parsed = readOptionalTaskSubmissionString(value, field)
  if (parsed === null) return null

  return enforceMaxLength(parsed, field, maxLength)
}
function buildSubmissionEvidences(value: unknown): SubmissionEvidenceInput[] {
  if (value === undefined || value === null) return []
  if (!Array.isArray(value)) {
    throw ValidationException.field('evidences', 'evidences must be an array')
  }
  if (value.length > MAX_SUBMISSION_EVIDENCES) {
    throw ValidationException.field(
      'evidences',
      `evidences cannot exceed ${MAX_SUBMISSION_EVIDENCES} items`
    )
  }

  return value.map((evidence, index) => {
    const field = `evidences.${index}`
    if (typeof evidence !== 'object' || evidence === null || Array.isArray(evidence)) {
      throw ValidationException.field(field, `${field} must be an object`)
    }

    const values = evidence as Record<string, unknown>
    return {
      evidence_type: requireTaskSubmissionEvidenceType(
        values['evidenceType'] ?? values['evidence_type'],
        `${field}.evidence_type`
      ),
      url: enforceMaxLength(
        readRequiredTaskSubmissionString(values['url'], `${field}.url`),
        `${field}.url`,
        MAX_SUBMISSION_EVIDENCE_URL_LENGTH
      ),
      title: readLimitedOptionalTaskSubmissionString(
        values['title'],
        `${field}.title`,
        MAX_SUBMISSION_EVIDENCE_TITLE_LENGTH
      ),
      description: readLimitedOptionalTaskSubmissionString(
        values['description'],
        `${field}.description`,
        MAX_SUBMISSION_EVIDENCE_DESCRIPTION_LENGTH
      ),
    }
  })
}

export function buildTaskSubmissionDTO(ctx: HttpContext, submit: boolean): SubmitTaskSubmissionDTO {
  const body = ctx.request.only([
    'summary',
    'implementationNotes',
    'implementation_notes',
    'knownLimitations',
    'known_limitations',
    'testNotes',
    'test_notes',
    'demoUrl',
    'demo_url',
    'repositoryUrl',
    'repository_url',
    'pullRequestUrl',
    'pull_request_url',
    'evidences',
  ]) as SubmissionBody

  const { taskId } = buildRequiredTaskRouteRequest(ctx.params)
  return {
    task_id: taskId,
    summary: readSummaryString(body['summary']),
    implementation_notes: readOptionalTaskSubmissionString(
      readSubmissionValue(body, 'implementationNotes', 'implementation_notes'),
      'implementation_notes'
    ),
    known_limitations: readOptionalTaskSubmissionString(
      readSubmissionValue(body, 'knownLimitations', 'known_limitations'),
      'known_limitations'
    ),
    test_notes: readOptionalTaskSubmissionString(
      readSubmissionValue(body, 'testNotes', 'test_notes'),
      'test_notes'
    ),
    demo_url: readOptionalTaskSubmissionString(
      readSubmissionValue(body, 'demoUrl', 'demo_url'),
      'demo_url'
    ),
    repository_url: readOptionalTaskSubmissionString(
      readSubmissionValue(body, 'repositoryUrl', 'repository_url'),
      'repository_url'
    ),
    pull_request_url: readOptionalTaskSubmissionString(
      readSubmissionValue(body, 'pullRequestUrl', 'pull_request_url'),
      'pull_request_url'
    ),
    submit,
    evidences: buildSubmissionEvidences(body.evidences),
  }
}
