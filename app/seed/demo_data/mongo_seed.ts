import { randomUUID } from 'node:crypto'

import db from '@adonisjs/lucid/services/db'

import type { SeedContext } from './types.js'

export const OWNER_DEMO_OPERATIONAL_EVENT_TYPES = {
  notifications: [
    'task_assigned',
    'task_application_submitted',
    'task_application_approved',
    'task_application_rejected',
    'task_application_withdrawn',
    'review_disputed',
    'profile_snapshot_published',
    'organization_context_updated',
  ],
  auditActions: [
    'seed_org_owner_workspace',
    'apply_marketplace_task',
    'approve_marketplace_application',
    'reject_marketplace_application',
    'complete_task',
    'dispute_review',
    'generate_profile_snapshot',
    'switch_organization_context',
  ],
  activityActions: [
    'switch_organization',
    'login',
    'view_marketplace',
    'apply_task',
    'view_profile',
  ],
} as const

export interface SeedOperationalEventRuntime {
  fresh: boolean
  uuid(): string
  isoDaysAgo(daysAgo: number, hour?: number): string
  requireValue<T>(value: T | undefined, label: string): T
}

export async function seedOperationalEvents(
  runtime: SeedOperationalEventRuntime,
  context: SeedContext
): Promise<void> {
  const marketplaceTask = runtime.requireValue(
    context.tasks['marketplace-content-pass'],
    'operational-task:marketplace-content-pass'
  )
  const ownerPendingApplicationTask = runtime.requireValue(
    context.tasks['owner-marketplace-pending'],
    'operational-task:owner-marketplace-pending'
  )
  const ownerApprovedApplicationTask = runtime.requireValue(
    context.tasks['owner-marketplace-approved'],
    'operational-task:owner-marketplace-approved'
  )
  const ownerRejectedApplicationTask = runtime.requireValue(
    context.tasks['owner-marketplace-rejected'],
    'operational-task:owner-marketplace-rejected'
  )
  const ownerWithdrawnApplicationTask = runtime.requireValue(
    context.tasks['owner-marketplace-withdrawn'],
    'operational-task:owner-marketplace-withdrawn'
  )
  const ownerDisputedTask = runtime.requireValue(
    context.tasks['owner-review-dispute-case'],
    'operational-task:owner-review-dispute-case'
  )

  await db
    .from('notifications')
    .whereIn('type', [...OWNER_DEMO_OPERATIONAL_EVENT_TYPES.notifications])
    .delete()
  await db.from('audit_events').where('user_agent', 'seed:data').delete()
  await db.from('user_activity_events').where('user_agent', 'seed:data').delete()

  await db.table('notifications').insert([
    {
      id: randomUUID(),
      user_id: context.users.owner.id,
      title: 'Task board có task đang làm',
      message: 'Bạn đang được assign task in_progress trong Org A Platform.',
      type: 'task_assigned',
      related_entity_type: 'task',
      related_entity_id: runtime.requireValue(
        context.tasks['owner-active-platform-work'],
        'operational-task:owner-active-platform-work'
      ).id,
      metadata: JSON.stringify({
        status: 'in_progress',
        organization: context.organizations.orgA.slug,
      }),
      is_read: false,
      created_at: new Date(runtime.isoDaysAgo(0)),
      updated_at: new Date(runtime.isoDaysAgo(0)),
    },
    {
      id: randomUUID(),
      user_id: context.users.owner.id,
      title: 'Application marketplace đã gửi',
      message: 'Application public_listing của bạn đang ở trạng thái pending.',
      type: 'task_application_submitted',
      related_entity_type: 'task',
      related_entity_id: ownerPendingApplicationTask.id,
      metadata: JSON.stringify({ application_status: 'pending' }),
      is_read: false,
      created_at: new Date(runtime.isoDaysAgo(2)),
      updated_at: new Date(runtime.isoDaysAgo(2)),
    },
    {
      id: randomUUID(),
      user_id: context.users.owner.id,
      title: 'Application marketplace đã được duyệt',
      message: 'Bạn đã được approve và tạo freelancer assignment cho task Data Ops.',
      type: 'task_application_approved',
      related_entity_type: 'task',
      related_entity_id: ownerApprovedApplicationTask.id,
      metadata: JSON.stringify({ application_status: 'approved', assignment_type: 'freelancer' }),
      is_read: false,
      created_at: new Date(runtime.isoDaysAgo(1)),
      updated_at: new Date(runtime.isoDaysAgo(1)),
    },
    {
      id: randomUUID(),
      user_id: context.users.owner.id,
      title: 'Application marketplace bị từ chối',
      message: 'Rejected application seeded để kiểm tra trạng thái marketplace.',
      type: 'task_application_rejected',
      related_entity_type: 'task',
      related_entity_id: ownerRejectedApplicationTask.id,
      metadata: JSON.stringify({ application_status: 'rejected' }),
      is_read: false,
      created_at: new Date(runtime.isoDaysAgo(1)),
      updated_at: new Date(runtime.isoDaysAgo(1)),
    },
    {
      id: randomUUID(),
      user_id: context.users.owner.id,
      title: 'Application marketplace đã rút',
      message: 'Withdrawn application seeded để kiểm tra trạng thái marketplace.',
      type: 'task_application_withdrawn',
      related_entity_type: 'task',
      related_entity_id: ownerWithdrawnApplicationTask.id,
      metadata: JSON.stringify({ application_status: 'withdrawn' }),
      is_read: true,
      created_at: new Date(runtime.isoDaysAgo(1)),
      updated_at: new Date(runtime.isoDaysAgo(1)),
    },
    {
      id: randomUUID(),
      user_id: context.users.owner.id,
      title: 'Review disputed cần kiểm tra',
      message: 'Task owner-review-dispute-case có review session disputed.',
      type: 'review_disputed',
      related_entity_type: 'task',
      related_entity_id: ownerDisputedTask.id,
      metadata: JSON.stringify({ review_status: 'disputed' }),
      is_read: false,
      created_at: new Date(runtime.isoDaysAgo(1)),
      updated_at: new Date(runtime.isoDaysAgo(1)),
    },
    {
      id: randomUUID(),
      user_id: context.users.owner.id,
      title: 'Profile snapshot đã cập nhật',
      message: 'Snapshot public của owner đã có work history và performance stats mới.',
      type: 'profile_snapshot_published',
      related_entity_type: 'user_profile_snapshot',
      related_entity_id: context.snapshots.owner,
      metadata: JSON.stringify({ visibility: 'public' }),
      is_read: false,
      created_at: new Date(runtime.isoDaysAgo(0)),
      updated_at: new Date(runtime.isoDaysAgo(0)),
    },
    {
      id: randomUUID(),
      user_id: context.users.owner.id,
      title: 'Đã có ứng viên mới cho task marketplace',
      message: 'MaiFreelancer vừa apply vào task public của organization A.',
      type: 'task_application_submitted',
      related_entity_type: 'task',
      related_entity_id: marketplaceTask.id,
      metadata: JSON.stringify({ applicant: context.users.freelancerOne.username }),
      is_read: false,
      created_at: new Date(runtime.isoDaysAgo(1)),
      updated_at: new Date(runtime.isoDaysAgo(1)),
    },
    {
      id: randomUUID(),
      user_id: context.users.owner.id,
      title: 'Đã chuyển context mặc định về organization owner',
      message: 'Tài khoản của bạn sẽ vào Suar Workspace Lab trước để test giao diện owner rõ hơn.',
      type: 'organization_context_updated',
      related_entity_type: 'organization',
      related_entity_id: context.organizations.orgA.id,
      metadata: JSON.stringify({ role: 'org_owner' }),
      is_read: false,
      created_at: new Date(runtime.isoDaysAgo(0)),
      updated_at: new Date(runtime.isoDaysAgo(0)),
    },
    {
      id: randomUUID(),
      user_id: context.users.owner.id,
      title: 'Org B đã giao thêm task cho bạn',
      message: 'Bạn hiện có dữ liệu task khi chuyển sang org B với vai trò member.',
      type: 'task_assigned',
      related_entity_type: 'organization',
      related_entity_id: context.organizations.orgB.id,
      metadata: JSON.stringify({ role: 'org_member' }),
      is_read: false,
      created_at: new Date(runtime.isoDaysAgo(0)),
      updated_at: new Date(runtime.isoDaysAgo(0)),
    },
    {
      id: randomUUID(),
      user_id: context.users.member.id,
      title: 'Snapshot hồ sơ đã được publish',
      message: 'Profile proof mới nhất của bạn đã có share link và lịch sử snapshot.',
      type: 'profile_snapshot_published',
      related_entity_type: 'user_profile_snapshot',
      related_entity_id: context.snapshots.member,
      metadata: JSON.stringify({ visibility: 'public' }),
      is_read: false,
      created_at: new Date(runtime.isoDaysAgo(1)),
      updated_at: new Date(runtime.isoDaysAgo(1)),
    },
    {
      id: randomUUID(),
      user_id: context.users.member.id,
      title: 'Bạn có task đang review',
      message:
        'Luồng profile động đang có một task ở trạng thái in_review để test widget realtime.',
      type: 'task_review_pending',
      related_entity_type: 'task',
      related_entity_id: runtime.requireValue(
        context.tasks['member-profile-live'],
        'operational-task:member-profile-live'
      ).id,
      metadata: JSON.stringify({ project: context.projects.orgAPlatform.name }),
      is_read: false,
      created_at: new Date(runtime.isoDaysAgo(0)),
      updated_at: new Date(runtime.isoDaysAgo(0)),
    },
    {
      id: randomUUID(),
      user_id: context.users.superadmin.id,
      title: 'Có review bị flag cần kiểm tra',
      message: 'Trang admin hiện có 1 flagged review ở trạng thái pending.',
      type: 'flagged_review_pending',
      related_entity_type: 'flagged_review',
      related_entity_id: null,
      metadata: JSON.stringify({ source: 'seed:data' }),
      is_read: false,
      created_at: new Date(runtime.isoDaysAgo(1)),
      updated_at: new Date(runtime.isoDaysAgo(1)),
    },
    {
      id: randomUUID(),
      user_id: context.users.superadmin.id,
      title: 'Package usage đã được cập nhật',
      message: 'Dashboard có dữ liệu gói Pro và ProMax để kiểm tra admin package management.',
      type: 'subscription_metrics_ready',
      related_entity_type: 'user_subscription',
      related_entity_id: null,
      metadata: JSON.stringify({ packages: ['pro', 'promax'] }),
      is_read: false,
      created_at: new Date(runtime.isoDaysAgo(0)),
      updated_at: new Date(runtime.isoDaysAgo(0)),
    },
    {
      id: randomUUID(),
      user_id: context.users.orgAdmin.id,
      title: 'Design system role states cần review',
      message: 'Có task mới trong Workspace Design System để kiểm tra owner/member visual states.',
      type: 'task_assigned',
      related_entity_type: 'project',
      related_entity_id: context.projects.orgADesignSystem.id,
      metadata: JSON.stringify({
        task: runtime.requireValue(
          context.tasks['orga-design-refresh'],
          'operational-task:orga-design-refresh'
        ).id,
      }),
      is_read: false,
      created_at: new Date(runtime.isoDaysAgo(0)),
      updated_at: new Date(runtime.isoDaysAgo(0)),
    },
  ])

  await db.table('audit_events').insert([
    {
      id: randomUUID(),
      user_id: context.users.owner.id,
      action: 'seed_org_owner_workspace',
      entity_type: 'organization',
      entity_id: context.organizations.orgA.id,
      old_values: null,
      new_values: JSON.stringify({
        current_org: context.organizations.orgA.slug,
        secondary_membership: context.organizations.orgB.slug,
      }),
      ip_address: '127.0.0.1',
      user_agent: 'seed:data',
      occurred_at: new Date(runtime.isoDaysAgo(1)),
      created_at: new Date(runtime.isoDaysAgo(1)),
    },
    {
      id: randomUUID(),
      user_id: context.users.superadmin.id,
      action: 'seed_admin_dashboard',
      entity_type: 'user',
      entity_id: context.users.superadmin.id,
      old_values: JSON.stringify({ system_role: 'registered_user' }),
      new_values: JSON.stringify({ system_role: 'superadmin', redirect_target: '/admin' }),
      ip_address: '127.0.0.1',
      user_agent: 'seed:data',
      occurred_at: new Date(runtime.isoDaysAgo(1)),
      created_at: new Date(runtime.isoDaysAgo(1)),
    },
    {
      id: randomUUID(),
      user_id: context.users.member.id,
      action: 'publish_profile_snapshot',
      entity_type: 'user_profile_snapshot',
      entity_id: context.snapshots.member,
      old_values: null,
      new_values: JSON.stringify({ is_public: true, user_id: context.users.member.id }),
      ip_address: '127.0.0.1',
      user_agent: 'seed:data',
      occurred_at: new Date(runtime.isoDaysAgo(1)),
      created_at: new Date(runtime.isoDaysAgo(1)),
    },
    {
      id: randomUUID(),
      user_id: context.users.owner.id,
      action: 'create_project',
      entity_type: 'project',
      entity_id: context.projects.orgAPlatform.id,
      old_values: null,
      new_values: JSON.stringify({ organization_id: context.organizations.orgA.id }),
      ip_address: '127.0.0.1',
      user_agent: 'seed:data',
      occurred_at: new Date(runtime.isoDaysAgo(5)),
      created_at: new Date(runtime.isoDaysAgo(5)),
    },
    {
      id: randomUUID(),
      user_id: context.users.owner.id,
      action: 'apply_marketplace_task',
      entity_type: 'task',
      entity_id: ownerPendingApplicationTask.id,
      old_values: null,
      new_values: JSON.stringify({ application_status: 'pending', source: 'public_listing' }),
      ip_address: '127.0.0.1',
      user_agent: 'seed:data',
      occurred_at: new Date(runtime.isoDaysAgo(2)),
      created_at: new Date(runtime.isoDaysAgo(2)),
    },
    {
      id: randomUUID(),
      user_id: context.users.owner.id,
      action: 'approve_marketplace_application',
      entity_type: 'task',
      entity_id: ownerApprovedApplicationTask.id,
      old_values: JSON.stringify({ application_status: 'pending' }),
      new_values: JSON.stringify({ application_status: 'approved', assignment_type: 'freelancer' }),
      ip_address: '127.0.0.1',
      user_agent: 'seed:data',
      occurred_at: new Date(runtime.isoDaysAgo(1)),
      created_at: new Date(runtime.isoDaysAgo(1)),
    },
    {
      id: randomUUID(),
      user_id: context.users.owner.id,
      action: 'reject_marketplace_application',
      entity_type: 'task',
      entity_id: ownerRejectedApplicationTask.id,
      old_values: JSON.stringify({ application_status: 'pending' }),
      new_values: JSON.stringify({
        application_status: 'rejected',
        rejection_reason: 'Seeded rejection reason để test marketplace rejected state.',
      }),
      ip_address: '127.0.0.1',
      user_agent: 'seed:data',
      occurred_at: new Date(runtime.isoDaysAgo(1)),
      created_at: new Date(runtime.isoDaysAgo(1)),
    },
    {
      id: randomUUID(),
      user_id: context.users.owner.id,
      action: 'complete_task',
      entity_type: 'task',
      entity_id: runtime.requireValue(
        context.tasks['owner-profile-scoring-loop'],
        'operational-task:owner-profile-scoring-loop'
      ).id,
      old_values: JSON.stringify({ status: 'in_progress' }),
      new_values: JSON.stringify({ status: 'done' }),
      ip_address: '127.0.0.1',
      user_agent: 'seed:data',
      occurred_at: new Date(runtime.isoDaysAgo(2)),
      created_at: new Date(runtime.isoDaysAgo(2)),
    },
    {
      id: randomUUID(),
      user_id: context.users.owner.id,
      action: 'dispute_review',
      entity_type: 'task',
      entity_id: ownerDisputedTask.id,
      old_values: JSON.stringify({ review_status: 'completed' }),
      new_values: JSON.stringify({ review_status: 'disputed' }),
      ip_address: '127.0.0.1',
      user_agent: 'seed:data',
      occurred_at: new Date(runtime.isoDaysAgo(1)),
      created_at: new Date(runtime.isoDaysAgo(1)),
    },
    {
      id: randomUUID(),
      user_id: context.users.owner.id,
      action: 'generate_profile_snapshot',
      entity_type: 'user_profile_snapshot',
      entity_id: context.snapshots.owner,
      old_values: null,
      new_values: JSON.stringify({ is_public: true, user_id: context.users.owner.id }),
      ip_address: '127.0.0.1',
      user_agent: 'seed:data',
      occurred_at: new Date(runtime.isoDaysAgo(0)),
      created_at: new Date(runtime.isoDaysAgo(0)),
    },
    {
      id: randomUUID(),
      user_id: context.users.owner.id,
      action: 'switch_organization_context',
      entity_type: 'organization',
      entity_id: context.organizations.orgB.id,
      old_values: JSON.stringify({
        organization: context.organizations.orgA.slug,
        role: 'org_owner',
      }),
      new_values: JSON.stringify({
        organization: context.organizations.orgB.slug,
        role: 'org_member',
      }),
      ip_address: '127.0.0.1',
      user_agent: 'seed:data',
      occurred_at: new Date(runtime.isoDaysAgo(1)),
      created_at: new Date(runtime.isoDaysAgo(1)),
    },
    {
      id: randomUUID(),
      user_id: context.users.superadmin.id,
      action: 'seed_package_catalog',
      entity_type: 'user_subscription',
      entity_id: null,
      old_values: null,
      new_values: JSON.stringify({ packages: ['pro', 'promax'], active_subscriptions: 3 }),
      ip_address: '127.0.0.1',
      user_agent: 'seed:data',
      occurred_at: new Date(runtime.isoDaysAgo(0)),
      created_at: new Date(runtime.isoDaysAgo(0)),
    },
  ])

  await db.table('user_activity_events').insert([
    {
      id: randomUUID(),
      user_id: context.users.owner.id,
      action_type: 'switch_organization',
      action_data: JSON.stringify({
        from: context.organizations.orgA.slug,
        to: context.organizations.orgB.slug,
        expected_role: 'org_member',
      }),
      related_entity_type: 'organization',
      related_entity_id: context.organizations.orgB.id,
      ip_address: '127.0.0.1',
      user_agent: 'seed:data',
      created_at: new Date(runtime.isoDaysAgo(1)),
    },
    {
      id: randomUUID(),
      user_id: context.users.owner.id,
      action_type: 'login',
      action_data: JSON.stringify({
        auth_method: 'github',
        current_organization_id: context.organizations.orgA.id,
      }),
      related_entity_type: 'user',
      related_entity_id: context.users.owner.id,
      ip_address: '127.0.0.1',
      user_agent: 'seed:data',
      created_at: new Date(runtime.isoDaysAgo(2)),
    },
    {
      id: randomUUID(),
      user_id: context.users.owner.id,
      action_type: 'view_marketplace',
      action_data: JSON.stringify({ visible_public_tasks: 4 }),
      related_entity_type: 'task',
      related_entity_id: ownerPendingApplicationTask.id,
      ip_address: '127.0.0.1',
      user_agent: 'seed:data',
      created_at: new Date(runtime.isoDaysAgo(2)),
    },
    {
      id: randomUUID(),
      user_id: context.users.owner.id,
      action_type: 'apply_task',
      action_data: JSON.stringify({ application_status: 'pending', source: 'public_listing' }),
      related_entity_type: 'task',
      related_entity_id: ownerPendingApplicationTask.id,
      ip_address: '127.0.0.1',
      user_agent: 'seed:data',
      created_at: new Date(runtime.isoDaysAgo(2)),
    },
    {
      id: randomUUID(),
      user_id: context.users.owner.id,
      action_type: 'view_profile',
      action_data: JSON.stringify({ snapshot_id: context.snapshots.owner, is_public: true }),
      related_entity_type: 'user_profile_snapshot',
      related_entity_id: context.snapshots.owner,
      ip_address: '127.0.0.1',
      user_agent: 'seed:data',
      created_at: new Date(runtime.isoDaysAgo(0)),
    },
    {
      id: randomUUID(),
      user_id: context.users.member.id,
      action_type: 'profile_snapshot_published',
      action_data: JSON.stringify({
        snapshot_id: context.snapshots.member,
        total_completed_assignments: 3,
      }),
      related_entity_type: 'user_profile_snapshot',
      related_entity_id: context.snapshots.member,
      ip_address: '127.0.0.1',
      user_agent: 'seed:data',
      created_at: new Date(runtime.isoDaysAgo(1)),
    },
    {
      id: randomUUID(),
      user_id: context.users.superadmin.id,
      action_type: 'admin_login',
      action_data: JSON.stringify({
        redirect_to: '/admin',
        current_organization_id: null,
      }),
      related_entity_type: 'user',
      related_entity_id: context.users.superadmin.id,
      ip_address: '127.0.0.1',
      user_agent: 'seed:data',
      created_at: new Date(runtime.isoDaysAgo(1)),
    },
    {
      id: randomUUID(),
      user_id: context.users.owner.id,
      action_type: 'package_metrics_viewed',
      action_data: JSON.stringify({
        packages: ['pro', 'promax'],
        active_orgs: Object.keys(context.organizations).length,
      }),
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
    count('notifications'),
    count('audit_events'),
    count('user_activity_events'),
  ])

  console.warn(
    `Users=${userCount}, organizations=${orgCount}, projects=${projectCount}, tasks=${taskCount}, review_sessions=${reviewCount}, user_subscriptions=${subscriptionCount}, postgres_notifications=${notificationCount}, postgres_audit_logs=${auditLogCount}, postgres_user_activity_logs=${userActivityCount}`
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
