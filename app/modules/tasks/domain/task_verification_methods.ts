export const VALID_TASK_VERIFICATION_METHODS = new Set([
  'code_review',
  'automated_test',
  'manual_qa',
  'demo_presentation',
  'manager_approval',
  'peer_review',
  'user_acceptance_test',
  'a_b_test',
  'load_test',
  'security_audit',
  'documentation_review',
  'multi_step',
])

const VERIFICATION_METHOD_LABEL_ALIASES = new Map<string, string>([
  ['code review', 'code_review'],
  ['automated test', 'automated_test'],
  ['manual qa', 'manual_qa'],
  ['demo / presentation', 'demo_presentation'],
  ['manager approval', 'manager_approval'],
  ['peer review', 'peer_review'],
  ['user acceptance test', 'user_acceptance_test'],
  ['a/b test', 'a_b_test'],
  ['a-b test', 'a_b_test'],
  ['load test', 'load_test'],
  ['security audit', 'security_audit'],
  ['documentation review', 'documentation_review'],
  ['multi-step verification', 'multi_step'],
])

function normalizeVerificationToken(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

function uniqueValues(values: string[]): string[] {
  return [...new Set(values.filter((value) => value.trim().length > 0))]
}

export function parseTaskVerificationMethods(value: string | null | undefined): {
  selectedValues: string[]
  customValues: string[]
} {
  const tokens = (value ?? '')
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0)

  const selectedValues: string[] = []
  const customValues: string[] = []

  for (const token of tokens) {
    const normalizedToken = normalizeVerificationToken(token)
    const customMatch = /^custom\s*:\s*(.+)$/i.exec(token)

    if (customMatch?.[1]) {
      customValues.push(customMatch[1].trim())
      continue
    }

    if (VALID_TASK_VERIFICATION_METHODS.has(token)) {
      selectedValues.push(token)
      continue
    }

    const mappedValue = VERIFICATION_METHOD_LABEL_ALIASES.get(normalizedToken)
    if (mappedValue) {
      selectedValues.push(mappedValue)
      continue
    }

    customValues.push(token)
  }

  return {
    selectedValues: uniqueValues(selectedValues),
    customValues: uniqueValues(customValues),
  }
}

export function normalizeTaskVerificationMethod(value: string | null | undefined): string {
  const parsed = parseTaskVerificationMethods(value)

  if (parsed.selectedValues.length === 0 && parsed.customValues.length === 0) {
    return 'code_review'
  }

  return [
    ...parsed.selectedValues,
    ...parsed.customValues.map((item) => `custom:${item}`),
  ].join('\n')
}

export function taskVerificationMethodRequiresEvidence(
  value: string | null | undefined
): boolean {
  const evidenceRequiredMethods = new Set([
    'automated_test',
    'demo_presentation',
    'manual_qa',
    'user_acceptance_test',
    'load_test',
    'security_audit',
    'multi_step',
  ])

  const parsed = parseTaskVerificationMethods(value)
  return parsed.selectedValues.some((selectedValue) =>
    evidenceRequiredMethods.has(selectedValue)
  )
}
