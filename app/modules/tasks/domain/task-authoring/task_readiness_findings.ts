import type { TaskReadinessFindingV1 } from '#modules/tasks/public_contracts/task-authoring/task_contracts'

export const PLACEHOLDER_PHRASES = new Set([
  '-',
  'n/a',
  'na',
  'none',
  'see docs',
  'see document',
  'tbd',
  'todo',
  'xem docs',
  'xem tài liệu',
  'xem tai lieu',
])

export const PLACEHOLDER_TOKENS = new Set([
  'docs',
  'document',
  'later',
  'lieu',
  'n',
  'na',
  'none',
  'see',
  'tai',
  'tbd',
  'todo',
  'xem',
])

export const READY_DEPENDENCY_STATES = new Set([
  'available',
  'completed',
  'none_known',
  'not_applicable',
  'ready',
])

export type FindingTarget = TaskReadinessFindingV1[]

export function normalizeText(value: string | null | undefined): string {
  return (value ?? '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('vi-VN')
}

export function isMeaningfulText(value: string | null | undefined): boolean {
  const normalized = normalizeText(value)
  if (!normalized || PLACEHOLDER_PHRASES.has(normalized)) {
    return false
  }

  const tokens = normalized
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .split(' ')
    .filter(Boolean)
  return tokens.length > 0 && !tokens.every((token) => PLACEHOLDER_TOKENS.has(token))
}

export function hasMeaningfulListContent(
  values: readonly { readonly title: string; readonly description: string }[]
): boolean {
  return values.some(
    (value) => isMeaningfulText(value.title) || isMeaningfulText(value.description)
  )
}

export function addFinding(
  target: FindingTarget,
  finding: Omit<TaskReadinessFindingV1, 'severity'> & {
    readonly severity?: TaskReadinessFindingV1['severity']
  }
): void {
  target.push({ severity: finding.severity ?? 'blocker', ...finding })
}

export function compareFindings(left: TaskReadinessFindingV1, right: TaskReadinessFindingV1): number {
  return (
    left.code.localeCompare(right.code) ||
    left.fieldPath.localeCompare(right.fieldPath) ||
    (left.sourcePath ?? '').localeCompare(right.sourcePath ?? '')
  )
}

export function normalizeFindings(findings: readonly TaskReadinessFindingV1[]): TaskReadinessFindingV1[] {
  const byCode = new Map<string, TaskReadinessFindingV1>()
  for (const finding of [...findings].sort(compareFindings)) {
    if (!byCode.has(finding.code)) {
      byCode.set(finding.code, finding)
    }
  }
  return [...byCode.values()].sort(compareFindings)
}

export function addRequiredTextFinding(
  target: FindingTarget,
  value: string | null | undefined,
  code: string,
  fieldPath: string,
  label: string
): void {
  if (!isMeaningfulText(value)) {
    addFinding(target, {
      code,
      fieldPath,
      sourcePath: null,
      message: `${label} is missing or contains only placeholder text.`,
      remediationHint: `Provide a concrete ${label.toLocaleLowerCase('en-US')}.`,
    })
  }
}
