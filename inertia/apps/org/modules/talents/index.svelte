<script lang="ts">
  import { router } from '@inertiajs/svelte'
  import OrganizationLayout from '@/apps/org/shared/layouts/organization_layout.svelte'
  import OrgTalentsResultExplainabilitySummary from '@/apps/org/shared/components/org_talents_result_explainability_summary.svelte'
  import UnifiedCursorPagination from '@/apps/org/shared/ui/unified_cursor_pagination.svelte'
  import UnifiedOffsetPagination from '@/apps/org/shared/ui/unified_offset_pagination.svelte'
  import { useTranslation } from '@/apps/org/shared/stores/translation.svelte'
  import TalentCard from './components/talent_card.svelte'
  import TalentDirectoryFilterForm from './components/talent_directory_filter_form.svelte'
  import type { Talent, TalentDirectoryProps, TalentFilters } from './types'

  const { talents, filters, availableSkills, availableTasks, pagination }: TalentDirectoryProps = $props()
  const { t } = useTranslation()

  function initialFilter<T>(read: (value: TalentFilters) => T): T {
    return read(filters)
  }

  function toArray(value: string[] | string | null | undefined) {
    if (Array.isArray(value)) return value
    return value ? [value] : []
  }

  let formValues = $state({
    q: initialFilter((value) => value.q ?? ''),
    taskId: initialFilter((value) => value.task_id ?? ''),
    selectedCategories: initialFilter((value) => toArray(value.skill_categories)),
    selectedSkillIds: initialFilter((value) => toArray(value.skill_ids)),
    businessDomain: initialFilter((value) => value.business_domain ?? ''),
    taskType: initialFilter((value) => value.task_type ?? ''),
    problemCategory: initialFilter((value) => value.problem_category ?? ''),
    roleInTask: initialFilter((value) => value.role_in_task ?? ''),
    techStack: initialFilter((value) => value.tech_stack ?? ''),
    domainTags: initialFilter((value) => value.domain_tags ?? ''),
    sortBy: initialFilter((value) => value.sort_by ?? 'trust_score'),
    sortOrder: initialFilter((value) => value.sort_order ?? 'desc'),
    availableBefore: initialFilter((value) => value.available_before ?? ''),
    minProficiency: initialFilter((value) => value.min_proficiency ?? ''),
  })

  let expandedTalentId = $state<string | null>(null)

  const selectedTask = $derived(
    availableTasks.find((task) => task.id === (filters.task_id ?? '')) ?? null
  )
  const isTaskRankingMode = $derived(Boolean(filters.task_id))
  const usesLegacyFilters = $derived(
    Boolean(
      formValues.taskId ||
      formValues.selectedCategories.length ||
      formValues.roleInTask ||
      formValues.domainTags
    )
  )

  const paginationQuery = $derived(
    pagination.mode === 'offset'
      ? {
          q: filters.q,
          task_id: filters.task_id,
          skill_categories: filters.skill_categories,
          skill_ids: filters.skill_ids,
          business_domain: filters.business_domain,
          task_type: filters.task_type,
          problem_category: filters.problem_category,
          role_in_task: filters.role_in_task,
          tech_stack: filters.tech_stack,
          domain_tags: filters.domain_tags,
          sort_by: filters.sort_by,
          available_before: filters.available_before,
          min_proficiency: filters.min_proficiency,
        }
      : {
          q: filters.q,
          skill_ids: filters.skill_ids,
          per_page: pagination.perPage,
          business_domain: filters.business_domain,
          task_type: filters.task_type,
          problem_category: filters.problem_category,
          tech_stack: filters.tech_stack,
          sort_by: filters.sort_by,
          sort_order: filters.sort_order,
          available_before: filters.available_before,
          min_proficiency: filters.min_proficiency,
        }
  )

  function cursorHref(cursor: string | null | undefined) {
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(paginationQuery)) {
      if (value === undefined || value === null || value === '') continue
      params.set(key, Array.isArray(value) ? value.join(',') : String(value))
    }
    if (cursor) params.set('cursor', cursor)
    const query = params.toString()
    return query ? `/org/talents?${query}` : '/org/talents'
  }

  function toggleExplainability(talentId: string) {
    expandedTalentId = expandedTalentId === talentId ? null : talentId
  }

  function submitSearch() {
    const legacyPayload = {
      q: formValues.q.trim() || undefined,
      task_id: formValues.taskId || undefined,
      skill_categories: formValues.selectedCategories.length ? formValues.selectedCategories : undefined,
      skill_ids: formValues.selectedSkillIds.length ? formValues.selectedSkillIds : undefined,
      business_domain: formValues.businessDomain || undefined,
      task_type: formValues.taskType || undefined,
      problem_category: formValues.problemCategory || undefined,
      role_in_task: formValues.roleInTask || undefined,
      tech_stack: formValues.techStack.trim() || undefined,
      domain_tags: formValues.domainTags.trim() || undefined,
      sort_by: formValues.sortBy || undefined,
      sort_order: formValues.sortOrder || undefined,
      available_before: formValues.availableBefore || undefined,
      min_proficiency: formValues.minProficiency || undefined,
    }
    const canonicalPayload = {
      q: formValues.q.trim() || undefined,
      skill_ids: formValues.selectedSkillIds.length ? formValues.selectedSkillIds.join(',') : undefined,
      business_domain: formValues.businessDomain || undefined,
      task_type: formValues.taskType || undefined,
      problem_category: formValues.problemCategory || undefined,
      tech_stack: formValues.techStack.trim() || undefined,
      sort_by: formValues.sortBy === 'relevance' ? 'trust_score' : formValues.sortBy || undefined,
      sort_order: formValues.sortOrder || undefined,
      available_before: formValues.availableBefore || undefined,
      min_proficiency: formValues.minProficiency || undefined,
    }
    router.get('/org/talents', usesLegacyFilters ? legacyPayload : canonicalPayload, {
      preserveState: false,
      preserveScroll: true,
    })
  }

  async function saveTalent(talent: Talent) {
    const token = document.head.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
    await fetch(`/api/v1/me/organizations/current/talents/${talent.id}/bookmarks`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(token ? { 'X-CSRF-TOKEN': token } : {}),
      },
      body: JSON.stringify({ folder: 'Shortlist' }),
    })
    router.reload({ only: ['talents', 'stats', 'flash'] })
  }

  async function removeTalent(talent: Talent) {
    const token = document.head.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
    await fetch(`/api/v1/me/organizations/current/talents/${talent.id}/bookmarks`, {
      method: 'DELETE',
      headers: {
        Accept: 'application/json',
        ...(token ? { 'X-CSRF-TOKEN': token } : {}),
      },
    })
    router.reload({ only: ['talents', 'stats', 'flash'] })
  }
