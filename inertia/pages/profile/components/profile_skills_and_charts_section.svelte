<script lang="ts">
  import SpiderChart from '../../reviews/components/spider_chart.svelte'
  import { getProfileLevelClass, getProfileLevelLabel } from '../profile_theme'
  import type { SpiderChartPoint } from '../types.svelte'

  interface SkillItem {
    id: string
    skill_name: string
    level_code: string | null
    total_reviews: number
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
  }

  const { groupedSkills, spiderChartData, neoBrutalCard }: Props = $props()
</script>

<section class="grid gap-3 xl:grid-cols-2">
  <div class={neoBrutalCard}>
    <p class="mb-3 text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Chi tiết kỹ năng</p>

    {#if groupedSkills.length === 0}
      <p class="text-sm font-semibold text-muted-foreground">Chưa có kỹ năng nào</p>
    {:else}
      <div class="space-y-4">
        {#each groupedSkills as group (group.code)}
          <div class="space-y-1">
            <div class="flex items-center gap-2">
              <span class="inline-block rounded px-2 py-0.5 text-[10px] font-black uppercase tracking-wide shadow-neo-sm {group.bgClass}">{group.title}</span>
            </div>

            {#each group.items as skill (skill.id)}
              <div class="flex items-center justify-between gap-2 border-b border-dashed border-border/40 py-1 text-xs {skill.total_reviews === 0 ? 'opacity-40' : ''}">
                <span class="flex items-center gap-1 font-bold">
                  {skill.skill_name}
                  {#if skill.total_reviews === 0}
                    <span class="rounded border border-border px-1 text-[9px] font-bold uppercase">tự khai</span>
                  {/if}
                </span>
                <span class="rounded-full border-2 border-border px-2 py-0.5 text-[10px] font-black shadow-neo-sm {getProfileLevelClass(skill.level_code)}">{getProfileLevelLabel(skill.level_code)}</span>
              </div>
            {/each}
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <div class={neoBrutalCard}>
    <p class="mb-3 text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Biểu đồ kỹ năng</p>

    <div class="space-y-4">
      <div class="space-y-2">
        <div class="flex flex-wrap items-center justify-between gap-2 text-[11px] font-bold text-muted-foreground">
          <div class="flex items-center gap-1"><span class="inline-block h-2 w-2 rounded-full neo-dot-magenta"></span>Kỹ thuật</div>
          <div class="flex items-center gap-3 text-[10px] font-bold"><span class="neo-text-magenta">Đã review</span></div>
        </div>
        <div class="min-h-[220px]">
          <SpiderChart
            softSkills={spiderChartData.technical}
            softSkillsLabel="Đã review"
            size={300}
          />
        </div>
      </div>

      <div class="border-t-2 border-border pt-4">
        <div class="flex flex-wrap items-center justify-between gap-2 text-[11px] font-bold text-muted-foreground">
          <div class="flex items-center gap-1"><span class="inline-block h-2 w-2 rounded-full neo-dot-blue"></span>Kỹ năng mềm</div>
          <div class="flex items-center gap-3 text-[10px] font-bold"><span class="neo-text-blue">Đã review</span></div>
        </div>
        <div class="min-h-[220px]">
          <SpiderChart
            softSkills={spiderChartData.soft_skills}
            softSkillsLabel="Đã review"
            size={300}
          />
        </div>
      </div>

      <div class="border-t-2 border-border pt-4">
        <div class="flex flex-wrap items-center justify-between gap-2 text-[11px] font-bold text-muted-foreground">
          <div class="flex items-center gap-1"><span class="inline-block h-2 w-2 rounded-full neo-dot-orange"></span>Delivery</div>
          <div class="flex items-center gap-3 text-[10px] font-bold"><span class="neo-text-orange">Đã review</span></div>
        </div>
        <div class="min-h-[220px]">
          <SpiderChart
            softSkills={spiderChartData.delivery}
            softSkillsLabel="Đã review"
            size={300}
          />
        </div>
      </div>
    </div>
  </div>
</section>
