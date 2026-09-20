import axios from 'axios'

import type { ProjectMember } from '../types'

import type {
  AutoFillPreviewItem,
  ProfessionalRoleOption,
  RoleCandidateInsight,
  RoleCandidateResponsePayload,
  RoleCandidateSummary,
} from './project_staffing_types'

export async function fetchRoleCandidateInsights(
  projectId: string,
  roles: ProfessionalRoleOption[]
): Promise<RoleCandidateInsight[]> {
  const results = await Promise.all(
    roles.map(async (role) => {
      const response = await axios.get<RoleCandidateResponsePayload>(
        `/api/v1/projects/${projectId}/professional-roles/${role.id}/candidates`
      )

      const payload = response.data.data
      const candidateList = payload.candidates
      return {
        roleId: payload.role.id,
        roleName: payload.role.name,
        roleCode: payload.role.code,
        totalCandidates: candidateList.length,
        orgMemberCandidates: payload.orgMembers?.length ?? 0,
        projectMemberCandidates: payload.projectMembers?.length ?? 0,
        topCandidate: candidateList[0] ?? null,
        topCandidates: candidateList.slice(0, 3),
      } satisfies RoleCandidateInsight
    })
  )

  return results
}

export async function assignCandidateToRole({
  projectId,
  members,
  insight,
  candidate,
}: {
  projectId: string
  members: ProjectMember[]
  insight: RoleCandidateInsight
  candidate: RoleCandidateSummary
}): Promise<'updated_member' | 'added_member'> {
  if (candidate.source === 'external') {
    throw new Error('External candidates cannot be assigned from this flow')
  }
  const existingProjectMember = members.find((member) => member.user_id === candidate.userId)

  if (candidate.source === 'project_member' && existingProjectMember?.user_id) {
    await axios.put(
      `/projects/members/${existingProjectMember.user_id}`,
      {
        projectId,
        projectRole: existingProjectMember.role,
        projectProfessionalRoleId: insight.roleId,
      },
      { headers: { Accept: 'application/json' } }
    )
    return 'updated_member'
  }

  await axios.post(
    '/projects/members',
    {
      projectId,
      userId: candidate.userId,
      projectRole: 'project_member',
      projectProfessionalRoleId: insight.roleId,
    },
    { headers: { Accept: 'application/json' } }
  )
  return 'added_member'
}

export function buildAutoFillPreview(
  roleCandidateInsights: RoleCandidateInsight[],
  autoFillExcludedRoleIds: string[]
): AutoFillPreviewItem[] {
  const seenUserIds = new Set<string>()
  const items: AutoFillPreviewItem[] = []

  for (const insight of roleCandidateInsights) {
    const candidate =
      insight.topCandidates.find(
        (item) => item.source !== 'external' && !seenUserIds.has(item.userId)
      ) ?? null

    if (candidate) {
      seenUserIds.add(candidate.userId)
    }

    items.push({
      roleId: insight.roleId,
      roleName: insight.roleName,
      candidate,
      excluded: autoFillExcludedRoleIds.includes(insight.roleId),
      actionType: candidate
        ? candidate.source === 'project_member'
          ? 'update_member'
          : candidate.source === 'org_member'
            ? 'add_member'
            : null
        : null,
    })
  }

  return items
}

export function calculateAutoFillSummary(autoFillPreview: AutoFillPreviewItem[]) {
  let addMemberCount = 0
  let updateMemberCount = 0
  let skippedCount = 0
  let excludedCount = 0

  for (const item of autoFillPreview) {
    if (item.excluded) {
      excludedCount += 1
      continue
    }
    if (!item.candidate || item.actionType === null) {
      skippedCount += 1
      continue
    }
    if (item.actionType === 'add_member') {
      addMemberCount += 1
    } else {
      updateMemberCount += 1
    }
  }
  return { addMemberCount, updateMemberCount, skippedCount, excludedCount }
}
