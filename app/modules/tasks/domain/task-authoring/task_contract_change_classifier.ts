import type { TvaChangeClass } from '#modules/tasks/public_contracts/task-authoring/primitives'
import type {
  ResolvedTaskContractV1,
  TaskSpecificationSectionV1,
} from '#modules/tasks/public_contracts/task-authoring/task_contracts'

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

const TASK_CONTRACT_CHANGE_POLICY_V1: Readonly<Required<TaskContractChangePolicy>> = Object.freeze({
  clarificationRequiresReack: false,
  deadlinePriorityRequiresReack: false,
})

export const INITIAL_TASK_CONTRACT_CHANGE_DECISION_V1: TaskContractChangeDecisionV1 =
  Object.freeze({
    classifierVersion: TASK_CONTRACT_CHANGE_CLASSIFIER_VERSION_V1,
    policyVersion: TASK_CONTRACT_CHANGE_POLICY_VERSION_V1,
    changeClass: 'initial',
    code: 'TVA.CHANGE.INITIAL',
    codes: Object.freeze(['TVA.CHANGE.INITIAL'] as const),
    changedPaths: Object.freeze([] as string[]),
    requiresReack: true,
  })

const CHANGE_CLASS_PRECEDENCE = [
  'ownership',
  'evidence',
  'acceptance',
  'material_scope',
  'deadline_priority',
  'clarification',
  'editorial',
] as const satisfies readonly TaskContractEffectiveChangeClass[]

const CHANGE_CLASS_CODES: Readonly<Record<TaskContractEffectiveChangeClass, TaskContractChangeCode>> =
  Object.freeze({
    editorial: 'TVA.CHANGE.EDITORIAL',
    clarification: 'TVA.CHANGE.CLARIFICATION',
    deadline_priority: 'TVA.CHANGE.DEADLINE_PRIORITY',
    material_scope: 'TVA.CHANGE.MATERIAL_SCOPE',
    acceptance: 'TVA.CHANGE.ACCEPTANCE',
    evidence: 'TVA.CHANGE.EVIDENCE',
    ownership: 'TVA.CHANGE.OWNERSHIP',
  })

const OWNERSHIP_PATHS = new Set([
  'work.roleInTask',
  'work.ownershipLevel',
  'work.autonomyLevel',
  'work.collaborationType',
])

const ACCEPTANCE_PREFIXES = ['work.acceptanceCriteria', 'work.qualityRequirements'] as const

const MATERIAL_CHANGE_CLASSES = new Set<TaskContractEffectiveChangeClass>([
  'material_scope',
  'acceptance',
  'evidence',
  'ownership',
])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function valuesEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) {
    return true
  }
  if (Array.isArray(left) && Array.isArray(right)) {
    return (
      left.length === right.length && left.every((value, index) => valuesEqual(value, right[index]))
    )
  }
  if (isRecord(left) && isRecord(right)) {
    const leftKeys = Object.keys(left).sort()
    const rightKeys = Object.keys(right).sort()
    return (
      leftKeys.length === rightKeys.length &&
      leftKeys.every((key, index) => key === rightKeys[index] && valuesEqual(left[key], right[key]))
    )
  }
  return false
}

function collectChangedPaths(
  previous: unknown,
  next: unknown,
  path: string,
  output: string[]
): void {
  if (Object.is(previous, next)) {
    return
  }

  if (path === 'specification.richContent') {
    if (!valuesEqual(previous, next)) {
      output.push(path)
    }
    return
  }

  if (Array.isArray(previous) && Array.isArray(next)) {
    if (previous.length !== next.length) {
      output.push(`${path}.length`)
    }
    const commonLength = Math.min(previous.length, next.length)
    for (let index = 0; index < commonLength; index += 1) {
      collectChangedPaths(previous[index], next[index], `${path}.${index}`, output)
    }
    for (let index = commonLength; index < Math.max(previous.length, next.length); index += 1) {
      output.push(`${path}.${index}`)
    }
    return
  }

  if (isRecord(previous) && isRecord(next)) {
    const keys = [...new Set([...Object.keys(previous), ...Object.keys(next)])].sort()
    for (const key of keys) {
      const childPath = path.length === 0 ? key : `${path}.${key}`
      collectChangedPaths(previous[key], next[key], childPath, output)
    }
    return
  }

  output.push(path)
}

