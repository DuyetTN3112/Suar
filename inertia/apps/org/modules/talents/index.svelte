<script lang="ts">
  import { router } from '@inertiajs/svelte'
  import OrganizationLayout from '@/apps/org/shared/layouts/organization_layout.svelte'
  import UnifiedOffsetPagination from '@/apps/org/shared/ui/unified_offset_pagination.svelte'
  import type { OffsetPagePagination } from '@/apps/org/shared/lib/pagination'

  interface Talent {
    id: string
    username: string
    status?: string
    skill_match?: number | null
    domain_match?: number | null
    delivery_reliability?: number | null
    trust_score?: number | null
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
  }

  interface Props {
    talents: Talent[]
    filters: Filters
    availableSkills: SkillOption[]
    availableTasks: TaskOption[]
    stats?: { total?: number; saved?: number }
    pagination: OffsetPagePagination
  }

  const { talents, filters, availableSkills, availableTasks, pagination }: Props = $props()

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
  let sortBy = $state(initialFilter((value) => value.sort_by ?? 'relevance'))
  let sortOrder = $state(initialFilter((value) => value.sort_order ?? 'desc'))

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

  const paginationQuery = $derived({
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
  })

  function toArray(value: string[] | string | null | undefined) {
    if (Array.isArray(value)) return value
    return value ? [value] : []
  }

  function clampPercent(value: number | null | undefined) {
    if (typeof value !== 'number' || !Number.isFinite(value)) return 0
    return Math.min(100, Math.max(0, Math.round(value)))
  }

  function submitSearch() {
    router.get(
      '/org/talents',
      {
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
      },
      { preserveState: false, preserveScroll: true }
    )
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
    router.reload()
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
    router.reload()
  }

  function toggleCategory(category: string) {
    selectedCategories = selectedCategories.includes(category)
      ? selectedCategories.filter((item) => item !== category)
      : [...selectedCategories, category]
    selectedSkillIds = []
  }
</script>

