export interface ValidationIssue {
  readonly code: string
  readonly path: string
  readonly message: string
  readonly rule?: string
}

export function validationIssue(
  path: string,
  message: string,
  code = 'VALIDATION_FIELD',
  rule?: string
): ValidationIssue {
  const normalizedPath = path.trim()
  const normalizedMessage = message.trim()

  if (!normalizedPath) throw new TypeError('Validation issue path is required')
  if (!normalizedMessage) throw new TypeError('Validation issue message is required')

  return {
    code: code.trim() || 'VALIDATION_FIELD',
    path: normalizedPath,
    message: normalizedMessage,
    ...(rule?.trim() ? { rule: rule.trim() } : {}),
  }
}

export function validationIssuesFromRecord(
  errors: Record<string, string>
): readonly ValidationIssue[] {
  return Object.entries(errors).map(([path, message]) => validationIssue(path, message))
}

export function flattenValidationIssues(
  issues: readonly ValidationIssue[]
): Record<string, string> {
  return issues.reduce<Record<string, string>>((flattened, issue) => {
    flattened[issue.path] ??= issue.message
    return flattened
  }, {})
}
