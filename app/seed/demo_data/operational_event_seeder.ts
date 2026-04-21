import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type { OrgKey, ProjectKey, SeedContext, UserKey } from './types.js'

import { notificationApplication } from '#composition/notifications/notification-feed/notification_composition'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import {
  BACKEND_NOTIFICATION_ENTITY_TYPES,
  BACKEND_NOTIFICATION_TYPES,
  type BackendNotificationType,
} from '#modules/notifications/public_contracts/notification_constants'
import { buildNotificationEventId } from '#modules/notifications/public_contracts/notification_event_identity'

export const OWNER_DEMO_OPERATIONAL_EVENT_TYPES = {
  notifications: [
    BACKEND_NOTIFICATION_TYPES.TASK_ASSIGNED,
    BACKEND_NOTIFICATION_TYPES.TASK_APPLICATION_RECEIVED,
    BACKEND_NOTIFICATION_TYPES.TASK_APPLICATION_APPROVED,
    BACKEND_NOTIFICATION_TYPES.TASK_APPLICATION_REJECTED,
    BACKEND_NOTIFICATION_TYPES.TASK_DUE_SOON,
    BACKEND_NOTIFICATION_TYPES.REVIEW_DISPUTE_ESCALATED,
    BACKEND_NOTIFICATION_TYPES.REVIEW_REQUESTED,
    BACKEND_NOTIFICATION_TYPES.SYSTEM_ANNOUNCEMENT,
  ],
  auditActions: [
    'organization_workspace_initialized',
    'apply_marketplace_task',
    'process_marketplace_application',
    'complete_task',
    'dispute_review',
    'publish_profile_snapshot',
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

interface DemoNotificationSpec {
  key: string
  recipientId: string
  type: BackendNotificationType
  scope:
    | { kind: 'user'; id: string }
    | { kind: 'organization'; id: string }
    | { kind: 'system' }
  actor?: { type: string; id: string }
  subject?: { type: string; id: string }
  parameters: Record<string, string | number | boolean | null>
  occurredAt: string
  title: string
  message: string
}

interface DemoAuditSpec {
  actorId: string
  actorOrganizationId: string | null
  actorRoleSurface: string
  action: string
  eventName: string
  eventFamily: string
  module: string
  entityType: string
  entityId: string
  targetOrganizationId?: string | null
  affectedUserIds?: string[]
  oldValues?: Record<string, unknown> | null
  newValues?: Record<string, unknown> | null
  daysAgo: number
}

/**
 * Seed the causal operational bundle through the same acceptance boundaries used
 * by live commands. This intentionally does not delete rows by notification type
 * or user-agent; the write command itself requires a fresh seed transaction.
 */
export async function seedOperationalEvents(
  runtime: SeedOperationalEventRuntime,
  context: SeedContext,
  trx: TransactionClientContract
): Promise<void> {
  const ownerActiveTask = runtime.requireValue(
    context.tasks['owner-active-platform-work'],
    'operational-task:owner-active-platform-work'
  )
  const ownerPendingTask = runtime.requireValue(
    context.tasks['owner-marketplace-pending'],
    'operational-task:owner-marketplace-pending'
  )
  const ownerApprovedTask = runtime.requireValue(
    context.tasks['owner-marketplace-approved'],
    'operational-task:owner-marketplace-approved'
  )
  const ownerRejectedTask = runtime.requireValue(
    context.tasks['owner-marketplace-rejected'],
    'operational-task:owner-marketplace-rejected'
  )
  const ownerWithdrawnTask = runtime.requireValue(
    context.tasks['owner-marketplace-withdrawn'],
    'operational-task:owner-marketplace-withdrawn'
  )
  const marketplaceTask = runtime.requireValue(
    context.tasks['marketplace-content-pass'],
    'operational-task:marketplace-content-pass'
  )
  const ownerDisputedTask = runtime.requireValue(
    context.tasks['owner-review-dispute-case'],
    'operational-task:owner-review-dispute-case'
  )
  const memberReviewTask = runtime.requireValue(
    context.tasks['member-profile-live'],
    'operational-task:member-profile-live'
  )
  const orgAdminTask = runtime.requireValue(
    context.tasks['orga-design-refresh'],
    'operational-task:orga-design-refresh'
  )
  const ownerCompletedTask = runtime.requireValue(
    context.tasks['owner-profile-scoring-loop'],
    'operational-task:owner-profile-scoring-loop'
  )
  const ownerSnapshotId = runtime.requireValue(
    context.snapshots['owner'],
    'operational-snapshot:owner'
  )
  const memberSnapshotId = runtime.requireValue(
    context.snapshots['member'],
    'operational-snapshot:member'
  )
  const notificationOccurredAt = (daysAgo: number): string => {
    const intended = new Date(runtime.isoDaysAgo(daysAgo)).getTime()
    const safelyBeforeAcceptance = Date.now() - 60_000
    return new Date(Math.min(intended, safelyBeforeAcceptance)).toISOString()
  }

  const notifications: DemoNotificationSpec[] = [
    {
      key: 'owner-active-task',
      recipientId: context.users.owner.id,
      type: BACKEND_NOTIFICATION_TYPES.TASK_ASSIGNED,
      scope: { kind: 'organization', id: context.organizations.orgA.id },
      actor: { type: 'user', id: context.users.owner.id },
      subject: { type: BACKEND_NOTIFICATION_ENTITY_TYPES.TASK, id: ownerActiveTask.id },
      parameters: { taskTitle: ownerActiveTask.title },
      occurredAt: notificationOccurredAt(0),
      title: 'Công việc phát hành đang triển khai',
      message:
        'Bạn đang phụ trách trung tâm theo dõi chất lượng phát hành, nơi gom tiến độ, rủi ro và chứng cứ bàn giao.',
    },
    {
      key: 'owner-application-pending',
      recipientId: context.users.owner.id,
      type: BACKEND_NOTIFICATION_TYPES.TASK_APPLICATION_RECEIVED,
      scope: { kind: 'organization', id: context.organizations.orgD.id },
      actor: { type: 'user', id: context.users.owner.id },
      subject: { type: BACKEND_NOTIFICATION_ENTITY_TYPES.TASK, id: ownerPendingTask.id },
      parameters: { taskTitle: ownerPendingTask.title, status: 'pending' },
      occurredAt: notificationOccurredAt(2),
      title: 'Đề xuất cộng tác đang chờ phản hồi',
      message:
        'Đề xuất biên soạn câu chuyện hồ sơ chuyên gia đã được ghi nhận và đang chờ đơn vị phụ trách xem xét.',
    },
    {
      key: 'owner-application-approved',
      recipientId: context.users.owner.id,
      type: BACKEND_NOTIFICATION_TYPES.TASK_APPLICATION_APPROVED,
      scope: { kind: 'organization', id: context.organizations.orgE.id },
      actor: { type: 'user', id: context.users.externalContributorTwo.id },
      subject: { type: BACKEND_NOTIFICATION_ENTITY_TYPES.TASK, id: ownerApprovedTask.id },
      parameters: { taskTitle: ownerApprovedTask.title, status: 'approved' },
      occurredAt: notificationOccurredAt(1),
      title: 'Đề xuất kiểm định dữ liệu đã được chấp thuận',
      message:
        'Bạn đã được giao hạng mục kiểm định pipeline; phân công và tư cách thành viên cộng tác đã được đồng bộ.',
    },
    {
      key: 'owner-application-rejected',
      recipientId: context.users.owner.id,
      type: BACKEND_NOTIFICATION_TYPES.TASK_APPLICATION_REJECTED,
      scope: { kind: 'organization', id: context.organizations.orgD.id },
      actor: { type: 'user', id: context.users.externalContributorOne.id },
      subject: { type: BACKEND_NOTIFICATION_ENTITY_TYPES.TASK, id: ownerRejectedTask.id },
      parameters: { taskTitle: ownerRejectedTask.title, status: 'rejected' },
      occurredAt: notificationOccurredAt(1),
      title: 'Đề xuất thiết kế cần thêm bằng chứng chuyên môn',
      message:
        'Đơn vị tuyển chọn ưu tiên hồ sơ có thêm bằng chứng thiết kế hệ thống giao diện ở quy mô sản phẩm.',
    },
    {
      key: 'owner-application-withdrawn',
      recipientId: context.users.owner.id,
      type: BACKEND_NOTIFICATION_TYPES.TASK_UPDATED,
      scope: { kind: 'organization', id: context.organizations.orgE.id },
      actor: { type: 'user', id: context.users.owner.id },
      subject: { type: BACKEND_NOTIFICATION_ENTITY_TYPES.TASK, id: ownerWithdrawnTask.id },
      parameters: { taskTitle: ownerWithdrawnTask.title, applicationStatus: 'withdrawn' },
      occurredAt: notificationOccurredAt(1),
      title: 'Đề xuất tài liệu chỉ số đã được rút',
      message:
        'Đề xuất cộng tác đã được rút chủ động trước khi đơn vị phụ trách đưa ra quyết định tuyển chọn.',
    },
    {
      key: 'owner-review-dispute',
      recipientId: context.users.owner.id,
      type: BACKEND_NOTIFICATION_TYPES.REVIEW_DISPUTE_ESCALATED,
      scope: { kind: 'organization', id: context.organizations.orgA.id },
      actor: { type: 'user', id: context.users.owner.id },
      subject: { type: BACKEND_NOTIFICATION_ENTITY_TYPES.TASK, id: ownerDisputedTask.id },
      parameters: { taskTitle: ownerDisputedTask.title, status: 'admin_reviewing' },
      occurredAt: notificationOccurredAt(1),
      title: 'Hồ sơ đánh giá đang được đối soát',
      message:
        'Tranh chấp đã có trao đổi hai phía, case file và khuyến nghị AI; quyết định cuối vẫn thuộc hội đồng quản trị.',
    },
    {
      key: 'owner-profile-published',
      recipientId: context.users.owner.id,
      type: BACKEND_NOTIFICATION_TYPES.SYSTEM_ANNOUNCEMENT,
      scope: { kind: 'user', id: context.users.owner.id },
      subject: { type: BACKEND_NOTIFICATION_ENTITY_TYPES.USER, id: context.users.owner.id },
      parameters: { snapshotId: ownerSnapshotId, visibility: 'public' },
      occurredAt: notificationOccurredAt(0),
      title: 'Hồ sơ năng lực công khai đã cập nhật',
      message:
        'Phiên bản hồ sơ mới đã tổng hợp lịch sử công việc, kỹ năng được xác thực và chỉ số hiệu suất gần nhất.',
    },
    {
      key: 'marketplace-application-received',
      recipientId: context.users.owner.id,
      type: BACKEND_NOTIFICATION_TYPES.TASK_APPLICATION_RECEIVED,
      scope: { kind: 'organization', id: context.organizations.orgA.id },
      actor: { type: 'user', id: context.users.externalContributorOne.id },
      subject: { type: BACKEND_NOTIFICATION_ENTITY_TYPES.TASK, id: marketplaceTask.id },
      parameters: {
        taskTitle: marketplaceTask.title,
        applicantName: context.users.externalContributorOne.username,
      },
      occurredAt: notificationOccurredAt(1),
      title: 'Có đề xuất mới trên marketplace',
      message: `${context.users.externalContributorOne.username} đã gửi đề xuất kèm hồ sơ và thông điệp cộng tác.`,
    },
    {
      key: 'owner-secondary-org-assignment',
      recipientId: context.users.owner.id,
      type: BACKEND_NOTIFICATION_TYPES.TASK_ASSIGNED,
      scope: { kind: 'organization', id: context.organizations.orgB.id },
      actor: { type: 'user', id: context.users.orgBOwner.id },
      subject: {
        type: BACKEND_NOTIFICATION_ENTITY_TYPES.TASK,
        id: runtime.requireValue(
          context.tasks['owner-orgb-curriculum-todo'],
          'operational-task:owner-orgb-curriculum-todo'
        ).id,
      },
      parameters: { organizationName: context.organizations.orgB.name },
      occurredAt: notificationOccurredAt(0),
      title: 'Bạn có công việc mới từ đơn vị đối tác',
      message:
        'Học viện Kỹ năng Số Mở đã giao hạng mục xây dựng khung năng lực AI ứng dụng.',
    },
    {
      key: 'member-profile-published',
      recipientId: context.users.member.id,
      type: BACKEND_NOTIFICATION_TYPES.SYSTEM_ANNOUNCEMENT,
      scope: { kind: 'user', id: context.users.member.id },
      subject: { type: BACKEND_NOTIFICATION_ENTITY_TYPES.USER, id: context.users.member.id },
      parameters: { snapshotId: memberSnapshotId, visibility: 'public' },
      occurredAt: notificationOccurredAt(1),
      title: 'Hồ sơ năng lực đã được công bố',
      message:
        'Phiên bản hồ sơ mới có liên kết chia sẻ và ghi rõ nguồn chứng cứ cho từng kỹ năng đã xác thực.',
    },
    {
      key: 'member-review-requested',
      recipientId: context.users.member.id,
      type: BACKEND_NOTIFICATION_TYPES.REVIEW_REQUESTED,
      scope: { kind: 'organization', id: context.organizations.orgA.id },
      actor: { type: 'user', id: context.users.owner.id },
      subject: { type: BACKEND_NOTIFICATION_ENTITY_TYPES.TASK, id: memberReviewTask.id },
      parameters: { taskTitle: memberReviewTask.title },
      occurredAt: notificationOccurredAt(0),
      title: 'Hạng mục đang chờ phản hồi đánh giá',
      message:
        'Thẻ năng lực đã có submission và đang đi qua cổng review trước khi hoàn tất.',
    },
    {
      key: 'admin-dispute-queue',
      recipientId: context.users.superadmin.id,
      type: BACKEND_NOTIFICATION_TYPES.REVIEW_DISPUTE_ESCALATED,
      scope: { kind: 'system' },
      actor: { type: 'user', id: context.users.owner.id },
      subject: { type: BACKEND_NOTIFICATION_ENTITY_TYPES.TASK, id: ownerDisputedTask.id },
      parameters: { queue: 'human_final_decision', status: 'admin_reviewing' },
      occurredAt: notificationOccurredAt(1),
      title: 'Có hồ sơ tranh chấp cần quyết định của con người',
      message:
        'Case file đã đủ chứng cứ và khuyến nghị AI đã sẵn sàng để hội đồng đưa ra quyết định cuối.',
    },
    {
      key: 'admin-subscription-metrics',
      recipientId: context.users.superadmin.id,
      type: BACKEND_NOTIFICATION_TYPES.SYSTEM_ANNOUNCEMENT,
      scope: { kind: 'system' },
      subject: { type: BACKEND_NOTIFICATION_ENTITY_TYPES.USER, id: context.users.superadmin.id },
      parameters: { report: 'subscription_usage', storagePlans: 'pro,enterprise' },
      occurredAt: notificationOccurredAt(0),
      title: 'Báo cáo sử dụng gói dịch vụ đã sẵn sàng',
      message:
        'Chỉ số Pro và Pro Max đã được tổng hợp; Pro Max tiếp tục dùng mã lưu trữ enterprise.',
    },
    {
      key: 'org-admin-design-task',
      recipientId: context.users.orgAdmin.id,
      type: BACKEND_NOTIFICATION_TYPES.TASK_ASSIGNED,
      scope: { kind: 'organization', id: context.organizations.orgA.id },
      actor: { type: 'user', id: context.users.owner.id },
      subject: { type: BACKEND_NOTIFICATION_ENTITY_TYPES.TASK, id: orgAdminTask.id },
      parameters: { taskTitle: orgAdminTask.title },
      occurredAt: notificationOccurredAt(0),
      title: 'Bộ trạng thái phân quyền cần được duyệt',
      message:
        'Hạng mục đã được giao để thiết kế và vận hành cùng rà soát trước mốc phát hành.',
    },
  ]

  const coreOperationalUsers = new Set<UserKey>([
    'owner',
    'superadmin',
    'member',
    'orgAdmin',
    'peerReviewer',
    'orgBOwner',
    'externalContributorOne',
    'externalContributorTwo',
  ])
  for (const [userKey, user] of Object.entries(context.users) as [
    UserKey,
    (typeof context.users)[UserKey],
  ][]) {
    if (coreOperationalUsers.has(userKey)) {
      continue
    }
    const assignmentEntry = Object.entries(context.assignments).find(
      ([, assignment]) => assignment.assigneeId === user.id
    )
    if (!assignmentEntry) {
      continue
    }
    const [taskKey] = assignmentEntry
    const task = runtime.requireValue(
      context.tasks[taskKey],
      `operational-expanded-task:${userKey}`
    )
    notifications.push({
      key: `expanded-assignment-${userKey}`,
      recipientId: user.id,
      type: BACKEND_NOTIFICATION_TYPES.TASK_ASSIGNED,
      scope: { kind: 'organization', id: task.organizationId },
      subject: { type: BACKEND_NOTIFICATION_ENTITY_TYPES.TASK, id: task.id },
      parameters: { taskTitle: task.title, portfolioContext: 'expanded_demo_narrative' },
      occurredAt: notificationOccurredAt(1),
      title: `Công việc mới trong hồ sơ của ${user.username}`,
      message: `Bạn được giao “${task.title}”; phạm vi, tiêu chí nghiệm thu và gói bằng chứng đã sẵn sàng trong không gian dự án.`,
    })
  }

  const acceptanceNow = new Date()
  for (const notification of notifications) {
    await notificationApplication.stage(
      {
        eventId: buildNotificationEventId({
          eventName: `seed.demo.${notification.key.toLowerCase()}`,
          businessEventId: notification.subject?.id ?? notification.key,
          recipientId: notification.recipientId,
        }),
        type: notification.type,
        schemaVersion: 1,
        recipientId: notification.recipientId,
        scope: notification.scope,
        ...(notification.actor ? { actor: notification.actor } : {}),
        ...(notification.subject ? { subject: notification.subject } : {}),
        parameters: notification.parameters,
        occurredAt: notification.occurredAt,
        correlationId: `seed-demo:${notification.key}`,
        dedupeKey: `seed-demo:${notification.key}:${notification.recipientId}`,
      },
      {
        trx,
        now: acceptanceNow,
        snapshotTextOverride: {
          title: notification.title,
          message: notification.message,
        },
      }
    )
  }

  const audits: DemoAuditSpec[] = [
    {
      actorId: context.users.owner.id,
      actorOrganizationId: context.organizations.orgA.id,
      actorRoleSurface: 'organization_owner',
      action: 'organization_workspace_initialized',
      eventName: 'organization.workspace.initialized',
      eventFamily: 'organization.lifecycle',
      module: 'organizations',
      entityType: 'organization',
      entityId: context.organizations.orgA.id,
      targetOrganizationId: context.organizations.orgA.id,
      newValues: {
        primary_workspace: context.organizations.orgA.slug,
        secondary_membership: context.organizations.orgB.slug,
      },
      daysAgo: 5,
    },
    {
      actorId: context.users.superadmin.id,
      actorOrganizationId: null,
      actorRoleSurface: 'system_admin',
      action: 'admin_access_granted',
      eventName: 'admin.access.granted',
      eventFamily: 'admin.access',
      module: 'admin',
      entityType: 'user',
      entityId: context.users.superadmin.id,
      newValues: { system_role: 'superadmin', redirect_target: '/admin' },
      daysAgo: 5,
    },
    {
      actorId: context.users.member.id,
      actorOrganizationId: context.organizations.orgA.id,
      actorRoleSurface: 'user_profile',
      action: 'publish_profile_snapshot',
      eventName: 'user.profile_snapshot.published',
      eventFamily: 'user.profile',
      module: 'users',
      entityType: 'user',
      entityId: context.users.member.id,
      newValues: { snapshot_id: memberSnapshotId, is_public: true },
      daysAgo: 2,
    },
    {
      actorId: context.users.owner.id,
      actorOrganizationId: context.organizations.orgA.id,
      actorRoleSurface: 'organization_owner',
      action: 'create_project',
      eventName: 'project.created',
      eventFamily: 'project.lifecycle',
      module: 'projects',
      entityType: 'project',
      entityId: context.projects.orgAPlatform.id,
      targetOrganizationId: context.organizations.orgA.id,
      newValues: { organization_id: context.organizations.orgA.id },
      daysAgo: 5,
    },
    {
      actorId: context.users.owner.id,
      actorOrganizationId: context.organizations.orgD.id,
      actorRoleSurface: 'marketplace_applicant',
      action: 'apply_marketplace_task',
      eventName: 'task.application.submitted',
      eventFamily: 'task.marketplace',
      module: 'tasks',
      entityType: 'task',
      entityId: ownerPendingTask.id,
      targetOrganizationId: context.organizations.orgD.id,
      newValues: { application_status: 'pending', source: 'public_listing' },
      daysAgo: 2,
    },
    {
      actorId: context.users.externalContributorTwo.id,
      actorOrganizationId: context.organizations.orgE.id,
      actorRoleSurface: 'organization_owner',
      action: 'process_marketplace_application',
      eventName: 'task.application.approved',
      eventFamily: 'task.marketplace',
      module: 'tasks',
      entityType: 'task',
      entityId: ownerApprovedTask.id,
      targetOrganizationId: context.organizations.orgE.id,
      affectedUserIds: [context.users.owner.id],
      oldValues: { application_status: 'pending' },
      newValues: {
        application_status: 'approved',
        assignment_type: 'external_contributor',
      },
      daysAgo: 1,
    },
    {
      actorId: context.users.externalContributorOne.id,
      actorOrganizationId: context.organizations.orgD.id,
      actorRoleSurface: 'organization_owner',
      action: 'process_marketplace_application',
      eventName: 'task.application.rejected',
      eventFamily: 'task.marketplace',
      module: 'tasks',
      entityType: 'task',
      entityId: ownerRejectedTask.id,
      targetOrganizationId: context.organizations.orgD.id,
      affectedUserIds: [context.users.owner.id],
      oldValues: { application_status: 'pending' },
      newValues: {
        application_status: 'rejected',
        rejection_reason: 'Cần thêm bằng chứng thiết kế hệ thống giao diện ở quy mô sản phẩm.',
      },
      daysAgo: 1,
    },
    {
      actorId: context.users.owner.id,
      actorOrganizationId: context.organizations.orgA.id,
      actorRoleSurface: 'task_assignee',
      action: 'complete_task',
      eventName: 'task.completed',
      eventFamily: 'task.lifecycle',
      module: 'tasks',
      entityType: 'task',
      entityId: ownerCompletedTask.id,
      targetOrganizationId: context.organizations.orgA.id,
      oldValues: { status: 'in_testing' },
      newValues: { status: 'done' },
      daysAgo: 2,
    },
    {
      actorId: context.users.owner.id,
      actorOrganizationId: context.organizations.orgA.id,
      actorRoleSurface: 'reviewee',
      action: 'dispute_review',
      eventName: 'review.dispute.created',
      eventFamily: 'review.governance',
      module: 'reviews',
      entityType: 'review_dispute',
      entityId: ownerDisputedTask.id,
      targetOrganizationId: context.organizations.orgA.id,
      oldValues: { review_status: 'completed' },
      newValues: { review_status: 'admin_reviewing' },
      daysAgo: 1,
    },
    {
      actorId: context.users.owner.id,
      actorOrganizationId: context.organizations.orgA.id,
      actorRoleSurface: 'user_profile',
      action: 'publish_profile_snapshot',
      eventName: 'user.profile_snapshot.published',
      eventFamily: 'user.profile',
      module: 'users',
      entityType: 'user',
      entityId: context.users.owner.id,
      affectedUserIds: [context.users.owner.id],
      newValues: { snapshot_id: ownerSnapshotId, is_public: true },
      daysAgo: 0,
    },
    {
      actorId: context.users.owner.id,
      actorOrganizationId: context.organizations.orgB.id,
      actorRoleSurface: 'organization_member',
      action: 'switch_organization_context',
      eventName: 'organization.context.switched',
      eventFamily: 'organization.membership',
      module: 'organizations',
      entityType: 'organization',
      entityId: context.organizations.orgB.id,
      targetOrganizationId: context.organizations.orgB.id,
      oldValues: { organization: context.organizations.orgA.slug, role: 'org_owner' },
      newValues: { organization: context.organizations.orgB.slug, role: 'org_member' },
      daysAgo: 1,
    },
    {
      actorId: context.users.superadmin.id,
      actorOrganizationId: null,
      actorRoleSurface: 'system_admin',
      action: 'subscription_catalog_reviewed',
      eventName: 'subscription.catalog.reviewed',
      eventFamily: 'subscription.governance',
      module: 'subscriptions',
      entityType: 'user',
      entityId: context.users.superadmin.id,
      newValues: { display_packages: ['pro', 'promax'], storage_packages: ['pro', 'enterprise'] },
      daysAgo: 0,
    },
  ]

  const expandedOrganizations: {
    organization: OrgKey
    owner: UserKey
  }[] = [
    { organization: 'orgF', owner: 'backendSpecialist' },
    { organization: 'orgG', owner: 'civicServiceLead' },
    { organization: 'orgH', owner: 'agriProductOwner' },
    { organization: 'orgI', owner: 'securityOwner' },
    { organization: 'orgJ', owner: 'commerceOwner' },
  ]
  for (const [index, item] of expandedOrganizations.entries()) {
    const organization = context.organizations[item.organization]
    audits.push({
      actorId: context.users[item.owner].id,
      actorOrganizationId: organization.id,
      actorRoleSurface: 'organization_owner',
      action: 'organization_workspace_initialized',
      eventName: 'organization.workspace.initialized',
      eventFamily: 'organization.lifecycle',
      module: 'organizations',
      entityType: 'organization',
      entityId: organization.id,
      targetOrganizationId: organization.id,
      newValues: { workspace: organization.slug, narrative_pack: 'expanded_data_train_inspired' },
      daysAgo: 8 - index,
    })
  }

  const expandedProjectAuditActors: Partial<Record<ProjectKey, UserKey>> = {
    orgFReviewOps: 'backendSpecialist',
    orgFDeveloperExperience: 'frontendSpecialist',
    orgFReleaseReliability: 'devopsEngineer',
    orgGCitizenPortal: 'civicServiceLead',
    orgGComplaintResolution: 'civicServiceLead',
    orgGAccessibilityAnalytics: 'dataAnalyst',
    orgHFarmOperations: 'agriProductOwner',
    orgHIotFieldMonitoring: 'mobileEngineer',
    orgHKnowledgeHub: 'agriProductOwner',
    orgISecureDelivery: 'securityOwner',
    orgIIncidentReadiness: 'securityOwner',
    orgIDependencyGovernance: 'securityEngineer',
    orgJSustainableCommerce: 'commerceOwner',
    orgJCustomerInsight: 'productResearcher',
    orgJCreatorMarketplace: 'communityManager',
  }
  for (const [projectKey, actorKey] of Object.entries(expandedProjectAuditActors) as [
    ProjectKey,
    UserKey,
  ][]) {
    const project = context.projects[projectKey]
    audits.push({
      actorId: context.users[actorKey].id,
      actorOrganizationId: project.organizationId,
      actorRoleSurface: 'project_owner',
      action: 'create_project',
      eventName: 'project.created',
      eventFamily: 'project.lifecycle',
      module: 'projects',
      entityType: 'project',
      entityId: project.id,
      targetOrganizationId: project.organizationId,
      newValues: {
        organization_id: project.organizationId,
        content_provenance: 'curated_from_training_taxonomy',
      },
      daysAgo: 4,
    })
  }

  for (const audit of audits) {
    await auditPublicApi.write(
      {
        userId: audit.actorId,
        ip: '127.0.0.1',
        userAgent: 'seed:data:runtime-derived-v2',
        organizationId: audit.actorOrganizationId,
        actorRoleSurface: audit.actorRoleSurface,
        requestId: `seed-demo:${audit.eventName}`,
        traceId: 'seed-demo-runtime-derived-v2',
        workflowId: audit.eventFamily,
      },
      {
        user_id: audit.actorId,
        action: audit.action,
        event_name: audit.eventName,
        event_family: audit.eventFamily,
        module: audit.module,
        outcome: 'success',
        entity_type: audit.entityType,
        entity_id: audit.entityId,
        target_type: audit.entityType,
        target_id: audit.entityId,
        ...(audit.targetOrganizationId !== undefined
          ? { target_organization_id: audit.targetOrganizationId }
          : {}),
        ...(audit.affectedUserIds ? { affected_user_ids: audit.affectedUserIds } : {}),
        ...(audit.oldValues !== undefined ? { old_values: audit.oldValues } : {}),
        ...(audit.newValues !== undefined ? { new_values: audit.newValues } : {}),
        source_occurred_at: new Date(runtime.isoDaysAgo(audit.daysAgo)),
        retention_class: 'demo_operational_evidence_2y',
        critical: true,
      },
      trx
    )
  }
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
