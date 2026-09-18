import type { TvaChangeClass } from '#modules/tasks/public_contracts/task-authoring/primitives'
import type { ResolvedTaskContractV1 } from '#modules/tasks/public_contracts/task-authoring/task_contracts'

export type TaskContractEffectiveChangeClass = Extract<
  TvaChangeClass,
  | 'editorial'
  | 'clarification'
  | 'deadline_priority'
  | 'material_scope'
  | 'acceptance'
  | 'evidence'
  | 'ownership'
>

export type TaskContractChangeCode =
  | 'TVA.CHANGE.INITIAL'
  | 'TVA.CHANGE.NONE'
  | 'TVA.CHANGE.EDITORIAL'
  | 'TVA.CHANGE.CLARIFICATION'
  | 'TVA.CHANGE.DEADLINE_PRIORITY'
  | 'TVA.CHANGE.MATERIAL_SCOPE'
  | 'TVA.CHANGE.ACCEPTANCE'
  | 'TVA.CHANGE.EVIDENCE'
  | 'TVA.CHANGE.OWNERSHIP'
  | 'TVA.CHANGE.INHERITED_PIN_CHANGED'
  | 'TVA.CHANGE.CRITICAL_SPECIFICATION_DRIFT'
  | 'TVA.CHANGE.UNEXPLAINED_PLAIN_TEXT_DRIFT'
  | 'TVA.CHANGE.UNCLASSIFIED_FAIL_SAFE'

export interface TaskContractChangePolicy {
  readonly clarificationRequiresReack?: boolean
  readonly deadlinePriorityRequiresReack?: boolean
}

export interface ClassifyTaskContractChangeInput {
  readonly previous: ResolvedTaskContractV1
  readonly next: ResolvedTaskContractV1
  readonly previousPriority?: string | null
  readonly nextPriority?: string | null
  readonly policy?: TaskContractChangePolicy
}

export interface TaskContractChangeDecision {
  readonly changeClass: TaskContractEffectiveChangeClass | null
  readonly code: TaskContractChangeCode
  readonly codes: readonly TaskContractChangeCode[]
  readonly changedPaths: readonly string[]
  readonly requiresReack: boolean
}

/**
 * Immutable identifiers for the first Assignment Contract change-classification ruleset.
 * A new classifier or policy must receive a new identifier instead of changing V1 semantics.
 */
export const TASK_CONTRACT_CHANGE_CLASSIFIER_VERSION_V1 =
  'suar.task_contract_change_classifier.v1' as const
export const TASK_CONTRACT_CHANGE_POLICY_VERSION_V1 =
  'suar.task_contract_change_policy.v1' as const

export interface TaskContractChangeDecisionV1 {
  readonly classifierVersion: typeof TASK_CONTRACT_CHANGE_CLASSIFIER_VERSION_V1
  readonly policyVersion: typeof TASK_CONTRACT_CHANGE_POLICY_VERSION_V1
  readonly changeClass: TaskContractEffectiveChangeClass | 'initial' | null
  readonly code: TaskContractChangeCode
  readonly codes: readonly TaskContractChangeCode[]
  readonly changedPaths: readonly string[]
  readonly requiresReack: boolean
}

export const TASK_CONTRACT_CHANGE_POLICY_V1: Readonly<Required<TaskContractChangePolicy>> =
  Object.freeze({
    clarificationRequiresReack: false,
    deadlinePriorityRequiresReack: false,
  })

export const INITIAL_TASK_CONTRACT_CHANGE_DECISION_V1: TaskContractChangeDecisionV1 = Object.freeze(
  {
    classifierVersion: TASK_CONTRACT_CHANGE_CLASSIFIER_VERSION_V1,
    policyVersion: TASK_CONTRACT_CHANGE_POLICY_VERSION_V1,
    changeClass: 'initial',
    code: 'TVA.CHANGE.INITIAL',
    codes: Object.freeze(['TVA.CHANGE.INITIAL'] as const),
    changedPaths: Object.freeze([] as string[]),
    requiresReack: true,
  }
)

export const CHANGE_CLASS_PRECEDENCE = [
  'ownership',
  'evidence',
  'acceptance',
  'material_scope',
  'deadline_priority',
  'clarification',
  'editorial',
] as const satisfies readonly TaskContractEffectiveChangeClass[]

export const CHANGE_CLASS_CODES: Readonly<
  Record<TaskContractEffectiveChangeClass, TaskContractChangeCode>
> = Object.freeze({
  editorial: 'TVA.CHANGE.EDITORIAL',
  clarification: 'TVA.CHANGE.CLARIFICATION',
  deadline_priority: 'TVA.CHANGE.DEADLINE_PRIORITY',
  material_scope: 'TVA.CHANGE.MATERIAL_SCOPE',
  acceptance: 'TVA.CHANGE.ACCEPTANCE',
  evidence: 'TVA.CHANGE.EVIDENCE',
  ownership: 'TVA.CHANGE.OWNERSHIP',
})

export const OWNERSHIP_PATHS = new Set([
  'work.roleInTask',
  'work.ownershipLevel',
  'work.autonomyLevel',
  'work.collaborationType',
])

export const ACCEPTANCE_PREFIXES = ['work.acceptanceCriteria', 'work.qualityRequirements'] as const

export const MATERIAL_CHANGE_CLASSES = new Set<TaskContractEffectiveChangeClass>([
  'material_scope',
  'acceptance',
  'evidence',
  'ownership',
])

export const TASK_CONTRACT_CHANGE_CLASSES_V1 = new Set<
  TaskContractChangeDecisionV1['changeClass']
>([null, 'initial', ...CHANGE_CLASS_PRECEDENCE])

export const TASK_CONTRACT_CHANGE_CODES_V1 = new Set<TaskContractChangeCode>([
  'TVA.CHANGE.INITIAL',
  'TVA.CHANGE.NONE',
  ...Object.values(CHANGE_CLASS_CODES),
  'TVA.CHANGE.INHERITED_PIN_CHANGED',
  'TVA.CHANGE.CRITICAL_SPECIFICATION_DRIFT',
  'TVA.CHANGE.UNEXPLAINED_PLAIN_TEXT_DRIFT',
  'TVA.CHANGE.UNCLASSIFIED_FAIL_SAFE',
])