</script>

<OrganizationLayout title={t('workspace.talents.page_title', {}, 'Organization talent directory')}>
  <div class="space-y-6">
    <div>
      <p class="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
        {t('workspace.talents.eyebrow', {}, 'Talent discovery')}
      </p>
      <h1 class="mt-1 text-3xl font-black text-foreground">
        {t('workspace.talents.title', {}, 'Organization talent directory')}
      </h1>
    </div>

    <TalentDirectoryFilterForm
      bind:formValues
      {availableTasks}
      {availableSkills}
      onSubmit={submitSearch}
    />

    {#if talents.length > 0}
      <OrgTalentsResultExplainabilitySummary {talents} />
    {/if}

    {#if isTaskRankingMode && selectedTask}
      <section class="rounded-xl border border-border bg-background p-4">
        <p class="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
          {t('workspace.talents.ranking_context', {}, 'Ranking context')}
        </p>
        <h2 class="mt-1 text-lg font-black text-foreground">{selectedTask.title}</h2>
      </section>
    {:else if !isTaskRankingMode}
      <section class="rounded-xl border border-border bg-background p-4">
        <p class="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
          {t('workspace.talents.trust_only_mode', {}, 'Trust-only directory')}
        </p>
        <p class="mt-1 text-sm text-muted-foreground">
          {t('workspace.talents.trust_only_description', {}, 'Choose a task to compare skill, domain, delivery, and match score.')}
        </p>
      </section>
    {/if}

    <div class="grid gap-3">
      {#if talents.length === 0}
        <section data-testid="empty-state" class="rounded-xl border border-dashed border-border bg-background p-6 text-center">
          <h2 class="text-lg font-bold text-foreground">
            {t('workspace.talents.empty_title', {}, 'No talent found')}
          </h2>
          <p class="mt-1 text-sm text-muted-foreground">
            {t(
              'workspace.talents.empty_description',
              {},
              'Try another keyword, task, or skill filter.'
            )}
          </p>
        </section>
      {:else}
        {#each talents as talent (talent.id)}
          <TalentCard
            {talent}
            {isTaskRankingMode}
            isExpanded={expandedTalentId === talent.id}
            onToggleExplainability={() => toggleExplainability(talent.id)}
            onSave={saveTalent}
            onRemove={removeTalent}
          />
        {/each}
      {/if}
    </div>

    {#if pagination.mode === 'cursor'}
      <UnifiedCursorPagination
        {pagination}
        olderHref={cursorHref(pagination.cursor?.nextCursor)}
        newerHref={cursorHref(pagination.cursor?.previousCursor)}
        newestHref={cursorHref(null)}
      />
    {:else}
      <UnifiedOffsetPagination {pagination} baseUrl="/org/talents" queryParams={paginationQuery} />
    {/if}
  </div>
</OrganizationLayout>
