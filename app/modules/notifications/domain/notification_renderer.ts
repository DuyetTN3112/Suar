import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import type { NotificationActionDescriptor } from '#modules/notifications/domain/notification_catalog'
import { getNotificationDefinition } from '#modules/notifications/domain/notification_catalog'
import type { NotificationCommandV1 } from '#modules/notifications/domain/notification_command'

export interface RenderedNotificationSnapshot {
  title: string
  message: string
  action: NotificationActionDescriptor | null
}

function humanizeType(type: string): string {
  const words = type.split('_').filter(Boolean)
  const text = words.join(' ')
  const firstCharacter = text.at(0)
  return firstCharacter === undefined
    ? 'Notification'
    : firstCharacter.toUpperCase() + text.slice(1)
}

function optionalParameter(command: NotificationCommandV1, key: string): string | undefined {
  const value = command.parameters[key]
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

export function renderNotificationSnapshot(
  command: NotificationCommandV1
): RenderedNotificationSnapshot {
  const definition = getNotificationDefinition(command.type)
  if (!definition) {
    throw new InvariantViolationException(
      `Cannot render unknown notification type "${command.type}"`
    )
  }

  const fallbackTitle = humanizeType(command.type)
  let title = fallbackTitle
  let message = fallbackTitle

  if (command.type === 'task_assigned') {
    title = 'Task assigned'
    const taskTitle = optionalParameter(command, 'taskTitle')
    const assignerName = optionalParameter(command, 'assignerName')
    const reason = optionalParameter(command, 'reason')
    if (assignerName && taskTitle) {
      title = 'Bạn có nhiệm vụ mới'
      message = `${assignerName} đã giao cho bạn task: ${taskTitle}`
      if (reason) {
        message += ` (${reason})`
      }
    } else {
      message = taskTitle ? `You were assigned to "${taskTitle}".` : 'You were assigned a task.'
    }
  } else if (command.type === 'task_unassigned') {
    title = 'Cập nhật nhiệm vụ'
    const assignerName = optionalParameter(command, 'assignerName') ?? 'Unknown'
    const taskTitle = optionalParameter(command, 'taskTitle') ?? 'nhiệm vụ'
    message = `${assignerName} đã bỏ giao task: ${taskTitle}`
  } else if (command.type === 'task_reassigned') {
    title = 'Cập nhật nhiệm vụ'
    const assignerName = optionalParameter(command, 'assignerName') ?? 'Unknown'
    const taskTitle = optionalParameter(command, 'taskTitle') ?? 'nhiệm vụ'
    message = `${assignerName} đã chuyển nhiệm vụ "${taskTitle}" cho người khác`
  } else if (command.type === 'task_updated') {
    const updaterName = optionalParameter(command, 'updaterName')
    const taskTitle = optionalParameter(command, 'taskTitle')
    if (
      optionalParameter(command, 'assignmentChange') === 'unassigned' &&
      updaterName &&
      taskTitle
    ) {
      title = 'Cập nhật nhiệm vụ'
      message = `${updaterName} đã bỏ giao nhiệm vụ: ${taskTitle}`
    } else {
      title = 'Task updated'
      message = taskTitle ? `Task "${taskTitle}" was updated.` : 'A task was updated.'
    }
  } else if (command.type === 'task_application') {
    title = 'Yêu cầu tham gia task mới'
    const taskTitle = optionalParameter(command, 'taskTitle')
    message = taskTitle
      ? `Có người đã đăng ký tham gia task "${taskTitle}".`
      : 'Có người đã đăng ký tham gia task của bạn.'
  } else if (command.type === 'task_application_review') {
    const approved = optionalParameter(command, 'status') === 'approved'
    title = approved ? 'Yêu cầu được chấp nhận' : 'Yêu cầu bị từ chối'
    message = approved
      ? 'Yêu cầu tham gia task của bạn đã được chấp nhận.'
      : 'Yêu cầu tham gia task của bạn đã bị từ chối.'
  } else if (command.type === 'organization_join_request') {
    title = 'Yêu cầu tham gia tổ chức mới'
    const organizationName = optionalParameter(command, 'organizationName')
    message = organizationName
      ? `Có yêu cầu tham gia tổ chức "${organizationName}".`
      : 'Có yêu cầu tham gia tổ chức mới.'
  } else if (command.type === 'task_completed') {
    title = 'Task completed'
    message = 'A task relevant to you was completed.'
  } else if (command.type === 'task_submitted') {
    title = 'Task submitted'
    const taskTitle = optionalParameter(command, 'taskTitle')
    message = taskTitle
      ? `Task "${taskTitle}" has been submitted for review.`
      : 'Your task submission has been submitted for review.'
  } else if (command.type === 'review_requested') {
    if (optionalParameter(command, 'reviewKind') === 'sprint_review') {
      title = 'Review sau sprint đã mở'
      message = 'Hãy review người giao việc trong sprint và môi trường làm việc của bạn.'
    } else {
      title = 'Có task chờ bạn review'
      const taskTitle = optionalParameter(command, 'taskTitle')
      message = taskTitle
        ? `Task "${taskTitle}" đang chờ bạn đánh giá.`
        : 'Một task vừa được chuyển vào vùng review và đang chờ đánh giá của bạn.'
    }
  } else if (command.type === 'task_status_updated') {
    title = 'Cập nhật trạng thái nhiệm vụ'
    const updaterName = optionalParameter(command, 'updaterName') ?? 'Unknown'
    const taskTitle = optionalParameter(command, 'taskTitle') ?? 'nhiệm vụ'
    const reason = optionalParameter(command, 'reason')
    message = `${updaterName} đã cập nhật trạng thái task: ${taskTitle}`
    if (reason) {
      message += ` (${reason})`
    }
  } else if (command.type === 'task_mentioned') {
    title = 'Bạn được nhắc trong thảo luận task'
    message = 'Bạn đã được nhắc trong một bình luận của task.'
  } else if (command.type === 'task_access_revoked') {
    title = 'Quyền truy cập task đã bị thu hồi'
    const reason = optionalParameter(command, 'reason')
    message = reason
      ? `Quyền truy cập của bạn vào task đã bị thu hồi. Lý do: ${reason}`
      : 'Quyền truy cập của bạn vào task đã bị thu hồi.'
  } else if (command.type === 'assignment_revoked_need_action') {
    title = 'Task assignment đã bị revoke'
    const assigneeName = optionalParameter(command, 'assigneeName')
    message = assigneeName
      ? `Assignment của ${assigneeName} đã bị revoke. Task cần được reassign.`
      : 'Một task assignment đã bị revoke và cần được reassign.'
  } else if (command.type === 'review_dispute_escalated') {
    if (optionalParameter(command, 'audience') === 'admin') {
      title = 'Có tranh chấp review mới cần admin xử lý'
      message = 'Một review dispute đã được report lên hệ thống và đang chờ admin xem xét.'
    } else {
      title = 'Tranh chấp đã được báo cáo lên admin'
      message = 'Admin hệ thống sẽ xem xét hồ sơ tranh chấp của bạn.'
    }
  } else if (command.type === 'task_deleted') {
    title = 'Nhiệm vụ đã bị xóa'
    const taskTitle = optionalParameter(command, 'taskTitle')
    const reason = optionalParameter(command, 'reason')
    message = taskTitle ? `Nhiệm vụ "${taskTitle}" đã bị xóa` : 'Một nhiệm vụ đã bị xóa'
    if (reason) {
      message += ` (${reason})`
    }
  } else if (command.type === 'organization_invitation') {
    title = 'Lời mời tham gia tổ chức'
    const organizationName = optionalParameter(command, 'organizationName')
    message = organizationName
      ? `Bạn đã nhận được lời mời tham gia tổ chức ${organizationName}`
      : 'Bạn đã nhận được lời mời tham gia một tổ chức'
  } else if (command.type === 'organization_join_approved') {
    title = 'Lời mời được chấp nhận'
    const organizationName = optionalParameter(command, 'organizationName')
    message = organizationName
      ? `Một người dùng đã chấp nhận lời mời tham gia tổ chức ${organizationName}`
      : 'Một người dùng đã chấp nhận lời mời tham gia tổ chức'
  } else if (command.type === 'organization_join_rejected') {
    title = 'Lời mời bị từ chối'
    const organizationName = optionalParameter(command, 'organizationName')
    message = organizationName
      ? `Một người dùng đã từ chối lời mời tham gia tổ chức ${organizationName}`
      : 'Một người dùng đã từ chối lời mời tham gia tổ chức'
  } else if (command.type === 'organization_created') {
    title = 'Tổ chức mới được tạo'
    const organizationName = optionalParameter(command, 'organizationName')
    message = organizationName
      ? `Bạn đã tạo tổ chức "${organizationName}" thành công. Bạn là Chủ sở hữu của tổ chức này.`
      : 'Bạn đã tạo tổ chức thành công. Bạn là Chủ sở hữu của tổ chức này.'
  } else if (command.type === 'member_added') {
    title = 'Được thêm vào tổ chức'
    const roleName = optionalParameter(command, 'roleName')
    message = roleName
      ? `Bạn đã được thêm vào tổ chức với vai trò ${roleName}`
      : 'Bạn đã được thêm vào tổ chức.'
  } else if (command.type === 'member_removed') {
    title = 'Đã rời khỏi tổ chức'
    const reason = optionalParameter(command, 'reason')
    message = reason ? `Bạn đã bị xóa khỏi tổ chức: ${reason}` : 'Bạn đã bị xóa khỏi tổ chức.'
  } else if (command.type === 'role_changed') {
    title = 'Vai trò đã thay đổi'
    const roleName = optionalParameter(command, 'roleName')
    const actionType = optionalParameter(command, 'actionType')
    const actionVerb = actionType === 'promotion' ? 'được thăng chức' : 'được chuyển vai trò'
    message = roleName
      ? `Bạn ${actionVerb} thành ${roleName} trong tổ chức`
      : 'Vai trò của bạn trong tổ chức đã thay đổi.'
  } else if (command.type === 'ownership_transferred') {
    const organizationName = optionalParameter(command, 'organizationName')
    const quotedOrganizationName = organizationName ? ` "${organizationName}"` : ''
    if (optionalParameter(command, 'ownershipRole') === 'new_owner') {
      title = 'Bạn đã trở thành owner'
      message = `Bạn đã được chuyển giao quyền sở hữu tổ chức${quotedOrganizationName}.`
    } else {
      title = 'Đã chuyển giao quyền sở hữu'
      message = `Bạn đã chuyển giao quyền sở hữu tổ chức${quotedOrganizationName}.`
    }
  } else if (command.type === 'project_ownership_transferred') {
    const projectName = optionalParameter(command, 'projectName')
    const quotedProjectName = projectName ? ` "${projectName}"` : ''
    if (optionalParameter(command, 'ownershipRole') === 'new_owner') {
      title = 'Bạn đã trở thành project owner'
      message = `Bạn đã được chuyển giao quyền sở hữu project${quotedProjectName}.`
    } else {
      title = 'Đã chuyển giao quyền sở hữu project'
      message = `Quyền sở hữu project${quotedProjectName} đã được chuyển giao.`
    }
  } else if (command.type === 'join_request_approved') {
    title = 'Yêu cầu được chấp nhận'
    message = 'Yêu cầu tham gia tổ chức của bạn đã được chấp nhận'
  } else if (command.type === 'join_request_rejected') {
    title = 'Yêu cầu bị từ chối'
    const reason = optionalParameter(command, 'reason')
    message = reason
      ? `Yêu cầu tham gia tổ chức của bạn đã bị từ chối: ${reason}`
      : 'Yêu cầu tham gia tổ chức của bạn đã bị từ chối'
  } else if (command.type === 'account_deactivated') {
    title = 'Tài khoản đã bị vô hiệu hóa'
    const reason = optionalParameter(command, 'reason')
    message = `Tài khoản của bạn đã bị vô hiệu hóa. Lý do: ${reason ?? 'Không có lý do cụ thể'}`
  } else if (command.type === 'system_announcement') {
    title = 'System announcement'
    message = optionalParameter(command, 'summary') ?? 'There is a new system announcement.'
  } else {
    message = `There is a new ${fallbackTitle.toLocaleLowerCase('en-US')} update.`
  }

  const actionInput = {
    recipientId: command.recipientId,
    scope: command.scope,
    parameters: command.parameters,
    ...(command.subject === undefined ? {} : { subject: command.subject }),
  }

  return {
    title,
    message,
    action: definition.resolveAction(actionInput),
  }
}
