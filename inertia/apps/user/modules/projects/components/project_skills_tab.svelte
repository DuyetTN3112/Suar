  <script lang="ts">
  import axios from 'axios'
  import { LoaderCircle, Plus, Settings, ToggleLeft, X } from 'lucide-svelte'

  import Button from '@/apps/user/shared/ui/button.svelte'
  import Dialog from '@/apps/user/shared/ui/dialog.svelte'
  import DialogContent from '@/apps/user/shared/ui/dialog_content.svelte'
  import DialogHeader from '@/apps/user/shared/ui/dialog_header.svelte'
  import DialogTitle from '@/apps/user/shared/ui/dialog_title.svelte'
  import Input from '@/apps/user/shared/ui/input.svelte'
  import Label from '@/apps/user/shared/ui/label.svelte'
  import SkillSearchCombobox from '@/apps/user/modules/search/components/skill_search_combobox.svelte'
  import Textarea from '@/apps/user/shared/ui/textarea.svelte'
  import { confirmDialogStore } from '@/apps/user/shared/stores/confirm_dialog_store.svelte'
  import { useTranslation } from '@/apps/user/shared/stores/translation.svelte'
  import { uiToast } from '@/apps/user/shared/lib/ui_toast'

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
    isActive: boolean
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
  let loading = $state(true)

  let addOpen = $state(false)
  let selectedSkillId = $state('')
  let adding = $state(false)

  let editOpen = $state(false)
  let editingSkill = $state<ProjectSkill | null>(null)
  let displayNameOverride = $state('')
  let descriptionOverride = $state('')
  let saving = $state(false)

  let deactivating = $state<string | null>(null)

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
      const [skillsRes, globalRes] = await Promise.all([
        axios.get<{ data: ProjectSkill[] }>(`/api/v1/projects/${projectId}/skills`),
        axios.get<{ data: Skill[] }>('/api/v1/skills'),
      ])
      projectSkills = skillsRes.data.data
      globalSkills = globalRes.data.data
    } catch {
      uiToast.error(t('project.skills_tab.load_error', {}, 'Unable to load skill catalog'))
    } finally {
      loading = false
    }
  }

  const addableSkills = $derived(
    globalSkills.filter((gs) => !projectSkills.some((ps) => ps.skill.id === gs.id && ps.isActive))
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
    if (!selectedSkillId) return
    adding = true
    try {
      await axios.post(`/api/v1/projects/${projectId}/skills`, { skillId: selectedSkillId })
      uiToast.success(t('project.skills_tab.add_success', {}, 'Skill added to Catalog'))
      addOpen = false
      selectedSkillId = ''
      await fetchAll()
    } catch (error: unknown) {
      uiToast.error(getErrorMessage(error, t('project.skills_tab.add_error', {}, 'Unable to add skill')))
    } finally {
      adding = false
    }
  }

  function openEdit(ps: ProjectSkill) {
    editingSkill = ps
    displayNameOverride = ps.displayNameOverride ?? ''
    descriptionOverride = ps.descriptionOverride ?? ''
    editOpen = true
  }

  async function handleSaveOverrides(e: Event) {
    e.preventDefault()
    if (!editingSkill) return
    saving = true
    try {
      await axios.put(`/api/v1/projects/${projectId}/skills/${editingSkill.id}`, {
        displayNameOverride: displayNameOverride || null,
        descriptionOverride: descriptionOverride || null,
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
      <Dialog bind:open={addOpen}>
        <Button size="sm" onclick={() => { addOpen = true }} class="gap-1.5 shrink-0">
          <Plus class="h-4 w-4" />
          {t('project.skills_tab.add_skill', {}, 'Add Skill')}
        </Button>
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
                placeholder={t('project.skills_tab.select_skill_placeholder', {}, 'Search and choose a skill...')}
              />
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
              <Button type="submit" disabled={!selectedSkillId || adding}>
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
        <div class="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onclick={() => { editOpen = false; editingSkill = null }}>
            {t('project.skills_tab.cancel', {}, 'Cancel')}
          </Button>
          <Button type="submit" disabled={saving}>
            {#if saving}<LoaderCircle class="h-4 w-4 animate-spin mr-1.5" />{/if}
            {t('project.skills_tab.save_settings', {}, 'Save settings')}
          </Button>
        </div>
      </form>
    </DialogContent>
  </Dialog>
{/if}
