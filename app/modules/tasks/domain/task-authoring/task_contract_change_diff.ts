import {
  ACCEPTANCE_PREFIXES,
  MATERIAL_CHANGE_CLASSES,
  OWNERSHIP_PATHS,
  type TaskContractChangePolicy,
  type TaskContractEffectiveChangeClass,
} from './task_contract_change_types.js'

import type {
  ResolvedTaskContractV1,
  TaskSpecificationSectionV1,
} from '#modules/tasks/public_contracts/task-authoring/task_contracts'

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function valuesEqual(left: unknown, right: unknown): boolean {
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

export function collectChangedPaths(
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

export function comparableContract(contract: ResolvedTaskContractV1): Record<string, unknown> {
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

export function sectionById(
  sections: readonly TaskSpecificationSectionV1[],
  id: string
): TaskSpecificationSectionV1 | undefined {
  return sections.find((section) => section.id === id)
}

export function criticalSectionChanged(
  previous: readonly TaskSpecificationSectionV1[],
  next: readonly TaskSpecificationSectionV1[]
): boolean {
  const ids = new Set([
    ...previous.map((section) => section.id),
    ...next.map((section) => section.id),
  ])
  return [...ids].some((id) => {
    const previousSection = sectionById(previous, id)
    const nextSection = sectionById(next, id)
    if (!previousSection?.critical && !nextSection?.critical) {
      return false
    }
    return !valuesEqual(previousSection, nextSection)
  })
}

export function criticalPlainTextChanged(
  previous: readonly TaskSpecificationSectionV1[],
  next: readonly TaskSpecificationSectionV1[]
): boolean {
  const ids = new Set([
    ...previous.map((section) => section.id),
    ...next.map((section) => section.id),
  ])
  return [...ids].some((id) => {
    const previousSection = sectionById(previous, id)
    const nextSection = sectionById(next, id)
    if (!previousSection?.critical && !nextSection?.critical) {
      return false
    }
    return previousSection?.plainText !== nextSection?.plainText
  })
}

export function startsWithAny(path: string, prefixes: readonly string[]): boolean {
  return prefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}.`))
}

export function addPathClass(
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

export function requiresReack(
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
