import type { UpdateMemberRoleDTO } from '../../dtos/request/members/update_member_role_dto.js'

import loggerService from '#modules/logger/public_contracts/application_logger'
import {
  BACKEND_NOTIFICATION_ENTITY_TYPES,
  BACKEND_NOTIFICATION_TYPES,
} from '#modules/notifications/public_contracts/notification_constants'
import { buildNotificationEventId } from '#modules/notifications/public_contracts/notification_event_identity'
import type { OrganizationNotificationStager } from '#modules/organizations/actions/ports/outbound/members/organization_notification_stager'
import type { OrganizationTransaction } from '#modules/organizations/actions/ports/outbound/organization_transaction'

export async function settlePostCommitEffect(
  effectName: string,
  effect: () => Promise<void>,
  context: { organizationId: string; actorId: string }
): Promise<void> {
  try {
    await effect()
  } catch (error) {
    try {
      loggerService.error('Organization post-commit effect failed', {
        effectName,
        committed: true,
        organizationId: context.organizationId,
        actorId: context.actorId,
        errorName: error instanceof Error ? error.name : 'UnknownError',
      })
    } catch {
      // Telemetry failure must not alter the result of an already committed mutation.
    }
  }
}

export async function stageRoleChangedNotification(
  dto: UpdateMemberRoleDTO,
  actorId: string,
  oldRole: string,
  occurredAt: string,
  notificationStager: OrganizationNotificationStager,
  trx: OrganizationTransaction
): Promise<void> {
  await notificationStager.stage(
    {
      eventId: buildNotificationEventId({
        eventName: 'organization.member_role_changed',
        businessEventId: `${dto.organizationId}:${dto.userId}:${occurredAt}`,
        recipientId: dto.userId,
      }),
      type: BACKEND_NOTIFICATION_TYPES.ROLE_CHANGED,
      schemaVersion: 1,
      recipientId: dto.userId,
      scope: { kind: 'organization', id: dto.organizationId },
      actor: { type: 'user', id: actorId },
      subject: {
        type: BACKEND_NOTIFICATION_ENTITY_TYPES.ORGANIZATION,
        id: dto.organizationId,
      },
      parameters: {
        oldRole,
        newRole: dto.newRoleId,
        roleName: dto.getRoleNameVi(),
        actionType: dto.getActionType(oldRole),
      },
      occurredAt,
      correlationId: `${dto.organizationId}:${dto.userId}`,
    },
    { trx }
  )
}
