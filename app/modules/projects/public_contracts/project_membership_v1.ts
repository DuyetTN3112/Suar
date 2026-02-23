export interface ProjectMembershipV1 {
  projectId: string
  organizationId: string
  userId: string
  role: string
  status: string
  joinedAt: string | null
}
