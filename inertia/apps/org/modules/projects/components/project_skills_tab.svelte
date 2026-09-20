<script lang="ts">
  import axios from 'axios'
  import { LoaderCircle, Plus, Settings, ToggleLeft, X } from 'lucide-svelte'

  import Button from '@/apps/org/shared/ui/button.svelte'
  import Input from '@/apps/org/shared/ui/input.svelte'
  import { confirmDialogStore } from '@/apps/org/shared/stores/confirm_dialog_store.svelte'
  import { useTranslation } from '@/apps/org/shared/stores/translation.svelte'
  import { uiToast } from '@/apps/org/shared/lib/ui_toast'
  import {
    categoryColors,
    categoryFilters,
    categoryLabelFallbacks,
    getErrorMessage,
    isCategoryFilter,
    levelRangeLabel,
    rubricLabel,
    statusLabelFallbacks,
    type ProficiencyLevel,
    type ProjectSkill,
    type ProjectSkillCategoryFilter,
    type ProjectSkillsTabProps,
    type Skill,
  } from '@/apps/shared/projects/project_skills_types'
  import ProjectSkillAddDialog from './project_skill_add_dialog.svelte'
  import ProjectSkillEditDialog from './project_skill_edit_dialog.svelte'

  const { projectId, canEdit }: ProjectSkillsTabProps = $props()
  const { t } = useTranslation()

  // State
  let projectSkills = $state<ProjectSkill[]>([])
  let globalSkills = $state<Skill[]>([])
  let proficiencyLevels = $state<ProficiencyLevel[]>([])
  let loading = $state(true)

  let addOpen = $state(false)
  let editOpen = $state(false)
  let editingSkill = $state<ProjectSkill | null>(null)

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

  function openEdit(ps: ProjectSkill) {
    editingSkill = ps
    editOpen = true
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
      <ProjectSkillAddDialog
        bind:open={addOpen}
        {projectId}
        {addableSkills}
        {proficiencyLevels}
        onAdded={fetchAll}
      />
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
            <th class="text-left px-4 py-2.5 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Khoảng level task</th>
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
                {levelRangeLabel(ps, proficiencyLevels)}
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
                      <Button size="sm" variant="outline" onclick={() => { openEdit(ps); }} class="h-7 gap-1 px-2 text-xs">
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
  <ProjectSkillEditDialog
    bind:open={editOpen}
    bind:editingSkill
    {projectId}
    {proficiencyLevels}
    onSaved={fetchAll}
  />
{/if}
