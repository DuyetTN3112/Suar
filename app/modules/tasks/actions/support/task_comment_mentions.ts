import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

const MENTION_REGEX = /(^|[^\w])@([a-zA-Z0-9._-]{2,60})/g

interface MentionedUserRow {
  id: string
  username: string | null
}

function uniqueMentionTokens(body: string): string[] {
  const tokens = new Set<string>()

  for (const match of body.matchAll(MENTION_REGEX)) {
    const username = match[2]?.trim().toLowerCase()
    if (username) {
      tokens.add(username)
    }
  }

  return Array.from(tokens)
}

export async function resolveTaskCommentMentions(
  organizationId: string,
  body: string,
  trx?: TransactionClientContract
): Promise<Array<{ userId: string; username: string; token: string }>> {
  const tokens = uniqueMentionTokens(body)
  if (tokens.length === 0) {
    return []
  }

  const client = trx ?? db
  const placeholders = tokens.map(() => '?').join(', ')
  const rows = (await client
    .from('users')
    .join('organization_users', 'organization_users.user_id', 'users.id')
    .where('organization_users.organization_id', organizationId)
    .whereRaw(`LOWER(users.username) IN (${placeholders})`, tokens)
    .select('users.id', 'users.username')) as MentionedUserRow[]

  const byUsername = new Map(
    rows
      .filter((row): row is MentionedUserRow & { username: string } => typeof row.username === 'string')
      .map((row) => [row.username.toLowerCase(), row])
  )

  return tokens.flatMap((token) => {
    const row = byUsername.get(token)
    if (!row || !row.username) {
      return []
    }

    return [{
      userId: row.id,
      username: row.username,
      token,
    }]
  })
}

export async function replaceTaskCommentMentions(
  taskCommentId: string,
  mentionedByUserId: string,
  mentions: Array<{ userId: string; token: string }>,
  trx?: TransactionClientContract
): Promise<void> {
  const client = trx ?? db
  await client.from('task_comment_mentions').where('task_comment_id', taskCommentId).delete()

  if (mentions.length === 0) {
    return
  }

  await client.table('task_comment_mentions').insert(
    mentions.map((mention) => ({
      task_comment_id: taskCommentId,
      mentioned_user_id: mention.userId,
      mentioned_by_user_id: mentionedByUserId,
      mention_token: mention.token,
    }))
  )
}

export async function loadTaskCommentMentions(
  commentIds: string[],
  trx?: TransactionClientContract
): Promise<Map<string, Array<{ userId: string; username: string; mentionToken: string }>>> {
  if (commentIds.length === 0) {
    return new Map()
  }

  const client = trx ?? db
  const rows = (await client
    .from('task_comment_mentions as tcm')
    .join('users as mentioned_user', 'mentioned_user.id', 'tcm.mentioned_user_id')
    .whereIn('tcm.task_comment_id', commentIds)
    .select(
      'tcm.task_comment_id',
      'tcm.mention_token',
      'mentioned_user.id as mentioned_user_id',
      'mentioned_user.username as mentioned_username'
    )) as Array<{
      task_comment_id: string
      mention_token: string
      mentioned_user_id: string
      mentioned_username: string | null
    }>

  const result = new Map<string, Array<{ userId: string; username: string; mentionToken: string }>>()
  for (const row of rows) {
    const items = result.get(row.task_comment_id) ?? []
    items.push({
      userId: row.mentioned_user_id,
      username: row.mentioned_username ?? row.mention_token,
      mentionToken: row.mention_token,
    })
    result.set(row.task_comment_id, items)
  }

  return result
}
