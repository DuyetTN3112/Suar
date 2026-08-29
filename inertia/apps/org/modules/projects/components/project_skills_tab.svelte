  <script lang="ts">
  import axios from 'axios'
  import { LoaderCircle, Plus, Settings, ToggleLeft, X } from 'lucide-svelte'

  import Button from '@/apps/org/shared/ui/button.svelte'
  import Dialog from '@/apps/org/shared/ui/dialog.svelte'
  import DialogContent from '@/apps/org/shared/ui/dialog_content.svelte'
  import DialogHeader from '@/apps/org/shared/ui/dialog_header.svelte'
  import DialogTitle from '@/apps/org/shared/ui/dialog_title.svelte'
  import Input from '@/apps/org/shared/ui/input.svelte'
  import Label from '@/apps/org/shared/ui/label.svelte'
  import SkillSearchCombobox from '@/apps/org/modules/search/components/skill_search_combobox.svelte'
  import Textarea from '@/apps/org/shared/ui/textarea.svelte'
  import { confirmDialogStore } from '@/apps/org/shared/stores/confirm_dialog_store.svelte'
  import { useTranslation } from '@/apps/org/shared/stores/translation.svelte'
  import { uiToast } from '@/apps/org/shared/lib/ui_toast'

  interface Skill {
    id: string
    skillName: string
    categoryCode?: string
    aliases?: string[]
  }

  interface ProjectSkill {
    id: string
    skill: Skill
    displayNameOverride: string | null
    descriptionOverride: string | null
    rubricVersionId: string | null
    minimumTaskRequirementLevelId: string | null
    maximumTaskRequirementLevelId: string | null
    isActive: boolean
  }

  interface RubricVersion {
    id: string
    version: number
    status: 'draft' | 'published'
    effective_to: string | null
  }

  interface ProficiencyLevel {
    id: string
    ordinal: number
    code: string
    displayName: string
  }

  interface Props {
    projectId: string
    canEdit: boolean
  }

  interface ApiErrorResponse {
    message?: string
  }

  type ProjectSkillCategoryFilter = 'all' | 'technology' | 'engineering' | 'soft_skill' | 'delivery'

  const categoryFilters: ProjectSkillCategoryFilter[] = [
    'all',
    'technology',
    'engineering',
    'soft_skill',
    'delivery',
  ]

  const categoryLabelFallbacks: Record<ProjectSkillCategoryFilter, string> = {
    all: 'All',
    technology: 'Technology',
    engineering: 'Software engineering',
    soft_skill: 'Soft skills',
    delivery: 'Delivery',
  }

  const statusLabelFallbacks: Record<'all' | 'active' | 'inactive', string> = {
    active: 'Active only',
    inactive: 'Inactive only',
    all: 'All statuses',
  }

  const { projectId, canEdit }: Props = $props()
  const { t } = useTranslation()

  // State
  let projectSkills = $state<ProjectSkill[]>([])
  let globalSkills = $state<Skill[]>([])
  let proficiencyLevels = $state<ProficiencyLevel[]>([])
  let loading = $state(true)

  let addOpen = $state(false)
  let selectedSkillId = $state('')
  let customSkillName = $state('')
  let customSkillCategory = $state<ProjectSkillCategoryFilter>('technology')
  let adding = $state(false)
  let addMinimumTaskRequirementLevelId = $state('')
  let addMaximumTaskRequirementLevelId = $state('')

  let editOpen = $state(false)
  let editingSkill = $state<ProjectSkill | null>(null)
  let displayNameOverride = $state('')
  let descriptionOverride = $state('')
  let editMinimumTaskRequirementLevelId = $state('')
  let editMaximumTaskRequirementLevelId = $state('')
  let editRubricVersionId = $state('')
  let rubricVersions = $state<RubricVersion[]>([])
  let rubricLoading = $state(false)
  let saving = $state(false)

  let deactivating = $state<string | null>(null)
  let activating = $state<string | null>(null)

  // Filter state
  let categoryFilter = $state<ProjectSkillCategoryFilter>('all')
  let statusFilter = $state<'all' | 'active' | 'inactive'>('active')
  let searchQuery = $state('')

  // Fetch on mount
  $effect(() => {
    void fetchAll()
  })

  async function fetchAll() {
    loading = true
    try {
      const [skillsRes, globalRes, scalesRes] = await Promise.all([
        axios.get<{ data: ProjectSkill[] }>(`/api/v1/projects/${projectId}/skills`),
        axios.get<{ data: Skill[] }>('/api/v1/skills'),
        axios.get<{ data: { levels?: ProficiencyLevel[] } }>('/api/v1/proficiency-scales'),
      ])
      projectSkills = skillsRes.data.data
      globalSkills = globalRes.data.data
      proficiencyLevels = scalesRes.data.data.levels ?? []
    } catch {
      uiToast.error(t('project.skills_tab.load_error', {}, 'Unable to load skill catalog'))
    } finally {
      loading = false
    }
  }

  const addableSkills = $derived(
    globalSkills.filter((gs) => !projectSkills.some((ps) => ps.skill.id === gs.id))
  )

  const filtered = $derived(
    projectSkills.filter((ps) => {
      if (statusFilter === 'active' && !ps.isActive) return false
      if (statusFilter === 'inactive' && ps.isActive) return false
      if (categoryFilter !== 'all' && ps.skill.categoryCode !== categoryFilter) return false
      if (searchQuery && !ps.skill.skillName.toLowerCase().includes(searchQuery.toLowerCase())) return false
      return true
    })
  )

  const categoryColors: Record<string, string> = {
    technology: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/30',
    engineering: 'bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/30',
    soft_skill: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30',
    delivery: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30',
  }

  function isCategoryFilter(category: string): category is ProjectSkillCategoryFilter {
    return categoryFilters.includes(category as ProjectSkillCategoryFilter)
  }

  function categoryLabel(category: string | undefined): string {
    if (!category) {
      return t('project.skills_tab.category.none', {}, 'Uncategorized')
    }

    if (isCategoryFilter(category)) {
      return t(
        `project.skills_tab.category.${category}`,
        {},
        categoryLabelFallbacks[category]
      )
    }

    return category
  }

  function statusLabel(status: 'all' | 'active' | 'inactive'): string {
    return t(
      `project.skills_tab.status_filter.${status}`,
      {},
      statusLabelFallbacks[status]
    )
  }

  function getErrorMessage(error: unknown, fallback: string): string {
    if (axios.isAxiosError<ApiErrorResponse>(error)) {
      return error.response ? (error.response.data.message ?? fallback) : fallback
    }

    return fallback
  }

  async function handleAdd(e: Event) {
    e.preventDefault()
    const isCustomSkill = customSkillName.trim().length > 0
    if (
      (!selectedSkillId && !isCustomSkill) ||
      !addMinimumTaskRequirementLevelId ||
      !addMaximumTaskRequirementLevelId
    ) {
      return
    }
    adding = true
    try {
      if (isCustomSkill) {
        await axios.post(`/api/v1/projects/${projectId}/skills/custom`, {
          name: customSkillName.trim(),
          categoryCode: customSkillCategory,
          minimumTaskRequirementLevelId: addMinimumTaskRequirementLevelId,
          maximumTaskRequirementLevelId: addMaximumTaskRequirementLevelId,
        })
      } else {
        await axios.post(`/api/v1/projects/${projectId}/skills`, {
          skillId: selectedSkillId,
          minimumTaskRequirementLevelId: addMinimumTaskRequirementLevelId,
          maximumTaskRequirementLevelId: addMaximumTaskRequirementLevelId,
        })
      }
      uiToast.success(t('project.skills_tab.add_success', {}, 'Skill added to Catalog'))
      addOpen = false
      selectedSkillId = ''
      customSkillName = ''
      customSkillCategory = 'technology'
      addMinimumTaskRequirementLevelId = ''
      addMaximumTaskRequirementLevelId = ''
      await fetchAll()
    } catch (error: unknown) {
      uiToast.error(getErrorMessage(error, t('project.skills_tab.add_error', {}, 'Unable to add skill')))
    } finally {
      adding = false
    }
  }

  async function openEdit(ps: ProjectSkill) {
    editingSkill = ps
    displayNameOverride = ps.displayNameOverride ?? ''
    descriptionOverride = ps.descriptionOverride ?? ''
    editRubricVersionId = ps.rubricVersionId ?? ''
    editMinimumTaskRequirementLevelId = ps.minimumTaskRequirementLevelId ?? ''
    editMaximumTaskRequirementLevelId = ps.maximumTaskRequirementLevelId ?? ''
    rubricVersions = []
    editOpen = true

    rubricLoading = true
    try {
      const response = await axios.get<{ data: RubricVersion[] }>(
        `/api/v1/skills/${ps.skill.id}/rubrics`
      )
      rubricVersions = response.data.data.filter(
        (version) => version.status === 'published' && version.effective_to === null
      )
    } catch (error: unknown) {
      uiToast.error(
        getErrorMessage(
          error,
          'Không tải được rubric global của skill này. Hãy publish rubric trước.'
        )
      )
    } finally {
      rubricLoading = false
    }
  }

  async function handleSaveOverrides(e: Event) {
    e.preventDefault()
    if (!editingSkill) return
    saving = true
    try {
      await axios.put(`/api/v1/projects/${projectId}/skills/${editingSkill.id}`, {
        displayNameOverride: displayNameOverride || null,
        descriptionOverride: descriptionOverride || null,
        rubricVersionId: editRubricVersionId || null,
        minimumTaskRequirementLevelId: editMinimumTaskRequirementLevelId || null,
        maximumTaskRequirementLevelId: editMaximumTaskRequirementLevelId || null,
      })
      uiToast.success(t('project.skills_tab.save_success', {}, 'Skill settings updated'))
      editOpen = false
      editingSkill = null
      await fetchAll()
    } catch (error: unknown) {
      uiToast.error(getErrorMessage(error, t('project.skills_tab.save_error', {}, 'Unable to save skill settings')))
    } finally {
      saving = false
    }
  }

  function levelLabel(levelId: string | null): string {
    const level = proficiencyLevels.find((item) => item.id === levelId)
    return level ? level.code.toUpperCase() : 'Chưa cấu hình'
  }

  function levelRangeLabel(projectSkill: ProjectSkill): string {
    if (
      !projectSkill.minimumTaskRequirementLevelId ||
      !projectSkill.maximumTaskRequirementLevelId
    ) {
      return 'Chưa cấu hình'
    }
    return `${levelLabel(projectSkill.minimumTaskRequirementLevelId)}–${levelLabel(projectSkill.maximumTaskRequirementLevelId)}`
  }

  function rubricLabel(projectSkill: ProjectSkill): string {
    return projectSkill.rubricVersionId ? 'Đã gắn' : 'Chưa gắn'
  }

  function isValidRange(minimumLevelId: string, maximumLevelId: string): boolean {
    const minimum = proficiencyLevels.find((level) => level.id === minimumLevelId)
    const maximum = proficiencyLevels.find((level) => level.id === maximumLevelId)
    return Boolean(minimum && maximum && minimum.ordinal <= maximum.ordinal)
  }

  async function handleDeactivate(ps: ProjectSkill) {
    const confirmed = await confirmDialogStore.request({
      title: t('project.skills_tab.deactivate_title', {}, 'Turn off skill from Catalog'),
      desc: t(
        'project.skills_tab.deactivate_desc',
        { skill: ps.skill.skillName },
        `Turn off "${ps.skill.skillName}" from Catalog? This skill will not be available for new tasks.`
      ),
      confirmText: t('project.skills_tab.deactivate_confirm', {}, 'Turn off skill'),
      cancelBtnText: t('project.skills_tab.cancel', {}, 'Cancel'),
      destructive: true,
    })
    if (!confirmed) return
    deactivating = ps.id
    try {
      await axios.delete(`/api/v1/projects/${projectId}/skills/${ps.id}`)
      uiToast.success(t('project.skills_tab.deactivate_success', {}, 'Skill turned off from Catalog'))
      await fetchAll()
    } catch (error: unknown) {
      uiToast.error(getErrorMessage(error, t('project.skills_tab.deactivate_error', {}, 'Unable to turn off skill')))
    } finally {
      deactivating = null
    }
  }

  async function handleActivate(ps: ProjectSkill) {
    activating = ps.id
    try {
      await axios.put(`/api/v1/projects/${projectId}/skills/${ps.id}`, { isActive: true })
      uiToast.success(t('project.skills_tab.activate_success', {}, 'Skill turned on in Catalog'))
      await fetchAll()
    } catch (error: unknown) {
      uiToast.error(getErrorMessage(error, t('project.skills_tab.activate_error', {}, 'Unable to turn on skill')))
    } finally {
      activating = null
    }
  }
