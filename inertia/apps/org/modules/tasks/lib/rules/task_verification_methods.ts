export interface TaskVerificationMethodOption {
  value: string
  label: string
  requiresEvidence?: boolean
}

export type TaskTranslator = (
  key: string,
  params?: Record<string, unknown>,
  fallback?: string
) => string

export const TASK_VERIFICATION_METHOD_OPTIONS: TaskVerificationMethodOption[] = [
  { value: 'code_review', label: 'Code review' },
  { value: 'automated_test', label: 'Automated test', requiresEvidence: true },
  { value: 'manual_qa', label: 'Manual QA', requiresEvidence: true },
  { value: 'demo_presentation', label: 'Demo / Presentation', requiresEvidence: true },
  { value: 'manager_approval', label: 'Manager approval' },
  { value: 'peer_review', label: 'Peer review' },
  { value: 'user_acceptance_test', label: 'User acceptance test', requiresEvidence: true },
  { value: 'a_b_test', label: 'A/B test' },
  { value: 'load_test', label: 'Load test', requiresEvidence: true },
  { value: 'security_audit', label: 'Security audit', requiresEvidence: true },
  { value: 'documentation_review', label: 'Documentation review' },
  { value: 'multi_step', label: 'Multi-step verification', requiresEvidence: true },
] as const

const verificationLabelByValue = new Map(
  TASK_VERIFICATION_METHOD_OPTIONS.map((option) => [option.value, option.label])
)
const verificationValueByNormalizedLabel = new Map(
  TASK_VERIFICATION_METHOD_OPTIONS.map((option) => [normalizeVerificationToken(option.label), option.value])
)

function normalizeVerificationToken(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

function uniqueValues(values: string[]): string[] {
  return [...new Set(values.filter((value) => value.trim().length > 0))]
}

export function parseTaskVerificationMethod(value: string | null | undefined): {
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

    if (verificationLabelByValue.has(token)) {
      selectedValues.push(token)
      continue
    }

    const matchedValue = verificationValueByNormalizedLabel.get(normalizedToken)
    if (matchedValue) {
      selectedValues.push(matchedValue)
      continue
    }

    customValues.push(token)
  }

  return {
    selectedValues: uniqueValues(selectedValues),
    customValues: uniqueValues(customValues),
  }
}

export function serializeTaskVerificationMethod(input: {
  selectedValues: string[]
  customValues: string[]
}): string {
  const selectedValues = uniqueValues(input.selectedValues).filter((value) =>
    verificationLabelByValue.has(value)
  )
  const customValues = uniqueValues(input.customValues)

  if (selectedValues.length === 0 && customValues.length === 0) {
    return 'code_review'
  }

  return [
    ...selectedValues,
    ...customValues.map((value) => `custom:${value}`),
  ].join('\n')
}

export function formatTaskVerificationMethodForDisplay(
  value: string | null | undefined,
  t?: TaskTranslator
): string[] {
  const parsed = parseTaskVerificationMethod(value)

  return [
    ...parsed.selectedValues.map((selectedValue) => {
      const fallback = verificationLabelByValue.get(selectedValue) ?? selectedValue
      return t?.(`task.verification_methods.${selectedValue}`, {}, fallback) ?? fallback
    }),
    ...parsed.customValues,
  ]
}
