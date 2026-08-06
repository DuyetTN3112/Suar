import type {
  TvaChangeClass,
  TvaPrivacyClassification,
  TvaSha256,
} from '#modules/tasks/public_contracts/task-authoring/primitives'
import type {
  ResolvedTaskContractV1,
  TaskEvidenceContractV1,
  TaskReadinessFindingV1,
  TaskReadinessResultV1,
  TaskSpecificationVersionV1,
  TaskSupportingReferenceV1,
  TaskWorkContractV1,
} from '#modules/tasks/public_contracts/task-authoring/task_contracts'

export interface TaskContractContentHashing {
  hash(value: unknown): TvaSha256
}

export type TaskWorkContractField = keyof TaskWorkContractV1
export type TaskWorkContractSource = 'task' | 'work_package' | 'project_context' | 'template'

export interface TaskWorkContractLayer {
  readonly sourceVersionId: string
  readonly privacyClassification: TvaPrivacyClassification
  readonly values: Partial<TaskWorkContractV1>
  readonly clearFields: readonly TaskWorkContractField[]
}

export interface TaskWorkContractResolutionInput {
  readonly targetPrivacyClassification: TvaPrivacyClassification
  readonly ancestryVersionIds: readonly string[]
  readonly task: TaskWorkContractLayer | null
  readonly workPackage: TaskWorkContractLayer | null
  readonly projectContext: TaskWorkContractLayer | null
  readonly template: TaskWorkContractLayer | null
}

export interface TaskWorkFieldProvenance {
  readonly source: TaskWorkContractSource
  readonly sourceVersionId: string
  readonly inherited: boolean
  readonly privacyClassification: TvaPrivacyClassification
}

export interface TaskWorkContractResolutionResult {
  readonly resolvedWork: Partial<TaskWorkContractV1>
  readonly provenance: Partial<Record<TaskWorkContractField, TaskWorkFieldProvenance>>
  readonly findings: readonly TaskReadinessFindingV1[]
  readonly warnings: readonly TaskReadinessFindingV1[]
}

export interface TaskSpecificationStructuredParityInput {
  readonly fieldPath: string
  readonly sourcePath: string
  readonly specificationValueHash: TvaSha256
  readonly structuredValueHash: TvaSha256
  readonly critical: boolean
}

export interface BuildResolvedTaskContractInput {
  readonly taskId: string
  readonly contractVersionId: string
  readonly title?: string
  readonly specification: TaskSpecificationVersionV1
  readonly resolution: TaskWorkContractResolutionInput
  readonly evidence: TaskEvidenceContractV1
  readonly supportingReferences: readonly TaskSupportingReferenceV1[]
  readonly readiness: TaskReadinessResultV1
  readonly inheritedFrom: ResolvedTaskContractV1['inheritedFrom']
  readonly parityChecks?: readonly TaskSpecificationStructuredParityInput[]
}

export interface BuildResolvedTaskContractResult {
  readonly contract: ResolvedTaskContractV1 | null
  readonly resolvedWork: Partial<TaskWorkContractV1>
  readonly provenance: Partial<Record<TaskWorkContractField, TaskWorkFieldProvenance>>
  readonly findings: readonly TaskReadinessFindingV1[]
  readonly warnings: readonly TaskReadinessFindingV1[]
}

const WORK_FIELDS = [
  'action',
  'object',
  'problemStatement',
  'desiredOutcome',
  'scope',
  'outOfScope',
  'deliverables',
  'acceptanceCriteria',
  'qualityRequirements',
  'constraints',
  'dependencies',
  'roleInTask',
  'ownershipLevel',
  'autonomyLevel',
  'collaborationType',
  'environment',
  'complexityContext',
  'impactScope',
  'estimatedUsersAffected',
  'dueAt',
] as const satisfies readonly TaskWorkContractField[]

const PRIVACY_RANK: Record<TvaPrivacyClassification, number> = {
  public: 0,
  public_safe: 1,
  redacted: 2,
  internal: 3,
  confidential: 4,
  private: 5,
}

function finding(input: {
  code: string
  severity: 'blocker' | 'warning'
  fieldPath: string
  sourcePath: string | null
  message: string
  remediationHint: string
}): TaskReadinessFindingV1 {
  return input
}

function isEmptyOverride(value: unknown): boolean {
  if (value === null || value === undefined) return true
  if (typeof value === 'string') return value.trim().length === 0
  if (Array.isArray(value)) return value.length === 0
  return false
}

