<script lang="ts">
  

  interface FeaturedReview {
    skill_id: string
    skill_name: string
    level_code: string
    avg_percentage: number
    total_reviews: number
    reviewer_name: string
    reviewer_role: string
    stars: number
    content: string
    task_name: string
  }

  interface Props {
    featuredReviews: FeaturedReview[]
    reviewedSkillsCount: number
  }

  const { featuredReviews, reviewedSkillsCount }: Props = $props()

  type SortMode = 'stars' | 'task' | 'skill'
  let sortMode = $state<SortMode>('stars')

  const sortedReviews = $derived.by(() => {
    const items = [...featuredReviews]
    if (sortMode === 'stars') {
      items.sort((a, b) => b.stars - a.stars)
    } else if (sortMode === 'task') {
      items.sort((a, b) => a.task_name.localeCompare(b.task_name))
    } else {
      items.sort((a, b) => a.skill_name.localeCompare(b.skill_name))
    }
    return items
  })

  function levelLabel(levelCode: string): string {
    const code = levelCode.toLowerCase()
    if (code.includes('begin')) return 'Beginner'
    if (code.includes('jun')) return 'Junior'
    if (code.includes('mid')) return 'Mid'
    if (code.includes('sen')) return 'Senior'
    if (code.includes('lead')) return 'Lead'
    return levelCode
  }

  function levelBadgeClass(levelCode: string): string {
    const code = levelCode.toLowerCase()
    if (code.includes('sen') || code.includes('lead')) return 'border-black bg-accent text-foreground'
    if (code.includes('mid')) return 'border-border bg-white text-foreground'
    return 'border-border bg-muted text-muted-foreground'
  }
</script>

<section class="space-y-4">
  <div class="flex items-center justify-between gap-3">
    <div>
      <p class="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
        Đánh giá nổi bật
      </p>
      <p class="text-xs text-muted-foreground">{reviewedSkillsCount} kỹ năng đã được đánh giá</p>
    </div>

    {#if featuredReviews.length > 1}
      <div class="flex gap-1 rounded-lg border border-border bg-white p-0.5">
        <button
          class="rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wide {sortMode === 'stars' ? 'bg-black text-white' : 'text-muted-foreground hover:text-foreground'}"
          onclick={() => sortMode = 'stars'}
        >Sao</button>
        <button
          class="rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wide {sortMode === 'task' ? 'bg-black text-white' : 'text-muted-foreground hover:text-foreground'}"
          onclick={() => sortMode = 'task'}
        >Task</button>
        <button
          class="rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wide {sortMode === 'skill' ? 'bg-black text-white' : 'text-muted-foreground hover:text-foreground'}"
          onclick={() => sortMode = 'skill'}
        >Skill</button>
      </div>
    {/if}
  </div>

  {#if featuredReviews.length === 0}
    <div class="rounded-2xl border border-border bg-white p-6">
      <p class="text-sm font-semibold text-muted-foreground">Chưa có đánh giá nổi bật để hiển thị.</p>
    </div>
  {:else}
    <div class="grid gap-3 md:grid-cols-2">
      {#each sortedReviews as item (item.skill_id)}
        <article class="rounded-2xl border border-border bg-white p-4 shadow-suar-xs">
          <div class="flex items-start gap-3">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-xs font-black text-foreground">
              {item.skill_name.slice(0, 2).toUpperCase()}
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <p class="truncate text-sm font-bold text-foreground">{item.skill_name}</p>
                <span class="shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide {levelBadgeClass(item.level_code)}">
                  {levelLabel(item.level_code)}
                </span>
              </div>
              <p class="truncate text-[11px] text-muted-foreground">{item.reviewer_name} · {item.reviewer_role}</p>
            </div>
            <div class="flex flex-col items-end gap-1">
              <div class="flex gap-0.5" aria-label={`${item.stars} stars`}>
                {#each Array.from({ length: 5 }) as _, i}
                  <span class={i < item.stars ? 'text-orange' : 'text-border'}>★</span>
                {/each}
              </div>
              {#if item.avg_percentage}
                <span class="text-[10px] font-bold text-muted-foreground">{item.avg_percentage.toFixed(0)}%</span>
              {/if}
            </div>
          </div>

          <p class="mt-3 text-xs leading-5 text-foreground">{item.content}</p>

          <div class="mt-3 flex items-center justify-between border-t border-border pt-2">
            <p class="truncate text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {item.task_name}
            </p>
            <span class="text-[10px] font-bold text-muted-foreground">
              {item.total_reviews} đánh giá
            </span>
          </div>
        </article>
      {/each}
    </div>
  {/if}
</section>
