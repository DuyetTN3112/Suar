import db from '@adonisjs/lucid/services/db'

import type { SeedContext } from './types.js'

import { MongoAuditLogModel } from '#modules/audit/infra/models/audit_log'
import MongoNotification from '#modules/notifications/infra/models/notification'
import MongoUserActivityLog from '#modules/user_activity/infra/models/user_activity_log'
import env from '#start/env'


export interface SeedMongoRuntime {
  fresh: boolean
  isoDaysAgo(daysAgo: number, hour?: number): string
  requireValue<T>(value: T | undefined, label: string): T
}

export async function seedMongo(runtime: SeedMongoRuntime, context: SeedContext): Promise<void> {
  if (!env.get('MONGODB_URL', '')) {
    return
  }

  const userIds = Object.values(context.users).map((user) => user.id)
  const entityIds = [
    ...Object.values(context.organizations).map((org) => org.id),
    ...Object.values(context.projects).map((project) => project.id),
    ...Object.values(context.tasks).map((task) => task.id),
    ...Object.values(context.snapshots),
  ]

  if (!runtime.fresh) {
    await Promise.all([
      MongoNotification.deleteMany({ user_id: { $in: userIds } }),
      MongoUserActivityLog.deleteMany({ user_id: { $in: userIds } }),
      MongoAuditLogModel.deleteMany({
        $or: [{ user_id: { $in: userIds } }, { entity_id: { $in: entityIds } }],
      }),
    ])
  }

  const marketplaceTask = runtime.requireValue(
    context.tasks['marketplace-content-pass'],
    'mongo-task:marketplace-content-pass'
  )

  await MongoNotification.insertMany([
    {
      user_id: context.users.owner.id,
      title: 'Đã có ứng viên mới cho task marketplace',
      message: 'MaiFreelancer vừa apply vào task public của organization A.',
      type: 'task_application_submitted',
      related_entity_type: 'task',
      related_entity_id: marketplaceTask.id,
      metadata: { applicant: context.users.freelancerOne.username },
      is_read: false,
      created_at: new Date(runtime.isoDaysAgo(1)),
      updated_at: new Date(runtime.isoDaysAgo(1)),
    },
    {
      user_id: context.users.owner.id,
      title: 'Đã chuyển context mặc định về organization owner',
      message:
        'Tài khoản của bạn sẽ vào Suar Workspace Lab trước để test giao diện owner rõ hơn.',
      type: 'organization_context_updated',
      related_entity_type: 'organization',
      related_entity_id: context.organizations.orgA.id,
      metadata: { role: 'org_owner' },
      is_read: false,
      created_at: new Date(runtime.isoDaysAgo(0)),
      updated_at: new Date(runtime.isoDaysAgo(0)),
    },
    {
      user_id: context.users.owner.id,
      title: 'Org B đã giao thêm task cho bạn',
      message: 'Bạn hiện có dữ liệu task khi chuyển sang org B với vai trò member.',
      type: 'task_assigned',
      related_entity_type: 'organization',
      related_entity_id: context.organizations.orgB.id,
      metadata: { role: 'org_member' },
      is_read: false,
      created_at: new Date(runtime.isoDaysAgo(0)),
      updated_at: new Date(runtime.isoDaysAgo(0)),
    },
    {
      user_id: context.users.member.id,
      title: 'Snapshot hồ sơ đã được publish',
      message: 'Profile proof mới nhất của bạn đã có share link và lịch sử snapshot.',
      type: 'profile_snapshot_published',
      related_entity_type: 'user_profile_snapshot',
      related_entity_id: context.snapshots.member,
      metadata: { visibility: 'public' },
      is_read: false,
      created_at: new Date(runtime.isoDaysAgo(1)),
      updated_at: new Date(runtime.isoDaysAgo(1)),
    },
    {
      user_id: context.users.member.id,
      title: 'Bạn có task đang review',
      message:
        'Luồng profile động đang có một task ở trạng thái in_review để test widget realtime.',
      type: 'task_review_pending',
      related_entity_type: 'task',
      related_entity_id: runtime.requireValue(
        context.tasks['member-profile-live'],
        'mongo-task:member-profile-live'
      ).id,
      metadata: { project: context.projects.orgAPlatform.name },
      is_read: false,
      created_at: new Date(runtime.isoDaysAgo(0)),
      updated_at: new Date(runtime.isoDaysAgo(0)),
    },
    {
      user_id: context.users.superadmin.id,
      title: 'Có review bị flag cần kiểm tra',
      message: 'Trang admin hiện có 1 flagged review ở trạng thái pending.',
      type: 'flagged_review_pending',
      related_entity_type: 'flagged_review',
      related_entity_id: null,
      metadata: { source: 'seed:data' },
      is_read: false,
      created_at: new Date(runtime.isoDaysAgo(1)),
      updated_at: new Date(runtime.isoDaysAgo(1)),
    },
    {
      user_id: context.users.superadmin.id,
      title: 'Package usage đã được cập nhật',
      message: 'Dashboard có dữ liệu gói Pro và ProMax để kiểm tra admin package management.',
      type: 'subscription_metrics_ready',
      related_entity_type: 'user_subscription',
      related_entity_id: null,
      metadata: { packages: ['pro', 'promax'] },
      is_read: false,
      created_at: new Date(runtime.isoDaysAgo(0)),
      updated_at: new Date(runtime.isoDaysAgo(0)),
    },
    {
      user_id: context.users.orgAdmin.id,
      title: 'Design system role states cần review',
      message:
        'Có task mới trong Workspace Design System để kiểm tra owner/member visual states.',
      type: 'task_assigned',
      related_entity_type: 'project',
      related_entity_id: context.projects.orgADesignSystem.id,
      metadata: {
        task: runtime.requireValue(
          context.tasks['orga-design-refresh'],
          'mongo-task:orga-design-refresh'
        ).id,
      },
      is_read: false,
      created_at: new Date(runtime.isoDaysAgo(0)),
      updated_at: new Date(runtime.isoDaysAgo(0)),
    },
  ])

  await MongoAuditLogModel.insertMany([
    {
      user_id: context.users.owner.id,
      action: 'seed_org_owner_workspace',
      entity_type: 'organization',
      entity_id: context.organizations.orgA.id,
      old_values: null,
      new_values: {
        current_org: context.organizations.orgA.slug,
        secondary_membership: context.organizations.orgB.slug,
      },
      ip_address: '127.0.0.1',
      user_agent: 'seed:data',
      created_at: new Date(runtime.isoDaysAgo(1)),
    },
    {
      user_id: context.users.superadmin.id,
      action: 'seed_admin_dashboard',
      entity_type: 'user',
      entity_id: context.users.superadmin.id,
      old_values: { system_role: 'registered_user' },
      new_values: { system_role: 'superadmin', redirect_target: '/admin' },
      ip_address: '127.0.0.1',
      user_agent: 'seed:data',
      created_at: new Date(runtime.isoDaysAgo(1)),
    },
    {
      user_id: context.users.member.id,
      action: 'publish_profile_snapshot',
      entity_type: 'user_profile_snapshot',
      entity_id: context.snapshots.member,
      old_values: null,
      new_values: { is_public: true, user_id: context.users.member.id },
      ip_address: '127.0.0.1',
      user_agent: 'seed:data',
      created_at: new Date(runtime.isoDaysAgo(1)),
    },
    {
      user_id: context.users.owner.id,
      action: 'create_project',
      entity_type: 'project',
      entity_id: context.projects.orgAPlatform.id,
      old_values: null,
      new_values: { organization_id: context.organizations.orgA.id },
      ip_address: '127.0.0.1',
      user_agent: 'seed:data',
      created_at: new Date(runtime.isoDaysAgo(5)),
    },
    {
      user_id: context.users.superadmin.id,
      action: 'seed_package_catalog',
      entity_type: 'user_subscription',
      entity_id: null,
      old_values: null,
      new_values: { packages: ['pro', 'promax'], active_subscriptions: 3 },
      ip_address: '127.0.0.1',
      user_agent: 'seed:data',
      created_at: new Date(runtime.isoDaysAgo(0)),
    },
  ])

  await MongoUserActivityLog.insertMany([
    {
      user_id: context.users.owner.id,
      action_type: 'switch_organization',
      action_data: {
        from: context.organizations.orgA.slug,
        to: context.organizations.orgB.slug,
        expected_role: 'org_member',
      },
      related_entity_type: 'organization',
      related_entity_id: context.organizations.orgB.id,
      ip_address: '127.0.0.1',
      user_agent: 'seed:data',
      created_at: new Date(runtime.isoDaysAgo(1)),
    },
    {
      user_id: context.users.member.id,
      action_type: 'profile_snapshot_published',
      action_data: {
        snapshot_id: context.snapshots.member,
        total_completed_assignments: 3,
      },
      related_entity_type: 'user_profile_snapshot',
      related_entity_id: context.snapshots.member,
      ip_address: '127.0.0.1',
      user_agent: 'seed:data',
      created_at: new Date(runtime.isoDaysAgo(1)),
    },
    {
      user_id: context.users.superadmin.id,
      action_type: 'admin_login',
      action_data: {
        redirect_to: '/admin',
        current_organization_id: null,
      },
      related_entity_type: 'user',
      related_entity_id: context.users.superadmin.id,
      ip_address: '127.0.0.1',
      user_agent: 'seed:data',
      created_at: new Date(runtime.isoDaysAgo(1)),
    },
    {
      user_id: context.users.owner.id,
      action_type: 'package_metrics_viewed',
      action_data: {
        packages: ['pro', 'promax'],
        active_orgs: Object.keys(context.organizations).length,
      },
      related_entity_type: 'user_subscription',
      related_entity_id: null,
      ip_address: '127.0.0.1',
      user_agent: 'seed:data',
      created_at: new Date(runtime.isoDaysAgo(0)),
    },
  ])
}

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
    userActivityCount,
  ] = await Promise.all([
    count('users'),
    count('organizations'),
    count('projects'),
    count('tasks'),
    count('review_sessions'),
    count('user_subscriptions'),
    env.get('MONGODB_URL', '') ? MongoNotification.countDocuments({}) : Promise.resolve(0),
    env.get('MONGODB_URL', '') ? MongoAuditLogModel.countDocuments({}) : Promise.resolve(0),
    env.get('MONGODB_URL', '') ? MongoUserActivityLog.countDocuments({}) : Promise.resolve(0),
  ])

  console.warn(
    `Users=${userCount}, organizations=${orgCount}, projects=${projectCount}, tasks=${taskCount}, review_sessions=${reviewCount}, user_subscriptions=${subscriptionCount}, mongo_notifications=${notificationCount}, mongo_audit_logs=${auditLogCount}, mongo_user_activity_logs=${userActivityCount}`
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
