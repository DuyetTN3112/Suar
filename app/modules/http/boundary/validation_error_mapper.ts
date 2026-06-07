import type { ApiV1ProblemViolation } from '../../../contracts/api/v1/errors.js'

import type { ValidationIssue } from '#modules/errors/public_contracts/validation_issue'

export interface MappedValidationErrors {
  readonly errors: Record<string, string>
  readonly violations: readonly ApiV1ProblemViolation[]
}

function toJsonPointer(path: string): string {
  return `/${path
    .replace(/\[(\d+)\]/g, '.$1')
    .split('.')
    .filter(Boolean)
    .map((segment) => segment.replace(/~/g, '~0').replace(/\//g, '~1'))
    .join('/')}`
}

export function mapValidationIssues(issues: readonly ValidationIssue[]): MappedValidationErrors {
  const errors: Record<string, string> = {}
  const violations: ApiV1ProblemViolation[] = []

  for (const issue of issues) {
    if (errors[issue.path] === undefined) errors[issue.path] = issue.message
    violations.push({
      field: issue.path,
      pointer: toJsonPointer(issue.path),
      message: issue.message,
      code: issue.code,
    })
  }

  return { errors, violations }
}
