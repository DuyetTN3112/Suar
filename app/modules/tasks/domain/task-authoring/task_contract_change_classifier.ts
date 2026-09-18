import {
  addPathClass,
  collectChangedPaths,
  comparableContract,
  criticalPlainTextChanged,
  criticalSectionChanged,
  isRecord,
  requiresReack,
  valuesEqual,
} from './task_contract_change_diff.js'
import {
  CHANGE_CLASS_CODES,
  CHANGE_CLASS_PRECEDENCE,
  INITIAL_TASK_CONTRACT_CHANGE_DECISION_V1,
  TASK_CONTRACT_CHANGE_CLASSES_V1,
  TASK_CONTRACT_CHANGE_CLASSIFIER_VERSION_V1,
  TASK_CONTRACT_CHANGE_CODES_V1,
  TASK_CONTRACT_CHANGE_POLICY_V1,
  TASK_CONTRACT_CHANGE_POLICY_VERSION_V1,
  type ClassifyTaskContractChangeInput,
  type TaskContractChangeCode,
  type TaskContractChangeDecision,
  type TaskContractChangeDecisionV1,
  type TaskContractEffectiveChangeClass,
} from './task_contract_change_types.js'

import type { ResolvedTaskContractV1 } from '#modules/tasks/public_contracts/task-authoring/task_contracts'

export {
  CHANGE_CLASS_CODES,
  CHANGE_CLASS_PRECEDENCE,
  INITIAL_TASK_CONTRACT_CHANGE_DECISION_V1,
  TASK_CONTRACT_CHANGE_CLASSIFIER_VERSION_V1,
  TASK_CONTRACT_CHANGE_POLICY_V1,
  TASK_CONTRACT_CHANGE_POLICY_VERSION_V1,
  type ClassifyTaskContractChangeInput,
  type TaskContractChangeCode,
  type TaskContractChangeDecision,
  type TaskContractChangeDecisionV1,
  type TaskContractChangePolicy,
  type TaskContractEffectiveChangeClass,
} from './task_contract_change_types.js'

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
      !addPathClass(path, classes, criticalSpecificationDrift, unexplainedPlainTextDrift)
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

function versionedV1Decision(decision: TaskContractChangeDecision): TaskContractChangeDecisionV1 {
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
    left.changeClass === right.changeClass &&
    left.code === right.code &&
    arraysEqual(left.codes, right.codes) &&
    arraysEqual(left.changedPaths, right.changedPaths) &&
    left.requiresReack === right.requiresReack
  )
}

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
    value['codes'].every((code) =>
      TASK_CONTRACT_CHANGE_CODES_V1.has(code as TaskContractChangeCode)
    ) &&
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
