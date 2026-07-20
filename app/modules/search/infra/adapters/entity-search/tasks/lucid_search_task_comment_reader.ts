import db from '@adonisjs/lucid/services/db'

import type { SearchTaskCommentReader } from '#modules/search/actions/ports/outbound/search_task_comment_reader'
import { buildPublicCommentSearchTerms } from '#modules/search/domain/quality/public_comment_search_terms'

export class LucidSearchTaskCommentReader implements SearchTaskCommentReader {
  async search(query: string, limit: number) {
    const terms = buildPublicCommentSearchTerms(query)
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
}
