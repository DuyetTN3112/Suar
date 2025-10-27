import { scoreField } from './scoring.js'
import { buildSnippet, highlightSnippet } from './text_matching.js'
import type { GlobalSearchCenterResult, GlobalSearchTaskCommentResult } from './types.js'

export function buildCommentResult(
  comment: GlobalSearchTaskCommentResult,
  query: string
): GlobalSearchCenterResult {
  const snippet = buildSnippet(comment.body, query)
  const fieldScore = scoreField({
    entityType: 'comment',
    fieldKey: 'comment',
    label: 'Comment',
    value: comment.body,
    query,
    matched: true,
  })

  return {
    id: `comment:${comment.id}`,
    entityType: 'comment',
    entityId: comment.id,
    title: comment.taskTitle,
    sourceLabel: 'Comment',
    url: `/tasks/${comment.taskId}?comment=${comment.id}`,
    matchedFields: ['comment'],
    matchedFieldLabels: ['Comment'],
    snippets: [snippet],
    highlightedSnippets: [highlightSnippet(snippet, query)],
    parentLabel: comment.authorName ? `Task comment by ${comment.authorName}` : 'Task comment',
    breadcrumbs: compactParts([comment.taskTitle, comment.authorName]),
    matchStrength: fieldScore.matchStrength,
    rank: 0,
    score: fieldScore.score,
    primaryActionLabel: 'Open comment',
    secondaryMeta: 'Matched in Comment',
  }
}

function compactParts(parts: Array<string | null>): string[] {
  return parts.filter((part): part is string => Boolean(part))
}