function layerEntries(
  input: TaskWorkContractResolutionInput
): ReadonlyArray<[TaskWorkContractSource, TaskWorkContractLayer | null]> {
  return [
    ['task', input.task],
    ['work_package', input.workPackage],
    ['project_context', input.projectContext],
    ['template', input.template],
  ]
}

function hasOwnField(values: Partial<TaskWorkContractV1>, field: TaskWorkContractField): boolean {
  return Object.prototype.hasOwnProperty.call(values, field)
}

export function resolveTaskWorkContract(
  input: TaskWorkContractResolutionInput
): TaskWorkContractResolutionResult {
  const resolvedWork: Partial<TaskWorkContractV1> = {}
  const provenance: Partial<Record<TaskWorkContractField, TaskWorkFieldProvenance>> = {}
  const findings: TaskReadinessFindingV1[] = []
  const warnings: TaskReadinessFindingV1[] = []

  if (new Set(input.ancestryVersionIds).size !== input.ancestryVersionIds.length) {
    findings.push(
      finding({
        code: 'TVA.RESOLUTION.CIRCULAR_INHERITANCE',
        severity: 'blocker',
        fieldPath: 'ancestryVersionIds',
        sourcePath: null,
        message: 'The inheritance chain contains a repeated version.',
        remediationHint: 'Remove the circular Project Context or Work Package pin.',
      })
    )
  }
  if (!input.template) {
    findings.push(
      finding({
        code: 'TVA.RESOLUTION.TEMPLATE_VERSION_MISSING',
        severity: 'blocker',
        fieldPath: 'template',
        sourcePath: null,
        message: 'The pinned template version is unavailable.',
        remediationHint:
          'Restore the immutable template version or create an explicit replacement.',
      })
    )
  }

  for (const field of WORK_FIELDS) {
    let selected = false
    for (const [source, layer] of layerEntries(input)) {
      if (!layer || !hasOwnField(layer.values, field)) continue
      const value = layer.values[field]
      const explicitlyCleared = layer.clearFields.includes(field)
      const empty = isEmptyOverride(value)
      if (empty && !explicitlyCleared && source !== 'template') {
        warnings.push(
          finding({
            code: 'TVA.RESOLUTION.EMPTY_OVERRIDE_IGNORED',
            severity: 'warning',
            fieldPath: `work.${field}`,
            sourcePath: `${source}.${field}`,
            message: 'An empty override was ignored so it could not hide inherited content.',
            remediationHint: 'Provide a meaningful override or use an explicit clear operation.',
          })
        )
        continue
      }
      if (empty && source === 'template' && typeof value === 'string') continue

      Object.assign(resolvedWork, { [field]: value })
      provenance[field] = {
        source,
        sourceVersionId: layer.sourceVersionId,
        inherited: source !== 'task',
        privacyClassification: layer.privacyClassification,
      }
      if (
        source !== 'task' &&
        PRIVACY_RANK[layer.privacyClassification] > PRIVACY_RANK[input.targetPrivacyClassification]
      ) {
        findings.push(
          finding({
            code: 'TVA.RESOLUTION.INHERITED_PRIVACY_CONFLICT',
            severity: 'blocker',
            fieldPath: `work.${field}`,
            sourcePath: `${source}.${field}`,
            message: 'Inherited content is more restricted than the target Task visibility.',
            remediationHint: 'Restrict the Task or provide an approved redacted local override.',
          })
        )
      }
      selected = true
      break
    }
    if (!selected) {
      findings.push(
        finding({
          code: 'TVA.RESOLUTION.WORK_FIELD_MISSING',
          severity: 'blocker',
          fieldPath: `work.${field}`,
          sourcePath: null,
          message: 'No value is available from Task, Work Package, Project Context, or template.',
          remediationHint: 'Author the field locally or restore a pinned inherited source.',
        })
      )
    }
  }

  return {
    resolvedWork,
    provenance,
    findings: deduplicateFindings(findings),
    warnings: deduplicateFindings(warnings),
  }
}

function deduplicateFindings(findings: TaskReadinessFindingV1[]): TaskReadinessFindingV1[] {
  const byKey = new Map<string, TaskReadinessFindingV1>()
  for (const item of findings) {
    const key = `${item.code}:${item.fieldPath}:${item.sourcePath ?? ''}`
    if (!byKey.has(key)) byKey.set(key, item)
  }
  return [...byKey.values()].sort(
    (left, right) =>
      left.code.localeCompare(right.code) || left.fieldPath.localeCompare(right.fieldPath)
  )
}

