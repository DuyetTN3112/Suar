import { findRoleMatchedProjectMembers } from '@/apps/org/modules/tasks/lib/create_prefill'
import type {
  ProjectProfessionalRoleOption,
  ProjectProfessionalRolesResponse,
  ProjectDetailApiResponse,
  ProjectMemberCandidateResponse,
} from '@/apps/org/modules/tasks/types/create_task_types'

export interface CreateTaskProjectContextOptions {
  getOpen: () => boolean
  getInitialRoleId: () => string | undefined
  getProjectId: () => string
  getFallbackUsers: () => { id: string; username: string; email: string }[] | undefined
  onClearFrozenPayload: () => void
  onAssignUser: (userId: string) => void
}

export function useCreateTaskProjectContext(options: CreateTaskProjectContextOptions) {
  let selectedRoleId = $state('')
  let projectProfessionalRoleId = $state('')
  let availableRoles = $state<ProjectProfessionalRoleOption[]>([])
  let selectedProjectVisibility = $state<string | null>(null)
  let assigneeGroups = $state({
    projectMembers: [] as {
      id: string
      username: string
      email: string
      governanceRole?: string | null
      deliveryRoleName?: string | null
      projectProfessionalRoleId?: string | null
    }[],
    orgMembersOutsideProject: [] as {
      id: string
      username: string
      email: string
      orgRole?: string | null
    }[],
  })
  const prefilling = $state(false)
  let prefilledSkillCount = $state(0)
  let lastLoadedProjectId = ''
  let autoPrefillAttempted = $state(false)
  let assigneeGroupRequestKey = 0

  const roleMatchedProjectMembers = $derived(
    findRoleMatchedProjectMembers(selectedRoleId, assigneeGroups.projectMembers)
  )

  const scopedAssigneeUsers = $derived([
    ...assigneeGroups.projectMembers.map((member) => ({
      id: member.id,
      username: member.username,
      email: member.email,
    })),
    ...assigneeGroups.orgMembersOutsideProject
      .filter(
        (member) =>
          !assigneeGroups.projectMembers.some((projectMember) => projectMember.id === member.id)
      )
      .map((member) => ({
        id: member.id,
        username: member.username,
        email: member.email,
      })),
    ...(options.getFallbackUsers() || []).filter(
      (user) =>
        !assigneeGroups.projectMembers.some((member) => member.id === user.id) &&
        !assigneeGroups.orgMembersOutsideProject.some((member) => member.id === user.id)
    ),
  ])

  $effect(() => {
    const projectId = options.getProjectId()

    if (!projectId) {
      availableRoles = []
      selectedProjectVisibility = null
      assigneeGroups = { projectMembers: [], orgMembersOutsideProject: [] }
      selectedRoleId = ''
      projectProfessionalRoleId = ''
      prefilledSkillCount = 0
      lastLoadedProjectId = ''
      autoPrefillAttempted = false
      return
    }

    if (lastLoadedProjectId && lastLoadedProjectId !== projectId) {
      selectedRoleId = ''
      projectProfessionalRoleId = ''
      prefilledSkillCount = 0
      autoPrefillAttempted = false
    }
    lastLoadedProjectId = projectId

    fetch(`/api/v1/projects/${projectId}/professional-roles`)
      .then((r) => r.json())
      .then((payload) => {
        const data = payload as ProjectProfessionalRolesResponse
        availableRoles = data.data ?? []
        if (selectedRoleId && !availableRoles.some((role) => role.id === selectedRoleId)) {
          selectedRoleId = ''
          projectProfessionalRoleId = ''
          prefilledSkillCount = 0
        }
      })
      .catch(() => {
        availableRoles = []
        selectedRoleId = ''
        projectProfessionalRoleId = ''
        prefilledSkillCount = 0
      })
  })

  $effect(() => {
    const projectId = options.getProjectId()
    if (!projectId) {
      selectedProjectVisibility = null
      assigneeGroups = { projectMembers: [], orgMembersOutsideProject: [] }
      return
    }

    const requestKey = assigneeGroupRequestKey + 1
    assigneeGroupRequestKey = requestKey
    Promise.all([
      fetch(`/api/v1/projects/${projectId}`).then(
        (response) => response.json() as Promise<ProjectDetailApiResponse>
      ),
      fetch(`/projects/${projectId}/member-candidates`).then(
        (response) => response.json() as Promise<ProjectMemberCandidateResponse>
      ),
    ])
      .then(([projectPayload, candidatePayload]) => {
        if (requestKey !== assigneeGroupRequestKey) return

        selectedProjectVisibility = projectPayload.data?.project?.visibility ?? null
        assigneeGroups = {
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
        }
      })
      .catch(() => {
        if (requestKey !== assigneeGroupRequestKey) return
        selectedProjectVisibility = null
        assigneeGroups = { projectMembers: [], orgMembersOutsideProject: [] }
      })
  })

  $effect(() => {
    const isOpen = options.getOpen()
    const initialRoleId = options.getInitialRoleId()
    const projectId = options.getProjectId()

    if (
      isOpen &&
      initialRoleId &&
      !autoPrefillAttempted &&
      projectId &&
      availableRoles.some((role) => role.id === initialRoleId)
    ) {
      autoPrefillAttempted = true
      selectedRoleId = initialRoleId
      handlePrefillFromRole()
    }
  })

  function handlePrefillFromRole() {
    if (!options.getProjectId()) return
    if (!selectedRoleId) {
      projectProfessionalRoleId = ''
      prefilledSkillCount = 0
      return
    }

    options.onClearFrozenPayload()
    projectProfessionalRoleId = selectedRoleId
    prefilledSkillCount = 0
  }

  function handleRoleChange(roleId: string) {
    selectedRoleId = roleId
    handlePrefillFromRole()
  }

  function handleAssignRoleMatchedMember(userId: string) {
    options.onClearFrozenPayload()
    options.onAssignUser(userId)
  }

  function resetProjectContext() {
    selectedRoleId = ''
    projectProfessionalRoleId = ''
    prefilledSkillCount = 0
    selectedProjectVisibility = null
    autoPrefillAttempted = false
    assigneeGroups = { projectMembers: [], orgMembersOutsideProject: [] }
  }

  return {
    get selectedRoleId() {
      return selectedRoleId
    },
    set selectedRoleId(v) {
      selectedRoleId = v
    },
    get projectProfessionalRoleId() {
      return projectProfessionalRoleId
    },
    set projectProfessionalRoleId(v) {
      projectProfessionalRoleId = v
    },
    get availableRoles() {
      return availableRoles
    },
    get selectedProjectVisibility() {
      return selectedProjectVisibility
    },
    get assigneeGroups() {
      return assigneeGroups
    },
    get prefilling() {
      return prefilling
    },
    get prefilledSkillCount() {
      return prefilledSkillCount
    },
    get autoPrefillAttempted() {
      return autoPrefillAttempted
    },
    get roleMatchedProjectMembers() {
      return roleMatchedProjectMembers
    },
    get scopedAssigneeUsers() {
      return scopedAssigneeUsers
    },

    handlePrefillFromRole,
    handleRoleChange,
    handleAssignRoleMatchedMember,
    resetProjectContext,
  }
}
