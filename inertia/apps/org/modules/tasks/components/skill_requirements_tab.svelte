<script lang="ts">
  import axios from 'axios'
  import { CircleQuestionMark, LoaderCircle, Plus, RefreshCw, Trash2 } from 'lucide-svelte'

  import ConfirmDialog from '@/apps/org/shared/components/confirm_dialog.svelte'
  import Button from '@/apps/org/shared/ui/button.svelte'
  import ProficiencyLevelBadge from '@/apps/org/modules/profile/components/proficiency_level_badge.svelte'
  import Tooltip from '@/apps/org/shared/ui/tooltip.svelte'
  import TooltipContent from '@/apps/org/shared/ui/tooltip_content.svelte'
  import TooltipTrigger from '@/apps/org/shared/ui/tooltip_trigger.svelte'
  import { uiToast } from '@/apps/org/shared/lib/ui_toast'
  import { useTranslation } from '@/apps/org/shared/stores/translation.svelte'

  import TaskSkillPrefillDialog from '@/apps/org/modules/tasks/components/task_skill_prefill_dialog.svelte'
  import TaskSkillAddDialog from '@/apps/org/modules/tasks/components/task_skill_add_dialog.svelte'
  import TaskSkillEditDialog from '@/apps/org/modules/tasks/components/task_skill_edit_dialog.svelte'
  import TaskSkillHistory from '@/apps/org/modules/tasks/components/task_skill_history.svelte'

  interface ProficiencyLevel {
    id: string
    ordinal: number
    code: string
    displayName: string
    shortName?: string
    genericDescription?: string
  }

  interface Skill {
    id: string
    skillName: string
    categoryCode?: string
  }

  interface ProjectSkill {
    id: string
    skill: Skill
    isActive: boolean
  }

  interface ProjectRole {
    id: string
    code: string
    name: string
    isActive: boolean
  }

  interface TaskRequirement {
    id: string
    skillId: string
    projectSkillId?: string | null
    sourceProjectProfessionalRoleId?: string | null
    minimumLevelId?: string | null
    targetLevelId?: string | null
    assessmentCeilingLevelId?: string | null
    isMandatory: boolean
    importance: 'low' | 'medium' | 'high' | 'critical'
    weight: number
    requirementSource: string
    requirementNotes?: string | null
    // Populated
    skill?: Skill
    minimumLevel?: ProficiencyLevel
    targetLevel?: ProficiencyLevel
    assessmentCeilingLevel?: ProficiencyLevel
  }

  interface RequirementVersion {
    id: string
    versionNumber: number
    reason: string
    createdBy: string | null
    createdAt: string | null
    itemsCount: number
    diff: {
      addedSkillIds: string[]
      removedSkillIds: string[]
      modifiedSkillIds: string[]
    }
  }

  interface Props {
    taskId: string
    projectId?: string | null
    canEdit: boolean
  }

  const { taskId, projectId, canEdit }: Props = $props()
  const { t } = useTranslation()

  let requirements = $state<TaskRequirement[]>([])
  let versions = $state<RequirementVersion[]>([])
  let projectSkills = $state<ProjectSkill[]>([])
  let projectRoles = $state<ProjectRole[]>([])
  let proficiencyLevels = $state<ProficiencyLevel[]>([])
  let loading = $state(true)

  // Dialog open states
  let prefillOpen = $state(false)
  let addOpen = $state(false)
  let editOpen = $state(false)
  let removeDialogOpen = $state(false)

  // Focus states
  let editingReq = $state<TaskRequirement | null>(null)
  let pendingRemoveRequirement = $state<TaskRequirement | null>(null)
  let removingId = $state<string | null>(null)

  $effect(() => {
    void fetchAll()
  })

  async function fetchAll() {
    loading = true
    try {
      const reqsRes = await axios.get<{ data: TaskRequirement[] }>(`/api/v1/tasks/${taskId}/requirements`)
      requirements = reqsRes.data.data
      const versionsRes = await axios.get<{ data: RequirementVersion[] }>(
        `/api/v1/tasks/${taskId}/requirements/versions`
      )
      versions = versionsRes.data.data

      if (projectId) {
        const [skillsRes, rolesRes, scalesRes] = await Promise.all([
          axios.get<{ data: ProjectSkill[] }>(`/api/v1/projects/${projectId}/skills`),
          axios.get<{ data: ProjectRole[] }>(`/api/v1/projects/${projectId}/professional-roles`),
          axios.get<{ data: { levels?: ProficiencyLevel[] } }>('/api/v1/proficiency-scales'),
        ])
        projectSkills = skillsRes.data.data
        projectRoles = rolesRes.data.data
        proficiencyLevels = scalesRes.data.data.levels ?? []
      }
    } catch {
      uiToast.error(t('task.skill_requirements.load_error', {}, 'Unable to load skill requirements'))
    } finally {
      loading = false
    }
  }

  const activeProjectSkills = $derived(
    projectSkills.filter((ps) => ps.isActive && !requirements.some((r) => r.projectSkillId === ps.id))
  )

  const importanceColors: Record<string, string> = {
    low: 'bg-muted/40 text-muted-foreground border-border',
    medium: 'bg-primary/10 text-primary border-primary/30',
    high: 'bg-secondary/40 text-foreground border-border',
    critical: 'bg-destructive/10 text-destructive border-destructive/30',
  }

  const sourceFallbackLabels: Record<string, string> = {
    manual: 'Manual',
    professional_role_prefill: 'Role prefill',
    template: 'Template',
    copied_task: 'Copied',
    imported_legacy: 'Imported',
  }

  const importanceFallbackLabels: Record<TaskRequirement['importance'], string> = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    critical: 'Critical',
  }

  const completeness = $derived(() => {
    if (requirements.length === 0) return null
    const configured = requirements.filter((r) => r.minimumLevelId && r.targetLevelId).length
    return Math.round((configured / requirements.length) * 100)
  })

  const completenessValue = $derived(completeness() ?? 0)

  function openEdit(req: TaskRequirement) {
    editingReq = req
    editOpen = true
  }

  function requestRemove(req: TaskRequirement) {
    pendingRemoveRequirement = req
    removeDialogOpen = true
  }

  async function confirmRemoveRequirement() {
    const req = pendingRemoveRequirement
    if (!req) return

    removingId = req.id
    try {
      await axios.delete(`/api/v1/tasks/${taskId}/requirements/${req.id}`)
      uiToast.success(t('task.skill_requirements.remove_success', {}, 'Skill requirement removed'))
      await fetchAll()
    } catch {
      uiToast.error(t('task.skill_requirements.remove_error', {}, 'Unable to remove skill requirement'))
    } finally {
      removingId = null
      pendingRemoveRequirement = null
      removeDialogOpen = false
    }
  }
