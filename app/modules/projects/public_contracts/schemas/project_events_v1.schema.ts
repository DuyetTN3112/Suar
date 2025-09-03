import { z } from 'zod'

export const projectMemberRemovedV1Schema = z.object({
  eventType: z.literal('projects.member_removed.v1'),
  projectId: z.string(),
  organizationId: z.string(),
  removedUserId: z.string(),
  removedByUserId: z.string(),
  removedAt: z.string(),
})
