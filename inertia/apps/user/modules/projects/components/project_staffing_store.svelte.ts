import { router } from '@inertiajs/svelte'
import axios from 'axios'

import { notificationStore } from '@/apps/user/shared/stores/notification_store.svelte'
import { useTranslation } from '@/apps/user/shared/stores/translation.svelte'

import type { ProjectMember } from '../types'

export interface ProfessionalRoleOption {
  id: string
  name: string
  code: string
  isActive?: boolean
}

export interface RoleCandidateSummary {
  userId: string
  username: string
  source: 'project_member' | 'org_member' | 'external'
  matchScore: number
  matchedSkills: number
  totalRequiredSkills: number
  skillGaps: string[]
  reviewedSkillsCount: number
  importedSkillsCount: number
  underDisputeSkillsCount: number
  latestConfidenceSignal: 'low' | 'medium' | 'high' | null
}

export interface RoleCandidateInsight {
  roleId: string
  roleName: string
  roleCode: string
  totalCandidates: number
  orgMemberCandidates: number
  projectMemberCandidates: number
  topCandidate: RoleCandidateSummary | null
  topCandidates: RoleCandidateSummary[]
}

export interface AutoFillPreviewItem {
  roleId: string
  roleName: string
  candidate: RoleCandidateSummary | null
  excluded: boolean
  actionType: 'add_member' | 'update_member' | null
}

export interface AutoFillResultItem {
  roleId: string
  roleName: string
  candidateUserId: string | null
  candidateUsername: string | null
  actionType: 'add_member' | 'update_member' | null
  status: 'success' | 'error'
  errorMessage?: string
  reviewedSkillsCount?: number | null
  importedSkillsCount?: number | null
  underDisputeSkillsCount?: number | null
  latestConfidenceSignal?: 'low' | 'medium' | 'high' | null
  matchedSkills?: number | null
  totalRequiredSkills?: number | null
  skillGaps?: string[]
}

export interface RoleCandidateResponsePayload {
  data: {
    role: { id: string; name: string; code: string }
    candidates: RoleCandidateSummary[]
    orgMembers?: unknown[]
    projectMembers?: unknown[]
  }
}

export interface ProjectStaffingStoreProps {
  projectId: string
  members: ProjectMember[]
  activeProfessionalRoles: ProfessionalRoleOption[]
  unstaffedProfessionalRoles: ProfessionalRoleOption[]
}