</script>

<div class="space-y-4" data-demo-section="project-skills-catalog">
  <!-- Header row -->
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
    <div class="flex items-center gap-2 flex-wrap">
      <!-- Search -->
      <Input
        type="search"
        placeholder={t('project.skills_tab.search_placeholder', {}, 'Search skills...')}
        bind:value={searchQuery}
        class="h-8 w-48 text-sm"
      />

      <!-- Category filter -->
      <div class="flex p-0.5 rounded-lg border border-border bg-secondary text-xs">
        {#each categoryFilters as cat (cat)}
          <button
            class="px-2.5 py-1 rounded-md font-medium transition-colors
              {categoryFilter === cat ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground hover:text-foreground'}"
            onclick={() => { categoryFilter = cat }}
          >
            {categoryLabel(cat)}
          </button>
        {/each}
      </div>

      <!-- Status filter -->
      <select
        bind:value={statusFilter}
        class="h-8 rounded-md border border-input bg-background px-2 text-xs"
      >
        <option value="active">{statusLabel('active')}</option>
        <option value="inactive">{statusLabel('inactive')}</option>
        <option value="all">{statusLabel('all')}</option>
      </select>
    </div>

    {#if canEdit}
      <Button size="sm" onclick={() => { addOpen = true }} class="gap-1.5 shrink-0">
        <Plus class="h-4 w-4" />
        {t('project.skills_tab.add_skill', {}, 'Add Skill')}
      </Button>
      <Dialog bind:open={addOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('project.skills_tab.add_title', {}, 'Add Skill to Catalog')}</DialogTitle>
          </DialogHeader>
          <form onsubmit={handleAdd} class="space-y-4 pt-2">
            <div class="space-y-2">
              <Label>{t('project.skills_tab.select_skill', {}, 'Choose Skill')}</Label>
              <SkillSearchCombobox
                skills={addableSkills}
                bind:value={selectedSkillId}
                onSelect={() => { customSkillName = '' }}
                placeholder={t('project.skills_tab.select_skill_placeholder', {}, 'Search and choose a skill...')}
              />
              <div class="grid grid-cols-[1fr_auto] items-end gap-2">
                <div class="space-y-1.5">
                  <Label for="ps-add-custom-name">Hoặc tạo skill mới</Label>
                  <Input
                    id="ps-add-custom-name"
                    bind:value={customSkillName}
                    oninput={() => { selectedSkillId = '' }}
                    placeholder="Nhập tên skill chưa có trong catalog"
                  />
                </div>
                <select
                  aria-label="Nhóm skill mới"
                  bind:value={customSkillCategory}
                  class="flex h-9 rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                >
                  <option value="technology">Công nghệ</option>
                  <option value="engineering">Kỹ thuật phần mềm</option>
                  <option value="soft_skill">Kỹ năng mềm</option>
                  <option value="delivery">Quản lý công việc</option>
                </select>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div class="space-y-1.5">
                  <Label for="ps-add-minimum">Mức task thấp nhất</Label>
                  <select
                    id="ps-add-minimum"
                    bind:value={addMinimumTaskRequirementLevelId}
                    class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                    required
                  >
                    <option value="" disabled>Chọn level</option>
                    {#each proficiencyLevels as level (level.id)}
                      <option value={level.id}>{level.code.toUpperCase()} · {level.displayName}</option>
                    {/each}
                  </select>
                </div>
                <div class="space-y-1.5">
                  <Label for="ps-add-maximum">Mức task cao nhất</Label>
                  <select
                    id="ps-add-maximum"
                    bind:value={addMaximumTaskRequirementLevelId}
                    class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                    required
                  >
                    <option value="" disabled>Chọn level</option>
                    {#each proficiencyLevels as level (level.id)}
                      <option value={level.id}>{level.code.toUpperCase()} · {level.displayName}</option>
                    {/each}
                  </select>
                </div>
              </div>
              <p class="text-xs text-muted-foreground">
                Đây là khoảng level Task được phép yêu cầu; không phải trần năng lực của người làm hay AI.
              </p>
              {#if addableSkills.length === 0}
                <p class="text-xs text-muted-foreground">
                  {t('project.skills_tab.all_skills_added', {}, 'All skills are already in the Catalog.')}
                </p>
              {/if}
            </div>
            <div class="flex justify-end gap-2">
              <Button type="button" variant="outline" onclick={() => { addOpen = false }}>
                {t('project.skills_tab.cancel', {}, 'Cancel')}
              </Button>
              <Button
                type="submit"
                disabled={
                  (!selectedSkillId && !customSkillName.trim()) ||
                  !isValidRange(
                    addMinimumTaskRequirementLevelId,
                    addMaximumTaskRequirementLevelId
                  ) ||
                  adding
                }
              >
                {#if adding}<LoaderCircle class="h-4 w-4 animate-spin mr-1.5" />{/if}
                {t('project.skills_tab.add_to_catalog', {}, 'Add to Catalog')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    {/if}
  </div>

  <!-- Table -->
  {#if loading}
    <div class="flex items-center justify-center py-16 text-muted-foreground gap-2">
      <LoaderCircle class="h-5 w-5 animate-spin" />
      <span class="text-sm">{t('project.skills_tab.loading', {}, 'Loading...')}</span>
    </div>
  {:else if filtered.length === 0}
    <div class="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
      <div class="h-10 w-10 rounded-full bg-secondary flex items-center justify-center">
        <ToggleLeft class="h-5 w-5 text-muted-foreground" />
      </div>
      <p class="text-sm">
        {searchQuery || categoryFilter !== 'all'
          ? t('project.skills_tab.empty_filtered', {}, 'No skills match the filters')
          : t('project.skills_tab.empty', {}, 'No skills yet.')}
      </p>
    </div>
  {:else}
    <div class="rounded-lg border border-border overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-secondary/40 border-b border-border">
          <tr>
            <th class="text-left px-4 py-2.5 font-semibold text-muted-foreground text-xs uppercase tracking-wide">{t('project.skills_tab.header_skill', {}, 'Skill')}</th>
            <th class="text-left px-4 py-2.5 font-semibold text-muted-foreground text-xs uppercase tracking-wide">{t('project.skills_tab.header_category', {}, 'Category')}</th>
            <th class="text-left px-4 py-2.5 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Khoảng level Task</th>
            <th class="text-left px-4 py-2.5 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Rubric</th>
            <th class="text-left px-4 py-2.5 font-semibold text-muted-foreground text-xs uppercase tracking-wide hidden md:table-cell">{t('project.skills_tab.header_custom_name', {}, 'Custom name')}</th>
            <th class="text-left px-4 py-2.5 font-semibold text-muted-foreground text-xs uppercase tracking-wide">{t('project.skills_tab.header_status', {}, 'Status')}</th>
            {#if canEdit}
              <th class="text-right px-4 py-2.5 font-semibold text-muted-foreground text-xs uppercase tracking-wide">{t('project.skills_tab.header_actions', {}, 'Actions')}</th>
            {/if}
          </tr>
        </thead>
        <tbody class="divide-y divide-border">
          {#each filtered as ps (ps.id)}
            <tr class="hover:bg-muted/50 transition-colors {ps.isActive ? '' : 'opacity-50'}">
              <td class="px-4 py-3 font-medium text-foreground">
                {ps.skill.skillName}
              </td>
              <td class="px-4 py-3">
                {#if ps.skill.categoryCode}
                  <span class="inline-flex items-center px-2 py-0.5 rounded border text-xs font-semibold {categoryColors[ps.skill.categoryCode] ?? 'bg-muted text-muted-foreground border-border'}">
                    {categoryLabel(ps.skill.categoryCode)}
                  </span>
                {:else}
                  <span class="text-muted-foreground text-xs">—</span>
                {/if}
              </td>
              <td class="px-4 py-3 text-xs font-semibold text-foreground">
                {levelRangeLabel(ps)}
              </td>
              <td class="px-4 py-3 text-xs font-semibold {ps.rubricVersionId ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'}">
                {rubricLabel(ps)}
              </td>
              <td class="px-4 py-3 text-muted-foreground hidden md:table-cell max-w-48 truncate">
                {ps.displayNameOverride ?? '—'}
              </td>
              <td class="px-4 py-3">
                {#if ps.isActive}
                  <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-medium bg-primary/10 text-foreground border-primary/20 shadow-suar-xs">
                    {t('project.skills_tab.status.active', {}, 'Active')}
                  </span>
                {:else}
                  <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-medium bg-secondary text-muted-foreground border-border shadow-suar-xs">
                    {t('project.skills_tab.status.inactive', {}, 'Inactive')}
                  </span>
                {/if}
              </td>
              {#if canEdit}
                <td class="px-4 py-3 text-right">
                  <div class="flex items-center justify-end gap-1.5">
                    {#if ps.isActive}
                      <Button size="sm" variant="outline" onclick={() => { void openEdit(ps); }} class="h-7 gap-1 px-2 text-xs">
                        <Settings class="h-3.5 w-3.5" />
                        {t('project.skills_tab.configure', {}, 'Configure')}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onclick={() => { void handleDeactivate(ps) }}
                        disabled={deactivating === ps.id}
                        class="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-destructive"
                      >
                        {#if deactivating === ps.id}
                          <LoaderCircle class="h-3.5 w-3.5 animate-spin" />
                        {:else}
                          <X class="h-3.5 w-3.5" />
                        {/if}
                        {t('project.skills_tab.deactivate_short', {}, 'Off')}
                      </Button>
                    {:else}
                      <Button
                        size="sm"
                        variant="outline"
                        onclick={() => { void handleActivate(ps) }}
                        disabled={activating === ps.id}
                        class="h-7 gap-1 px-2 text-xs"
                      >
                        {#if activating === ps.id}<LoaderCircle class="h-3.5 w-3.5 animate-spin" />{/if}
                        {t('project.skills_tab.activate_short', {}, 'Bật lại')}
                      </Button>
                    {/if}
                  </div>
                </td>
              {/if}
            </tr>
          {/each}
        </tbody>
      </table>
      <div class="px-4 py-2.5 bg-secondary/40 border-t border-border text-xs text-muted-foreground">
        {t('project.skills_tab.counter', { shown: filtered.length, total: projectSkills.length }, `${filtered.length} / ${projectSkills.length} skills`)}
      </div>
    </div>
  {/if}
</div>

<!-- Edit overrides dialog -->
{#if editOpen && editingSkill}
  <Dialog bind:open={editOpen}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{t('project.skills_tab.edit_title', { skill: editingSkill.skill.skillName }, `Configure: ${editingSkill.skill.skillName}`)}</DialogTitle>
      </DialogHeader>
      <form onsubmit={handleSaveOverrides} class="space-y-4 pt-2">
        <div class="space-y-1.5">
          <Label for="ps-display-name">{t('project.skills_tab.display_name_label', {}, 'Custom display name')}</Label>
          <Input
            id="ps-display-name"
            bind:value={displayNameOverride}
            placeholder={editingSkill.skill.skillName}
          />
        </div>
        <div class="space-y-1.5">
          <Label for="ps-description">{t('project.skills_tab.description_label', {}, 'Custom description')}</Label>
          <Textarea
            id="ps-description"
            bind:value={descriptionOverride}
            rows={3}
            placeholder={t('project.skills_tab.description_placeholder', {}, 'Describe this skill in this project context...')}
          />
        </div>
        <div class="space-y-1.5">
          <Label for="ps-rubric">Rubric global dùng cho task</Label>
          <select
            id="ps-rubric"
            bind:value={editRubricVersionId}
            disabled={rubricLoading}
            class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
          >
            <option value="">Chưa gắn rubric</option>
            {#each rubricVersions as rubric (rubric.id)}
              <option value={rubric.id}>Rubric v{rubric.version} · đã publish</option>
            {/each}
          </select>
          {#if rubricLoading}
            <p class="text-xs text-muted-foreground">Đang tải rubric global...</p>
          {:else if rubricVersions.length === 0}
            <p class="text-xs text-amber-700 dark:text-amber-300">
              Skill này chưa có rubric published. Skill vẫn có thể nằm trong Project, nhưng chưa dùng để giao task được.
            </p>
          {:else}
            <p class="text-xs text-muted-foreground">
              Chỉ rubric published đang hiệu lực mới được gắn vào Project Skill.
            </p>
          {/if}
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div class="space-y-1.5">
            <Label for="ps-edit-minimum">Mức task thấp nhất</Label>
            <select
              id="ps-edit-minimum"
              bind:value={editMinimumTaskRequirementLevelId}
              class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
              required
            >
              <option value="" disabled>Chọn level</option>
              {#each proficiencyLevels as level (level.id)}
                <option value={level.id}>{level.code.toUpperCase()} · {level.displayName}</option>
              {/each}
            </select>
          </div>
          <div class="space-y-1.5">
            <Label for="ps-edit-maximum">Mức task cao nhất</Label>
            <select
              id="ps-edit-maximum"
              bind:value={editMaximumTaskRequirementLevelId}
              class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
              required
            >
              <option value="" disabled>Chọn level</option>
              {#each proficiencyLevels as level (level.id)}
                <option value={level.id}>{level.code.toUpperCase()} · {level.displayName}</option>
              {/each}
            </select>
          </div>
        </div>
        <p class="text-xs text-muted-foreground">
          Task chỉ được chọn mức tối thiểu trong khoảng này. Người đạt mức cao hơn vẫn đủ điều kiện.
        </p>
        <div class="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onclick={() => { editOpen = false; editingSkill = null }}>
            {t('project.skills_tab.cancel', {}, 'Cancel')}
          </Button>
          <Button
            type="submit"
            disabled={
              saving ||
              !isValidRange(editMinimumTaskRequirementLevelId, editMaximumTaskRequirementLevelId)
            }
          >
            {#if saving}<LoaderCircle class="h-4 w-4 animate-spin mr-1.5" />{/if}
            {t('project.skills_tab.save_settings', {}, 'Save settings')}
          </Button>
        </div>
      </form>
    </DialogContent>
  </Dialog>
{/if}