function comparableContract(contract: ResolvedTaskContractV1): Record<string, unknown> {
  return {
    taskId: contract.taskId,
    title: contract.title,
    specification: {
      richContent: contract.specification.richContent,
      plainText: contract.specification.plainText,
      sections: contract.specification.sections,
    },
    work: contract.work,
    evidence: contract.evidence,
    supportingReferences: contract.supportingReferences,
    inheritedFrom: contract.inheritedFrom,
  }
}

function sectionById(
  sections: readonly TaskSpecificationSectionV1[],
  id: string
): TaskSpecificationSectionV1 | undefined {
  return sections.find((section) => section.id === id)
}

function criticalSectionChanged(
  previous: readonly TaskSpecificationSectionV1[],
  next: readonly TaskSpecificationSectionV1[]
): boolean {
  const ids = new Set([...previous.map((section) => section.id), ...next.map((section) => section.id)])
  return [...ids].some((id) => {
    const previousSection = sectionById(previous, id)
    const nextSection = sectionById(next, id)
    if (!previousSection?.critical && !nextSection?.critical) {
      return false
    }
    return !valuesEqual(previousSection, nextSection)
  })
}

function criticalPlainTextChanged(
  previous: readonly TaskSpecificationSectionV1[],
  next: readonly TaskSpecificationSectionV1[]
): boolean {
  const ids = new Set([...previous.map((section) => section.id), ...next.map((section) => section.id)])
  return [...ids].some((id) => {
    const previousSection = sectionById(previous, id)
    const nextSection = sectionById(next, id)
    if (!previousSection?.critical && !nextSection?.critical) {
      return false
    }
    return previousSection?.plainText !== nextSection?.plainText
  })
}

