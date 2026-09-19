import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type { SeedContext, UserKey } from '../types.js'

import { notificationApplication } from '#composition/notifications/notification-feed/notification_composition'
import {
  BACKEND_NOTIFICATION_ENTITY_TYPES,
  BACKEND_NOTIFICATION_TYPES,
  type BackendNotificationType,
} from '#modules/notifications/public_contracts/notification_constants'
import { buildNotificationEventId } from '#modules/notifications/public_contracts/notification_event_identity'

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

export async function seedOperationalNotifications(
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
}