<OrganizationLayout title="Danh bạ Talent Tổ chức">
  <div class="space-y-6">
    <div>
      <p class="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Talent discovery</p>
      <h1 class="mt-1 text-3xl font-black text-foreground">Danh bạ Talent Tổ chức</h1>
    </div>

    <form class="grid items-end gap-3 rounded-xl border border-border bg-background p-4 md:grid-cols-3 xl:grid-cols-4" onsubmit={(event) => { event.preventDefault(); submitSearch() }}>
      <input data-testid="talent-search-keyword" class="h-10 rounded-xl border border-border px-3 py-2 text-sm" bind:value={q} placeholder="Tìm talent" />
      <select data-testid="talent-search-task" class="h-10 rounded-xl border border-border px-3 py-2 text-sm" bind:value={taskId}>
        <option value="">Chọn task</option>
        {#each availableTasks as task (task.id)}
          <option value={task.id}>{task.title}</option>
        {/each}
      </select>
      <select data-testid="talent-sort-by" class="h-10 rounded-xl border border-border px-3 py-2 text-sm" bind:value={sortBy}>
        <option value="relevance">Relevance</option>
        <option value="trust_score">Trust score</option>
        <option value="completed_tasks">Completed tasks</option>
      </select>
      <select data-testid="talent-sort-order" class="h-10 rounded-xl border border-border px-3 py-2 text-sm" bind:value={sortOrder}>
        <option value="desc">Desc</option>
        <option value="asc">Asc</option>
      </select>
      <select
        data-testid="talent-skill-filter"
        class="h-10 rounded-xl border border-border px-3 py-2 text-sm"
        value={selectedSkillIds[0] ?? ''}
        onchange={(event) => {
          const value = event.currentTarget.value
          selectedSkillIds = value ? [value] : []
        }}
      >
        <option value="">Skill</option>
        {#each filteredSkills as skill (skill.id)}
          <option value={skill.id}>{skill.skill_name} · {categoryLabels[skill.category_code] ?? skill.category_code}</option>
        {/each}
      </select>
      <select data-testid="talent-business-domain" class="h-10 rounded-xl border border-border px-3 py-2 text-sm" bind:value={businessDomain}>
        <option value="">Business domain</option>
        {#each taxonomy.businessDomains as option}
          <option value={option.toLowerCase().replaceAll(' ', '_')}>{option}</option>
        {/each}
      </select>
      <select data-testid="talent-task-type" class="h-10 rounded-xl border border-border px-3 py-2 text-sm" bind:value={taskType}>
        <option value="">Task type</option>
        {#each taxonomy.taskTypes as option}
          <option value={option.toLowerCase().replaceAll(' ', '_')}>{option}</option>
        {/each}
      </select>
      <select data-testid="talent-problem-category" class="h-10 rounded-xl border border-border px-3 py-2 text-sm" bind:value={problemCategory}>
        <option value="">Problem category</option>
        {#each taxonomy.problemCategories as option}
          <option value={option.toLowerCase().replaceAll(' ', '_')}>{option}</option>
        {/each}
      </select>
      <input
        data-testid="talent-role-in-task"
        class="h-10 rounded-xl border border-border px-3 py-2 text-sm"
        bind:value={roleInTask}
        onchange={(event) => { roleInTask = (event.currentTarget as HTMLInputElement).value }}
        placeholder="Role in task"
      />
      <input data-testid="talent-tech-stack" class="h-10 rounded-xl border border-border px-3 py-2 text-sm" bind:value={techStack} placeholder="Tech stack" />
      <input data-testid="talent-domain-tags" class="h-10 rounded-xl border border-border px-3 py-2 text-sm" bind:value={domainTags} placeholder="Domain tags" />
      <div class="flex h-10 items-center gap-2 text-xs">
        {#each Object.entries(categoryLabels) as [category, label]}
          <label class="inline-flex items-center gap-1.5 whitespace-nowrap">
            <input type="checkbox" checked={selectedCategories.includes(category)} onchange={() => toggleCategory(category)} />
            {label}
          </label>
        {/each}
      </div>
      <button class="h-10 rounded-xl border border-border px-4 py-2 text-sm font-bold" type="submit">Tìm kiếm</button>
    </form>

    <div class="grid gap-3">
      {#if talents.length === 0}
        <section data-testid="empty-state" class="rounded-xl border border-dashed border-border bg-background p-6 text-center">
          <h2 class="text-lg font-bold text-foreground">Không tìm thấy talent nào</h2>
          <p class="mt-1 text-sm text-muted-foreground">Thử đổi từ khóa, task, hoặc bộ lọc kỹ năng.</p>
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
                <a class="rounded-md border border-border px-3 py-1 font-bold" href={`/org/talents/${talent.id}`}>Hồ sơ</a>
                {#if talent.bookmark?.isSaved}
                  <button class="rounded-md border border-border px-3 py-1 font-bold" type="button" onclick={() => removeTalent(talent)}>Bỏ lưu</button>
                {:else}
                  <button class="rounded-md border border-border px-3 py-1 font-bold" type="button" onclick={() => saveTalent(talent)}>Lưu talent</button>
                {/if}
              </div>
            </div>
            <div class="mt-3 grid gap-2 text-sm sm:grid-cols-4">
              <div>Kỹ năng <strong>{clampPercent(talent.skill_match)}</strong></div>
              <div>Domain <strong>{clampPercent(talent.domain_match)}</strong></div>
              <div>Đúng hạn <strong>{clampPercent(talent.delivery_reliability)}</strong></div>
              <div>Trust <strong>{clampPercent(talent.trust_score)}</strong></div>
            </div>
          </article>
        {/each}
      {/if}
    </div>

    <UnifiedOffsetPagination {pagination} baseUrl="/org/talents" queryParams={paginationQuery} />
  </div>
</OrganizationLayout>
