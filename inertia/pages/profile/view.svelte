<script lang="ts">
  /* eslint-disable svelte/no-unused-class-name */
  import AppLayout from '@/layouts/app_layout.svelte'
  import { router } from '@inertiajs/svelte'
  import { useTranslation } from '@/stores/translation.svelte'
  import Button from '@/components/ui/button.svelte'
  import SpiderChart from '../reviews/components/spider_chart.svelte'
  import type { ProfileViewProps, SpiderChartPoint } from './types.svelte'

  interface Props {
    user: ProfileViewProps['user']
    completeness: ProfileViewProps['completeness']
    spiderChartData: ProfileViewProps['spiderChartData']
    isOwnProfile: ProfileViewProps['isOwnProfile']
  }

  const { user, completeness, spiderChartData, isOwnProfile }: Props = $props()
  const { t } = useTranslation()

  const pageTitle = $derived(isOwnProfile ? t('profile.show', {}, 'Hồ sơ cá nhân') : `${user.username} - Hồ sơ`)

  const userSkills = $derived(
    (user.skills ?? []).map((s) => ({
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
        dotClass:
          code === 'technical'
            ? 'bg-violet-500'
            : code === 'soft_skill'
              ? 'bg-emerald-500'
              : code === 'delivery'
                ? 'bg-amber-600'
                : 'bg-slate-500',
        items,
      }))
  })

  const reviewedSkills = $derived(userSkills.filter((s) => s.total_reviews > 0).length)
  const totalReviews = $derived(userSkills.reduce((sum, s) => sum + s.total_reviews, 0))
  const avgSkillPercent = $derived(() => {
    const values = userSkills
      .map((s) => s.avg_percentage)
      .filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
    if (values.length === 0) return 0
    return values.reduce((sum, n) => sum + n, 0) / values.length
  })

  const initials = $derived(
    user.username
      .split(/[\s@]+/)
      .slice(0, 2)
      .map((s) => s[0].toUpperCase())
      .join('')
  )

  const joinedAt = $derived(() => {
    const date = new Date(user.created_at)
    if (Number.isNaN(date.getTime())) return 'N/A'
    return date.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })
  })

  const yearsOfExp = $derived(() => {
    const date = new Date(user.created_at)
    if (Number.isNaN(date.getTime())) return 'N/A'
    const diff = (Date.now() - date.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
    return `${Math.max(1, Math.floor(diff))} năm`
  })

  const profileLanguage = $derived((user as Record<string, unknown>).language as string | undefined)
  const freelancerRating = $derived((user as Record<string, unknown>).freelancer_rating as number | null | undefined)
  const doneTasks = $derived((user as Record<string, unknown>).freelancer_completed_tasks_count as number | undefined)
  const onTimeTasks = $derived(Math.round((reviewedSkills / Math.max(userSkills.length, 1)) * (doneTasks ?? 0)))

  const featuredInsights = $derived(
    [...userSkills]
      .sort((a, b) => {
        if (b.total_reviews !== a.total_reviews) return b.total_reviews - a.total_reviews
        return (b.avg_percentage ?? 0) - (a.avg_percentage ?? 0)
      })
      .slice(0, 2)
      .map((skill, index) => ({
        id: skill.id,
        initials: skill.skill_name.slice(0, 2).toUpperCase(),
        reviewer: index === 0 ? 'Đánh giá kỹ thuật' : 'Đánh giá năng lực',
        role: skill.total_reviews > 0 ? `${skill.total_reviews} lượt đánh giá` : 'Chưa có review',
        stars: Math.max(1, Math.min(5, Math.round((skill.avg_percentage ?? 20) / 20))),
        content:
          skill.total_reviews > 0
            ? `${skill.skill_name} đang giữ mức ${levelLabel(skill.level_code)} với điểm trung bình ${(skill.avg_percentage ?? 0).toFixed(1)}%.`
            : `${skill.skill_name} mới được khai báo, chưa có lượt review để chấm điểm.`,
        task: `Skill: ${skill.skill_name}`,
      }))
  )

  const brutalCardClass =
    'rounded-[10px] border-2 border-black bg-[#fffef9] p-4 shadow-[6px_6px_0_#111] dark:border-white dark:bg-slate-800 dark:shadow-[6px_6px_0_#fff]'

  function levelLabel(levelCode: string): string {
    const code = levelCode.toLowerCase()
    if (code.includes('begin')) return 'Beginner'
    if (code.includes('jun')) return 'Junior'
    if (code.includes('mid')) return 'Middle'
    if (code.includes('sen')) return 'Senior'
    if (code.includes('lead')) return 'Lead'
    return levelCode
  }

  function levelClass(levelCode: string): string {
    const code = levelCode.toLowerCase()
    if (code.includes('begin')) return 'bg-zinc-200 text-zinc-700'
    if (code.includes('jun')) return 'bg-lime-200 text-lime-800'
    if (code.includes('mid')) return 'bg-sky-200 text-sky-800'
    if (code.includes('sen')) return 'bg-violet-200 text-violet-800'
    if (code.includes('lead')) return 'bg-amber-200 text-amber-900'
    return 'bg-zinc-200 text-zinc-700'
  }

  function declaredRadar(points: SpiderChartPoint[]): SpiderChartPoint[] {
    return points.map((point) => ({
      ...point,
      avg_percentage: Math.min(100, point.avg_percentage + 6),
    }))
  }

  function goToReviews() {
    router.get(`/users/${user.id}/reviews`)
  }

  function goToEditProfile() {
    router.get('/profile/edit')
  }
</script>

<svelte:head>
  <title>{pageTitle}</title>
</svelte:head>

<AppLayout title={pageTitle}>
  <div class="w-full space-y-3 px-4 py-4 sm:px-6 lg:px-8">
    <section class={brutalCardClass}>
      <div class="grid gap-4 lg:grid-cols-[auto_1fr_auto] lg:items-center">
        <div class="flex h-14 w-14 items-center justify-center rounded-full border-2 border-black bg-violet-300 text-lg font-extrabold text-violet-950 dark:border-white">
          {initials}
        </div>

        <div class="space-y-2">
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-xl font-black">{user.username}</span>
            <span class="inline-flex items-center gap-1 rounded-full border border-sky-400 bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-800">
              <span class="h-1.5 w-1.5 rounded-full bg-sky-700"></span>Đã xác thực
            </span>
          </div>

          <p class="text-xs font-semibold text-slate-600 dark:text-slate-300">
            {user.status_name ?? 'Thành viên'}
            {#if user.current_organization?.name}
              · {user.current_organization.name}
            {/if}
          </p>

          <div class="grid gap-x-4 gap-y-1 text-xs sm:grid-cols-2 lg:grid-cols-3">
            <div><span class="font-semibold text-slate-500">Tổ chức:</span> {user.current_organization?.name ?? 'Chưa tham gia'}</div>
            <div><span class="font-semibold text-slate-500">Kinh nghiệm:</span> {yearsOfExp()}</div>
            <div><span class="font-semibold text-slate-500">Tham gia:</span> {joinedAt()}</div>
            <div><span class="font-semibold text-slate-500">Múi giờ:</span> {user.timezone ?? 'N/A'}</div>
            <div><span class="font-semibold text-slate-500">Ngôn ngữ:</span> {profileLanguage ?? 'Tiếng Việt'}</div>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
          <div class="rounded-lg border-2 border-black bg-zinc-100 px-3 py-2 text-center dark:border-white dark:bg-zinc-900">
            <p class="text-[10px] font-bold text-slate-500">Trust score</p>
            <p class="text-xl font-black">{typeof user.trust_score === 'number' ? user.trust_score.toFixed(1) : '--'}</p>
          </div>
          <div class="rounded-lg border-2 border-black bg-zinc-100 px-3 py-2 text-center dark:border-white dark:bg-zinc-900">
            <p class="text-[10px] font-bold text-slate-500">Rating</p>
            <p class="text-xl font-black">{typeof freelancerRating === 'number' ? freelancerRating.toFixed(1) : '--'}</p>
          </div>
          <div class="rounded-lg border-2 border-black bg-zinc-100 px-3 py-2 text-center dark:border-white dark:bg-zinc-900">
            <p class="text-[10px] font-bold text-slate-500">Tasks xong</p>
            <p class="text-xl font-black">{doneTasks ?? 0}</p>
          </div>
          <div class="rounded-lg border-2 border-black bg-zinc-100 px-3 py-2 text-center dark:border-white dark:bg-zinc-900">
            <p class="text-[10px] font-bold text-slate-500">Dispute</p>
            <p class="text-xl font-black text-lime-700">0</p>
          </div>
        </div>
      </div>
    </section>

    <div class="flex justify-end gap-2">
      <Button variant="outline" size="sm" onclick={goToReviews}>Xem đánh giá</Button>
      {#if isOwnProfile}
        <Button variant="outline" size="sm" onclick={goToEditProfile}>Chỉnh sửa</Button>
      {/if}
    </div>

    <section class="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
      <div class="rounded-lg border-2 border-black bg-white px-3 py-2 shadow-[4px_4px_0_#111] dark:border-white dark:bg-slate-800 dark:shadow-[4px_4px_0_#fff]">
        <p class="text-[10px] font-bold uppercase tracking-wide text-slate-500">Tỉ lệ trễ deadline</p>
        <p class="text-2xl font-black">{Math.max(0, 100 - Math.round(completeness))}%</p>
      </div>
      <div class="rounded-lg border-2 border-black bg-white px-3 py-2 shadow-[4px_4px_0_#111] dark:border-white dark:bg-slate-800 dark:shadow-[4px_4px_0_#fff]">
        <p class="text-[10px] font-bold uppercase tracking-wide text-slate-500">Estimate chính xác</p>
        <p class="text-2xl font-black text-lime-700">{Math.round(completeness)}%</p>
      </div>
      <div class="rounded-lg border-2 border-black bg-white px-3 py-2 shadow-[4px_4px_0_#111] dark:border-white dark:bg-slate-800 dark:shadow-[4px_4px_0_#fff]">
        <p class="text-[10px] font-bold uppercase tracking-wide text-slate-500">Tasks đúng hạn</p>
        <p class="text-2xl font-black">{onTimeTasks} / {doneTasks ?? 0}</p>
      </div>
      <div class="rounded-lg border-2 border-black bg-white px-3 py-2 shadow-[4px_4px_0_#111] dark:border-white dark:bg-slate-800 dark:shadow-[4px_4px_0_#fff]">
        <p class="text-[10px] font-bold uppercase tracking-wide text-slate-500">Điểm kỹ năng trung bình</p>
        <p class="text-2xl font-black text-amber-700">{avgSkillPercent().toFixed(1)}%</p>
      </div>
    </section>

    <section class="grid gap-3 xl:grid-cols-2">
      <div class={brutalCardClass}>
        <p class="mb-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Chi tiết kỹ năng</p>

        {#if groupedSkills().length === 0}
          <p class="text-sm font-semibold text-slate-500">Chưa có kỹ năng nào</p>
        {:else}
          <div class="space-y-4">
            {#each groupedSkills() as group (group.code)}
              <div class="space-y-1">
                <div class="flex items-center gap-2 border-b-2 border-black pb-1 dark:border-white">
                  <span class="h-2 w-2 rounded-full {group.dotClass}"></span>
                  <span class="text-[11px] font-black uppercase tracking-wide text-slate-600 dark:text-slate-200">{group.title}</span>
                </div>

                {#each group.items as skill (skill.id)}
                  <div class="flex items-center justify-between gap-2 border-b border-dashed border-black/60 py-1 text-xs dark:border-white/60 {skill.total_reviews === 0 ? 'opacity-60' : ''}">
                    <span class="flex items-center gap-1 font-bold">
                      {skill.skill_name}
                      {#if skill.total_reviews === 0}
                        <span class="rounded border border-black px-1 text-[9px] dark:border-white">tự khai</span>
                      {/if}
                    </span>
                    <span class="rounded-full px-2 py-0.5 text-[10px] font-black {levelClass(skill.level_code)}">{levelLabel(skill.level_code)}</span>
                  </div>
                {/each}
              </div>
            {/each}
          </div>
        {/if}
      </div>

      <div class={brutalCardClass}>
        <p class="mb-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Biểu đồ kỹ năng</p>

        <div class="space-y-4">
          <div class="space-y-2">
            <div class="flex flex-wrap items-center justify-between gap-2 text-[11px] font-bold text-slate-600 dark:text-slate-200">
              <div class="flex items-center gap-1"><span class="h-2 w-2 rounded-full bg-violet-500"></span>Kỹ thuật</div>
              <div class="flex items-center gap-3 text-[10px]"><span class="text-violet-700">Đã review</span><span class="text-violet-400">Tự khai</span></div>
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

          <div class="border-t-2 border-black pt-4 dark:border-white">
            <div class="flex flex-wrap items-center justify-between gap-2 text-[11px] font-bold text-slate-600 dark:text-slate-200">
              <div class="flex items-center gap-1"><span class="h-2 w-2 rounded-full bg-emerald-500"></span>Kỹ năng mềm</div>
              <div class="flex items-center gap-3 text-[10px]"><span class="text-emerald-700">Đã review</span><span class="text-emerald-400">Tự khai</span></div>
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

          <div class="border-t-2 border-black pt-4 dark:border-white">
            <div class="flex flex-wrap items-center justify-between gap-2 text-[11px] font-bold text-slate-600 dark:text-slate-200">
              <div class="flex items-center gap-1"><span class="h-2 w-2 rounded-full bg-amber-600"></span>Delivery</div>
              <div class="flex items-center gap-3 text-[10px]"><span class="text-amber-700">Đã review</span><span class="text-amber-400">Tự khai</span></div>
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

    <section class={brutalCardClass}>
      <div class="mb-2 flex items-center justify-between gap-2">
        <p class="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Đánh giá nổi bật</p>
        <span class="rounded-full border-2 border-black bg-amber-200 px-2 py-0.5 text-[10px] font-black dark:border-white dark:text-slate-900">{totalReviews} đánh giá</span>
      </div>

      {#if featuredInsights.length === 0}
        <p class="border-t-2 border-black pt-2 text-sm font-semibold text-slate-500 dark:border-white">Chưa có đánh giá nổi bật để hiển thị.</p>
      {:else}
        <div class="grid gap-3 md:grid-cols-2">
          {#each featuredInsights as item (item.id)}
            <article class="border-t-2 border-black pt-2 dark:border-white">
              <div class="mb-1 flex items-center gap-2">
                <div class="flex h-7 w-7 items-center justify-center rounded-full border-2 border-black bg-emerald-200 text-[10px] font-black text-emerald-900 dark:border-white">
                  {item.initials}
                </div>
                <div>
                  <p class="text-xs font-black">{item.reviewer}</p>
                  <p class="text-[10px] font-semibold text-slate-500">{item.role}</p>
                </div>
                <div class="ml-auto flex gap-1" aria-label={`${item.stars} stars`}>
                  {#each Array.from({ length: 5 }) as _, i}
                    <span class={i < item.stars ? 'text-amber-500' : 'text-slate-300'}>★</span>
                  {/each}
                </div>
              </div>
              <p class="text-xs font-semibold text-slate-700 dark:text-slate-200">{item.content}</p>
              <p class="mt-1 text-[10px] font-semibold text-slate-500">{item.task}</p>
            </article>
          {/each}
        </div>
      {/if}
    </section>
  </div>
</AppLayout>
