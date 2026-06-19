import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { validationIssue, type ValidationIssue } from '#modules/errors/public_contracts/validation_issue'

type OptionalPayloadKeys<T extends object> = {
  [Key in keyof T]-?: undefined extends T[Key] ? Key : never
}[keyof T]

type OmittedUndefined<T extends object> = {
  [Key in keyof T as Key extends OptionalPayloadKeys<T> ? never : Key]: T[Key]
} & {
  [Key in OptionalPayloadKeys<T>]?: Exclude<T[Key], undefined>
}

function omitUndefined<T extends object>(value: T): OmittedUndefined<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined)
  ) as OmittedUndefined<T>
}


export interface UpdateOrganizationSettingsInput {
  readonly name?: string
  readonly description?: string
  readonly website?: string
  readonly email?: string
}

function asRecord(value: unknown, issues: ValidationIssue[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    issues.push(validationIssue('body', 'Request body must be an object', 'REQUEST_OBJECT_REQUIRED'))
    return {}
  }
  return value as Record<string, unknown>
}

function optionalString(value: unknown, path: string, issues: ValidationIssue[]): string | undefined {
  if (value === undefined || value === null || value === '') return undefined
  if (typeof value !== 'string') {
    issues.push(validationIssue(path, `${path} must be a string`, 'REQUEST_STRING_INVALID'))
    return undefined
  }
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : undefined
}

export function buildUpdateOrganizationSettingsInput(payload: unknown): UpdateOrganizationSettingsInput {
  const issues: ValidationIssue[] = []
  const body = asRecord(payload, issues)
  const input = omitUndefined({
    name: optionalString(body['name'], 'name', issues),
    description: optionalString(body['description'], 'description', issues),
    website: optionalString(body['website'], 'website', issues),
    email: optionalString(body['email'], 'email', issues),
  })
  if (issues.length > 0) throw ValidationException.fromIssues(issues)
  return input
}
