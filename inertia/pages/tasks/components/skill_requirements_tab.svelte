<script lang="ts">
  import axios from 'axios'
  import { CircleQuestionMark, Clock3, LoaderCircle, Plus, RefreshCw, Trash2 } from 'lucide-svelte'
  import { toast } from 'svelte-sonner'

  import Button from '@/components/ui/button.svelte'
  import Dialog from '@/components/ui/dialog.svelte'
  import DialogContent from '@/components/ui/dialog_content.svelte'
  import DialogHeader from '@/components/ui/dialog_header.svelte'
  import DialogTitle from '@/components/ui/dialog_title.svelte'
  import Input from '@/components/ui/input.svelte'
  import Label from '@/components/ui/label.svelte'
  import LevelRangeSelector from '@/components/ui/level_range_selector.svelte'
  import ProficiencyLevelBadge from '@/components/ui/proficiency_level_badge.svelte'
  import Tooltip from '@/components/ui/tooltip.svelte'
  import TooltipContent from '@/components/ui/tooltip_content.svelte'
  import TooltipTrigger from '@/components/ui/tooltip_trigger.svelte'

  interface ProficiencyLevel {
    id: string
    ordinal: number
    code: string
    display_name: string
    short_name?: string
    generic_description?: string
  }

  interface Skill {
    id: string
    skill_name: string
    category_code?: string
  }

  interface ProjectSkill {
    id: string
    skill: Skill
    is_active: boolean
  }

  interface ProjectRole {
    id: string
    code: string
    name: string
    is_active: boolean
  }

  interface TaskRequirement {
    id: string
    skill_id: string
    project_skill_id?: string | null
    source_project_professional_role_id?: string | null
    minimum_level_id?: string | null
    target_level_id?: string | null
    assessment_ceiling_level_id?: string | null
    is_mandatory: boolean
    importance: 'low' | 'medium' | 'high' | 'critical'
    weight: number
    requirement_source: string
    requirement_notes?: string | null
    // Populated
    skill?: Skill
    minimum_level?: ProficiencyLevel
    target_level?: ProficiencyLevel
    assessment_ceiling_level?: ProficiencyLevel
  }

  interface RequirementVersion {
    id: string
    version_number: number
    reason: string
    created_by: string | null
    created_at: string | null
    items_count: number
    diff: {
      added_skill_ids: string[]
      removed_skill_ids: string[]
      modified_skill_ids: string[]
    }
  }

  interface Props {
    taskId: string
    projectId?: string | null
    canEdit: boolean
  }

  interface ProficiencyScaleResponse {
    levels?: ProficiencyLevel[]
  }

  interface ApiErrorResponse {
    message?: string
  }

  const { taskId, projectId, canEdit }: Props = $props()

  let requirements = $state<TaskRequirement[]>([])
  let versions = $state<RequirementVersion[]>([])
  let projectSkills = $state<ProjectSkill[]>([])
  let projectRoles = $state<ProjectRole[]>([])
  let proficiencyLevels = $state<ProficiencyLevel[]>([])
  let loading = $state(true)

  // Add requirement dialog
  let addOpen = $state(false)
  let selectedProjectSkillId = $state('')
  let addMinLevelId = $state('')
  let addTargetLevelId = $state('')
  let addCeilingLevelId = $state('')
  let addMandatory = $state(true)
  let addImportance = $state<'low' | 'medium' | 'high' | 'critical'>('medium')
  let addWeight = $state(1.0)
  let addNotes = $state('')
  let adding = $state(false)

  // Prefill from role dialog
  let prefillOpen = $state(false)
  let selectedRoleId = $state('')
  let prefilling = $state(false)

  // Edit requirement
  let editOpen = $state(false)
  let editingReq = $state<TaskRequirement | null>(null)
  let editMinLevelId = $state('')
  let editTargetLevelId = $state('')
  let editCeilingLevelId = $state('')
  let editMandatory = $state(false)
  let editImportance = $state<'low' | 'medium' | 'high' | 'critical'>('medium')
  let editWeight = $state(1.0)
  let editNotes = $state('')
  let saving = $state(false)

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
          axios.get<{ data: ProficiencyScaleResponse }>('/api/v1/proficiency-scales'),
        ])
        projectSkills = skillsRes.data.data
        projectRoles = rolesRes.data.data
        proficiencyLevels = scalesRes.data.data.levels ?? []
      }
    } catch {
      toast.error('Không thể tải yêu cầu skill')
    } finally {
      loading = false
    }
  }

  const activeProjectSkills = $derived(
    projectSkills.filter((ps) => ps.is_active && !requirements.some((r) => r.project_skill_id === ps.id))
  )

  const importanceColors: Record<string, string> = {
    low: 'bg-slate-50 text-slate-600 border-slate-200',
    medium: 'bg-ink-04 text-foreground border-blue-200',
    high: 'bg-orange-50 text-orange-700 border-orange-200',
    critical: 'bg-orange-03 text-destructive border-border',
  }

  const sourceLabels: Record<string, string> = {
    manual: 'Thêm thủ công',
    professional_role_prefill: 'Prefill từ Role',
    template: 'Template',
    copied_task: 'Copied',
    imported_legacy: 'Imported',
  }

  const reasonLabels: Record<string, string> = {
    task_created: 'Task created',
    task_assigned: 'Task assigned',
    submission_sent: 'Submission sent',
    review_started: 'Review started',
    dispute_opened: 'Dispute opened',
    manual_edit: 'Manual edit',
  }

  // Completeness
  const completeness = $derived(() => {
    if (requirements.length === 0) return null
    const configured = requirements.filter((r) => r.minimum_level_id && r.target_level_id).length
    return Math.round((configured / requirements.length) * 100)
  })

  const completenessValue = $derived(completeness() ?? 0)

  function getErrorMessage(error: unknown, fallback: string): string {
    if (axios.isAxiosError<ApiErrorResponse>(error)) {
      return error.response ? (error.response.data.message ?? fallback) : fallback
    }

    return fallback
  }

  async function handleAdd(e: Event) {
    e.preventDefault()
    if (!selectedProjectSkillId) return
    const ps = projectSkills.find((p) => p.id === selectedProjectSkillId)
    if (!ps) return

    adding = true
    try {
      await axios.post(`/api/v1/tasks/${taskId}/requirements`, {
        skill_id: ps.skill.id,
        project_skill_id: selectedProjectSkillId,
        minimum_level_id: addMinLevelId || null,
        target_level_id: addTargetLevelId || null,
        assessment_ceiling_level_id: addCeilingLevelId || null,
        is_mandatory: addMandatory,
        importance: addImportance,
        weight: addWeight,
        requirement_notes: addNotes || null,
      })
      toast.success('Đã thêm yêu cầu skill')
      addOpen = false
      resetAdd()
      await fetchAll()
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Lỗi thêm yêu cầu'))
    } finally {
      adding = false
    }
  }

  function resetAdd() {
    selectedProjectSkillId = ''
    addMinLevelId = ''
    addTargetLevelId = ''
    addCeilingLevelId = ''
    addMandatory = true
    addImportance = 'medium'
    addWeight = 1.0
    addNotes = ''
  }

  async function handlePrefillFromRole(e: Event) {
    e.preventDefault()
    if (!selectedRoleId) return
    prefilling = true
    try {
      const res = await axios.post<{ data: { addedCount: number; skippedCount: number } }>(
        `/api/v1/tasks/${taskId}/requirements/prefill-from-role`,
        { project_professional_role_id: selectedRoleId }
      )
      const { addedCount, skippedCount } = res.data.data
      toast.success(`Prefill thành công: +${addedCount} skill${skippedCount > 0 ? `, bỏ qua ${skippedCount}` : ''}`)
      prefillOpen = false
      selectedRoleId = ''
      await fetchAll()
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Lỗi prefill từ role'))
    } finally {
      prefilling = false
    }
  }

  function openEdit(req: TaskRequirement) {
    editingReq = req
    editMinLevelId = req.minimum_level_id ?? ''
    editTargetLevelId = req.target_level_id ?? ''
    editCeilingLevelId = req.assessment_ceiling_level_id ?? ''
    editMandatory = req.is_mandatory
    editImportance = req.importance
    editWeight = req.weight
    editNotes = req.requirement_notes ?? ''
    editOpen = true
  }

  async function handleSave(e: Event) {
    e.preventDefault()
    if (!editingReq) return
    saving = true
    try {
      await axios.put(`/api/v1/tasks/${taskId}/requirements/${editingReq.id}`, {
        minimum_level_id: editMinLevelId || null,
        target_level_id: editTargetLevelId || null,
        assessment_ceiling_level_id: editCeilingLevelId || null,
        is_mandatory: editMandatory,
        importance: editImportance,
        weight: editWeight,
        requirement_notes: editNotes || null,
      })
      toast.success('Đã cập nhật yêu cầu skill')
      editOpen = false
      editingReq = null
      await fetchAll()
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Lỗi lưu'))
    } finally {
      saving = false
    }
  }

  async function handleRemove(req: TaskRequirement) {
    const skillName = req.skill?.skill_name ?? 'skill này'
    if (!confirm(`Xóa yêu cầu "${skillName}" khỏi task?`)) return
    removingId = req.id
    try {
      await axios.delete(`/api/v1/tasks/${taskId}/requirements/${req.id}`)
      toast.success('Đã xóa yêu cầu skill')
      await fetchAll()
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Lỗi xóa'))
    } finally {
      removingId = null
    }
  }

  function formatVersionDate(value: string | null): string {
    return value ? new Date(value).toLocaleString('vi-VN') : 'Chưa rõ thời gian'
  }
