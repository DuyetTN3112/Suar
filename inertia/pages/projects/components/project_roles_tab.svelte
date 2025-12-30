<script lang="ts">
  import axios from 'axios'
  import { Copy, LoaderCircle, Plus, Trash2, UserCog, Users, Check, CircleAlert } from 'lucide-svelte'
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
  import Textarea from '@/components/ui/textarea.svelte'

  interface ProficiencyLevel {
    id: string
    ordinal: number
    code: string
    display_name: string
    short_name?: string
    generic_description?: string
  }

  interface ProjectSkill {
    id: string
    skill: { id: string; skill_name: string; category_code?: string }
    is_active: boolean
  }

  interface RoleSkill {
    id: string
    skill?: { skill_name: string }
    minimum_level?: ProficiencyLevel
    target_level?: ProficiencyLevel
    assessment_ceiling_level?: ProficiencyLevel
    is_mandatory: boolean
    importance: 'low' | 'medium' | 'high' | 'critical'
    weight: number
  }

  interface ProjectRole {
    id: string
    code: string
    name: string
    description?: string
    is_active: boolean
    skills: RoleSkill[]
    source_template_id?: string
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
  }

  const { projectId, canEdit }: Props = $props()

  let roles = $state<ProjectRole[]>([])
  let projectSkills = $state<ProjectSkill[]>([])
  let templates = $state<RoleTemplate[]>([])
  let proficiencyLevels = $state<ProficiencyLevel[]>([])
  let loading = $state(true)

  // Add role dialog
  let addRoleOpen = $state(false)
  let roleCreationType = $state<'template' | 'custom'>('template')
  let selectedTemplateId = $state('')
  let customCode = $state('')
  let customName = $state('')
  let customDescription = $state('')
  let addingRole = $state(false)

  // Add skill to role dialog
  let addSkillOpen = $state(false)
  let targetRoleId = $state('')
  let selectedProjectSkillId = $state('')
  let minLevelId = $state('')
  let targetLevelId = $state('')
  let ceilingLevelId = $state('')
  let isMandatory = $state(false)
  let importance = $state<'low' | 'medium' | 'high' | 'critical'>('medium')
  let weight = $state(1.0)
  let addingSkill = $state(false)

  // Edit skill in role dialog
  let editSkillOpen = $state(false)
  let editingRoleId = $state('')
  let editingRoleSkillId = $state('')
  let editMinLevelId = $state('')
  let editTargetLevelId = $state('')
  let editCeilingLevelId = $state('')
  let editMandatory = $state(false)
  let editImportance = $state<'low' | 'medium' | 'high' | 'critical'>('medium')
  let editWeight = $state(1.0)
  let savingSkill = $state(false)

  // Staffing candidates dialog
  let candidatesOpen = $state(false)
  let matchingRoleId = $state('')
  let matchingRoleName = $state('')
  interface StaffingCandidate {
    user_id: string
    username: string
    email: string
    source: 'project_member' | 'org_member' | 'external'
    match_score: number
    matched_skills: number
    total_required_skills: number
    skill_gaps: string[]
  }
  let matchingCandidates = $state<StaffingCandidate[]>([])
  let loadingCandidates = $state(false)
  let staffingCandidateId = $state<string | null>(null)

  async function openCandidates(role: ProjectRole) {
    matchingRoleId = role.id
    matchingRoleName = role.name
    candidatesOpen = true
    loadingCandidates = true
    try {
      const res = await axios.get<{ candidates: StaffingCandidate[] }>(
        `/api/v1/projects/${projectId}/professional-roles/${role.id}/candidates`
      )
      matchingCandidates = res.data.candidates
    } catch {
      toast.error('Không thể tải danh sách ứng viên đề xuất')
    } finally {
      loadingCandidates = false
    }
  }

  async function handleStaffCandidate(candidate: StaffingCandidate) {
    staffingCandidateId = candidate.user_id
    try {
      await axios.post('/projects/members', {
        project_id: projectId,
        user_id: candidate.user_id,
        project_role: 'project_member',
      })
      toast.success(`Đã thêm ${candidate.username} vào dự án`)
      const res = await axios.get<{ candidates: StaffingCandidate[] }>(
        `/api/v1/projects/${projectId}/professional-roles/${matchingRoleId}/candidates`
      )
      matchingCandidates = res.data.candidates
      await fetchAll()
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      toast.error(error.response?.data?.message ?? 'Lỗi thêm ứng viên')
    } finally {
      staffingCandidateId = null
    }
  }

  let deactivatingRole = $state<string | null>(null)

  $effect(() => {
    void fetchAll()
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
      toast.error('Không thể tải dữ liệu professional roles')
    } finally {
      loading = false
    }
  }

  const activeProjectSkills = $derived(projectSkills.filter((ps) => ps.is_active))

  const importanceColors: Record<string, string> = {
    low: 'bg-slate-50 text-slate-600 border-slate-200',
    medium: 'bg-ink-04 text-foreground border-blue-200',
    high: 'bg-orange-50 text-orange-700 border-orange-200',
    critical: 'bg-orange-03 text-destructive border-border',
  }

  // Role completeness: % of role skills that have both min AND target defined
  function roleCompleteness(role: ProjectRole): number {
    if (role.skills.length === 0) return 0
    const configured = role.skills.filter((rs) => rs.minimum_level && rs.target_level).length
    return Math.round((configured / role.skills.length) * 100)
  }

  async function handleAddRole(e: Event) {
    e.preventDefault()
    addingRole = true
    try {
      const payload =
        roleCreationType === 'template'
          ? { template_id: selectedTemplateId }
          : { code: customCode, name: customName, description: customDescription }
      await axios.post(`/api/v1/projects/${projectId}/professional-roles`, payload)
      toast.success('Đã tạo Professional Role')
      addRoleOpen = false
      resetAddRole()
      await fetchAll()
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      toast.error(error.response?.data?.message ?? 'Lỗi tạo role')
    } finally {
      addingRole = false
    }
  }

  function resetAddRole() {
    selectedTemplateId = ''
    customCode = ''
    customName = ''
    customDescription = ''
    roleCreationType = 'template'
  }

  function openAddSkill(roleId: string) {
    targetRoleId = roleId
    selectedProjectSkillId = ''
    minLevelId = ''
    targetLevelId = ''
    ceilingLevelId = ''
    isMandatory = false
    importance = 'medium'
    weight = 1.0
    addSkillOpen = true
  }

  async function handleAddSkill(e: Event) {
    e.preventDefault()
    if (!selectedProjectSkillId) return
    addingSkill = true
    try {
      await axios.post(
        `/api/v1/projects/${projectId}/professional-roles/${targetRoleId}/skills`,
        {
          project_skill_id: selectedProjectSkillId,
          minimum_level_id: minLevelId || null,
          target_level_id: targetLevelId || null,
          assessment_ceiling_level_id: ceilingLevelId || null,
          is_mandatory: isMandatory,
          importance,
          weight,
        }
      )
      toast.success('Đã thêm skill vào role')
      addSkillOpen = false
      await fetchAll()
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      toast.error(error.response?.data?.message ?? 'Lỗi thêm skill vào role')
    } finally {
      addingSkill = false
    }
  }

  function openEditSkill(roleId: string, rs: RoleSkill) {
    editingRoleId = roleId
    editingRoleSkillId = rs.id
    editMinLevelId = rs.minimum_level?.id ?? ''
    editTargetLevelId = rs.target_level?.id ?? ''
    editCeilingLevelId = rs.assessment_ceiling_level?.id ?? ''
    editMandatory = rs.is_mandatory
    editImportance = rs.importance
    editWeight = rs.weight
    editSkillOpen = true
  }

  async function handleSaveSkill(e: Event) {
    e.preventDefault()
    savingSkill = true
    try {
      await axios.put(
        `/api/v1/projects/${projectId}/professional-roles/${editingRoleId}/skills/${editingRoleSkillId}`,
        {
          minimum_level_id: editMinLevelId || null,
          target_level_id: editTargetLevelId || null,
          assessment_ceiling_level_id: editCeilingLevelId || null,
          is_mandatory: editMandatory,
          importance: editImportance,
          weight: editWeight,
        }
      )
      toast.success('Đã cập nhật cấu hình skill')
      editSkillOpen = false
      await fetchAll()
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      toast.error(error.response?.data?.message ?? 'Lỗi lưu cấu hình')
    } finally {
      savingSkill = false
    }
  }

  async function handleRemoveSkill(roleId: string, roleSkillId: string, skillName: string) {
    if (!confirm(`Xóa skill "${skillName}" khỏi role này?`)) return
    try {
      await axios.delete(`/api/v1/projects/${projectId}/professional-roles/${roleId}/skills/${roleSkillId}`)
      toast.success('Đã xóa skill khỏi role')
      await fetchAll()
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      toast.error(error.response?.data?.message ?? 'Lỗi xóa skill')
    }
  }

  async function handleDeactivateRole(role: ProjectRole) {
    if (!confirm(`Tắt role "${role.name}"? Role sẽ không thể dùng cho task mới.`)) return
    deactivatingRole = role.id
    try {
      await axios.delete(`/api/v1/projects/${projectId}/professional-roles/${role.id}`)
      toast.success('Đã tắt Professional Role')
      await fetchAll()
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      toast.error(error.response?.data?.message ?? 'Lỗi tắt role')
    } finally {
      deactivatingRole = null
    }
  }
