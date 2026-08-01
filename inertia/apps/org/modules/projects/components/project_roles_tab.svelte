<script lang="ts">
  import axios from 'axios'
  import { Copy, LoaderCircle, Plus, Trash2, UserCog, Users } from 'lucide-svelte'

  import Button from '@/apps/org/shared/ui/button.svelte'
  import ProficiencyLevelBadge from '@/apps/org/modules/profile/components/proficiency_level_badge.svelte'
  import { uiToast } from '@/apps/org/shared/lib/ui_toast'
  import { confirmDialogStore } from '@/apps/org/shared/stores/confirm_dialog_store.svelte'
  import { useTranslation } from '@/apps/org/shared/hooks/use_translation.svelte'
  import { inferTaskTypeFromRoleCode } from '@/apps/org/modules/tasks/lib/rules/task_contract_presets'

  import ProjectRoleCandidatesDialog from './project_role_candidates_dialog.svelte'
  import ProjectRoleAddDialog from './project_role_add_dialog.svelte'
  import ProjectRoleSkillDialog from './project_role_skill_dialog.svelte'

  interface ProficiencyLevel {
    id: string
    ordinal: number
    code: string
    displayName: string
    shortName?: string
    genericDescription?: string
  }

  interface ProjectSkill {
    id: string
    skill: { id: string; skillName: string; categoryCode?: string }
    isActive: boolean
  }

  interface RoleSkill {
    id: string
    skill?: { id?: string; skillName: string }
    minimumLevel?: ProficiencyLevel
    targetLevel?: ProficiencyLevel
    assessmentCeilingLevel?: ProficiencyLevel
    isMandatory: boolean
    importance: 'low' | 'medium' | 'high' | 'critical'
    weight: number
  }

  interface ProjectRole {
    id: string
    code: string
    name: string
    description?: string
    isActive: boolean
    skills: RoleSkill[]
    sourceTemplateId?: string
  }

  interface RoleTemplate {
    id: string
    code: string
    name: string
    description?: string
  }

  interface Props {
    projectId: string
    canEdit: boolean
    taskLaunchBaseUrl?: string
    candidateFocusRoleId?: string | null
    candidateFocusKey?: string | null
    projectMembers?: {
      userId?: string | null
      role?: string | null
      professionalRoleName?: string | null
    }[]
  }

  const {
    projectId,
    canEdit,
    taskLaunchBaseUrl,
    candidateFocusRoleId = null,
    candidateFocusKey = null,
    projectMembers = [],
  }: Props = $props()

  const { t } = $derived(useTranslation())
  const taskBoardUrl = $derived(
    taskLaunchBaseUrl ?? `/projects/${encodeURIComponent(projectId)}/tasks`
  )

  let roles = $state<ProjectRole[]>([])
  let projectSkills = $state<ProjectSkill[]>([])
  let templates = $state<RoleTemplate[]>([])
  let proficiencyLevels = $state<ProficiencyLevel[]>([])
  let loading = $state(true)

  // Dialog open states
  let addRoleOpen = $state(false)
  let skillDialogOpen = $state(false)
  let candidatesDialogOpen = $state(false)

  // Focus states
  let matchingRoleId = $state('')
  let matchingRoleName = $state('')
  let currentRoleIdForSkill = $state('')
  let currentRoleSkillForEdit = $state<RoleSkill | null>(null)
  let lastOpenedCandidateFocusKey = $state<string | null>(null)
  let deactivatingRole = $state<string | null>(null)

  function buildRoleTaskLaunchHref(baseUrl: string, roleId: string, roleCode: string): string {
    const inferredTaskType = inferTaskTypeFromRoleCode(roleCode)
    const params = new URLSearchParams({
      project_id: projectId,
      roleId,
      create: '1',
    })

    if (inferredTaskType) {
      params.set('taskType', inferredTaskType)
    }

    return `${baseUrl}?${params.toString()}`
  }

  function openCandidates(role: ProjectRole) {
    matchingRoleId = role.id
    matchingRoleName = role.name
    candidatesDialogOpen = true
  }

  $effect(() => {
    void fetchAll()
  })

  $effect(() => {
    if (!candidateFocusRoleId || !candidateFocusKey || loading || roles.length === 0) {
      return
    }

    if (candidateFocusKey === lastOpenedCandidateFocusKey) {
      return
    }

    const targetRole = roles.find((role) => role.id === candidateFocusRoleId)
    if (!targetRole) {
      return
    }

    lastOpenedCandidateFocusKey = candidateFocusKey
    openCandidates(targetRole)
  })

  async function fetchAll() {
    loading = true
    try {
      const [rolesRes, skillsRes, tplRes, scalesRes] = await Promise.all([
        axios.get<{ data: ProjectRole[] }>(`/api/v1/projects/${projectId}/professional-roles`),
        axios.get<{ data: ProjectSkill[] }>(`/api/v1/projects/${projectId}/skills`),
        axios.get<{ data: RoleTemplate[] }>('/api/v1/professional-role-templates'),
        axios.get<{ data: { levels?: ProficiencyLevel[] } }>('/api/v1/proficiency-scales'),
      ])
      roles = rolesRes.data.data
      projectSkills = skillsRes.data.data
      templates = tplRes.data.data
      proficiencyLevels = scalesRes.data.data.levels ?? []
    } catch {
      uiToast.error(t('project.roles_tab.load_error', {}, 'Unable to load professional roles'))
    } finally {
      loading = false
    }
  }

  const activeProjectSkills = $derived(projectSkills.filter((ps) => ps.isActive))

  const activeProjectSkillsForCurrentRole = $derived(() => {
    const currentRole = roles.find((role) => role.id === currentRoleIdForSkill)
    if (!currentRole || currentRoleSkillForEdit) return activeProjectSkills

    const assignedSkillIds = new Set(
      currentRole.skills.map((roleSkill) => roleSkill.skill?.id).filter((id): id is string => Boolean(id))
    )
    const assignedSkillNames = new Set(
      currentRole.skills
        .map((roleSkill) => roleSkill.skill?.skillName.trim().toLowerCase())
        .filter((name): name is string => Boolean(name))
    )

    return activeProjectSkills.filter(
      (projectSkill) =>
        !assignedSkillIds.has(projectSkill.skill.id) &&
        !assignedSkillNames.has(projectSkill.skill.skillName.trim().toLowerCase())
    )
  })

  const importanceColors: Record<string, string> = {
    low: 'bg-secondary text-muted-foreground border-border',
    medium: 'bg-muted text-foreground border-border/50',
    high: 'bg-primary/10 text-foreground border-primary/20',
    critical: 'bg-destructive/10 text-destructive border-destructive/20',
  }

  function roleCompleteness(role: ProjectRole): number {
    if (role.skills.length === 0) return 0
    const configured = role.skills.filter((rs) => rs.minimumLevel && rs.targetLevel).length
    return Math.round((configured / role.skills.length) * 100)
  }

  function levelCodeRange(roleSkill: RoleSkill): string | null {
    const min = roleSkill.minimumLevel?.code?.toUpperCase()
    const target = roleSkill.targetLevel?.code?.toUpperCase()
    if (!min || !target) return null
    return `${min}-${target}`
  }

  function importanceLabel(importance: RoleSkill['importance']): string {
    return t(`project.roles_tab.importance.${importance}`, {}, importance)
  }

  function openAddSkill(roleId: string) {
    currentRoleIdForSkill = roleId
    currentRoleSkillForEdit = null
    skillDialogOpen = true
  }

  function openEditSkill(roleId: string, rs: RoleSkill) {
    currentRoleIdForSkill = roleId
    currentRoleSkillForEdit = rs
    skillDialogOpen = true
  }

  async function handleRemoveSkill(roleId: string, roleSkillId: string, skillName: string) {
    const confirmed = await confirmDialogStore.request({
      title: t('project.roles_tab.remove_skill_title', {}, 'Remove skill from role'),
      desc: t('project.roles_tab.remove_skill_desc', { skill: skillName }, 'Remove skill ":skill" from this role?'),
      confirmText: t('project.roles_tab.remove_skill_confirm', {}, 'Remove skill'),
      cancelBtnText: t('project.roles_tab.cancel', {}, 'Cancel'),
      destructive: true,
    })
    if (!confirmed) return
    try {
      await axios.delete(`/api/v1/projects/${projectId}/professional-roles/${roleId}/skills/${roleSkillId}`)
      uiToast.success(t('project.roles_tab.remove_skill_success', {}, 'Skill removed from role'))
      await fetchAll()
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      uiToast.error(error.response?.data?.message ?? t('project.roles_tab.remove_skill_error', {}, 'Unable to remove skill'))
    }
  }

  async function handleDeactivateRole(role: ProjectRole) {
    const confirmed = await confirmDialogStore.request({
      title: t('project.roles_tab.deactivate_title', {}, 'Turn off professional role'),
      desc: t('project.roles_tab.deactivate_desc', { role: role.name }, 'Turn off role ":role"? It will not be available for new tasks.'),
      confirmText: t('project.roles_tab.deactivate_confirm', {}, 'Turn off role'),
      cancelBtnText: t('project.roles_tab.cancel', {}, 'Cancel'),
      destructive: true,
    })
    if (!confirmed) return
    deactivatingRole = role.id
    try {
      await axios.delete(`/api/v1/projects/${projectId}/professional-roles/${role.id}`)
      uiToast.success(t('project.roles_tab.deactivate_success', {}, 'Role turned off'))
      await fetchAll()
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      uiToast.error(error.response?.data?.message ?? t('project.roles_tab.deactivate_error', {}, 'Unable to turn off role'))
    } finally {
      deactivatingRole = null
    }
  }
