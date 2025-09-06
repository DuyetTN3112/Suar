import { z } from 'zod'

export const taskAssignedV1Schema = z.object({
  eventType: z.literal('tasks.assigned.v1'),
  taskId: z.string(),
  projectId: z.string().nullable(),
  organizationId: z.string(),
  assigneeUserId: z.string(),
  assignedByUserId: z.string(),
  assignedAt: z.string(),
})

export const taskAssignmentCompletedV1Schema = z.object({
  eventType: z.literal('tasks.assignment_completed.v1'),
  assignmentId: z.string(),
  taskId: z.string(),
  projectId: z.string().nullable(),
  organizationId: z.string(),
  assigneeUserId: z.string(),
  reviewerUserId: z.string().nullable(),
  completedAt: z.string(),
})