export function useProjectStaffingStore(getProps: () => ProjectStaffingStoreProps) {
  const { t } = useTranslation()
  const props = $derived.by(getProps)

  let loadingRoleCandidateInsights = $state(false)
  let roleCandidateInsights = $state<RoleCandidateInsight[]>([])
  let autoFillExcludedRoleIds = $state<string[]>([])
  let autoFillLastResults = $state<AutoFillResultItem[]>([])
  let autoStaffing = $state(false)
  let autoFillConfirming = $state(false)
  let staffingCandidateActionKey = $state<string | null>(null)

  const autoFillPreview = $derived.by(() => {
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
  })

  const autoFillReadyCount = $derived(
    autoFillPreview.filter((item) => item.candidate !== null && !item.excluded).length
  )
  const autoFillExcludableRoleIds = $derived(
    autoFillPreview
      .filter((item) => item.candidate !== null)
      .map((item) => item.roleId)
  )

  const autoFillSummary = $derived.by(() => {
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
  })

  $effect(() => {
    const currentRoleIds = new Set(roleCandidateInsights.map((insight) => insight.roleId))
    const nextExcludedRoleIds = autoFillExcludedRoleIds.filter((roleId) => currentRoleIds.has(roleId))

    if (
      nextExcludedRoleIds.length === autoFillExcludedRoleIds.length &&
      nextExcludedRoleIds.every((roleId, index) => roleId === autoFillExcludedRoleIds[index])
    ) {
      return
    }

    autoFillExcludedRoleIds = nextExcludedRoleIds
  })

  $effect(() => {
    if (autoFillReadyCount === 0) {
      autoFillConfirming = false
    }
  })

  $effect(() => {
    if (!props.projectId || props.activeProfessionalRoles.length === 0) {
      roleCandidateInsights = []
      return
    }

    const rolesNeedingStaffing = props.unstaffedProfessionalRoles.slice(0, 3)
    if (rolesNeedingStaffing.length === 0) {
      roleCandidateInsights = []
      return
    }

    void loadRoleCandidateInsights(rolesNeedingStaffing)
  })

  async function loadRoleCandidateInsights(roles: ProfessionalRoleOption[]) {
    loadingRoleCandidateInsights = true
    try {
      const results = await Promise.all(
        roles.map(async (role) => {
          const response = await axios.get<RoleCandidateResponsePayload>(
            `/api/v1/projects/${props.projectId}/professional-roles/${role.id}/candidates`
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
      roleCandidateInsights = results
    } catch {
      roleCandidateInsights = []
    } finally {
      loadingRoleCandidateInsights = false
    }
  }

  async function assignCandidateToRole(
    insight: RoleCandidateInsight,
    candidate: RoleCandidateSummary
  ): Promise<'updated_member' | 'added_member'> {
    if (candidate.source === 'external') {
      throw new Error('External candidates cannot be assigned from this flow')
    }
    const existingProjectMember = props.members.find(
      (member) => member.user_id === candidate.userId
    )

    if (candidate.source === 'project_member' && existingProjectMember?.user_id) {
      await axios.put(
        `/projects/members/${existingProjectMember.user_id}`,
        {
          projectId: props.projectId,
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
        projectId: props.projectId,
        userId: candidate.userId,
        projectRole: 'project_member',
        projectProfessionalRoleId: insight.roleId,
      },
      { headers: { Accept: 'application/json' } }
    )
    return 'added_member'
  }

  async function handleAssignCandidate(
    insight: RoleCandidateInsight,
    candidate: RoleCandidateSummary
  ) {
    if (candidate.source === 'external') return

    const actionKey = `${insight.roleId}:${candidate.userId}`
    staffingCandidateActionKey = actionKey
    try {
      const result = await assignCandidateToRole(insight, candidate)
      if (result === 'updated_member') {
        notificationStore.success(t('project.role_candidates.assign_success', { user: candidate.username, role: insight.roleName }, ':user assigned to role :role'))
      } else {
        notificationStore.success(t('project.role_candidates.add_success', { user: candidate.username, role: insight.roleName }, ':user added to project with role :role'))
      }
      router.reload()
    } catch {
      notificationStore.error(t('project.role_candidates.add_error', {}, 'Unable to add candidate'))
    } finally {
      staffingCandidateActionKey = null
    }
  }

  async function handleAutoFillTopMatches() {
    autoStaffing = true
    try {
      const seenUserIds = new Set<string>()
      let appliedCount = 0
      let addedCount = 0
      let updatedCount = 0
      const appliedResults: AutoFillResultItem[] = []

      for (const previewItem of autoFillPreview) {
        if (previewItem.excluded || !previewItem.candidate) continue

        const insight = roleCandidateInsights.find((item) => item.roleId === previewItem.roleId)
        const candidate = previewItem.candidate
        if (!insight) continue

        if (seenUserIds.has(candidate.userId)) continue
        if (candidate.source === 'external') continue

        seenUserIds.add(candidate.userId)
        try {
          const result = await assignCandidateToRole(insight, candidate)
          if (result === 'updated_member') {
            updatedCount += 1
          } else {
            addedCount += 1
          }
          appliedResults.push({
            roleId: insight.roleId,
            roleName: insight.roleName,
            candidateUserId: candidate.userId,
            candidateUsername: candidate.username,
            actionType: result === 'updated_member' ? 'update_member' : 'add_member',
            status: 'success',
            reviewedSkillsCount: candidate.reviewedSkillsCount,
            importedSkillsCount: candidate.importedSkillsCount,
            underDisputeSkillsCount: candidate.underDisputeSkillsCount,
            latestConfidenceSignal: candidate.latestConfidenceSignal,
            matchedSkills: candidate.matchedSkills,
            totalRequiredSkills: candidate.totalRequiredSkills,
            skillGaps: candidate.skillGaps,
          })
          appliedCount += 1
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : t('project.staffing.role_apply_error', {}, 'Unable to apply this role')
          appliedResults.push({
            roleId: insight.roleId,
            roleName: insight.roleName,
            candidateUserId: candidate.userId,
            candidateUsername: candidate.username,
            actionType: previewItem.actionType,
            status: 'error',
            errorMessage: message,
            reviewedSkillsCount: candidate.reviewedSkillsCount,
            importedSkillsCount: candidate.importedSkillsCount,
            underDisputeSkillsCount: candidate.underDisputeSkillsCount,
            latestConfidenceSignal: candidate.latestConfidenceSignal,
            matchedSkills: candidate.matchedSkills,
            totalRequiredSkills: candidate.totalRequiredSkills,
            skillGaps: candidate.skillGaps,
          })
        }
      }

      autoFillLastResults = appliedResults

      if (appliedCount === 0) {
        const hasFailures = appliedResults.some((result) => result.status === 'error')
        notificationStore.error(
          hasFailures
            ? t('project.staffing.batch_no_roles', {}, 'Batch staffing could not apply any roles. Review the errors below.')
            : t('project.staffing.no_auto_fill_match', {}, 'No matching candidates available for auto-fill')
        )
        return
      }

      notificationStore.success(t('project.staffing.auto_fill_success', { applied: appliedCount, added: addedCount, updated: updatedCount }, 'Auto-filled :applied roles: :added new, :updated reassigned'))
      autoFillConfirming = false
      router.reload()
    } catch {
      notificationStore.error(t('project.staffing.auto_fill_start_error', {}, 'Unable to start batch auto-fill'))
    } finally {
      autoStaffing = false
    }
  }

  async function handleRetryAutoFillResult(result: AutoFillResultItem) {
    if (!result.candidateUserId) {
      notificationStore.error(t('project.staffing.retry_candidate_missing', {}, 'Candidate not found for retry'))
      return
    }

    const insight = roleCandidateInsights.find((item) => item.roleId === result.roleId)
    const candidate = insight?.topCandidates.find((item) => item.userId === result.candidateUserId)

    if (!insight || !candidate) {
      notificationStore.error(t('project.staffing.candidate_stale', {}, 'Candidate is no longer in the shortlist. Open matching details to choose again.'))
      return
    }

    await handleAssignCandidate(insight, candidate)
  }

  function toggleAutoFillRole(roleId: string) {
    autoFillExcludedRoleIds = autoFillExcludedRoleIds.includes(roleId)
      ? autoFillExcludedRoleIds.filter((id) => id !== roleId)
      : [...autoFillExcludedRoleIds, roleId]
  }

  function includeAllAutoFillRoles() {
    autoFillExcludedRoleIds = []
  }

  function excludeAllAutoFillRoles() {
    autoFillExcludedRoleIds = [...autoFillExcludableRoleIds]
  }

  return {
    get loadingRoleCandidateInsights() { return loadingRoleCandidateInsights },
    get roleCandidateInsights() { return roleCandidateInsights },
    get autoFillExcludedRoleIds() { return autoFillExcludedRoleIds },
    get autoFillLastResults() { return autoFillLastResults },
    get autoStaffing() { return autoStaffing },
    get autoFillConfirming() { return autoFillConfirming },
    set autoFillConfirming(v) { autoFillConfirming = v },
    get staffingCandidateActionKey() { return staffingCandidateActionKey },
    get autoFillPreview() { return autoFillPreview },
    get autoFillReadyCount() { return autoFillReadyCount },
    get autoFillExcludableRoleIds() { return autoFillExcludableRoleIds },
    get autoFillSummary() { return autoFillSummary },

    handleAssignCandidate,
    handleAutoFillTopMatches,
    handleRetryAutoFillResult,
    toggleAutoFillRole,
    includeAllAutoFillRoles,
    excludeAllAutoFillRoles
  }
}
