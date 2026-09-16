import type { InviteUserDTO } from '../../dtos/request/invitations/invite_user_dto.js'

import {
  BACKEND_NOTIFICATION_ENTITY_TYPES,
  BACKEND_NOTIFICATION_TYPES,
} from '#modules/notifications/public_contracts/notification_constants'
import { buildNotificationEventId } from '#modules/notifications/public_contracts/notification_event_identity'
import type { OrganizationNotificationStager } from '#modules/organizations/actions/ports/outbound/invitations/organization_notification_stager'
import type { OrganizationTransaction } from '#modules/organizations/actions/ports/outbound/organization_transaction'

export async function stageInvitationNotification(
  dto: InviteUserDTO,
  userId: string,
  inviteeId: string,
  organizationName: string,
  occurredAt: string,
  notificationStager: OrganizationNotificationStager,
  trx: OrganizationTransaction
): Promise<void> {
  await notificationStager.stage(
    {
      eventId: buildNotificationEventId({
        eventName: 'organization.invited',
        businessEventId: `${dto.organizationId}:${inviteeId}:${occurredAt}`,
        recipientId: inviteeId,
      }),
      schemaVersion: 1,
      type: BACKEND_NOTIFICATION_TYPES.ORGANIZATION_INVITATION,
      recipientId: inviteeId,
      scope: { kind: 'organization', id: dto.organizationId },
      actor: { type: 'user', id: userId },
      subject: {
        type: BACKEND_NOTIFICATION_ENTITY_TYPES.ORGANIZATION,
        id: dto.organizationId,
      },
      parameters: {
        organizationName,
        roleName: dto.getRoleNameVi(),
      },
      occurredAt,
      correlationId: `${dto.organizationId}:${inviteeId}`,
    },
    { trx }
  )
}
