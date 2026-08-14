import type { TvaJsonObject } from '#modules/tasks/public_contracts/task-authoring/primitives'
import type {
  ProjectContextVersionV1,
  WorkPackageVersionV1,
} from '#modules/projects/public_contracts/project-context/task_to_accomplishment_project_contracts'
import type {
  TaskReadinessFindingV1,
  TaskWorkContractV1,
} from '#modules/tasks/public_contracts/task-authoring/task_contracts'
import type { TaskAuthoringInheritanceFactReaderV1 } from '#modules/projects/public_contracts/task_authoring_inheritance_facts_v1'
import type {
  TaskAuthoringInheritanceReadInput,
  TaskAuthoringInheritanceReader,
  TaskAuthoringInheritanceSnapshot,
} from '#modules/tasks/actions/ports/outbound/task-authoring/task_authoring_inheritance_reader'
import type { TaskTransaction } from '#modules/tasks/actions/ports/outbound/task_transaction'
import type { TaskWorkContractLayer } from '#modules/tasks/domain/task-authoring/task_contract_resolution'

const WORK_CONTRACT_FIELDS = [
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
] as const satisfies readonly (keyof TaskWorkContractV1)[]

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function contractRecord(value: TvaJsonObject): Record<string, unknown> {
  const source = value as Record<string, unknown>
  const nested = source['workContract'] ?? source['work_contract']
  return isRecord(nested) ? nested : source
}

function readWorkValues(value: TvaJsonObject): Partial<TaskWorkContractV1> {
  const source = contractRecord(value)
  const values: Partial<TaskWorkContractV1> = {}
  for (const field of WORK_CONTRACT_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(source, field)) {
      Object.assign(values, { [field]: source[field] })
    }
  }
  return values
}

function readClearFields(value: TvaJsonObject): readonly (keyof TaskWorkContractV1)[] {
  const source = contractRecord(value)
  const raw = source['_clearFields'] ?? source['clearFields']
  if (!Array.isArray(raw)) return []
  const allowed = new Set<string>(WORK_CONTRACT_FIELDS)
  return raw.filter(
    (entry): entry is keyof TaskWorkContractV1 => typeof entry === 'string' && allowed.has(entry)
  )
}

function finding(
  code: string,
  fieldPath: string,
  message: string,
  remediationHint: string
): TaskReadinessFindingV1 {
  return {
    code,
    severity: 'blocker',
    fieldPath,
    sourcePath: null,
    message,
    remediationHint,
  }
}

function projectContextLayer(version: ProjectContextVersionV1): TaskWorkContractLayer {
  return {
    sourceVersionId: version.id,
    privacyClassification: version.privacyClassification,
    values: readWorkValues(version.structuredDefaults),
    clearFields: readClearFields(version.structuredDefaults),
  }
}

function workPackageLayer(version: WorkPackageVersionV1): TaskWorkContractLayer {
  return {
    sourceVersionId: version.id,
    privacyClassification: version.privacyClassification,
    values: readWorkValues(version.structuredOverrides),
    clearFields: readClearFields(version.structuredOverrides),
  }
}

export class LucidTaskAuthoringInheritanceReader implements TaskAuthoringInheritanceReader {
  constructor(private readonly facts: TaskAuthoringInheritanceFactReaderV1) {}

  async readExactPins(
    input: TaskAuthoringInheritanceReadInput,
    transaction?: TaskTransaction
  ): Promise<TaskAuthoringInheritanceSnapshot> {
    const findings: TaskReadinessFindingV1[] = []
    let projectContext: TaskWorkContractLayer | null = null
    let workPackage: TaskWorkContractLayer | null = null
    const facts = await this.facts.readExactTaskAuthoringInheritance(input, transaction)

    if (input.projectContextVersionId) {
      if (!facts.projectContextVersion) {
        findings.push(
          finding(
            'TVA.RESOLUTION.PROJECT_CONTEXT_PIN_FORBIDDEN',
            'projectContextVersionId',
            'Pinned Project Context is unavailable in this organization and project.',
            'Select an accessible immutable Project Context version.'
          )
        )
      } else {
        projectContext = projectContextLayer(facts.projectContextVersion)
      }
    }

    if (input.workPackageVersionId) {
      if (!facts.workPackageVersion) {
        findings.push(
          finding(
            'TVA.RESOLUTION.WORK_PACKAGE_PIN_FORBIDDEN',
            'workPackageVersionId',
            'Pinned Work Package is unavailable in this organization and project.',
            'Select an accessible immutable Work Package version.'
          )
        )
      } else {
        workPackage = workPackageLayer(facts.workPackageVersion)
      }
    }

    return { projectContext, workPackage, findings }
  }
}
