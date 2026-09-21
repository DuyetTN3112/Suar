import type { TaskCreateAssigneeGroups } from '@/apps/user/modules/tasks/types/create_form_types'

export interface ProjectDetailMemberRecord {
  userId: string
  username: string
  email: string
  role: string
  projectProfessionalRoleId?: string | null
  professionalRoleName?: string | null
}

export interface ProjectDetailApiResponse {
  data?: {
    project?: {
      visibility?: string | null
    }
    members?: ProjectDetailMemberRecord[]
  }
}

export interface ProjectMemberCandidateResponse {
  data?: {
    userId: string
    username: string
    email: string
    orgRole: string
  }[]
}

export interface LoadedProjectAssigneeData {
  visibility: string | null
  assigneeGroups: TaskCreateAssigneeGroups
}

export async function fetchProjectAssigneeData(projectId: string): Promise<LoadedProjectAssigneeData> {
  const [projectPayload, candidatePayload] = await Promise.all([
    fetch(`/api/v1/projects/${projectId}`).then(
      (response) => response.json() as Promise<ProjectDetailApiResponse>
    ),
    fetch(`/projects/${projectId}/member-candidates`).then(
      (response) => response.json() as Promise<ProjectMemberCandidateResponse>
    ),
  ])

  return {
    visibility: projectPayload.data?.project?.visibility ?? null,
    assigneeGroups: {
      projectMembers: (projectPayload.data?.members ?? []).map((member) => ({
        id: member.userId,
        username: member.username,
        email: member.email,
        governanceRole: member.role,
        deliveryRoleName: member.professionalRoleName ?? null,
        projectProfessionalRoleId: member.projectProfessionalRoleId ?? null,
      })),
      orgMembersOutsideProject: (candidatePayload.data ?? []).map((member) => ({
        id: member.userId,
        username: member.username,
        email: member.email,
        orgRole: member.orgRole,
      })),
    },
  }
}
