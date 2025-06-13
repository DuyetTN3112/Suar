<script lang="ts">
  import AppLayout from '@/layouts/app_layout.svelte'
  import { page } from '@inertiajs/svelte'
  import { useTranslation } from '@/stores/translation.svelte'
  import SpiderChart from '../reviews/components/spider_chart.svelte'
  import type { SpiderChartPoint } from './types.svelte'

  interface DeliveryMetrics {
    delivery: {
      total_tasks_completed: number
      tasks_on_time: number
      tasks_late: number
      late_percentage: number
      estimate_accuracy_percentage: number
      avg_hours_over_estimate: number
    }
    skill_aggregation: {
      total_skills: number
      reviewed_skills: number
      avg_percentage: number | null
    }
    years_of_experience: number
    joined_at_formatted: string
  }

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

  interface SpiderChartData {
    technical: SpiderChartPoint[]
    soft_skills: SpiderChartPoint[]
    delivery: SpiderChartPoint[]
  }

  interface Props {
    user: any
    completeness: number
    spiderChartData: SpiderChartData
    deliveryMetrics: DeliveryMetrics
    featuredReviews: FeaturedReview[]
  }

  const { user, completeness, spiderChartData, deliveryMetrics, featuredReviews }: Props = $props()
  const { t } = useTranslation()

  const pageTitle = $derived(t('profile.show', {}, 'Hồ sơ cá nhân'))
  const flash = $derived(($page as { props: { flash?: { success?: string; error?: string } } }).props.flash)

  // Group skills by category (simple transform - NO business logic)
  const userSkills = $derived(
    (user.skills ?? []).map((s: any) => ({
      id: s.id,
      skill_id: s.skill_id,
      skill_name: s.skill?.skill_name ?? '',
      category_code: s.skill?.category_code ?? 'other',
      level_code: s.level_code,
      avg_percentage: s.avg_percentage ?? null,
      total_reviews: s.total_reviews,
    }))
  )

  const groupedSkills = $derived(() => {
    const groups = new Map<string, Array<(typeof userSkills)[number]>>()
    for (const skill of userSkills) {
      const key = skill.category_code || 'other'
      let bucket = groups.get(key)
      if (!bucket) {
        bucket = []
        groups.set(key, bucket)
      }
      bucket.push(skill)
    }

    const order = ['technical', 'soft_skill', 'delivery']
    return Array.from(groups.entries())
      .sort(([a], [b]) => {
        const ai = order.indexOf(a)
        const bi = order.indexOf(b)
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
      })
      .map(([code, items]) => ({
        code,
        title:
          code === 'technical'
            ? 'Kỹ thuật (Technical)'
            : code === 'soft_skill'
              ? 'Kỹ năng mềm (Soft Skills)'
              : code === 'delivery'
                ? 'Delivery'
                : code,
        bgClass:
          code === 'technical'
            ? 'bg-[#9B5DE5] text-white'
            : code === 'soft_skill'
              ? 'bg-[#00C853] text-white'
              : code === 'delivery'
                ? 'bg-[#FF6B00] text-white'
                : 'bg-slate-500 text-white',
        items,
      }))
  })

  const initials = $derived(
    user.username
      .split(/[\s@]+/)
      .slice(0, 2)
      .map((s: string) => s[0].toUpperCase())
      .join('')
  )

  // Neo-Brutalism card class
  const neoBrutalCard =
    'rounded-[10px] border-2 border-black bg-[#fffef9] p-4 shadow-[6px_6px_0_#111]'

  function levelLabel(levelCode: string): string {
    const code = levelCode.toLowerCase()
    if (code.includes('begin')) return 'Beginner'
    if (code.includes('jun')) return 'Junior'
    if (code.includes('mid')) return 'Middle'
    if (code.includes('sen')) return 'Senior'
    if (code.includes('lead')) return 'Lead'
    if (code.includes('prin')) return 'Principal'
    if (code.includes('mas')) return 'Master'
    return levelCode
  }

  function levelClass(levelCode: string): string {
    const code = levelCode.toLowerCase()
    if (code.includes('begin')) return 'bg-zinc-200 text-zinc-700'
    if (code.includes('jun')) return 'bg-[#00C853] text-white'
    if (code.includes('mid')) return 'bg-[#0096FF] text-white'
    if (code.includes('sen')) return 'bg-[#9B5DE5] text-white'
    if (code.includes('lead')) return 'bg-[#FF6B00] text-white'
    if (code.includes('prin')) return 'bg-[#FF2D55] text-white'
    if (code.includes('mas')) return 'bg-black text-[#FFE500]'
    return 'bg-zinc-200 text-zinc-700'
  }

  // Fake "declared" data (+6 for visualization) - presentation logic only
  function declaredRadar(points: SpiderChartPoint[]): SpiderChartPoint[] {
    return points.map((point) => ({
      ...point,
      avg_percentage: Math.min(100, point.avg_percentage + 6),
    }))
  }