export function compareTaskSpecificationStructuredParity(
  inputs: readonly TaskSpecificationStructuredParityInput[]
): TaskReadinessFindingV1[] {
  return inputs
    .filter((input) => input.specificationValueHash !== input.structuredValueHash)
    .map((input) =>
      finding({
        code: input.critical
          ? 'TVA.CONTRACT.RICH_STRUCTURED_MISMATCH'
          : 'TVA.CONTRACT.RICH_STRUCTURED_MISMATCH_WARNING',
        severity: input.critical ? 'blocker' : 'warning',
        fieldPath: input.fieldPath,
        sourcePath: input.sourcePath,
        message: 'Rich specification and structured contract values do not match.',
        remediationHint: 'Reconcile both representations and confirm the same requirement.',
      })
    )
}

function hasEveryWorkField(
  resolvedWork: Partial<TaskWorkContractV1>
): resolvedWork is TaskWorkContractV1 {
  return WORK_FIELDS.every((field) => Object.prototype.hasOwnProperty.call(resolvedWork, field))
}

export function buildResolvedTaskContract(
  input: BuildResolvedTaskContractInput,
  hasher: TaskContractContentHashing
): BuildResolvedTaskContractResult {
  const resolution = resolveTaskWorkContract(input.resolution)
  const parityFindings = compareTaskSpecificationStructuredParity(input.parityChecks ?? [])
  const findings = deduplicateFindings([
    ...resolution.findings,
    ...parityFindings.filter((item) => item.severity === 'blocker'),
  ])
  const warnings = deduplicateFindings([
    ...resolution.warnings,
    ...parityFindings.filter((item) => item.severity === 'warning'),
  ])
  if (!hasEveryWorkField(resolution.resolvedWork) || findings.length > 0) {
    return {
      contract: null,
      resolvedWork: resolution.resolvedWork,
      provenance: resolution.provenance,
      findings,
      warnings,
    }
  }

  const title =
    input.title?.trim() || input.specification.sectionIndex[0]?.title.trim() || 'Untitled Task'
  const hashInput = {
    schemaVersion: 'suar.resolved_task_contract.v1',
    taskId: input.taskId,
    versionId: input.contractVersionId,
    title,
    specification: {
      versionId: input.specification.id,
      richContent: input.specification.richContent,
      plainText: input.specification.plainTextProjection,
      sections: input.specification.sectionIndex,
    },
    work: resolution.resolvedWork,
    evidence: input.evidence,
    supportingReferences: input.supportingReferences,
    inheritedFrom: input.inheritedFrom,
    readiness: input.readiness,
  }
  const resolvedContentHash = hasher.hash(hashInput)
  const contract: ResolvedTaskContractV1 = {
    schemaVersion: 'suar.resolved_task_contract.v1',
    taskId: input.taskId,
    versionId: input.contractVersionId,
    title,
    specification: {
      versionId: input.specification.id,
      richContent: input.specification.richContent,
      plainText: input.specification.plainTextProjection,
      sections: input.specification.sectionIndex,
    },
    work: resolution.resolvedWork,
    evidence: input.evidence,
    supportingReferences: input.supportingReferences,
    inheritedFrom: input.inheritedFrom,
    readiness: input.readiness,
    resolvedContentHash,
  }
  return {
    contract,
    resolvedWork: resolution.resolvedWork,
    provenance: resolution.provenance,
    findings,
    warnings,
  }
}

export type TaskContractVersionChangeDecision = {
  readonly allowed: boolean
  readonly code: 'TVA.VERSION.IMMUTABLE_VERSION' | 'TVA.VERSION.SUCCESSOR_REQUIRED'
  readonly createSuccessor: true
  readonly acknowledgementRequired: boolean
}

export function decideTaskContractVersionChange(input: {
  readonly operation: 'mutate_existing' | 'create_successor'
  readonly assignmentSnapshotId: string | null
  readonly changeClass: TvaChangeClass
}): TaskContractVersionChangeDecision {
  if (input.operation === 'mutate_existing') {
    return {
      allowed: false,
      code: 'TVA.VERSION.IMMUTABLE_VERSION',
      createSuccessor: true,
      acknowledgementRequired: false,
    }
  }
  const materialAfterAssignment =
    input.assignmentSnapshotId !== null &&
    !['editorial', 'clarification', 'deadline_priority'].includes(input.changeClass)
  return {
    allowed: true,
    code: 'TVA.VERSION.SUCCESSOR_REQUIRED',
    createSuccessor: true,
    acknowledgementRequired: materialAfterAssignment,
  }
}
