import type { TvaJsonValue } from '#modules/tasks/public_contracts/task-authoring/primitives'

export const PROJECT_CONTEXT_RULE_CODES = {
  editForbidden: 'PROJECT_CONTEXT_EDIT_FORBIDDEN',
  projectArchived: 'PROJECT_CONTEXT_PROJECT_ARCHIVED',
  versionConflict: 'PROJECT_CONTEXT_VERSION_CONFLICT',
  titleRequired: 'PROJECT_CONTEXT_TITLE_REQUIRED',
  summaryRequired: 'PROJECT_CONTEXT_SUMMARY_REQUIRED',
  localContentRequired: 'PROJECT_CONTEXT_LOCAL_CONTENT_REQUIRED',
  confirmationRequired: 'PROJECT_CONTEXT_CONFIRMATION_REQUIRED',
  richContentInvalid: 'PROJECT_CONTEXT_RICH_CONTENT_INVALID',
  workPackageRequiredFields: 'WORK_PACKAGE_REQUIRED_FIELDS',
  workPackageScopeMismatch: 'WORK_PACKAGE_SCOPE_MISMATCH',
  workPackageArchived: 'WORK_PACKAGE_ARCHIVED',
  workPackageVersionConflict: 'WORK_PACKAGE_VERSION_CONFLICT',
  workPackageLocalContentRequired: 'WORK_PACKAGE_LOCAL_CONTENT_REQUIRED',
  workPackageConfirmationRequired: 'WORK_PACKAGE_CONFIRMATION_REQUIRED',
  workPackageProjectContextInvalid: 'WORK_PACKAGE_PROJECT_CONTEXT_INVALID',
} as const

export type ProjectContextRuleCode =
  (typeof PROJECT_CONTEXT_RULE_CODES)[keyof typeof PROJECT_CONTEXT_RULE_CODES]

export interface ProjectContextAuthorizationInput {
  actorId: string
  projectId: string
  organizationId: string
  canManageContext: boolean
  projectArchived: boolean
}

export interface ProjectContextPublicationInput {
  authorization: ProjectContextAuthorizationInput
  current: {
    activeVersionId: string | null
    activeVersionNumber: number
  }
  expectedActiveVersionId: string | null
  title: string
  summary: string
  localCriticalContent: string
  richContent: TvaJsonValue
  confirmed: boolean
  supportingReferences: ReadonlyArray<{
    url: string
    access: 'public' | 'authenticated' | 'restricted' | 'unknown'
  }>
}

export type ProjectContextPublicationDecision =
  | {
      allowed: true
      nextVersionNumber: number
      versionToken: string
      sanitizedRichContent: TvaJsonValue
    }
  | {
      allowed: false
      code: ProjectContextRuleCode
      field: string
      message: string
    }

type ProjectContextPublicationDenial = Extract<
  ProjectContextPublicationDecision,
  { allowed: false }
>

const blockedJsonKeys = new Set(['__proto__', 'constructor', 'prototype', 'script'])
const unsafeUrlPattern = /^\s*(?:javascript|data\s*:\s*text\/html)/i
const unsafeMarkupPattern =
  /<\s*\/?\s*(?:script|iframe|object|embed|svg|img|style)\b|<[^>]*\bon[a-z][\w-]*\s*=|(?:javascript|vbscript|data\s*:\s*text\/html)\s*:/i

function containsUnsafeRichContent(value: TvaJsonValue): boolean {
  if (typeof value === 'string') return unsafeMarkupPattern.test(value)
  if (Array.isArray(value)) return value.some((entry) => containsUnsafeRichContent(entry))
  if (value !== null && typeof value === 'object') {
    return Object.values(value).some((entry) => containsUnsafeRichContent(entry))
  }
  return false
}

function sanitizedJsonValue(value: TvaJsonValue, depth: number): TvaJsonValue {
  if (depth > 24) return null
  if (value === null || typeof value === 'boolean' || typeof value === 'number') return value
  if (typeof value === 'string') return value
  if (Array.isArray(value)) {
    const arrayValue = value as readonly TvaJsonValue[]
    return arrayValue.map((entry) => sanitizedJsonValue(entry, depth + 1))
  }

  const sanitized: Record<string, TvaJsonValue> = {}
  for (const [key, entry] of Object.entries(value)) {
    const normalizedKey = key.toLowerCase()
    if (blockedJsonKeys.has(normalizedKey) || normalizedKey.startsWith('on')) continue
    if (
      (normalizedKey === 'href' || normalizedKey === 'src' || normalizedKey === 'url') &&
      typeof entry === 'string' &&
      unsafeUrlPattern.test(entry)
    ) {
      continue
    }
    sanitized[key] = sanitizedJsonValue(entry, depth + 1)
  }
  return sanitized
}