</script>

<div class="space-y-4">
  <!-- Header -->
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
    <div class="flex items-center gap-3">
      <span class="text-sm text-muted-foreground">
        {requirements.length} skill yêu cầu
      </span>

      {#if completeness() !== null}
        <div class="flex items-center gap-1.5 text-xs">
          <div class="h-1.5 w-20 rounded-full bg-slate-100 overflow-hidden">
            <div
              class="h-full rounded-full transition-all {completenessValue >= 80 ? 'bg-emerald-500' : completenessValue >= 50 ? 'bg-amber-500' : 'bg-slate-400'}"
              style="width: {completenessValue}%"
            ></div>
          </div>
          <span class="font-mono text-muted-foreground">{completenessValue}% đầy đủ</span>
          <Tooltip>
            <TooltipTrigger>
              <CircleQuestionMark class="h-3.5 w-3.5 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent class="font-normal normal-case">
              Tỷ lệ skill đã có cả Level tối thiểu và Level mục tiêu.
            </TooltipContent>
          </Tooltip>
        </div>
      {/if}
    </div>

    {#if canEdit}
      <div class="flex gap-2">
        {#if projectId && projectRoles.filter((r) => r.is_active).length > 0}
          <Dialog bind:open={prefillOpen}>
            <Button size="sm" variant="outline" onclick={() => { prefillOpen = true }} class="gap-1.5">
              <RefreshCw class="h-4 w-4" />
              Prefill từ Role
            </Button>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Prefill Skill Requirements từ Professional Role</DialogTitle>
              </DialogHeader>
              <form onsubmit={handlePrefillFromRole} class="space-y-4 pt-2">
                <p class="text-sm text-muted-foreground">
                  Thêm tất cả skill của role được chọn vào task. Skill đã tồn tại sẽ bị bỏ qua.
                </p>
                <div class="space-y-1.5">
                  <Label for="prefill-role">Chọn Professional Role</Label>
                  <select
                    id="prefill-role"
                    bind:value={selectedRoleId}
                    class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                    required
                  >
                    <option value="" disabled>— Chọn role —</option>
                    {#each projectRoles.filter((r) => r.is_active) as role (role.id)}
                      <option value={role.id}>{role.name} ({role.code})</option>
                    {/each}
                  </select>
                </div>
                <div class="flex justify-end gap-2">
                  <Button type="button" variant="outline" onclick={() => { prefillOpen = false }}>Hủy</Button>
                  <Button type="submit" disabled={!selectedRoleId || prefilling}>
                    {#if prefilling}<LoaderCircle class="h-4 w-4 animate-spin mr-1.5" />{/if}
                    Prefill
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        {/if}

        {#if projectId && activeProjectSkills.length > 0}
          <Dialog bind:open={addOpen}>
            <Button size="sm" onclick={() => { addOpen = true }} class="gap-1.5">
              <Plus class="h-4 w-4" />
              Thêm Skill
            </Button>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Thêm Yêu cầu Skill</DialogTitle>
              </DialogHeader>
              <form onsubmit={handleAdd} class="space-y-4 pt-2">
                <div class="space-y-1.5">
                  <Label for="add-skill">Chọn Skill</Label>
                  <select
                    id="add-skill"
                    bind:value={selectedProjectSkillId}
                    class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                    required
                  >
                    <option value="" disabled>— Chọn skill từ Catalog —</option>
                    {#each activeProjectSkills as ps (ps.id)}
                      <option value={ps.id}>{ps.skill.skill_name}</option>
                    {/each}
                  </select>
                </div>

                <LevelRangeSelector
                  levels={proficiencyLevels}
                  bind:minLevelId={addMinLevelId}
                  bind:targetLevelId={addTargetLevelId}
                  bind:ceilingLevelId={addCeilingLevelId}
                />

                <div class="grid grid-cols-2 gap-3">
                  <div class="space-y-1.5">
                    <Label for="add-importance">Tầm quan trọng</Label>
                    <select
                      id="add-importance"
                      bind:value={addImportance}
                      class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                  <div class="space-y-1.5">
                    <Label for="add-weight">Trọng số</Label>
                    <Input id="add-weight" type="number" step="0.1" min="0" bind:value={addWeight} />
                  </div>
                </div>

                <div class="flex items-center gap-2">
                  <input id="add-mandatory" type="checkbox" bind:checked={addMandatory} class="h-4 w-4 rounded border-slate-300" />
                  <label for="add-mandatory" class="text-sm text-slate-700">
                    Bắt buộc phải đạt level tối thiểu để nhận task
                  </label>
                </div>

                <div class="flex justify-end gap-2">
                  <Button type="button" variant="outline" onclick={() => { addOpen = false; resetAdd() }}>Hủy</Button>
                  <Button type="submit" disabled={!selectedProjectSkillId || adding}>
                    {#if adding}<LoaderCircle class="h-4 w-4 animate-spin mr-1.5" />{/if}
                    Thêm
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        {/if}
      </div>
    {/if}
  </div>

  <!-- Requirements list -->
  {#if loading}
    <div class="flex items-center justify-center py-10 gap-2 text-muted-foreground">
      <LoaderCircle class="h-5 w-5 animate-spin" />
      <span class="text-sm">Đang tải...</span>
    </div>
  {:else if requirements.length === 0}
    <div class="flex flex-col items-center justify-center py-10 gap-2 text-center text-muted-foreground">
      <p class="text-sm">Task chưa có yêu cầu skill nào.</p>
      {#if !projectId}
        <p class="text-xs">Task này không thuộc dự án nên không thể thêm skill từ Catalog.</p>
      {/if}
    </div>
  {:else}
    <div class="space-y-2">
      {#each requirements as req (req.id)}
        <div class="flex items-center gap-3 p-3 rounded-lg border border-border bg-background hover:bg-slate-50/60 group transition-colors">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-sm font-medium text-slate-800">
                {req.skill?.skill_name ?? '—'}
              </span>
              {#if req.is_mandatory}
                <span class="text-[9px] font-bold uppercase text-destructive tracking-wide">Bắt buộc</span>
              {/if}
              <span class="inline-flex items-center px-1.5 py-0 rounded text-[10px] font-medium border {importanceColors[req.importance] ?? ''}">
                {req.importance}
              </span>
              {#if req.requirement_source !== 'manual'}
                <span class="text-[10px] text-muted-foreground">
                  {sourceLabels[req.requirement_source] ?? req.requirement_source}
                </span>
              {/if}
            </div>
            <div class="flex items-center gap-1 mt-1">
              <ProficiencyLevelBadge level={req.minimum_level} size="xs" />
              <span class="text-slate-300 text-xs">→</span>
              <ProficiencyLevelBadge level={req.target_level} size="xs" />
              {#if req.assessment_ceiling_level}
                <span class="text-slate-300 text-xs">≤</span>
                <ProficiencyLevelBadge level={req.assessment_ceiling_level} size="xs" />
              {/if}
            </div>
          </div>

          {#if canEdit}
            <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <button
                class="text-xs text-indigo-600 hover:text-indigo-800 font-semibold px-1.5 py-0.5 rounded hover:bg-indigo-50"
                onclick={() => { openEdit(req); }}
              >Sửa</button>
              <button
                class="text-xs text-destructive hover:text-destructive font-semibold px-1.5 py-0.5 rounded hover:bg-orange-03 flex items-center gap-0.5"
                onclick={() => handleRemove(req)}
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

  <div class="rounded-lg border bg-muted/20 p-3">
    <div class="mb-3 flex items-center justify-between gap-2">
      <div class="flex items-center gap-2">
        <Clock3 class="h-4 w-4 text-muted-foreground" />
        <span class="text-sm font-semibold">Requirement version history</span>
      </div>
      <span class="text-xs text-muted-foreground">{versions.length} snapshots</span>
    </div>

    {#if loading}
      <p class="text-xs text-muted-foreground">Đang tải version history...</p>
    {:else if versions.length === 0}
      <p class="text-xs text-muted-foreground">Chưa có requirement snapshot.</p>
    {:else}
      <div class="space-y-2">
        {#each versions.slice().reverse() as version (version.id)}
          <div class="rounded-md border bg-background p-2 text-xs">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div class="flex flex-wrap items-center gap-2">
                <span class="font-bold">v{version.version_number}</span>
                <span class="rounded border px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  {reasonLabels[version.reason] ?? version.reason}
                </span>
                <span class="text-muted-foreground">{version.items_count} skills</span>
              </div>
              <span class="text-muted-foreground">{formatVersionDate(version.created_at)}</span>
            </div>
            <div class="mt-2 flex flex-wrap gap-1.5 text-[10px]">
              <span class="rounded bg-emerald-50 px-1.5 py-0.5 text-emerald-700">
                +{version.diff.added_skill_ids.length} added
              </span>
              <span class="rounded bg-amber-50 px-1.5 py-0.5 text-amber-700">
                ~{version.diff.modified_skill_ids.length} modified
              </span>
              <span class="rounded bg-orange-03 px-1.5 py-0.5 text-destructive">
                -{version.diff.removed_skill_ids.length} removed
              </span>
              {#if version.created_by}
                <span class="text-muted-foreground">by {version.created_by}</span>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

<!-- Edit dialog -->
{#if editOpen && editingReq}
  <Dialog bind:open={editOpen}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Sửa: {editingReq.skill?.skill_name}</DialogTitle>
      </DialogHeader>
      <form onsubmit={handleSave} class="space-y-4 pt-2">
        <LevelRangeSelector
          levels={proficiencyLevels}
          bind:minLevelId={editMinLevelId}
          bind:targetLevelId={editTargetLevelId}
          bind:ceilingLevelId={editCeilingLevelId}
        />

        <div class="grid grid-cols-2 gap-3">
          <div class="space-y-1.5">
            <Label for="edit-imp">Tầm quan trọng</Label>
            <select
              id="edit-imp"
              bind:value={editImportance}
              class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          <div class="space-y-1.5">
            <Label for="edit-weight">Trọng số</Label>
            <Input id="edit-weight" type="number" step="0.1" min="0" bind:value={editWeight} />
          </div>
        </div>

        <div class="flex items-center gap-2">
          <input id="edit-mandatory" type="checkbox" bind:checked={editMandatory} class="h-4 w-4 rounded border-slate-300" />
          <label for="edit-mandatory" class="text-sm text-slate-700">Bắt buộc phải đạt level tối thiểu</label>
        </div>

        <div class="flex justify-end gap-2">
          <Button type="button" variant="outline" onclick={() => { editOpen = false; editingReq = null }}>Hủy</Button>
          <Button type="submit" disabled={saving}>
            {#if saving}<LoaderCircle class="h-4 w-4 animate-spin mr-1.5" />{/if}
            Lưu
          </Button>
        </div>
      </form>
    </DialogContent>
  </Dialog>
{/if}
