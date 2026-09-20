import type { TaskCreateAssigneeGroups } from '@/apps/org/modules/tasks/types/create_form_types'

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

export interface ProjectAssigneeGroupsResult {
  selectedProjectVisibility: string | null
  assigneeGroups: TaskCreateAssigneeGroups
}

export async function loadProjectAssigneeGroups(
  projectId: string
): Promise<ProjectAssigneeGroupsResult> {
  const [projectPayload, candidatePayload] = await Promise.all([
    fetch(`/api/v1/projects/${projectId}`).then(
      (response) => response.json() as Promise<ProjectDetailApiResponse>
    ),
    fetch(`/projects/${projectId}/member-candidates`).then(
      (response) => response.json() as Promise<ProjectMemberCandidateResponse>
    ),
  ])

  const selectedProjectVisibility = projectPayload.data?.project?.visibility ?? null
  const assigneeGroups: TaskCreateAssigneeGroups = {
    projectMembers: (projectPayload.data?.members ?? []).map((member) => ({
      id: member.userId,
      username: member.username,
      email: member.email,
      governanceRole: member.role,
      deliveryRoleName: member.professionalRoleName ?? null,
      projectProfessionalRoleId: member.projectProfessionalRoleId ?? null,
    })),
    orgMembersOutsideProject: (candidatePayload.data ?? []).map((candidate) => ({
      id: candidate.userId,
      username: candidate.username,
      email: candidate.email,
      governanceRole: candidate.orgRole,
      deliveryRoleName: null,
      projectProfessionalRoleId: null,
    })),
  }

  return { selectedProjectVisibility, assigneeGroups }
}
