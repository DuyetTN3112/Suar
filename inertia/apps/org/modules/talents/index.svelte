<script lang="ts">
  import { router } from '@inertiajs/svelte'
  import OrganizationLayout from '@/apps/org/shared/layouts/organization_layout.svelte'
  import OrgTalentsResultExplainabilitySummary from '@/apps/org/shared/components/org_talents_result_explainability_summary.svelte'
  import UnifiedCursorPagination from '@/apps/org/shared/ui/unified_cursor_pagination.svelte'
  import UnifiedOffsetPagination from '@/apps/org/shared/ui/unified_offset_pagination.svelte'
  import type { PagePagination } from '@/apps/org/shared/lib/pagination'
  import { useTranslation } from '@/apps/org/shared/stores/translation.svelte'
  import {
    formatTalentConfidenceLabel,
    formatTalentCoverageLabel,
    formatTalentGovernanceLabel,
  } from './talent_explainability'

  interface Talent {
    id: string
    username: string
    status?: string
    match_score?: number | null
    skill_match?: number | null
    domain_match?: number | null
    delivery_reliability?: number | null
    trust_score?: number | null
    explanations?: string[]
    risks?: string[]
    reviewed_skills_count?: number
    imported_skills_count?: number
    under_dispute_skills_count?: number
    latest_confidence_signal?: 'low' | 'medium' | 'high' | null
    public_accomplishments?: {
      title: string
      concise_statement: string
      action: string
      object: string
      role: string | null
      ownership_level: string
      verification_status: 'verified' | 'partially_verified'
      confidence_band: 'low' | 'medium' | 'high'
      published_at: string
    }[]
    bookmark?: {
      id: string | null
      isSaved: boolean
      notes?: string | null
      folder?: string | null
      rating?: number | null
    }
  }

  interface SkillOption {
    id: string
    skill_name: string
    category_code: string
  }

  interface TaskOption {
    id: string
    title: string
  }

  interface Filters {
    q?: string | null
    task_id?: string | null
    skill_categories?: string[] | string | null
    skill_ids?: string[] | string | null
    business_domain?: string | null
    task_type?: string | null
    problem_category?: string | null
    role_in_task?: string | null
    tech_stack?: string | null
    domain_tags?: string | null
    sort_by?: string | null
    sort_order?: string | null
    saved?: string | null
    min_trust_score?: string | null
    min_completed_tasks?: string | null
    available_before?: string | null
    min_proficiency?: string | null
  }

  interface Props {
    talents: Talent[]
    filters: Filters
    availableSkills: SkillOption[]
    availableTasks: TaskOption[]
    stats?: { total?: number; saved?: number }
    pagination: PagePagination
    search?: { scope?: string; rankingVersion?: string; normalizedQuery?: string }
    authority?: { total?: { state?: string } }
  }

  const { talents, filters, availableSkills, availableTasks, pagination }: Props = $props()
  const { t } = useTranslation()

  function initialFilter<T>(read: (value: Filters) => T): T {
    return read(filters)
  }

  let q = $state(initialFilter((value) => value.q ?? ''))
  let taskId = $state(initialFilter((value) => value.task_id ?? ''))
  let selectedCategories = $state<string[]>(initialFilter((value) => toArray(value.skill_categories)))
  let selectedSkillIds = $state<string[]>(initialFilter((value) => toArray(value.skill_ids)))
  let businessDomain = $state(initialFilter((value) => value.business_domain ?? ''))
  let taskType = $state(initialFilter((value) => value.task_type ?? ''))
  let problemCategory = $state(initialFilter((value) => value.problem_category ?? ''))
  let roleInTask = $state(initialFilter((value) => value.role_in_task ?? ''))
  let techStack = $state(initialFilter((value) => value.tech_stack ?? ''))
  let domainTags = $state(initialFilter((value) => value.domain_tags ?? ''))
  let sortBy = $state(initialFilter((value) => value.sort_by ?? 'trust_score'))
  let sortOrder = $state(initialFilter((value) => value.sort_order ?? 'desc'))
  let availableBefore = $state(initialFilter((value) => value.available_before ?? ''))
  let minProficiency = $state(initialFilter((value) => value.min_proficiency ?? ''))
  const proficiencyLevels = Array.from({ length: 15 }, (_, index) => `l${index}`)
  let expandedTalentId = $state<string | null>(null)

  const taxonomy = {
    businessDomains: ['Fintech', 'Gaming', 'Healthcare', 'Education'],
    taskTypes: ['API design', 'System integration', 'QA testing', 'Feature development'],
    problemCategories: ['Compliance', 'Reliability', 'Performance', 'Security'],
  }

  const categoryLabels: Record<string, string> = {
    technology: 'Technology',
    engineering: 'Engineering',
    delivery: 'Delivery',
    soft_skill: 'Soft Skills',
  }

  const filteredSkills = $derived(
    selectedCategories.length === 0
      ? availableSkills
      : availableSkills.filter((skill) => selectedCategories.includes(skill.category_code))
  )
  const selectedTask = $derived(availableTasks.find((task) => task.id === (filters.task_id ?? '')) ?? null)
  const isTaskRankingMode = $derived(Boolean(filters.task_id))
  const usesLegacyFilters = $derived(
    Boolean(taskId || selectedCategories.length || roleInTask || domainTags)
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

  function toArray(value: string[] | string | null | undefined) {
    if (Array.isArray(value)) return value
    return value ? [value] : []
  }

  function clampPercent(value: number | null | undefined) {
    if (typeof value !== 'number' || !Number.isFinite(value)) return 0
    return Math.min(100, Math.max(0, Math.round(value)))
  }

  function toggleExplainability(talentId: string) {
    expandedTalentId = expandedTalentId === talentId ? null : talentId
  }

  function hasTaskMatch(talent: Talent) {
    return typeof talent.match_score === 'number'
  }

  function explainabilityMetrics(talent: Talent) {
    return [
      {
        label: t('workspace.talents.metrics.skill', {}, 'Skill'),
        value: clampPercent(talent.skill_match),
        weight: '0.4',
      },
      {
        label: t('workspace.talents.metrics.domain', {}, 'Domain'),
        value: clampPercent(talent.domain_match),
        weight: '0.2',
      },
      {
        label: t('workspace.talents.metrics.delivery', {}, 'On time'),
        value: clampPercent(talent.delivery_reliability),
        weight: '0.2',
      },
      {
        label: t('workspace.talents.metrics.trust', {}, 'Trust'),
        value: clampPercent(talent.trust_score),
        weight: '0.2',
      },
    ]
  }

  function submitSearch() {
    const legacyPayload = {
      q: q.trim() || undefined,
      task_id: taskId || undefined,
      skill_categories: selectedCategories.length ? selectedCategories : undefined,
      skill_ids: selectedSkillIds.length ? selectedSkillIds : undefined,
      business_domain: businessDomain || undefined,
      task_type: taskType || undefined,
      problem_category: problemCategory || undefined,
      role_in_task: roleInTask || undefined,
      tech_stack: techStack.trim() || undefined,
      domain_tags: domainTags.trim() || undefined,
      sort_by: sortBy || undefined,
      sort_order: sortOrder || undefined,
      available_before: availableBefore || undefined,
      min_proficiency: minProficiency || undefined,
    }
    const canonicalPayload = {
      q: q.trim() || undefined,
      skill_ids: selectedSkillIds.length ? selectedSkillIds.join(',') : undefined,
      business_domain: businessDomain || undefined,
      task_type: taskType || undefined,
      problem_category: problemCategory || undefined,
      tech_stack: techStack.trim() || undefined,
      sort_by: sortBy === 'relevance' ? 'trust_score' : sortBy || undefined,
      sort_order: sortOrder || undefined,
      available_before: availableBefore || undefined,
      min_proficiency: minProficiency || undefined,
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

  function toggleCategory(category: string) {
    selectedCategories = selectedCategories.includes(category)
      ? selectedCategories.filter((item) => item !== category)
      : [...selectedCategories, category]
    selectedSkillIds = []
  }

  function toggleSkill(skillId: string) {
    selectedSkillIds = selectedSkillIds.includes(skillId)
      ? selectedSkillIds.filter((item) => item !== skillId)
      : [...selectedSkillIds, skillId]
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

    <form class="grid items-end gap-3 rounded-xl border border-border bg-background p-4 md:grid-cols-3 xl:grid-cols-4" onsubmit={(event) => { event.preventDefault(); submitSearch() }}>
      <input
        data-testid="talent-search-keyword"
        class="h-10 rounded-xl border border-border px-3 py-2 text-sm"
        bind:value={q}
        placeholder={t('workspace.talents.search_placeholder', {}, 'Search talent')}
      />
      <select data-testid="talent-search-task" class="h-10 rounded-xl border border-border px-3 py-2 text-sm" bind:value={taskId}>
        <option value="">{t('workspace.talents.choose_task', {}, 'Choose task')}</option>
        {#each availableTasks as task (task.id)}
          <option value={task.id}>{task.title}</option>
        {/each}
      </select>
      <select data-testid="talent-sort-by" class="h-10 rounded-xl border border-border px-3 py-2 text-sm" bind:value={sortBy}>
        <option value="relevance">
          {t('workspace.talents.sort.relevance', {}, 'Relevance')}
        </option>
        <option value="trust_score">
          {t('workspace.talents.sort.trust_score', {}, 'Trust score')}
        </option>
        <option value="completed_tasks">
          {t('workspace.talents.sort.completed_tasks', {}, 'Completed tasks')}
        </option>
      </select>
      <select data-testid="talent-sort-order" class="h-10 rounded-xl border border-border px-3 py-2 text-sm" bind:value={sortOrder}>
        <option value="desc">
          {t('workspace.talents.sort.desc', {}, 'Descending')}
        </option>
        <option value="asc">
          {t('workspace.talents.sort.asc', {}, 'Ascending')}
        </option>
      </select>
      <input
        data-testid="talent-available-before"
        type="date"
        class="h-10 rounded-xl border border-border px-3 py-2 text-sm"
        bind:value={availableBefore}
        aria-label={t('workspace.talents.available_before', {}, 'Available before')}
      />
      <select
        data-testid="talent-min-proficiency"
        class="h-10 rounded-xl border border-border px-3 py-2 text-sm"
        bind:value={minProficiency}
      >
        <option value="">
          {t('workspace.talents.min_proficiency', {}, 'Minimum proficiency')}
        </option>
        {#each proficiencyLevels as level}
          <option value={level}>{level.toUpperCase()}</option>
        {/each}
      </select>
      <details
        data-testid="talent-skill-filter"
        class="rounded-xl border border-border px-3 py-2 text-sm"
        open={selectedSkillIds.length > 0}
      >
        <summary class="flex cursor-pointer list-none items-center justify-between gap-2 text-xs font-semibold text-muted-foreground">
          <span>{t('workspace.talents.skill_filter', {}, 'Skills')}</span>
          {#if selectedSkillIds.length > 0}
            <span class="rounded-full bg-muted px-2 py-0.5 text-foreground">
              {selectedSkillIds.length}
            </span>
          {/if}
        </summary>
        <div class="mt-2 max-h-36 space-y-1 overflow-y-auto pr-1" style="max-height: 9rem; overflow-y: auto;">
          {#if filteredSkills.length === 0}
            <p class="text-xs text-muted-foreground">
              {t('workspace.talents.no_skills', {}, 'No skills in this category')}
            </p>
          {:else}
            {#each filteredSkills as skill (skill.id)}
              <label class="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 hover:bg-muted">
                <input
                  type="checkbox"
                  value={skill.id}
                  checked={selectedSkillIds.includes(skill.id)}
                  onchange={() => toggleSkill(skill.id)}
                />
                <span>{skill.skill_name} · {categoryLabels[skill.category_code] ?? skill.category_code}</span>
              </label>
            {/each}
          {/if}
        </div>
      </details>
      <select data-testid="talent-business-domain" class="h-10 rounded-xl border border-border px-3 py-2 text-sm" bind:value={businessDomain}>
        <option value="">
          {t('workspace.talents.business_domain', {}, 'Business domain')}
        </option>
        {#each taxonomy.businessDomains as option}
          <option value={option.toLowerCase().replaceAll(' ', '_')}>{option}</option>
        {/each}
      </select>
      <select data-testid="talent-task-type" class="h-10 rounded-xl border border-border px-3 py-2 text-sm" bind:value={taskType}>
        <option value="">{t('workspace.talents.task_type', {}, 'Task type')}</option>
        {#each taxonomy.taskTypes as option}
          <option value={option.toLowerCase().replaceAll(' ', '_')}>{option}</option>
        {/each}
      </select>
      <select data-testid="talent-problem-category" class="h-10 rounded-xl border border-border px-3 py-2 text-sm" bind:value={problemCategory}>
        <option value="">
          {t('workspace.talents.problem_category', {}, 'Problem category')}
        </option>
        {#each taxonomy.problemCategories as option}
          <option value={option.toLowerCase().replaceAll(' ', '_')}>{option}</option>
        {/each}
      </select>
      <input
        data-testid="talent-role-in-task"
        class="h-10 rounded-xl border border-border px-3 py-2 text-sm"
        bind:value={roleInTask}
        onchange={(event) => { roleInTask = (event.currentTarget as HTMLInputElement).value }}
        placeholder={t('workspace.talents.role_in_task', {}, 'Role in task')}
      />
      <input
        data-testid="talent-tech-stack"
        class="h-10 rounded-xl border border-border px-3 py-2 text-sm"
        bind:value={techStack}
        placeholder={t('workspace.talents.tech_stack', {}, 'Tech stack')}
      />
      <input
        data-testid="talent-domain-tags"
        class="h-10 rounded-xl border border-border px-3 py-2 text-sm"
        bind:value={domainTags}
        placeholder={t('workspace.talents.domain_tags', {}, 'Domain tags')}
      />
      <div class="flex h-10 items-center gap-2 text-xs">
        {#each Object.entries(categoryLabels) as [category, label]}
          <label class="inline-flex items-center gap-1.5 whitespace-nowrap">
            <input type="checkbox" checked={selectedCategories.includes(category)} onchange={() => toggleCategory(category)} />
            {t(`common.skill_search.categories.${category}`, {}, label)}
          </label>
        {/each}
      </div>
      <button class="h-10 rounded-xl border border-border px-4 py-2 text-sm font-bold" type="submit">
        {t('workspace.talents.search', {}, 'Search')}
      </button>
    </form>

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
          <article class="rounded-xl border border-border bg-background p-4">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 class="font-bold text-foreground">{talent.username}</h2>
                <p class="mt-1 text-sm text-muted-foreground">{talent.status ?? 'active'}</p>
              </div>
              <div class="flex flex-wrap items-center gap-2">
                <a class="rounded-md border border-border px-3 py-1 font-bold" href={`/org/talents/${talent.id}`}>
                  {t('workspace.talents.profile', {}, 'Profile')}
                </a>
                {#if talent.bookmark?.isSaved}
                  <button class="rounded-md border border-border px-3 py-1 font-bold" type="button" onclick={() => removeTalent(talent)}>
                    {t('workspace.talents.remove_saved', {}, 'Remove')}
                  </button>
                {:else}
                  <button class="rounded-md border border-border px-3 py-1 font-bold" type="button" onclick={() => saveTalent(talent)}>
                    {t('workspace.talents.save', {}, 'Save talent')}
                  </button>
                {/if}
              </div>
            </div>
            <div class="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <span class="rounded-full bg-muted px-2.5 py-1 font-semibold text-foreground">
                {formatTalentCoverageLabel(talent.reviewed_skills_count, talent.imported_skills_count)}
              </span>
              {#if formatTalentConfidenceLabel(talent.latest_confidence_signal)}
                <span class="rounded-full bg-muted px-2.5 py-1 font-semibold text-foreground">
                  {formatTalentConfidenceLabel(talent.latest_confidence_signal)}
                </span>
              {/if}
              {#if formatTalentGovernanceLabel(talent.under_dispute_skills_count)}
                <span class="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 font-semibold text-amber-900">
                  {formatTalentGovernanceLabel(talent.under_dispute_skills_count)}
                </span>
              {/if}
              {#if (talent.risks?.length ?? 0) > 0}
                <span class="rounded-full border border-destructive/30 bg-destructive/10 px-2.5 py-1 font-semibold text-destructive">
                  {talent.risks?.[0]}
                </span>
              {/if}
            </div>
            {#if isTaskRankingMode}
              <div data-testid="task-ranking-metrics" class="mt-3 grid gap-2 text-sm sm:grid-cols-4">
                <div>
                  {t('workspace.talents.metrics.skill', {}, 'Skill')}
                  <strong>{clampPercent(talent.skill_match)}</strong>
                </div>
                <div>
                  {t('workspace.talents.metrics.domain', {}, 'Domain')}
                  <strong>{clampPercent(talent.domain_match)}</strong>
                </div>
                <div>
                  {t('workspace.talents.metrics.delivery', {}, 'On time')}
                  <strong>{clampPercent(talent.delivery_reliability)}</strong>
                </div>
                <div>
                  {t('workspace.talents.metrics.trust', {}, 'Trust')}
                  <strong>{clampPercent(talent.trust_score)}</strong>
                </div>
              </div>
            {:else}
              <div data-testid="trust-only-metric" class="mt-3 text-sm">
                <span class="font-semibold text-muted-foreground">
                  {t('workspace.talents.metrics.trust', {}, 'Trust')}
                </span>
                <strong class="ml-2 text-foreground">{clampPercent(talent.trust_score)}</strong>
              </div>
            {/if}
            {#if (talent.public_accomplishments?.length ?? 0) > 0}
              <section
                data-testid={`public-accomplishments-${talent.id}`}
                class="mt-4 border-t border-border pt-3"
                aria-label="Verified demonstrated work"
              >
                <div class="flex items-center justify-between gap-2">
                  <h3 class="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    {t('workspace.talents.demonstrated_work', {}, 'Demonstrated work')}
                  </h3>
                  <span class="text-xs text-muted-foreground">
                    {t('workspace.talents.public_only', {}, 'Public-safe')}
                  </span>
                </div>
                <div class="mt-2 grid gap-2">
                  {#each talent.public_accomplishments ?? [] as accomplishment}
                    <article class="rounded-lg border border-border bg-muted/10 p-3">
                      <div class="flex flex-wrap items-start justify-between gap-2">
                        <h4 class="font-semibold text-foreground">{accomplishment.title}</h4>
                        <span class="rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800">
                          {accomplishment.verification_status === 'verified' ? 'Verified' : 'Partially verified'}
                        </span>
                      </div>
                      <p class="mt-1 text-sm text-muted-foreground">{accomplishment.concise_statement}</p>
                      <div class="mt-2 flex flex-wrap gap-1.5 text-xs">
                        <span class="rounded-full bg-muted px-2 py-1">{accomplishment.action}</span>
                        <span class="rounded-full bg-muted px-2 py-1">{accomplishment.object}</span>
                        <span class="rounded-full bg-muted px-2 py-1">{accomplishment.ownership_level}</span>
                        <span class="rounded-full bg-muted px-2 py-1">{accomplishment.confidence_band} confidence</span>
                      </div>
                    </article>
                  {/each}
                </div>
              </section>
            {/if}
            {#if isTaskRankingMode && hasTaskMatch(talent)}
              <div class="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
                <div>
                  <p class="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    {t('workspace.talents.match_score', {}, 'Match score')}
                  </p>
                  <p class="text-2xl font-black text-foreground">{clampPercent(talent.match_score)}</p>
                </div>
                <button
                  class="rounded-md border border-border px-3 py-1.5 text-sm font-bold"
                  type="button"
                  aria-expanded={expandedTalentId === talent.id}
                  aria-controls={`talent-explainability-${talent.id}`}
                  onclick={() => toggleExplainability(talent.id)}
                >
                  {expandedTalentId === talent.id
                    ? t('workspace.talents.hide_score_details', {}, 'Hide score details')
                    : t('workspace.talents.show_score_details', {}, 'Score details')}
                </button>
              </div>
            {/if}
            {#if expandedTalentId === talent.id}
              <section
                id={`talent-explainability-${talent.id}`}
                class="mt-3 grid gap-3 rounded-lg border border-border bg-muted/20 p-3"
              >
                <div class="grid gap-2 sm:grid-cols-4">
                  {#each explainabilityMetrics(talent) as metric}
                    <div class="rounded-md border border-border bg-background p-3">
                      <p class="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
                        {metric.label}
                      </p>
                      <p class="mt-1 text-xl font-black text-foreground">{metric.value}</p>
                      <p class="text-xs text-muted-foreground">
                        {t('workspace.talents.metric_weight', { weight: metric.weight }, 'weight :weight')}
                      </p>
                    </div>
                  {/each}
                </div>
                <div class="grid gap-3 md:grid-cols-2">
                  <div>
                    <h3 class="text-sm font-bold text-foreground">
                      {t('workspace.talents.explainability_evidence', {}, 'Matched skills, domain, delivery, and trust')}
                    </h3>
                    {#if (talent.explanations?.length ?? 0) > 0}
                      <ul class="mt-2 grid gap-1.5 text-sm text-muted-foreground">
                        {#each talent.explanations ?? [] as explanation}
                          <li>{explanation}</li>
                        {/each}
                      </ul>
                    {:else}
                      <p class="mt-2 text-sm text-muted-foreground">
                        {t('workspace.talents.no_explanations', {}, 'No score evidence supplied for this row yet.')}
                      </p>
                    {/if}
                  </div>
                  <div>
                    <h3 class="text-sm font-bold text-foreground">
                      {t('workspace.talents.explainability_risks', {}, 'Risks')}
                    </h3>
                    {#if (talent.risks?.length ?? 0) > 0}
                      <ul class="mt-2 grid gap-1.5 text-sm text-destructive">
                        {#each talent.risks ?? [] as risk}
                          <li>{risk}</li>
                        {/each}
                      </ul>
                    {:else}
                      <p class="mt-2 text-sm text-muted-foreground">
                        {t('workspace.talents.no_risks', {}, 'No match risks reported.')}
                      </p>
                    {/if}
                  </div>
                </div>
              </section>
            {/if}
          </article>
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
