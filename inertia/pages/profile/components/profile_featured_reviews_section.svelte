<script lang="ts">
  interface FeaturedReview {
    skill_id: string
    skill_name: string
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
</script>

<section class="neo-hero-blue rounded-[10px] p-4">
  <div class="mb-2 flex items-center justify-between gap-2">
    <p class="text-[10px] font-black uppercase tracking-[0.18em] text-white">Đánh giá nổi bật</p>
    <span class="neo-pill-ink rounded-full px-2 py-0.5 text-[10px] font-black">{reviewedSkillsCount} đánh giá</span>
  </div>

  {#if featuredReviews.length === 0}
    <p class="border-t-2 border-white pt-2 text-sm font-semibold text-white">Chưa có đánh giá nổi bật để hiển thị.</p>
  {:else}
    <div class="grid gap-3 md:grid-cols-2">
      {#each featuredReviews as item (item.skill_id)}
        <article class="border-t-2 border-white pt-2">
          <div class="mb-1 flex items-center gap-2">
            <div class="flex h-7 w-7 items-center justify-center rounded-full border-2 border-border bg-background text-[10px] font-black text-foreground">
              {item.skill_name.slice(0, 2).toUpperCase()}
            </div>
            <div class="min-w-0 flex-1">
              <p class="truncate text-xs font-black text-white">{item.reviewer_name}</p>
              <p class="text-[10px] font-semibold text-white opacity-75">{item.reviewer_role}</p>
            </div>
            <div class="ml-auto flex gap-1" aria-label={`${item.stars} stars`}>
              {#each Array.from({ length: 5 }) as _, i}
                <span class={i < item.stars ? 'text-orange-300' : 'text-white/30'}>★</span>
              {/each}
            </div>
          </div>
          <p class="text-xs font-semibold text-white">{item.content}</p>
          <p class="mt-1 text-[10px] font-semibold uppercase tracking-wide text-white opacity-65">{item.task_name}</p>
        </article>
      {/each}
    </div>
  {/if}
</section>