</script>

<div class="space-y-4" data-demo-section="project-roles-staffing">
  <!-- Header -->
  <div class="flex items-center justify-between">
    <div class="text-sm text-muted-foreground">
      {t('project.roles_tab.active_count', { count: roles.filter((r) => r.isActive).length }, ':count active roles')}
    </div>
    {#if canEdit}
      <Button size="sm" onclick={() => { addRoleOpen = true }} class="gap-1.5">
        <Plus class="h-4 w-4" />
        {t('project.roles_tab.add_role', {}, 'Add role')}
      </Button>
    {/if}
  </div>

  <!-- Roles grid -->
  {#if loading}
    <div class="flex items-center justify-center py-16 gap-2 text-muted-foreground">
      <LoaderCircle class="h-5 w-5 animate-spin" />
      <span class="text-sm">{t('project.roles_tab.loading', {}, 'Loading...')}</span>
    </div>
  {:else if roles.length === 0}
    <div class="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
      <div class="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
        <UserCog class="h-5 w-5 text-muted-foreground" />
      </div>
      <p class="text-sm">{t('project.roles_tab.empty', {}, 'No roles yet.')}</p>
    </div>
  {:else}
    <div class="grid grid-cols-1 xl:grid-cols-2 gap-5">
      {#each roles as role (role.id)}
        {@const completeness = roleCompleteness(role)}
        <div class="rounded-xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md {role.isActive ? '' : 'opacity-60'}">
          <!-- Role header -->
          <div class="px-5 pt-4 pb-3 border-b border-border">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <h4 class="font-semibold text-foreground leading-snug">{role.name}</h4>
                  <span class="inline-flex items-center px-2 py-0 rounded border text-[10px] font-mono font-semibold uppercase bg-muted text-muted-foreground border-border">
                    {role.code}
                  </span>
                  {#if role.sourceTemplateId}
                    <span class="inline-flex items-center gap-0.5 px-1.5 py-0 rounded text-[10px] font-medium bg-primary/10 text-primary border border-primary/20">
                      <Copy class="h-2.5 w-2.5" />
                      {t('project.roles_tab.template_badge', {}, 'Template')}
                    </span>
                  {/if}
                </div>
                {#if role.description}
                  <p class="text-xs text-muted-foreground mt-0.5 line-clamp-1">{role.description}</p>
                {/if}
              </div>
              {#if canEdit && role.isActive}
                <Button
                  size="sm"
                  variant="ghost"
                  onclick={() => { void handleDeactivateRole(role) }}
                  disabled={deactivatingRole === role.id}
                  class="h-7 px-2 text-xs text-muted-foreground hover:text-destructive shrink-0"
                >
                  {#if deactivatingRole === role.id}
                    <LoaderCircle class="h-3.5 w-3.5 animate-spin" />
                  {:else}
                    <Trash2 class="h-3.5 w-3.5" />
                  {/if}
                </Button>
              {/if}
            </div>

            <!-- Completeness bar -->
            {#if role.skills.length > 0}
              <div class="mt-3 space-y-1">
                <div class="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>{t('project.roles_tab.completeness', {}, 'Configuration complete')}</span>
                  <span class="font-mono font-semibold">{completeness}%</span>
                </div>
                <div class="h-1.5 rounded-full bg-secondary overflow-hidden">
                  <div
                    class="h-full rounded-full transition-all duration-500
                      {completeness >= 80 ? 'bg-primary' : completeness >= 50 ? 'bg-orange-500' : 'bg-zinc-400'}"
                    style="width: {completeness}%"
                  ></div>
                </div>
              </div>
            {/if}
          </div>

          <!-- Skill matrix -->
          <div class="px-5 py-3">
            <div class="flex items-center justify-between mb-2">
              <span class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {t('project.roles_tab.skills_count', { count: role.skills.length }, 'Skills (:count)')}
              </span>
              <div class="flex items-center gap-1.5">
                {#if role.isActive}
                  <Button size="sm" variant="outline" onclick={() => openCandidates(role)} class="h-7 gap-1 px-2 text-xs text-primary hover:text-primary">
                    <Users class="h-3 w-3" />
                    {t('project.roles_tab.candidates', {}, 'Candidates')}
                  </Button>
                  <a
                    href={buildRoleTaskLaunchHref(taskBoardUrl, role.id, role.code)}
                    class="inline-flex h-7 items-center gap-1 rounded-md border border-border px-2 text-xs font-medium text-foreground hover:bg-secondary"
                  >
                    <Plus class="h-3 w-3" />
                    {t('project.roles_tab.create_task', {}, 'Create task')}
                  </a>
                {/if}
                {#if canEdit && role.isActive}
                  <Button size="sm" variant="outline" onclick={() => { openAddSkill(role.id); }} class="h-7 gap-1 px-2 text-xs">
                    <Plus class="h-3 w-3" />
                    {t('project.roles_tab.add_skill', {}, 'Add skill')}
                  </Button>
                {/if}
              </div>
            </div>

            {#if role.skills.length === 0}
              <p class="text-xs text-muted-foreground py-3 text-center">
                {t('project.roles_tab.empty_skills', {}, 'No skills yet.')}
              </p>
            {:else}
              <div class="space-y-1">
                {#each role.skills as rs (rs.id)}
                  <div class="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-muted/40 group transition-colors">
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-1.5 flex-wrap">
                        <span class="text-sm font-medium text-foreground truncate">
                          {rs.skill?.skillName ?? 'Unknown'}
                        </span>
                        {#if rs.isMandatory}
                          <span class="text-[9px] font-bold uppercase text-destructive tracking-wide">{t('project.roles_tab.mandatory', {}, 'Mandatory')}</span>
                        {/if}
                        <span class="inline-flex items-center px-1.5 py-0 rounded text-[10px] font-medium border {importanceColors[rs.importance] ?? ''}">
                          {importanceLabel(rs.importance)}
                        </span>
                      </div>
                      <div class="flex items-center gap-1 mt-0.5">
                        <ProficiencyLevelBadge level={rs.minimumLevel} size="xs" />
                        <span class="text-muted-foreground text-xs">→</span>
                        <ProficiencyLevelBadge level={rs.targetLevel} size="xs" />
                        {#if rs.assessmentCeilingLevel}
                          <span class="text-muted-foreground text-xs">≤</span>
                          <ProficiencyLevelBadge level={rs.assessmentCeilingLevel} size="xs" />
                        {/if}
                        {#if levelCodeRange(rs)}
                          <span class="whitespace-nowrap text-[10px] font-black uppercase tracking-wide text-muted-foreground">
                            {levelCodeRange(rs)}
                          </span>
                        {/if}
                      </div>
                    </div>

                    {#if canEdit && role.isActive}
                      <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button
                          class="text-xs text-primary hover:text-primary font-semibold px-1"
                          onclick={() => { openEditSkill(role.id, rs); }}
                        >{t('project.roles_tab.edit', {}, 'Edit')}</button>
                        <button
                          class="text-xs text-destructive hover:text-destructive font-semibold px-1"
                          onclick={() => { void handleRemoveSkill(role.id, rs.id, rs.skill?.skillName ?? '') }}
                        >{t('project.roles_tab.delete', {}, 'Delete')}</button>
                      </div>
                    {/if}
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<!-- Add role dialog -->
<ProjectRoleAddDialog
  projectId={projectId}
  bind:open={addRoleOpen}
  {templates}
  onAddSuccess={fetchAll}
/>

<!-- Add / Edit skill dialog -->
<ProjectRoleSkillDialog
  projectId={projectId}
  roleId={currentRoleIdForSkill}
  roleSkill={currentRoleSkillForEdit}
  bind:open={skillDialogOpen}
  activeProjectSkills={activeProjectSkillsForCurrentRole()}
  {proficiencyLevels}
  onSuccess={fetchAll}
/>

<!-- Candidates suggestion dialog -->
<ProjectRoleCandidatesDialog
  projectId={projectId}
  roleId={matchingRoleId}
  roleName={matchingRoleName}
  {projectMembers}
  bind:open={candidatesDialogOpen}
  onStaffSuccess={fetchAll}
/>