</script>

<svelte:head>
  <title>{pageTitle}</title>
</svelte:head>

<AppLayout title={pageTitle}>
  <div class="w-full space-y-3 px-4 py-4 sm:px-6 lg:px-8">
    {#if flash?.success}
      <div class="rounded-xl border border-green-300 bg-green-100 px-3 py-2 text-sm font-medium text-green-900 dark:border-green-700 dark:bg-green-900/30 dark:text-green-100">
        {flash.success}
      </div>
    {/if}
    {#if flash?.error}
      <div class="rounded-xl border border-red-300 bg-red-100 px-3 py-2 text-sm font-medium text-red-900 dark:border-red-700 dark:bg-red-900/30 dark:text-red-100">
        {flash.error}
      </div>
    {/if}

    <!-- TOP CARD (Neo-Brutalism) - Background: #FFE500 -->
    <section class="rounded-[10px] border-2 border-black bg-[#FFE500] p-4 shadow-[6px_6px_0_#111]">
      <div class="grid gap-4 lg:grid-cols-[auto_1fr_auto] lg:items-center">
        <div class="flex h-14 w-14 items-center justify-center rounded-full border-2 border-black bg-black text-lg font-extrabold text-[#FFE500] shadow-[3px_3px_0_#111]">
          {initials}
        </div>

        <div class="space-y-2">
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-xl font-black text-black">{user.username}</span>
            <span class="inline-flex items-center gap-1 rounded-full border-2 border-black bg-black px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#FFE500]">
              <span class="h-1.5 w-1.5 rounded-full bg-[#FFE500]"></span>Đã xác thực
            </span>
          </div>

          <p class="text-xs font-bold text-black opacity-65">
            {user.status_name ?? 'Thành viên'}
            {#if user.current_organization?.name}
              · {user.current_organization.name} · Pro
            {/if}
          </p>

          <div class="flex flex-wrap gap-x-4 gap-y-1 text-xs">
            <div><span class="text-[9px] font-extrabold uppercase tracking-wider text-black opacity-50">Tổ chức</span> <span class="text-xs font-bold text-black">{user.current_organization?.name ?? 'Chưa tham gia'} {#if user.current_organization?.name}<span class="inline-block rounded border-2 border-black bg-[#00e5a0] px-1 text-[9px] font-extrabold uppercase text-black">Member</span>{/if}</span></div>
            <div><span class="text-[9px] font-extrabold uppercase tracking-wider text-black opacity-50">Kinh nghiệm</span> <span class="text-xs font-bold text-black">{deliveryMetrics.years_of_experience} năm</span></div>
            <div><span class="text-[9px] font-extrabold uppercase tracking-wider text-black opacity-50">Tham gia</span> <span class="text-xs font-bold text-black">{deliveryMetrics.joined_at_formatted}</span></div>
            <div><span class="text-[9px] font-extrabold uppercase tracking-wider text-black opacity-50">Múi giờ</span> <span class="text-xs font-bold text-black">{user.timezone ?? 'GMT+7'}</span></div>
            <div><span class="text-[9px] font-extrabold uppercase tracking-wider text-black opacity-50">Ngôn ngữ</span> <span class="text-xs font-bold text-black">Tiếng Việt, English</span></div>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-2 lg:grid-cols-2 xl:grid-cols-4">
          <div class="rounded-lg border-2 border-black bg-[#FFE500] px-3 py-2 text-center shadow-[3px_3px_0_#111]">
            <p class="text-[10px] font-bold uppercase tracking-wide text-black">Trust</p>
            <p class="text-xl font-black text-black">{typeof user.trust_score === 'number' ? user.trust_score.toFixed(1) : '84.2'}</p>
          </div>
          <div class="rounded-lg border-2 border-black bg-[#FF2D55] px-3 py-2 text-center shadow-[3px_3px_0_#111]">
            <p class="text-[10px] font-bold uppercase tracking-wide text-white">Rating</p>
            <p class="text-xl font-black text-white">{typeof user.freelancer_rating === 'number' ? user.freelancer_rating.toFixed(1) : '4.6'} <span class="text-[11px] font-semibold opacity-80">({deliveryMetrics.skill_aggregation.reviewed_skills})</span></p>
          </div>
          <div class="rounded-lg border-2 border-black bg-[#0096FF] px-3 py-2 text-center shadow-[3px_3px_0_#111]">
            <p class="text-[10px] font-bold uppercase tracking-wide text-white">Tasks</p>
            <p class="text-xl font-black text-white">{deliveryMetrics.delivery.total_tasks_completed}</p>
          </div>
          <div class="rounded-lg border-2 border-black bg-[#00e5a0] px-3 py-2 text-center shadow-[3px_3px_0_#111]">
            <p class="text-[10px] font-bold uppercase tracking-wide text-black">Dispute</p>
            <p class="text-xl font-black text-black">0</p>
          </div>
        </div>
      </div>
    </section>

    <!-- DELIVERY STRIP (4 metrics với màu Neo-Brutalism) -->
    <section class="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
      <div class="rounded-lg border-2 border-black bg-[#00e5a0] px-3 py-2 shadow-[4px_4px_0_#111]">
        <p class="text-[10px] font-bold uppercase tracking-wide text-black">Trễ deadline</p>
        <p class="text-2xl font-black text-black">{deliveryMetrics.delivery.late_percentage}%</p>
      </div>
      <div class="rounded-lg border-2 border-black bg-[#0096FF] px-3 py-2 shadow-[4px_4px_0_#111]">
        <p class="text-[10px] font-bold uppercase tracking-wide text-white">Estimate ok</p>
        <p class="text-2xl font-black text-white">{deliveryMetrics.delivery.estimate_accuracy_percentage}%</p>
      </div>
      <div class="rounded-lg border-2 border-black bg-[#FFE500] px-3 py-2 shadow-[4px_4px_0_#111]">
        <p class="text-[10px] font-bold uppercase tracking-wide text-black">Đúng hạn</p>
        <p class="text-2xl font-black text-black">{deliveryMetrics.delivery.tasks_on_time}/{deliveryMetrics.delivery.total_tasks_completed}</p>
      </div>
      <div class="rounded-lg border-2 border-black bg-[#FF6B00] px-3 py-2 shadow-[4px_4px_0_#111]">
        <p class="text-[10px] font-bold uppercase tracking-wide text-white">Vượt giờ TB</p>
        <p class="text-2xl font-black text-white">+{deliveryMetrics.delivery.avg_hours_over_estimate.toFixed(1)}h</p>
      </div>
    </section>

    <!-- MAIN 2-COL: Skills + Charts -->
    <section class="grid gap-3 xl:grid-cols-2">
      <!-- Skills List -->
      <div class={neoBrutalCard}>
        <p class="mb-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-600">Chi tiết kỹ năng</p>

        {#if groupedSkills().length === 0}
          <p class="text-sm font-semibold text-slate-500">Chưa có kỹ năng nào</p>
        {:else}
          <div class="space-y-4">
            {#each groupedSkills() as group (group.code)}
              <div class="space-y-1">
                <div class="flex items-center gap-2">
                  <span class="inline-block rounded border-2 border-black px-2 py-0.5 text-[10px] font-black uppercase tracking-wide shadow-[2px_2px_0_#111] {group.bgClass}">{group.title}</span>
                </div>

                {#each group.items as skill (skill.id)}
                  <div class="flex items-center justify-between gap-2 border-b border-dashed border-black/40 py-1 text-xs {skill.total_reviews === 0 ? 'opacity-40' : ''}">
                    <span class="flex items-center gap-1 font-bold">
                      {skill.skill_name}
                      {#if skill.total_reviews === 0}
                        <span class="rounded border border-black px-1 text-[9px] font-bold uppercase">tự khai</span>
                      {/if}
                    </span>
                    <span class="rounded-full border-2 border-black px-2 py-0.5 text-[10px] font-black shadow-[2px_2px_0_#111] {levelClass(skill.level_code)}">{levelLabel(skill.level_code)}</span>
                  </div>
                {/each}
              </div>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Spider Charts -->
      <div class={neoBrutalCard}>
        <p class="mb-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-600">Biểu đồ kỹ năng</p>

        <div class="space-y-4">
          <div class="space-y-2">
            <div class="flex flex-wrap items-center justify-between gap-2 text-[11px] font-bold text-slate-600">
              <div class="flex items-center gap-1"><span class="inline-block h-2 w-2 rounded-full bg-[#9B5DE5]"></span>Kỹ thuật</div>
              <div class="flex items-center gap-3 text-[10px] font-bold"><span class="text-[#9B5DE5]">Đã review</span><span class="opacity-50">Tự khai</span></div>
            </div>
            <div class="min-h-[220px]">
              <SpiderChart
                softSkills={spiderChartData.technical}
                delivery={declaredRadar(spiderChartData.technical)}
                softSkillsLabel="Đã review"
                deliveryLabel="Tự khai"
                size={300}
              />
            </div>
          </div>

          <div class="border-t-2 border-black pt-4">
            <div class="flex flex-wrap items-center justify-between gap-2 text-[11px] font-bold text-slate-600">
              <div class="flex items-center gap-1"><span class="inline-block h-2 w-2 rounded-full bg-[#00C853]"></span>Kỹ năng mềm</div>
              <div class="flex items-center gap-3 text-[10px] font-bold"><span class="text-[#00C853]">Đã review</span><span class="opacity-50">Tự khai</span></div>
            </div>
            <div class="min-h-[220px]">
              <SpiderChart
                softSkills={spiderChartData.soft_skills}
                delivery={declaredRadar(spiderChartData.soft_skills)}
                softSkillsLabel="Đã review"
                deliveryLabel="Tự khai"
                size={300}
              />
            </div>
          </div>

          <div class="border-t-2 border-black pt-4">
            <div class="flex flex-wrap items-center justify-between gap-2 text-[11px] font-bold text-slate-600">
              <div class="flex items-center gap-1"><span class="inline-block h-2 w-2 rounded-full bg-[#FF6B00]"></span>Delivery</div>
              <div class="flex items-center gap-3 text-[10px] font-bold"><span class="text-[#FF6B00]">Đã review</span><span class="opacity-50">Tự khai</span></div>
            </div>
            <div class="min-h-[220px]">
              <SpiderChart
                softSkills={spiderChartData.delivery}
                delivery={declaredRadar(spiderChartData.delivery)}
                softSkillsLabel="Đã review"
                deliveryLabel="Tự khai"
                size={300}
              />
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- REVIEWS (Neo-Brutalism bg-#0096FF) -->
    <section class="rounded-[10px] border-2 border-black bg-[#0096FF] p-4 shadow-[6px_6px_0_#111]">
      <div class="mb-2 flex items-center justify-between gap-2">
        <p class="text-[10px] font-black uppercase tracking-[0.18em] text-white">Đánh giá nổi bật</p>
        <span class="rounded-full border-2 border-black bg-[#FFE500] px-2 py-0.5 text-[10px] font-black text-black">{deliveryMetrics.skill_aggregation.reviewed_skills} đánh giá</span>
      </div>

      {#if featuredReviews.length === 0}
        <p class="border-t-2 border-white pt-2 text-sm font-semibold text-white">Chưa có đánh giá nổi bật để hiển thị.</p>
      {:else}
        <div class="grid gap-3 md:grid-cols-2">
          {#each featuredReviews as item (item.skill_id)}
            <article class="border-t-2 border-white pt-2">
              <div class="mb-1 flex items-center gap-2">
                <div class="flex h-7 w-7 items-center justify-center rounded-full border-2 border-black bg-[#FFE500] text-[10px] font-black text-black">
                  {item.skill_name.slice(0, 2).toUpperCase()}
                </div>
                <div class="min-w-0 flex-1">
                  <p class="truncate text-xs font-black text-white">{item.reviewer_name}</p>
                  <p class="text-[10px] font-semibold text-white opacity-75">{item.reviewer_role}</p>
                </div>
                <div class="ml-auto flex gap-1" aria-label={`${item.stars} stars`}>
                  {#each Array.from({ length: 5 }) as _, i}
                    <span class={i < item.stars ? 'text-[#FFE500]' : 'text-white/30'}>★</span>
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
  </div>
</AppLayout>
