import db from '@adonisjs/lucid/services/db'

import type { SeedContext } from '../types.js'

export async function logSummary(context: SeedContext): Promise<void> {
  const count = async (table: string) => {
    const row = (await db.from(table).count('* as total').first()) as {
      total?: string | number
    } | null
    return Number(row?.total ?? 0)
  }

  const [
    userCount,
    orgCount,
    projectCount,
    taskCount,
    reviewCount,
    subscriptionCount,
    notificationCount,
    auditLogCount,
  ] = await Promise.all([
    count('users'),
    count('organizations'),
    count('projects'),
    count('tasks'),
    count('review_sessions'),
    count('user_subscriptions'),
    count('notifications'),
    count('audit_events'),
  ])

  console.warn(
    `Users=${userCount}, organizations=${orgCount}, projects=${projectCount}, tasks=${taskCount}, review_sessions=${reviewCount}, user_subscriptions=${subscriptionCount}, postgres_notifications=${notificationCount}, postgres_audit_logs=${auditLogCount}`
  )

  const taskCountRows = (await db
    .from('tasks as t')
    .join('organizations as o', 'o.id', 't.organization_id')
    .select('o.slug')
    .count('* as total')
    .groupBy('o.slug')
    .orderBy('o.slug')) as { slug: string; total: string | number }[]

  console.warn(
    `Task counts by org: ${taskCountRows.map((row) => `${row.slug}=${Number(row.total)}`).join(', ')}`
  )

  const projectTaskCountRows = (await db
    .from('tasks as t')
    .join('projects as p', 'p.id', 't.project_id')
    .join('organizations as o', 'o.id', 'p.organization_id')
    .select('o.slug', 'p.name')
    .count('* as total')
    .groupBy('o.slug', 'p.name')
    .orderBy('o.slug')
    .orderBy('p.name')) as { slug: string; name: string; total: string | number }[]

  console.warn(
    `Task counts by project: ${projectTaskCountRows.map((row) => `${row.slug}/${row.name}=${Number(row.total)}`).join(', ')}`
  )
  console.warn(
    `Owner account: ${context.users.owner.email} | Superadmin: ${context.users.superadmin.username} | Member account: ${context.users.member.username}`
  )
}