export function sanitizeProjectContextJson(value: TvaJsonValue): TvaJsonValue {
  return sanitizedJsonValue(value, 0)
}

function deny(
  code: ProjectContextRuleCode,
  field: string,
  message: string
): ProjectContextPublicationDenial {
  return { allowed: false, code, field, message }
}

export function decideProjectContextPublication(
  input: ProjectContextPublicationInput
): ProjectContextPublicationDecision {
  if (!input.authorization.canManageContext) {
    return deny(
      PROJECT_CONTEXT_RULE_CODES.editForbidden,
      'authorization',
      'Actor may read this project but may not publish shared execution context.'
    )
  }
  if (input.authorization.projectArchived) {
    return deny(
      PROJECT_CONTEXT_RULE_CODES.projectArchived,
      'project.status',
      'Archived projects cannot publish a new context version.'
    )
  }
  if (!input.confirmed) {
    return deny(
      PROJECT_CONTEXT_RULE_CODES.confirmationRequired,
      'confirmed',
      'Project Context publication requires explicit confirmation.'
    )
  }
  if (containsUnsafeRichContent(input.richContent)) {
    return deny(
      PROJECT_CONTEXT_RULE_CODES.richContentInvalid,
      'richContent',
      'Rich content contains executable markup and cannot be published.'
    )
  }
  if (input.current.activeVersionId !== input.expectedActiveVersionId) {
    return deny(
      PROJECT_CONTEXT_RULE_CODES.versionConflict,
      'expectedActiveVersionId',
      'The active Project Context changed. Reload and review the new version before saving.'
    )
  }
  if (!input.title.trim()) {
    return deny(
      PROJECT_CONTEXT_RULE_CODES.titleRequired,
      'title',
      'Project Context title is required.'
    )
  }
  if (!input.summary.trim()) {
    return deny(
      PROJECT_CONTEXT_RULE_CODES.summaryRequired,
      'summary',
      'Project Context summary is required.'
    )
  }
  if (!input.localCriticalContent.trim()) {
    return deny(
      PROJECT_CONTEXT_RULE_CODES.localContentRequired,
      'localCriticalContent',
      'Critical execution information must be stored in Suar; a reference link is not sufficient.'
    )
  }

  const nextVersionNumber = input.current.activeVersionNumber + 1
  return {
    allowed: true,
    nextVersionNumber,
    versionToken: `${input.authorization.projectId}:context:${nextVersionNumber}`,
    sanitizedRichContent: sanitizeProjectContextJson(input.richContent),
  }
}

export interface WorkPackageDraftInput {
  projectId: string
  organizationId: string
  key: string
  title: string
  summary: string
}

export type WorkPackageDraftDecision =
  | { allowed: true; value: WorkPackageDraftInput | null }
  | { allowed: false; code: ProjectContextRuleCode; field: string; message: string }

export function validateWorkPackageDraft(
  input: WorkPackageDraftInput | null,
  scope: { projectId: string; organizationId: string }
): WorkPackageDraftDecision {
  if (input === null) return { allowed: true, value: null }
  if (input.projectId !== scope.projectId || input.organizationId !== scope.organizationId) {
    return {
      allowed: false,
      code: PROJECT_CONTEXT_RULE_CODES.workPackageScopeMismatch,
      field: 'projectId',
      message: 'Work Package must belong to the same organization and project.',
    }
  }
  if (!input.key.trim() || !input.title.trim() || !input.summary.trim()) {
    return {
      allowed: false,
      code: PROJECT_CONTEXT_RULE_CODES.workPackageRequiredFields,
      field: !input.key.trim() ? 'key' : !input.title.trim() ? 'title' : 'summary',
      message: 'A created Work Package requires key, title, and local summary.',
    }
  }
  return {
    allowed: true,
    value: {
      ...input,
      key: input.key.trim(),
      title: input.title.trim(),
      summary: input.summary.trim(),
    },
  }
}

