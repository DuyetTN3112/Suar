import type { HighlightedSnippet } from './types.js'

export function normalizeSearchText(value: string): string {
  return foldSearchText(value.trim())
}

export function includesQuery(value: string, query: string): boolean {
  return normalizeSearchText(value).includes(normalizeSearchText(query))
}

export function buildSnippet(value: string, query: string): string {
  const normalizedValue = value.trim()
  const matchRange = findFoldedMatchRange(normalizedValue, query)
  if (!matchRange || normalizedValue.length <= 180) {
    return normalizedValue
  }

  const start = Math.max(matchRange.start - 70, 0)
  const end = Math.min(matchRange.end + 90, normalizedValue.length)
  const prefix = start > 0 ? '...' : ''
  const suffix = end < normalizedValue.length ? '...' : ''
  return `${prefix}${normalizedValue.slice(start, end)}${suffix}`
}

export function highlightSnippet(snippet: string, query: string): HighlightedSnippet {
  const foldedSnippet = foldSearchText(snippet)
  const foldedQuery = foldSearchText(query.trim())
  const indexMap = buildFoldedIndexMap(snippet)
  const normalizedQuery = query.trim()
  if (!normalizedQuery) return [{ text: snippet, match: false }]

  const segments: HighlightedSnippet = []
  let cursor = 0
  let matchIndex = foldedSnippet.indexOf(foldedQuery)

  while (matchIndex >= 0) {
    const range = foldedRangeToOriginalRange(indexMap, matchIndex, foldedQuery.length)
    if (!range) break

    if (range.start > cursor) {
      segments.push({ text: snippet.slice(cursor, range.start), match: false })
    }
    segments.push({
      text: snippet.slice(range.start, range.end),
      match: true,
    })
    cursor = range.end
    matchIndex = foldedSnippet.indexOf(foldedQuery, matchIndex + foldedQuery.length)
  }

  if (cursor < snippet.length) {
    segments.push({ text: snippet.slice(cursor), match: false })
  }

  return segments.length > 0 ? segments : [{ text: snippet, match: false }]
}

function foldSearchText(value: string): string {
  return value
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
}

function findFoldedMatchRange(value: string, query: string): { start: number; end: number } | null {
  const foldedValue = foldSearchText(value)
  const foldedQuery = foldSearchText(query.trim())
  if (!foldedQuery) return null

  const matchIndex = foldedValue.indexOf(foldedQuery)
  if (matchIndex < 0) return null

  return foldedRangeToOriginalRange(buildFoldedIndexMap(value), matchIndex, foldedQuery.length)
}

function buildFoldedIndexMap(value: string): Array<{ start: number; end: number }> {
  const indexMap: Array<{ start: number; end: number }> = []

  for (let index = 0; index < value.length; ) {
    const codePoint = value.codePointAt(index)
    const charLength = codePoint && codePoint > 0xffff ? 2 : 1
    const char = value.slice(index, index + charLength)
    const foldedChars = Array.from(foldSearchText(char))

    for (const _foldedChar of foldedChars) {
      indexMap.push({ start: index, end: index + charLength })
    }
    index += charLength
  }

  return indexMap
}

function foldedRangeToOriginalRange(
  indexMap: Array<{ start: number; end: number }>,
  foldedStart: number,
  foldedLength: number
): { start: number; end: number } | null {
  const first = indexMap[foldedStart]
  const last = indexMap[foldedStart + foldedLength - 1]
  if (!first || !last) return null

  return {
    start: first.start,
    end: last.end,
  }
}