</script>

<div class="space-y-4">
  <!-- Header -->
  <div class="flex items-center justify-between">
    <div class="text-sm text-muted-foreground">
      {roles.filter((r) => r.is_active).length} role đang active
    </div>
    {#if canEdit}
      <Button size="sm" onclick={() => { addRoleOpen = true }} class="gap-1.5">
        <Plus class="h-4 w-4" />
        Thêm Role
      </Button>

      <Dialog bind:open={addRoleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thêm Professional Role</DialogTitle>
          </DialogHeader>
          <form onsubmit={handleAddRole} class="space-y-4 pt-2">
            <!-- Type picker -->
            <div class="flex gap-1 p-1 rounded-lg bg-slate-100 text-sm">
              <button
                type="button"
                class="flex-1 py-1.5 rounded-md font-medium transition-colors
                  {roleCreationType === 'template' ? 'bg-white shadow-sm text-slate-800' : 'text-muted-foreground hover:text-slate-700'}"
                onclick={() => { roleCreationType = 'template' }}
              >
                Clone từ Template
              </button>
              <button
                type="button"
                class="flex-1 py-1.5 rounded-md font-medium transition-colors
                  {roleCreationType === 'custom' ? 'bg-white shadow-sm text-slate-800' : 'text-muted-foreground hover:text-slate-700'}"
                onclick={() => { roleCreationType = 'custom' }}
              >
                Custom blank
              </button>
            </div>

            {#if roleCreationType === 'template'}
              <div class="space-y-1.5">
                <Label for="tpl-select">Chọn Template</Label>
                <select
                  id="tpl-select"
                  bind:value={selectedTemplateId}
                  class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                  required
                >
                  <option value="" disabled>— Chọn template —</option>
                  {#each templates as t (t.id)}
                    <option value={t.id}>{t.name} ({t.code})</option>
                  {/each}
                </select>
                {#if selectedTemplateId}
                  {@const tpl = templates.find((t) => t.id === selectedTemplateId)}
                  {#if tpl?.description}
                    <p class="text-xs text-muted-foreground">{tpl.description}</p>
                  {/if}
                {/if}
              </div>
            {:else}
              <div class="space-y-3">
                <div class="space-y-1.5">
                  <Label for="custom-code">Mã Role</Label>
                  <Input id="custom-code" bind:value={customCode} placeholder="vd: lead_backend_engineer" required />
                  <p class="text-xs text-muted-foreground">Không dấu cách, dùng underscore.</p>
                </div>
                <div class="space-y-1.5">
                  <Label for="custom-name">Tên hiển thị</Label>
                  <Input id="custom-name" bind:value={customName} placeholder="vd: Lead Backend Engineer" required />
                </div>
                <div class="space-y-1.5">
                  <Label for="custom-desc">Mô tả (tùy chọn)</Label>
                  <Textarea id="custom-desc" bind:value={customDescription} rows={2} placeholder="Mô tả vai trò..." />
                </div>
              </div>
            {/if}

            <div class="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onclick={() => { addRoleOpen = false; resetAddRole() }}>Hủy</Button>
              <Button type="submit" disabled={addingRole || (roleCreationType === 'template' && !selectedTemplateId) || (roleCreationType === 'custom' && (!customCode || !customName))}>
                {#if addingRole}<LoaderCircle class="h-4 w-4 animate-spin mr-1.5" />{/if}
                Tạo Role
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    {/if}
  </div>

  <!-- Roles grid -->
  {#if loading}
    <div class="flex items-center justify-center py-16 gap-2 text-muted-foreground">
      <LoaderCircle class="h-5 w-5 animate-spin" />
      <span class="text-sm">Đang tải...</span>
    </div>
  {:else if roles.length === 0}
    <div class="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
      <div class="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
        <UserCog class="h-5 w-5 text-muted-foreground" />
      </div>
      <p class="text-sm">Chưa cấu hình Professional Role nào.</p>
      <p class="text-xs">Tạo role để prefill skill requirements khi tạo task.</p>
    </div>
  {:else}
    <div class="grid grid-cols-1 xl:grid-cols-2 gap-5">
      {#each roles as role (role.id)}
        {@const completeness = roleCompleteness(role)}
        <div class="rounded-xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md {role.is_active ? '' : 'opacity-60'}">
          <!-- Role header -->
          <div class="px-5 pt-4 pb-3 border-b border-border">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <h4 class="font-semibold text-slate-800 leading-snug">{role.name}</h4>
                  <span class="inline-flex items-center px-2 py-0 rounded border text-[10px] font-mono font-semibold uppercase bg-slate-100 text-slate-600 border-slate-200">
                    {role.code}
                  </span>
                  {#if role.source_template_id}
                    <span class="inline-flex items-center gap-0.5 px-1.5 py-0 rounded text-[10px] font-medium bg-violet-50 text-violet-600 border border-violet-200">
                      <Copy class="h-2.5 w-2.5" />
                      Template
                    </span>
                  {/if}
                </div>
                {#if role.description}
                  <p class="text-xs text-muted-foreground mt-0.5 line-clamp-1">{role.description}</p>
                {/if}
              </div>
              {#if canEdit && role.is_active}
                <Button
                  size="sm"
                  variant="ghost"
                  onclick={() => handleDeactivateRole(role)}
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
                  <span>Cấu hình hoàn chỉnh</span>
                  <span class="font-mono font-semibold">{completeness}%</span>
                </div>
                <div class="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    class="h-full rounded-full transition-all duration-500
                      {completeness >= 80 ? 'bg-emerald-500' : completeness >= 50 ? 'bg-amber-500' : 'bg-slate-400'}"
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
                Skills ({role.skills.length})
              </span>
              <div class="flex items-center gap-1.5">
                {#if role.is_active}
                  <Button size="sm" variant="outline" onclick={() => openCandidates(role)} class="h-7 gap-1 px-2 text-xs text-indigo-600 hover:text-indigo-700">
                    <Users class="h-3 w-3" />
                    Ứng viên
                  </Button>
                {/if}
                {#if canEdit && role.is_active}
                  <Button size="sm" variant="outline" onclick={() => { openAddSkill(role.id); }} class="h-7 gap-1 px-2 text-xs">
                    <Plus class="h-3 w-3" />
                    Thêm Skill
                  </Button>
                {/if}
              </div>
            </div>

            {#if role.skills.length === 0}
              <p class="text-xs text-muted-foreground py-3 text-center">
                Role chưa có skill nào. Thêm skill để tạo yêu cầu năng lực.
              </p>
            {:else}
              <div class="space-y-1">
                {#each role.skills as rs (rs.id)}
                  <div class="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-slate-50 group transition-colors">
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-1.5 flex-wrap">
                        <span class="text-sm font-medium text-slate-700 truncate">
                          {rs.skill?.skill_name ?? 'Unknown'}
                        </span>
                        {#if rs.is_mandatory}
                          <span class="text-[9px] font-bold uppercase text-destructive tracking-wide">Bắt buộc</span>
                        {/if}
                        <span class="inline-flex items-center px-1.5 py-0 rounded text-[10px] font-medium border {importanceColors[rs.importance] ?? ''}">
                          {rs.importance}
                        </span>
                      </div>
                      <div class="flex items-center gap-1 mt-0.5">
                        <ProficiencyLevelBadge level={rs.minimum_level} size="xs" />
                        <span class="text-slate-300 text-xs">→</span>
                        <ProficiencyLevelBadge level={rs.target_level} size="xs" />
                        {#if rs.assessment_ceiling_level}
                          <span class="text-slate-300 text-xs">≤</span>
                          <ProficiencyLevelBadge level={rs.assessment_ceiling_level} size="xs" />
                        {/if}
                      </div>
                    </div>

                    {#if canEdit && role.is_active}
                      <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button
                          class="text-xs text-indigo-600 hover:text-indigo-800 font-semibold px-1"
                          onclick={() => { openEditSkill(role.id, rs); }}
                        >Sửa</button>
                        <button
                          class="text-xs text-destructive hover:text-destructive font-semibold px-1"
                          onclick={() => handleRemoveSkill(role.id, rs.id, rs.skill?.skill_name ?? '')}
                        >Xóa</button>
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

<!-- Add skill to role dialog -->
{#if addSkillOpen}
  <Dialog bind:open={addSkillOpen}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Thêm Skill vào Role</DialogTitle>
      </DialogHeader>
      <form onsubmit={handleAddSkill} class="space-y-4 pt-2">
        <div class="space-y-1.5">
          <Label for="rs-skill">Chọn Skill từ Catalog</Label>
          <select
            id="rs-skill"
            bind:value={selectedProjectSkillId}
            class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
            required
          >
            <option value="" disabled>— Chọn skill —</option>
            {#each activeProjectSkills as ps (ps.id)}
              <option value={ps.id}>{ps.skill.skill_name}</option>
            {/each}
          </select>
        </div>

        <LevelRangeSelector
          levels={proficiencyLevels}
          bind:minLevelId
          bind:targetLevelId
          bind:ceilingLevelId
        />

        <div class="grid grid-cols-2 gap-3">
          <div class="space-y-1.5">
            <Label for="rs-importance">Mức độ quan trọng</Label>
            <select
              id="rs-importance"
              bind:value={importance}
              class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          <div class="space-y-1.5">
            <Label for="rs-weight">Trọng số</Label>
            <Input id="rs-weight" type="number" step="0.1" min="0" bind:value={weight} />
          </div>
        </div>

        <div class="flex items-center gap-2">
          <input id="rs-mandatory" type="checkbox" bind:checked={isMandatory} class="h-4 w-4 rounded border-slate-300" />
          <label for="rs-mandatory" class="text-sm text-slate-700">
            Bắt buộc phải đạt level tối thiểu để nhận task
          </label>
        </div>

        <div class="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onclick={() => { addSkillOpen = false }}>Hủy</Button>
          <Button type="submit" disabled={!selectedProjectSkillId || addingSkill}>
            {#if addingSkill}<LoaderCircle class="h-4 w-4 animate-spin mr-1.5" />{/if}
            Thêm Skill
          </Button>
        </div>
      </form>
    </DialogContent>
  </Dialog>
{/if}

<!-- Edit skill in role dialog -->
{#if editSkillOpen}
  <Dialog bind:open={editSkillOpen}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Sửa cấu hình Skill trong Role</DialogTitle>
      </DialogHeader>
      <form onsubmit={handleSaveSkill} class="space-y-4 pt-2">
        <LevelRangeSelector
          levels={proficiencyLevels}
          bind:minLevelId={editMinLevelId}
          bind:targetLevelId={editTargetLevelId}
          bind:ceilingLevelId={editCeilingLevelId}
        />

        <div class="grid grid-cols-2 gap-3">
          <div class="space-y-1.5">
            <Label for="edit-importance">Mức độ quan trọng</Label>
            <select
              id="edit-importance"
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

        <div class="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onclick={() => { editSkillOpen = false }}>Hủy</Button>
          <Button type="submit" disabled={savingSkill}>
            {#if savingSkill}<LoaderCircle class="h-4 w-4 animate-spin mr-1.5" />{/if}
            Lưu thay đổi
          </Button>
        </div>
      </form>
    </DialogContent>
  </Dialog>
{/if}

<!-- Matching candidates dialog -->
{#if candidatesOpen}
  <Dialog bind:open={candidatesOpen}>
    <DialogContent class="max-w-2xl">
      <DialogHeader>
        <DialogTitle class="text-lg font-semibold text-slate-800">
          Ứng viên phù hợp cho vai trò: <span class="text-indigo-600">{matchingRoleName}</span>
        </DialogTitle>
      </DialogHeader>

      <div class="space-y-4 pt-2">
        {#if loadingCandidates}
          <div class="flex items-center justify-center py-12 gap-2 text-muted-foreground">
            <LoaderCircle class="h-5 w-5 animate-spin" />
            <span class="text-sm">Đang phân tích kỹ năng & tìm kiếm ứng viên...</span>
          </div>
        {:else if matchingCandidates.length === 0}
          <div class="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
            <div class="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
              <Users class="h-5 w-5 text-muted-foreground" />
            </div>
            <p class="text-sm">Không tìm thấy ứng viên nào có kỹ năng phù hợp trong tổ chức.</p>
            <p class="text-xs text-center px-4 text-slate-400">Đảm bảo các thành viên trong tổ chức đã cập nhật Hồ sơ Năng lực (Skills Profile) phù hợp với các kỹ năng yêu cầu của vai trò này.</p>
          </div>
        {:else}
          <div class="max-h-[400px] overflow-y-auto space-y-3 pr-1">
            {#each matchingCandidates as c}
              <div class="flex items-center justify-between gap-4 p-3 rounded-lg border border-border bg-white shadow-sm hover:border-slate-300 transition-colors">
                <div class="min-w-0 flex-1 space-y-1">
                  <div class="flex items-center gap-2">
                    <span class="font-semibold text-slate-800 text-sm">{c.username}</span>
                    <span class="text-xs text-slate-400 font-mono truncate">{c.email}</span>
                  </div>
                  <div class="flex items-center gap-3 text-xs text-muted-foreground">
                    <div class="flex items-center gap-1">
                      <span class="font-medium text-slate-700">Độ phù hợp:</span>
                      <span class="font-mono font-bold text-indigo-600">{c.match_score}%</span>
                    </div>
                    <span>•</span>
                    <div>Kỹ năng khớp: {c.matched_skills}/{c.total_required_skills}</div>
                  </div>
                  {#if c.skill_gaps.length > 0}
                    <div class="text-[11px] text-destructive flex items-center gap-1">
                      <CircleAlert class="h-3 w-3 shrink-0" />
                      <span>Còn thiếu: {c.skill_gaps.join(', ')}</span>
                    </div>
                  {/if}
                </div>

                <div class="shrink-0">
                  {#if c.source === 'project_member'}
                    <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <Check class="h-3.5 w-3.5" />
                      Đã trong dự án
                    </span>
                  {:else}
                    <Button
                      size="sm"
                      class="h-8 text-xs font-medium px-3 gap-1 bg-indigo-600 hover:bg-indigo-700 text-white"
                      onclick={() => handleStaffCandidate(c)}
                      disabled={staffingCandidateId === c.user_id}
                    >
                      {#if staffingCandidateId === c.user_id}
                        <LoaderCircle class="h-3 w-3 animate-spin" />
                      {/if}
                      Chọn & Thêm
                    </Button>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        {/if}

        <div class="flex justify-end pt-2 border-t border-border">
          <Button type="button" variant="outline" onclick={() => { candidatesOpen = false }}>Đóng</Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>
{/if}