function startsWithAny(path: string, prefixes: readonly string[]): boolean {
  return prefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}.`))
}

function addPathClass(
  path: string,
  classes: Set<TaskContractEffectiveChangeClass>,
  criticalSpecificationDrift: boolean,
  unexplainedPlainTextDrift: boolean
): boolean {
  if (path === 'specification.richContent') {
    classes.add('editorial')
    return true
  }
  if (path === 'specification.plainText' || path.startsWith('specification.sections.')) {
    classes.add(
      criticalSpecificationDrift || unexplainedPlainTextDrift ? 'material_scope' : 'clarification'
    )
    return true
  }
  if (path === 'priority' || path === 'work.dueAt') {
    classes.add('deadline_priority')
    return true
  }
  if (OWNERSHIP_PATHS.has(path)) {
    classes.add('ownership')
    return true
  }
  if (startsWithAny(path, ACCEPTANCE_PREFIXES)) {
    classes.add('acceptance')
    return true
  }
  if (path === 'evidence' || path.startsWith('evidence.')) {
    classes.add('evidence')
    return true
  }
  if (path === 'inheritedFrom' || path.startsWith('inheritedFrom.')) {
    classes.add('material_scope')
    return true
  }
  if (path === 'supportingReferences' || path.startsWith('supportingReferences.')) {
    classes.add('clarification')
    return true
  }
  if (path === 'title' || path === 'work' || path.startsWith('work.')) {
    classes.add('material_scope')
    return true
  }
  return false
}

function requiresReack(
  changeClass: TaskContractEffectiveChangeClass,
  policy: TaskContractChangePolicy | undefined
): boolean {
  if (MATERIAL_CHANGE_CLASSES.has(changeClass)) {
    return true
  }
  if (changeClass === 'clarification') {
    return policy?.clarificationRequiresReack === true
  }
  if (changeClass === 'deadline_priority') {
    return policy?.deadlinePriorityRequiresReack === true
  }
  return false
}

function classifyTaskContractChangeWithPolicyV1(
  input: ClassifyTaskContractChangeInput
): TaskContractChangeDecision {
  const changedPaths: string[] = []
  collectChangedPaths(
    comparableContract(input.previous),
    comparableContract(input.next),
    '',
    changedPaths
  )
  const normalizedPaths = changedPaths
  if (!Object.is(input.previousPriority, input.nextPriority)) {
    normalizedPaths.push('priority')
  }
  const stableChangedPaths = [...new Set(normalizedPaths)].sort()

  if (stableChangedPaths.length === 0) {
    return {
      changeClass: null,
      code: 'TVA.CHANGE.NONE',
      codes: [],
      changedPaths: [],
      requiresReack: false,
    }
  }

  const sectionsChanged = !valuesEqual(
    input.previous.specification.sections,
    input.next.specification.sections
  )
  const plainTextChanged = stableChangedPaths.includes('specification.plainText')
  const criticalSpecificationDrift = criticalSectionChanged(
    input.previous.specification.sections,
    input.next.specification.sections
  )
  const criticalPlainDrift = criticalPlainTextChanged(
    input.previous.specification.sections,
    input.next.specification.sections
  )
  const unexplainedPlainTextDrift = plainTextChanged && !sectionsChanged
  const inheritedPinChanged = stableChangedPaths.some((path) => path.startsWith('inheritedFrom.'))
  const classes = new Set<TaskContractEffectiveChangeClass>()
  let hasUnclassifiedChange = false

  for (const path of stableChangedPaths) {
    if (
      !addPathClass(
        path,
        classes,
        criticalSpecificationDrift,
        unexplainedPlainTextDrift
      )
    ) {
      classes.add('material_scope')
      hasUnclassifiedChange = true
    }
  }

  const orderedClasses = CHANGE_CLASS_PRECEDENCE.filter((changeClass) => classes.has(changeClass))
  const changeClass = orderedClasses[0] ?? 'material_scope'
  const codes: TaskContractChangeCode[] = orderedClasses.map(
    (classifiedChange) => CHANGE_CLASS_CODES[classifiedChange]
  )
  if (inheritedPinChanged) {
    codes.push('TVA.CHANGE.INHERITED_PIN_CHANGED')
  }
  if (criticalPlainDrift) {
    codes.push('TVA.CHANGE.CRITICAL_SPECIFICATION_DRIFT')
  }
  if (unexplainedPlainTextDrift) {
    codes.push('TVA.CHANGE.UNEXPLAINED_PLAIN_TEXT_DRIFT')
  }
  if (hasUnclassifiedChange) {
    codes.push('TVA.CHANGE.UNCLASSIFIED_FAIL_SAFE')
  }

  return {
    changeClass,
    code: CHANGE_CLASS_CODES[changeClass],
    codes,
    changedPaths: stableChangedPaths,
    requiresReack: requiresReack(changeClass, input.policy),
  }
}

/** Current authoring classifier. Historical snapshot verification never dispatches through this. */
export function classifyTaskContractChange(
  input: ClassifyTaskContractChangeInput
): TaskContractChangeDecision {
  return classifyTaskContractChangeWithPolicyV1(input)
}

function versionedV1Decision(
  decision: TaskContractChangeDecision
): TaskContractChangeDecisionV1 {
  return {
    classifierVersion: TASK_CONTRACT_CHANGE_CLASSIFIER_VERSION_V1,
    policyVersion: TASK_CONTRACT_CHANGE_POLICY_VERSION_V1,
    changeClass: decision.changeClass,
    code: decision.code,
    codes: [...decision.codes],
    changedPaths: [...decision.changedPaths],
    requiresReack: decision.requiresReack,
  }
}

/**
 * Produces the immutable V1 decision stored in an Assignment Contract snapshot.
 * This entry point deliberately owns a fixed policy; callers cannot silently alter V1 history.
 */
export function classifyTaskContractChangeV1(
  input: Omit<ClassifyTaskContractChangeInput, 'policy'>
): TaskContractChangeDecisionV1 {
  return versionedV1Decision(
    classifyTaskContractChangeWithPolicyV1({ ...input, policy: TASK_CONTRACT_CHANGE_POLICY_V1 })
  )
}

function arraysEqual<T>(left: readonly T[], right: readonly T[]): boolean {
  return left.length === right.length && left.every((item, index) => item === right[index])
}

function decisionsEqual(
  left: TaskContractChangeDecisionV1,
  right: TaskContractChangeDecisionV1
): boolean {
  return (
    left.classifierVersion === right.classifierVersion &&
    left.policyVersion === right.policyVersion &&
    left.changeClass === right.changeClass &&
    left.code === right.code &&
    arraysEqual(left.codes, right.codes) &&
    arraysEqual(left.changedPaths, right.changedPaths) &&
    left.requiresReack === right.requiresReack
  )
}

const TASK_CONTRACT_CHANGE_CLASSES_V1 = new Set<TaskContractChangeDecisionV1['changeClass']>([
  null,
  'initial',
  ...CHANGE_CLASS_PRECEDENCE,
])

const TASK_CONTRACT_CHANGE_CODES_V1 = new Set<TaskContractChangeCode>([
  'TVA.CHANGE.INITIAL',
  'TVA.CHANGE.NONE',
  ...Object.values(CHANGE_CLASS_CODES),
  'TVA.CHANGE.INHERITED_PIN_CHANGED',
  'TVA.CHANGE.CRITICAL_SPECIFICATION_DRIFT',
  'TVA.CHANGE.UNEXPLAINED_PLAIN_TEXT_DRIFT',
  'TVA.CHANGE.UNCLASSIFIED_FAIL_SAFE',
])

export function isTaskContractChangeDecisionV1(
  value: unknown
): value is TaskContractChangeDecisionV1 {
  if (!isRecord(value)) return false
  return (
    value['classifierVersion'] === TASK_CONTRACT_CHANGE_CLASSIFIER_VERSION_V1 &&
    value['policyVersion'] === TASK_CONTRACT_CHANGE_POLICY_VERSION_V1 &&
    TASK_CONTRACT_CHANGE_CLASSES_V1.has(
      value['changeClass'] as TaskContractChangeDecisionV1['changeClass']
    ) &&
    TASK_CONTRACT_CHANGE_CODES_V1.has(value['code'] as TaskContractChangeCode) &&
    Array.isArray(value['codes']) &&
    value['codes'].every((code) => TASK_CONTRACT_CHANGE_CODES_V1.has(code as TaskContractChangeCode)) &&
    Array.isArray(value['changedPaths']) &&
    value['changedPaths'].every((path) => typeof path === 'string') &&
    typeof value['requiresReack'] === 'boolean'
  )
}

/**
 * Version-dispatched historical verifier. Unknown versions fail closed. Future versions should be
 * added as new branches while the V1 branch remains byte-for-byte behaviorally stable.
 */
export function verifyTaskContractChangeDecision(input: {
  readonly decision: unknown
  readonly previous: ResolvedTaskContractV1 | null
  readonly next: ResolvedTaskContractV1
}): boolean {
  if (!isTaskContractChangeDecisionV1(input.decision)) {
    return false
  }
  const expected = input.previous
    ? classifyTaskContractChangeV1({ previous: input.previous, next: input.next })
    : INITIAL_TASK_CONTRACT_CHANGE_DECISION_V1
  return decisionsEqual(input.decision, expected)
}
