import db from '@adonisjs/lucid/services/db'

import type { GlobalSearchTaskCommentResult } from './types.js'

export async function searchTaskComments(
  query: string,
  limit: number
): Promise<GlobalSearchTaskCommentResult[]> {
  const terms = buildSqlLikeSearchTerms(query)
  const whereClause = terms.map(() => 'LOWER(tc.body) LIKE ?').join(' OR ')
  const bindings = terms.map((term) => `%${term}%`)
  const rows = (await db
    .from('task_comments as tc')
    .join('tasks as t', 't.id', 'tc.task_id')
    .leftJoin('users as u', 'u.id', 'tc.author_id')
    .select([
      'tc.id',
      'tc.task_id',
      'tc.body',
      'tc.created_at',
      't.title as task_title',
      'u.username as author_name',
    ])
    .whereNull('tc.deleted_at')
    .whereNull('t.deleted_at')
    .whereNull('t.assigned_to')
    .where('tc.visibility', 'public')
    .whereIn('t.task_visibility', ['external', 'all'])
    .whereRaw(`(${whereClause})`, bindings)
    .orderBy('tc.created_at', 'desc')
    .limit(limit)) as Array<{
    id: string
    task_id: string
    body: string
    created_at: Date | string
    task_title: string
    author_name: string | null
  }>

  return rows.map((row) => ({
    id: row.id,
    taskId: row.task_id,
    taskTitle: row.task_title,
    body: row.body,
    authorName: row.author_name,
    createdAt: typeof row.created_at === 'string' ? row.created_at : row.created_at.toISOString(),
  }))
}

function buildSqlLikeSearchTerms(query: string): string[] {
  const normalizedQuery = query.trim().toLocaleLowerCase()
  if (!normalizedQuery) return []

  const terms = new Set<string>([normalizedQuery])
  const dIndexes = Array.from(normalizedQuery)
    .map((char, index) => ({ char, index }))
    .filter(({ char }) => char === 'd')
    .map(({ index }) => index)

  for (const variant of buildSingleCharacterVariants(normalizedQuery)) {
    terms.add(variant)
  }

  for (const dIndex of dIndexes) {
    terms.add(replaceAt(normalizedQuery, dIndex, 'đ'))
    for (const variant of buildSingleCharacterVariants(replaceAt(normalizedQuery, dIndex, 'đ'))) {
      terms.add(variant)
      if (terms.size >= 64) break
    }
    if (terms.size >= 64) break
  }

  return [...terms].slice(0, 64)
}

function buildSingleCharacterVariants(value: string): string[] {
  const variants: string[] = []
  const chars = Array.from(value)

  chars.forEach((char, index) => {
    for (const replacement of vietnameseCharacterVariants(char)) {
      if (replacement !== char) {
        variants.push(
          `${chars.slice(0, index).join('')}${replacement}${chars.slice(index + 1).join('')}`
        )
      }
    }
  })

  return variants
}

function vietnameseCharacterVariants(char: string): string[] {
  const groups: Record<string, string[]> = {
    a: ['a', 'á', 'à', 'ả', 'ã', 'ạ', 'ă', 'ắ', 'ằ', 'ẳ', 'ẵ', 'ặ', 'â', 'ấ', 'ầ', 'ẩ', 'ẫ', 'ậ'],
    e: ['e', 'é', 'è', 'ẻ', 'ẽ', 'ẹ', 'ê', 'ế', 'ề', 'ể', 'ễ', 'ệ'],
    i: ['i', 'í', 'ì', 'ỉ', 'ĩ', 'ị'],
    o: ['o', 'ó', 'ò', 'ỏ', 'õ', 'ọ', 'ô', 'ố', 'ồ', 'ổ', 'ỗ', 'ộ', 'ơ', 'ớ', 'ờ', 'ở', 'ỡ', 'ợ'],
    u: ['u', 'ú', 'ù', 'ủ', 'ũ', 'ụ', 'ư', 'ứ', 'ừ', 'ử', 'ữ', 'ự'],
    y: ['y', 'ý', 'ỳ', 'ỷ', 'ỹ', 'ỵ'],
  }

  return groups[char] ?? [char]
}

function replaceAt(value: string, index: number, replacement: string): string {
  const chars = Array.from(value)
  chars[index] = replacement
  return chars.join('')
}
