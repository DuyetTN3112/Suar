import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { validationIssue, type ValidationIssue } from '#modules/errors/public_contracts/validation_issue'

function readInput(request: { input(key: string): unknown }, camel: string, snake?: string) {
  return request.input(camel) ?? (snake === undefined ? undefined : request.input(snake))
}

function readOptionalString(value: unknown, path: string, issues: ValidationIssue[]) {
  if (value === undefined || value === null) return value
  if (typeof value !== 'string') {
    issues.push(validationIssue(path, `${path} must be a string or null`, 'REQUEST_STRING_INVALID'))
    return undefined
  }
  return value.trim()
}

function readRequiredString(value: unknown, path: string, issues: ValidationIssue[]) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    issues.push(validationIssue(path, `${path} is required`, 'REQUEST_STRING_REQUIRED'))
    return ''
  }
  return value.trim()
}

function readRouteId(params: unknown, key: string) {
  const value = params && typeof params === 'object' && !Array.isArray(params)
    ? (params as Record<string, unknown>)[key]
    : undefined
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw ValidationException.fromIssues([
      validationIssue(key, `${key} is required`, 'ROUTE_PARAMETER_REQUIRED'),
    ])
  }
  return value.trim()
}

export function buildProjectRouteRequest(params: unknown) {
  return { projectId: readRouteId(params, 'projectId') }
}

export function buildProjectSkillRouteRequest(params: unknown) {
  return {
    projectId: readRouteId(params, 'projectId'),
    projectSkillId: readRouteId(params, 'projectSkillId'),
  }
}

export function buildProjectRoleRouteRequest(params: unknown) {
  return {
    projectId: readRouteId(params, 'projectId'),
    roleId: readRouteId(params, 'roleId'),
    roleSkillId: (params && typeof params === 'object' && !Array.isArray(params)
      ? (params as Record<string, unknown>)['roleSkillId']
      : undefined) === undefined
      ? undefined
      : readRouteId(params, 'roleSkillId'),
  }
}

export function buildAddProjectSkillRequest(
  request: { input(key: string): unknown },
  params: unknown
) {
  const { projectId } = buildProjectRouteRequest(params)
  const issues: ValidationIssue[] = []
  const skillId = readRequiredString(readInput(request, 'skillId', 'skill_id'), 'skillId', issues)
  if (issues.length > 0) throw ValidationException.fromIssues(issues)
  return { projectId, skillId }
}

export function buildCreateProjectRoleRequest(
  request: { input(key: string): unknown },
  params: unknown
) {
  const { projectId } = buildProjectRouteRequest(params)
  const issues: ValidationIssue[] = []
  const templateIdValue = readOptionalString(readInput(request, 'templateId', 'template_id'), 'templateId', issues)
  const codeValue = readOptionalString(request.input('code'), 'code', issues)
  const nameValue = readOptionalString(request.input('name'), 'name', issues)
  const descriptionValue = readOptionalString(request.input('description'), 'description', issues)
  const templateId = typeof templateIdValue === 'string' ? templateIdValue : undefined
  const code = typeof codeValue === 'string' ? codeValue : undefined
  const name = typeof nameValue === 'string' ? nameValue : undefined
  const description = typeof descriptionValue === 'string' ? descriptionValue : undefined
  if (templateId === undefined && (typeof code !== 'string' || code.length === 0)) {
    issues.push(validationIssue('code', 'code is required for a custom role', 'REQUEST_STRING_REQUIRED'))
  }
  if (templateId === undefined && (typeof name !== 'string' || name.length === 0)) {
    issues.push(validationIssue('name', 'name is required for a custom role', 'REQUEST_STRING_REQUIRED'))
  }
  if (issues.length > 0) throw ValidationException.fromIssues(issues)
  return {
    projectId,
    ...(templateId === undefined ? {} : { templateId }),
    ...(code === undefined ? {} : { code }),
    ...(name === undefined ? {} : { name }),
    ...(description === undefined ? {} : { description }),
  }
}

export function buildUpdateProjectSkillRequest(
  request: { input(key: string): unknown },
  params: unknown
) {
  const route = buildProjectSkillRouteRequest(params)
  const issues: ValidationIssue[] = []
  const displayNameOverride = readOptionalString(readInput(request, 'displayNameOverride', 'display_name_override'), 'displayNameOverride', issues)
  const descriptionOverride = readOptionalString(readInput(request, 'descriptionOverride', 'description_override'), 'descriptionOverride', issues)
  const rubricVersionId = readOptionalString(readInput(request, 'rubricVersionId', 'rubric_version_id'), 'rubricVersionId', issues)
  if (issues.length > 0) throw ValidationException.fromIssues(issues)
  return {
    ...route,
    ...(displayNameOverride === undefined ? {} : { displayNameOverride }),
    ...(descriptionOverride === undefined ? {} : { descriptionOverride }),
    ...(rubricVersionId === undefined ? {} : { rubricVersionId }),
  }
}
