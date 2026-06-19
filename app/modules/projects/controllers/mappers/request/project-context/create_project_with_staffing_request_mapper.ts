import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { validationIssue, type ValidationIssue } from '#modules/errors/public_contracts/validation_issue'
import { buildCreateProjectDTO } from '#modules/projects/controllers/mappers/request/project-context/project_request_mapper'

interface InitialStaffingAssignment {
  readonly userId: string
  readonly templateCode: string
}

interface CreateProjectWithStaffingRequest {
  readonly organizationId: string
  readonly afterCreateFocus?: 'members' | 'roles' | 'tasks'
  readonly project: ReturnType<typeof buildCreateProjectDTO>
  readonly seedRoleTemplates: string[]
  readonly initialStaffingAssignments: InitialStaffingAssignment[]
}
function readRequiredString(value: unknown, path: string, issues: ValidationIssue[]) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    issues.push(validationIssue(path, `${path} is required`, 'REQUEST_STRING_REQUIRED'))
    return ''
  }
  return value.trim()
}
function readStringList(value: unknown, path: string, issues: ValidationIssue[]) {
  if (value === undefined) return []
  if (!Array.isArray(value)) {
    issues.push(validationIssue(path, `${path} must be an array`, 'REQUEST_ARRAY_REQUIRED'))
    return []
  }
  return value.map((entry, index) => readRequiredString(entry, `${path}.${index}`, issues))
}
function readAssignments(value: unknown, issues: ValidationIssue[]): InitialStaffingAssignment[] {
  if (value === undefined) return []
  if (!Array.isArray(value)) {
    issues.push(validationIssue('initialStaffingAssignments', 'initialStaffingAssignments must be an array', 'REQUEST_ARRAY_REQUIRED'))
    return []
  }

  const assignments: InitialStaffingAssignment[] = []
  const seenUserIds = new Set<string>()
  value.forEach((entry, index) => {
    const record = entry && typeof entry === 'object' && !Array.isArray(entry)
      ? entry as Record<string, unknown>
      : {}
    const userId = readRequiredString(record['userId'], `initialStaffingAssignments.${index}.userId`, issues)
    const templateCode = readRequiredString(record['templateCode'], `initialStaffingAssignments.${index}.templateCode`, issues)
    if (userId && templateCode && !seenUserIds.has(userId)) {
      seenUserIds.add(userId)
      assignments.push({ userId, templateCode })
    }
  })
  return assignments
}

export function buildCreateProjectWithStaffingRequest(request: Parameters<typeof buildCreateProjectDTO>[0]): CreateProjectWithStaffingRequest {
  const issues: ValidationIssue[] = []
  const organizationId = readRequiredString(
    request.input('organizationId') ?? request.input('organization_id'),
    'organizationId',
    issues
  )
  const focus: unknown = request.input('afterCreateFocus')
  if (focus !== undefined && (typeof focus !== 'string' || !['members', 'roles', 'tasks'].includes(focus))) {
    issues.push(validationIssue('afterCreateFocus', 'afterCreateFocus is invalid', 'REQUEST_ENUM_INVALID'))
  }
  const seedRoleTemplates = readStringList(request.input('seedRoleTemplates'), 'seedRoleTemplates', issues)
  const initialStaffingAssignments = readAssignments(request.input('initialStaffingAssignments'), issues)
  if (issues.length > 0) throw ValidationException.fromIssues(issues)

  return {
    organizationId,
    ...(focus === undefined ? {} : { afterCreateFocus: focus as 'members' | 'roles' | 'tasks' }),
    project: buildCreateProjectDTO(request, organizationId),
    seedRoleTemplates,
    initialStaffingAssignments,
  }

}
