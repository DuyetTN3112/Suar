import { normalizeSearchText } from './text_matching.js'
import type { GlobalSearchEntityType, SearchMatchStrength } from './types.js'

export function scoreField(input: {
  entityType: GlobalSearchEntityType
  fieldKey: string
  label: string
  value: string
  query: string
  matched: boolean
}): { score: number; matchStrength: SearchMatchStrength } {
  if (!input.matched) {
    return { score: entityPriority(input.entityType), matchStrength: 'fallback' }
  }

  const normalizedValue = normalizeSearchText(input.value)
  const normalizedQuery = normalizeSearchText(input.query)
  const identityField = isIdentityField(input.fieldKey)
  let score = entityPriority(input.entityType) + fieldPriority(input.fieldKey)
  let matchStrength: SearchMatchStrength = 'partial'

  if (normalizedValue === normalizedQuery) {
    score += identityField ? 1000 : 760
    matchStrength = 'exact'
  } else if (identityField && normalizedValue.startsWith(normalizedQuery)) {
    score += 850
    matchStrength = 'strong'
  } else if (identityField && normalizedValue.includes(normalizedQuery)) {
    score += 720
    matchStrength = 'strong'
  } else {
    score += 420
    matchStrength = 'partial'
  }

  return { score, matchStrength }
}

export function entityPriority(type: GlobalSearchEntityType): number {
  switch (type) {
    case 'task':
      return 60
    case 'project':
      return 55
    case 'comment':
      return 50
    case 'talent':
      return 45
    case 'skill':
      return 40
    case 'organization':
      return 35
  }
}

function fieldPriority(fieldKey: string): number {
  if (isIdentityField(fieldKey)) return 80
  if (fieldKey.includes('description')) return 45
  if (fieldKey.includes('comment')) return 40
  return 30
}

function isIdentityField(fieldKey: string): boolean {
  return ['title', 'name', 'username', 'skillName'].includes(fieldKey)
}
