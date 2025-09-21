<script lang="ts">
  import { getProfileGroupStyle, getProfileLevelClass, getProfileLevelLabel } from '../profile_theme'
  import { formatPercent } from '../profile_view_helpers'
  import type { SpiderChartPoint } from '../types.svelte'

  import ProfileSpiderChartCard from './profile_spider_chart_card.svelte'

  interface SkillItem {
    id: string
    skill_id?: string
    skill_name: string
    category_code?: string
    level_code: string | null
    total_reviews: number
    avg_percentage?: number | null
    source?: string | null
  }

  interface SkillGroup {
    code: string
    title: string
    bgClass: string
    items: SkillItem[]
  }

  interface SpiderChartData {
    technical: SpiderChartPoint[]
    soft_skills: SpiderChartPoint[]
    delivery: SpiderChartPoint[]
  }

  interface Props {
    groupedSkills: SkillGroup[]
    spiderChartData: SpiderChartData
    neoBrutalCard: string
    showCharts?: boolean
  }

  const { groupedSkills, spiderChartData, neoBrutalCard, showCharts = true }: Props = $props()

  function formatSkillScore(value?: number | null): string {
    return typeof value === 'number' && Number.isFinite(value)
      ? formatPercent(value, 1)
      : 'Chưa review'
  }

  const totalSkillCount = $derived(
    groupedSkills.reduce((sum, group) => sum + group.items.length, 0)
  )
  const totalReviewedSkills = $derived(
    groupedSkills.reduce(
      (sum, group) => sum + group.items.filter((item) => item.total_reviews > 0).length,
      0
    )
  )
</script>

<section class="space-y-4">
  <div class="flex flex-wrap items-end justify-between gap-3">
    <div>
      <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Skill atlas</p>
      <h2 class="mt-2 text-2xl font-black tracking-tight text-foreground">Bản đồ năng lực mới của profile</h2>
      <p class="mt-1 max-w-3xl text-sm text-muted-foreground">
        Tách rõ từng nhóm năng lực, hiển thị score thực từ `user_skills`, và giới hạn radar theo top tín hiệu để đọc dễ hơn.
      </p>
    </div>

    <div class="flex flex-wrap gap-2 text-xs font-semibold">
      <span class="rounded-full border border-border bg-background px-3 py-1 text-foreground">
        {totalSkillCount} kỹ năng
      </span>
      <span class="rounded-full border border-border bg-background px-3 py-1 text-foreground">
        {totalReviewedSkills} kỹ năng reviewed
      </span>
    </div>
  </div>

  <div class={showCharts ? "grid gap-4 xl:grid-cols-[minmax(0,1.18fr)_minmax(22rem,0.82fr)]" : "w-full"}>
    <div class={`${neoBrutalCard} rounded-[28px] border border-border bg-white p-5 shadow-suar-md ${showCharts ? "" : "w-full"}`}>
      <div class="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Detailed inventory</p>
          <h3 class="mt-2 text-xl font-black text-foreground">Toàn bộ kỹ năng theo nhóm</h3>
        </div>
        <p class="text-sm text-muted-foreground">Badge level + score + nguồn dữ liệu</p>
      </div>

      {#if groupedSkills.length === 0}
        <div class="rounded-2xl border border-dashed border-border bg-background/60 px-4 py-12 text-center text-sm font-medium text-muted-foreground">
          Chưa có kỹ năng nào để hiển thị.
        </div>
      {:else}
        <div class="space-y-5">
          {#each groupedSkills as group (group.code)}
            {@const style = getProfileGroupStyle(group.code)}
            <section class={`rounded-[24px] border p-4 ${style.borderClass} ${style.surfaceClass}`}>
              <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div class="flex items-center gap-2">
                  <span class={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.18em] ${style.badgeClass}`}>
                    <span class={`h-2.5 w-2.5 ${style.dotClass}`}></span>
                    {group.title}
                  </span>
                  <span class="text-xs font-semibold text-muted-foreground">{group.items.length} skill</span>
                </div>
                <span class="text-xs font-semibold text-muted-foreground">
                  {group.items.filter((item) => item.total_reviews > 0).length} reviewed
                </span>
              </div>

              <div class="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {#each group.items as skill (skill.id)}
                  <article class="rounded-2xl border border-white/80 bg-white/85 p-3 shadow-sm dark:border-white/10 dark:bg-black/10">
                    <div class="flex items-start justify-between gap-3">
                      <div class="min-w-0">
                        <p class="truncate text-sm font-bold text-foreground">{skill.skill_name}</p>
                        <div class="mt-2 flex flex-wrap gap-2 text-[11px] font-semibold text-muted-foreground">
                          <span>{skill.total_reviews} review{skill.total_reviews === 1 ? '' : 's'}</span>
                          {#if skill.source}
                            <span class="rounded-full border border-border px-2 py-0.5 uppercase tracking-[0.12em]">
                              {skill.source === 'reviewed' ? 'reviewed' : 'self-declared'}
                            </span>
                          {/if}
                        </div>
                      </div>

                      <span class={`rounded-full border px-2.5 py-1 text-[11px] font-black ${getProfileLevelClass(skill.level_code)}`}>
                        {getProfileLevelLabel(skill.level_code)}
                      </span>
                    </div>

                    <div class="mt-3 grid grid-cols-2 gap-2">
                      <div class="rounded-xl border border-border/70 bg-background/70 px-3 py-2">
                        <p class="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Score</p>
                        <p class={`mt-1 text-lg font-black ${style.textClass}`}>
                          {formatSkillScore(skill.avg_percentage)}
                        </p>
                      </div>
                      <div class="rounded-xl border border-border/70 bg-background/70 px-3 py-2">
                        <p class="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Signal</p>
                        <p class="mt-1 text-lg font-black text-foreground">
                          {skill.total_reviews > 0 ? 'Verified' : 'Imported'}
                        </p>
                      </div>
                    </div>
                  </article>
                {/each}
              </div>
            </section>
          {/each}
        </div>
      {/if}
    </div>

    {#if showCharts}
      <div class="space-y-4">
        <ProfileSpiderChartCard categoryCode="technical" points={spiderChartData.technical} />
        <ProfileSpiderChartCard categoryCode="soft_skill" points={spiderChartData.soft_skills} />
        <ProfileSpiderChartCard categoryCode="delivery" points={spiderChartData.delivery} />
      </div>
    {/if}
  </div>
</section>