export interface WorkPackagePublicationInput {
  authorization: ProjectContextAuthorizationInput
  workPackage: {
    id: string
    projectId: string
    organizationId: string
    state: 'active' | 'archived'
    activeVersionId: string | null
    activeVersionNumber: number
  }
  expectedActiveVersionId: string | null
  projectContextVersionId: string | null
  projectContextVersionValid: boolean
  draft: WorkPackageDraftInput
  localCriticalContent: string
  richContent: TvaJsonValue
  confirmed: boolean
}

export type WorkPackagePublicationDecision =
  | {
      allowed: true
      nextVersionNumber: number
      versionToken: string
      value: WorkPackageDraftInput
      sanitizedRichContent: TvaJsonValue
    }
  | {
      allowed: false
      code: ProjectContextRuleCode
      field: string
      message: string
    }

export function decideWorkPackagePublication(
  input: WorkPackagePublicationInput
): WorkPackagePublicationDecision {
  if (!input.authorization.canManageContext) {
    return deny(
      PROJECT_CONTEXT_RULE_CODES.editForbidden,
      'authorization',
      'Actor may read this project but may not publish a Work Package version.'
    )
  }
  if (input.authorization.projectArchived) {
    return deny(
      PROJECT_CONTEXT_RULE_CODES.projectArchived,
      'project.status',
      'Archived projects cannot publish a Work Package version.'
    )
  }
  if (!input.confirmed) {
    return deny(
      PROJECT_CONTEXT_RULE_CODES.workPackageConfirmationRequired,
      'confirmed',
      'Work Package publication requires explicit confirmation.'
    )
  }
  if (containsUnsafeRichContent(input.richContent)) {
    return deny(
      PROJECT_CONTEXT_RULE_CODES.richContentInvalid,
      'richContent',
      'Rich content contains executable markup and cannot be published.'
    )
  }
  if (
    input.workPackage.projectId !== input.authorization.projectId ||
    input.workPackage.organizationId !== input.authorization.organizationId
  ) {
    return deny(
      PROJECT_CONTEXT_RULE_CODES.workPackageScopeMismatch,
      'workPackageId',
      'Work Package must belong to the authorized organization and project.'
    )
  }
  if (input.workPackage.state === 'archived') {
    return deny(
      PROJECT_CONTEXT_RULE_CODES.workPackageArchived,
      'workPackage.state',
      'Archived Work Packages cannot publish a new version.'
    )
  }
  if (input.workPackage.activeVersionId !== input.expectedActiveVersionId) {
    return deny(
      PROJECT_CONTEXT_RULE_CODES.workPackageVersionConflict,
      'expectedActiveVersionId',
      'The active Work Package version changed. Reload before saving.'
    )
  }
  if (input.projectContextVersionId !== null && !input.projectContextVersionValid) {
    return deny(
      PROJECT_CONTEXT_RULE_CODES.workPackageProjectContextInvalid,
      'projectContextVersionId',
      'Pinned Project Context version does not belong to this project and organization.'
    )
  }

  const draftDecision = validateWorkPackageDraft(input.draft, {
    projectId: input.authorization.projectId,
    organizationId: input.authorization.organizationId,
  })
  if (!draftDecision.allowed || draftDecision.value === null) {
    return draftDecision.allowed
      ? deny(
          PROJECT_CONTEXT_RULE_CODES.workPackageRequiredFields,
          'workPackage',
          'Publishing requires a Work Package.'
        )
      : draftDecision
  }
  if (!input.localCriticalContent.trim()) {
    return deny(
      PROJECT_CONTEXT_RULE_CODES.workPackageLocalContentRequired,
      'localCriticalContent',
      'Critical Work Package information must be stored in Suar; a link is not sufficient.'
    )
  }

  const nextVersionNumber = input.workPackage.activeVersionNumber + 1
  return {
    allowed: true,
    nextVersionNumber,
    versionToken: `${input.authorization.projectId}:work-package:${input.workPackage.id}:${nextVersionNumber}`,
    value: draftDecision.value,
    sanitizedRichContent: sanitizeProjectContextJson(input.richContent),
  }
}
