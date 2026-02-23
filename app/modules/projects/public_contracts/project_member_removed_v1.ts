export interface ProjectMemberRemovedV1 {
  eventType: 'projects.member_removed.v1'
  projectId: string
  organizationId: string
  removedUserId: string
  removedByUserId: string
  removedAt: string
}
