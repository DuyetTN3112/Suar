import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { validationIssue, type ValidationIssue } from '#modules/errors/public_contracts/validation_issue'
import type { AddProjectRoleSkillInput } from '#modules/skills/actions/commands/project-roles/add_project_role_skill_command'
import type { UpdateProjectRoleSkillInput } from '#modules/skills/actions/commands/project-roles/update_project_role_skill_command'
import {
  DEFAULT_SKILL_IMPORTANCE,
  DEFAULT_SKILL_WEIGHT,
  SKILL_IMPORTANCE_VALUES,
  type SkillImportance,
} from '#modules/skills/public_contracts/skill_constants'

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


type RequestInput = { input(key: string): unknown }

function read(request: RequestInput, camel: string, snake?: string) {
  const value: unknown = request.input(camel)
  if (value !== undefined && value !== null) return value
  return snake === undefined ? undefined : request.input(snake)
}

function optionalString(
  value: unknown,
  path: string,
  issues: ValidationIssue[]
): string | null | undefined {
  if (value === undefined || value === null) return value
  if (typeof value !== 'string' || value.trim().length === 0) {
    issues.push(
      validationIssue(path, `${path} must be a non-empty string or null`, 'REQUEST_STRING_INVALID')
    )
    return undefined
  }
  return value.trim()
}

function booleanValue(value: unknown, path: string, issues: ValidationIssue[]) {
  if (value === undefined) return undefined
  if (typeof value !== 'boolean') {
    issues.push(validationIssue(path, `${path} must be a boolean`, 'REQUEST_BOOLEAN_INVALID'))
    return undefined
  }
  return value
}

function numberValue(value: unknown, path: string, issues: ValidationIssue[]) {
  if (value === undefined) return undefined
  const parsed = typeof value === 'number' || typeof value === 'string' ? Number(value) : Number.NaN
  if (!Number.isFinite(parsed)) {
    issues.push(validationIssue(path, `${path} must be a finite number`, 'REQUEST_NUMBER_INVALID'))
    return undefined
  }
  return parsed
}

function importanceValue(value: unknown, path: string, issues: ValidationIssue[]) {
  if (value === undefined) return undefined
  if (typeof value !== 'string' || !SKILL_IMPORTANCE_VALUES.includes(value as SkillImportance)) {
    issues.push(validationIssue(path, `${path} is invalid`, 'REQUEST_ENUM_INVALID'))
    return undefined
  }
  return value as SkillImportance
}

function throwIfInvalid(issues: ValidationIssue[]) {
  if (issues.length > 0) throw ValidationException.fromIssues(issues)
}

export function readUpdateProjectRoleSkillInput(
  request: RequestInput,
  projectRoleSkillId: string
): UpdateProjectRoleSkillInput {
  const issues: ValidationIssue[] = []
  const minimumLevelId = optionalString(read(request, 'minimumLevelId', 'minimum_level_id'), 'minimumLevelId', issues)
  const targetLevelId = optionalString(read(request, 'targetLevelId', 'target_level_id'), 'targetLevelId', issues)
  const assessmentCeilingLevelId = optionalString(
    read(request, 'assessmentCeilingLevelId', 'assessment_ceiling_level_id'),
    'assessmentCeilingLevelId',
    issues
  )
  const isMandatory = booleanValue(read(request, 'isMandatory', 'is_mandatory'), 'isMandatory', issues)
  const importance = importanceValue(request.input('importance'), 'importance', issues)
  const weight = numberValue(request.input('weight'), 'weight', issues)
  const sortOrder = numberValue(read(request, 'sortOrder', 'sort_order'), 'sortOrder', issues)
  const notes = optionalString(request.input('notes'), 'notes', issues)
  throwIfInvalid(issues)

  return {
    projectRoleSkillId,
    ...omitUndefined({
      minimumLevelId,
      targetLevelId,
      assessmentCeilingLevelId,
      isMandatory,
      importance,
      weight,
      sortOrder,
      notes,
    }),
  }
}

export function readAddProjectRoleSkillInput(
  request: RequestInput,
  projectProfessionalRoleId: string
): AddProjectRoleSkillInput {
  const issues: ValidationIssue[] = []
  const rawProjectSkillId = read(request, 'projectSkillId', 'project_skill_id')
  const projectSkillId = optionalString(rawProjectSkillId, 'projectSkillId', issues)
  const minimumLevelId = optionalString(read(request, 'minimumLevelId', 'minimum_level_id'), 'minimumLevelId', issues)
  const targetLevelId = optionalString(read(request, 'targetLevelId', 'target_level_id'), 'targetLevelId', issues)
  const assessmentCeilingLevelId = optionalString(
    read(request, 'assessmentCeilingLevelId', 'assessment_ceiling_level_id'),
    'assessmentCeilingLevelId',
    issues
  )
  const isMandatory = booleanValue(read(request, 'isMandatory', 'is_mandatory'), 'isMandatory', issues)
  const importance = importanceValue(request.input('importance'), 'importance', issues)
  const weight = numberValue(request.input('weight'), 'weight', issues)
  const sortOrder = numberValue(read(request, 'sortOrder', 'sort_order'), 'sortOrder', issues)
  const notes = optionalString(request.input('notes'), 'notes', issues)
  if (rawProjectSkillId === undefined || rawProjectSkillId === null || rawProjectSkillId === '') {
    issues.push(validationIssue('projectSkillId', 'projectSkillId is required', 'REQUEST_STRING_REQUIRED'))
  }
  throwIfInvalid(issues)

  return {
    projectProfessionalRoleId,
    projectSkillId: projectSkillId as string,
    minimumLevelId: minimumLevelId ?? null,
    targetLevelId: targetLevelId ?? null,
    assessmentCeilingLevelId: assessmentCeilingLevelId ?? null,
    isMandatory: isMandatory ?? false,
    importance: importance ?? DEFAULT_SKILL_IMPORTANCE,
    weight: weight ?? DEFAULT_SKILL_WEIGHT,
    sortOrder: sortOrder ?? 0,
    notes: notes ?? null,
  }
}
