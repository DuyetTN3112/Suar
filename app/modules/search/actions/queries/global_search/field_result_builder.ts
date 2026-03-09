import { scoreField } from './scoring.js'
import { buildSnippet, highlightSnippet, includesQuery } from './text_matching.js'

import type {
  GlobalSearchCenterResult,
  GlobalSearchEntityType,
  SearchableField,
} from '#modules/search/public_contracts/global_search_contract'

export function buildEntityFieldResults(input: {
  entityType: Exclude<GlobalSearchEntityType, 'comment'>
  entityId: string
  title: string
  url: string
  breadcrumbs: string[]
  fields: SearchableField[]
  fallbackLabel: string
  primaryActionLabel: string
  query: string
}): GlobalSearchCenterResult[] {
  const matchingFields = input.fields.filter(
    (field) => field.value && includesQuery(field.value, input.query)
  )
  const fields =
    matchingFields.length > 0
      ? matchingFields
      : input.fields.filter((field) => field.value).slice(0, 1)
  const matched = matchingFields.length > 0
  const scoredFields = fields
    .map((field) => {
      const sourceLabel = matched ? field.label : input.fallbackLabel
      const fieldScore = scoreField({
        entityType: input.entityType,
        fieldKey: field.key,
        label: sourceLabel,
        value: field.value ?? '',
        query: input.query,
        matched,
      })

      return {
        field,
        sourceLabel,
        score: fieldScore.score,
        matchStrength: fieldScore.matchStrength,
      }
    })
    .sort((left, right) => {
      const scoreDelta = right.score - left.score
      if (scoreDelta !== 0) return scoreDelta
      return (
        input.fields.findIndex((field) => field.key === left.field.key) -
        input.fields.findIndex((field) => field.key === right.field.key)
      )
    })

  const bestField = scoredFields[0]
  if (!bestField) return []

  const snippets = scoredFields
    .map(({ field }) => (field.value ? buildSnippet(field.value, input.query) : ''))
    .filter((snippet) => snippet.length > 0)
  const matchedFieldLabels = scoredFields.map(({ sourceLabel }) => sourceLabel)

  return [
    {
      id: `${input.entityType}:${input.entityId}:${scoredFields.map(({ field }) => field.key).join('+')}`,
      entityType: input.entityType,
      entityId: input.entityId,
      title: input.title,
      sourceLabel: bestField.sourceLabel,
      url: input.url,
      matchedFields: scoredFields.map(({ field }) => field.key),
      matchedFieldLabels,
      snippets,
      highlightedSnippets: snippets.map((snippet) => highlightSnippet(snippet, input.query)),
      parentLabel: input.breadcrumbs.length > 0 ? input.breadcrumbs.join(' · ') : null,
      breadcrumbs: input.breadcrumbs,
      matchStrength: bestField.matchStrength,
      rank: 0,
      score: bestField.score + Math.max(scoredFields.length - 1, 0) * 25,
      primaryActionLabel: input.primaryActionLabel,
      secondaryMeta: `Matched in ${matchedFieldLabels.join(', ')}`,
    },
  ]
}
