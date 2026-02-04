export interface ProjectMemberCandidateRecord {
  userId: string
  username: string
  email: string
  organizationRole: string
}

export abstract class ProjectMemberCandidateReader {
  abstract listApprovedNonMembers(
    projectId: string,
    organizationId: string
  ): Promise<ProjectMemberCandidateRecord[]>
}
