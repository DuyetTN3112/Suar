import { z } from 'zod'

export const organizationMemberRemovedV1Schema = z.object({
  eventType: z.literal('organizations.member_removed.v1'),
  organizationId: z.string(),
  removedUserId: z.string(),
  removedByUserId: z.string(),
  removedAt: z.string(),
})

export const organizationRoleChangedV1Schema = z.object({
  eventType: z.literal('organizations.role_changed.v1'),
  organizationId: z.string(),
  userId: z.string(),
  oldRole: z.string().nullable(),
  newRole: z.string(),
  changedByUserId: z.string(),
  changedAt: z.string(),
})