</script>

<div class="space-y-4">
  <!-- Header -->
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
    <div class="flex items-center gap-3">
      <span class="text-sm text-muted-foreground">
        {t('task.skill_requirements.count', { count: requirements.length }, `${requirements.length} required skills`)}
      </span>

      {#if completeness() !== null}
        <div class="flex items-center gap-1.5 text-xs">
          <div class="h-1.5 w-20 rounded-full bg-muted overflow-hidden">
            <div
              class="h-full rounded-full transition-all {completenessValue >= 80 ? 'bg-primary' : completenessValue >= 50 ? 'bg-secondary-foreground' : 'bg-muted-foreground'}"
              style="width: {completenessValue}%"
            ></div>
          </div>
          <span class="font-mono text-muted-foreground">{t('task.skill_requirements.completeness', { value: completenessValue }, `${completenessValue}% complete`)}</span>
          <Tooltip>
            <TooltipTrigger>
              <CircleQuestionMark class="h-3.5 w-3.5 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent class="font-normal normal-case">
              {t('task.skill_requirements.completeness_help', {}, 'Share of skills with both minimum and target levels configured.')}
            </TooltipContent>
          </Tooltip>
        </div>
      {/if}
    </div>

    {#if canEdit}
      <div class="flex gap-2">
        {#if projectId && projectRoles.filter((r) => r.isActive).length > 0}
          <Button size="sm" variant="outline" onclick={() => { prefillOpen = true }} class="gap-1.5">
            <RefreshCw class="h-4 w-4" />
            {t('task.skill_requirements.apply_role', {}, 'Apply role')}
          </Button>
        {/if}

        {#if projectId && activeProjectSkills.length > 0}
          <Button size="sm" onclick={() => { addOpen = true }} class="gap-1.5">
            <Plus class="h-4 w-4" />
            {t('task.skill_requirements.add_skill', {}, 'Add Skill')}
          </Button>
        {/if}
      </div>
    {/if}
  </div>

  <!-- Requirements list -->
  {#if loading}
    <div class="flex items-center justify-center py-10 gap-2 text-muted-foreground">
      <LoaderCircle class="h-5 w-5 animate-spin" />
      <span class="text-sm">{t('task.skill_requirements.loading', {}, 'Loading...')}</span>
    </div>
  {:else if requirements.length === 0}
    <div class="flex flex-col items-center justify-center py-10 gap-2 text-center text-muted-foreground">
      <p class="text-sm">{t('task.skill_requirements.empty', {}, 'Task has no skill requirements yet.')}</p>
      {#if !projectId}
        <p class="text-xs">{t('task.skill_requirements.no_project', {}, 'This task is not attached to a project, so skills cannot be added from the catalog.')}</p>
      {/if}
    </div>
  {:else}
    <div class="space-y-2 font-sans">
      {#each requirements as req (req.id)}
        <div class="flex items-center gap-3 p-3 rounded-lg border border-border bg-background hover:bg-muted/60 group transition-colors">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap font-sans">
              <span class="text-sm font-medium text-foreground">
                {req.skill?.skillName ?? '—'}
              </span>
              {#if req.isMandatory}
                <span class="text-[9px] font-bold uppercase text-destructive tracking-wide font-sans">{t('task.skill_requirements.mandatory', {}, 'Mandatory')}</span>
              {/if}
              <span class="inline-flex items-center px-1.5 py-0 rounded text-[10px] font-medium border {importanceColors[req.importance] ?? ''}">
                {t(`task.skill_requirements.importance.${req.importance}`, {}, importanceFallbackLabels[req.importance])}
              </span>
              {#if req.requirementSource !== 'manual'}
                <span class="text-[10px] text-muted-foreground font-sans">
                  {t(`task.skill_requirements.source.${req.requirementSource}`, {}, sourceFallbackLabels[req.requirementSource] ?? req.requirementSource)}
                </span>
              {/if}
            </div>
            <div class="flex items-center gap-1 mt-1">
              <ProficiencyLevelBadge level={req.minimumLevel} size="xs" />
              <span class="text-muted-foreground text-xs">→</span>
              <ProficiencyLevelBadge level={req.targetLevel} size="xs" />
              {#if req.assessmentCeilingLevel}
                <span class="text-muted-foreground text-xs">≤</span>
                <ProficiencyLevelBadge level={req.assessmentCeilingLevel} size="xs" />
              {/if}
            </div>
          </div>

          {#if canEdit}
            <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <button
                class="text-xs text-primary hover:text-primary font-semibold px-1.5 py-0.5 rounded hover:bg-primary/10"
                onclick={() => { openEdit(req); }}
              >{t('task.skill_requirements.edit', {}, 'Edit')}</button>
              <button
                class="text-xs text-destructive hover:text-destructive font-semibold px-1.5 py-0.5 rounded hover:bg-destructive/10 flex items-center gap-0.5"
                onclick={() => requestRemove(req)}
                disabled={removingId === req.id}
              >
                {#if removingId === req.id}
                  <LoaderCircle class="h-3 w-3 animate-spin" />
                {:else}
                  <Trash2 class="h-3 w-3" />
                {/if}
              </button>
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}

  <TaskSkillHistory
    {versions}
    loading={loading}
  />
</div>

<ConfirmDialog
  bind:open={removeDialogOpen}
  title={t('task.skill_requirements.confirm_title', {}, 'Remove skill requirement')}
  desc={t(
    'task.skill_requirements.confirm_desc',
    { skillName: pendingRemoveRequirement?.skill?.skillName ?? t('task.skill_requirements.confirm_fallback_skill', {}, 'this skill') },
    `Remove requirement "${pendingRemoveRequirement?.skill?.skillName ?? t('task.skill_requirements.confirm_fallback_skill', {}, 'this skill')}" from this task?`
  )}
  cancelBtnText={t('task.skill_requirements.cancel', {}, 'Cancel')}
  confirmText={t('task.skill_requirements.remove', {}, 'Remove')}
  destructive={true}
  handleConfirm={() => {
    void confirmRemoveRequirement()
  }}
  isLoading={Boolean(removingId)}
/>

<!-- Prefill role dialog -->
<TaskSkillPrefillDialog
  bind:open={prefillOpen}
  {projectRoles}
  {taskId}
  onPrefillSuccess={fetchAll}
/>

<!-- Add skill dialog -->
<TaskSkillAddDialog
  bind:open={addOpen}
  {activeProjectSkills}
  {proficiencyLevels}
  {taskId}
  onAddSuccess={fetchAll}
/>

<!-- Edit skill dialog -->
<TaskSkillEditDialog
  bind:open={editOpen}
  requirement={editingReq}
  {proficiencyLevels}
  {taskId}
  onEditSuccess={fetchAll}
/>
