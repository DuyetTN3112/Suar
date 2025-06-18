<script lang="ts">

  import AppLayout from '@/layouts/app_layout.svelte'
  import { router } from '@inertiajs/svelte'
  import { useTranslation } from '@/stores/translation.svelte'
  import Button from '@/components/ui/button.svelte'
  import SpiderChart from '../reviews/components/spider_chart.svelte'
  import {
    getProfileGroupStyle,
    getProfileLevelClass,
    getProfileLevelLabel,
  } from './profile_theme'
  import type { ProfileViewProps } from './types.svelte'

  interface DeliveryMetrics {
    delivery: {
      late_percentage: number
      estimate_accuracy_percentage: number
      tasks_on_time: number
      avg_hours_over_estimate: number
    }
    skill_aggregation: {
      total_skills: number
      reviewed_skills: number
      avg_percentage: number
    }
    years_of_experience: number
    joined_at_formatted: string
  }

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
    user: ProfileViewProps['user']
    completeness: ProfileViewProps['completeness']
    spiderChartData: ProfileViewProps['spiderChartData']
    isOwnProfile: ProfileViewProps['isOwnProfile']
    deliveryMetrics: DeliveryMetrics
    featuredReviews: FeaturedReview[]
  }

  const {
    user,
    completeness: _completeness,
    spiderChartData,
    isOwnProfile,
    deliveryMetrics,
    featuredReviews,
  }: Props = $props()
  const { t } = useTranslation()

  const pageTitle = $derived(isOwnProfile ? t('profile.show', {}, 'Hồ sơ cá nhân') : `${user.username} - Hồ sơ`)

  const userSkills = $derived(
    (user.skills ?? []).map((s) => {
      const relation = s as unknown as Record<string, unknown>
      const skill = (s.skill ?? {}) as Record<string, unknown>
      return {
        id: s.id,
        skill_id: s.skill_id,
        skill_name:
          (skill.skill_name as string | undefined) ??
          (skill.skillName as string | undefined) ??
          (relation.skill_name as string | undefined) ??
          'Kỹ năng chưa đặt tên',
        category_code:
          (skill.category_code as string | undefined) ??
          (skill.categoryCode as string | undefined) ??
          (relation.category_code as string | undefined) ??
          'other',
        level_code:
          (s as { level_code?: string | null }).level_code ??
          (relation.level_code as string | undefined) ??
          (relation.levelCode as string | undefined) ??
          null,
        avg_percentage: s.avg_percentage ?? (relation.avgPercentage as number | null | undefined) ?? null,
        total_reviews:
          (s as { total_reviews?: number }).total_reviews ??
          (relation.totalReviews as number | undefined) ??
          0,
      }
    })
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
      .map(([code, items]) => {
        const style = getProfileGroupStyle(code)
        return {
          code,
          title: style.title,
          badgeClass: style.badgeClass,
          dotClass: style.dotClass,
          textClass: style.textClass,
          items,
        }
      })
  })

  const fallbackGroupedSkills = $derived.by(() => {
    const fromSpider = [
      (() => {
        const style = getProfileGroupStyle('technical')
        return {
          code: 'technical',
          title: style.title,
          badgeClass: style.badgeClass,
          dotClass: style.dotClass,
          textClass: style.textClass,
        items: spiderChartData.technical.map((point) => {
          const pointData = point as unknown as Record<string, unknown>
          return {
            id: point.skill_id,
            skill_name: point.skill_name,
            level_code:
              point.level_code ??
              (pointData.level_code as string | undefined) ??
              (pointData.levelCode as string | undefined) ??
              null,
            total_reviews: point.total_reviews,
          }
        }),
        }
      })(),
      (() => {
        const style = getProfileGroupStyle('soft_skill')
        return {
          code: 'soft_skill',
          title: style.title,
          badgeClass: style.badgeClass,
          dotClass: style.dotClass,
          textClass: style.textClass,
        items: spiderChartData.soft_skills.map((point) => {
          const pointData = point as unknown as Record<string, unknown>
          return {
            id: point.skill_id,
            skill_name: point.skill_name,
            level_code:
              point.level_code ??
              (pointData.level_code as string | undefined) ??
              (pointData.levelCode as string | undefined) ??
              null,
            total_reviews: point.total_reviews,
          }
        }),
        }
      })(),
      (() => {
        const style = getProfileGroupStyle('delivery')
        return {
          code: 'delivery',
          title: style.title,
          badgeClass: style.badgeClass,
          dotClass: style.dotClass,
          textClass: style.textClass,
        items: spiderChartData.delivery.map((point) => {
          const pointData = point as unknown as Record<string, unknown>
          return {
            id: point.skill_id,
            skill_name: point.skill_name,
            level_code:
              point.level_code ??
              (pointData.level_code as string | undefined) ??
              (pointData.levelCode as string | undefined) ??
              null,
            total_reviews: point.total_reviews,
          }
        }),
        }
      })(),
    ]

    return fromSpider.filter((group) => group.items.length > 0)
  })

  const effectiveGroupedSkills = $derived.by(() => {
    const direct = groupedSkills()
    return direct.length > 0 ? direct : fallbackGroupedSkills
  })

  const totalReviews = $derived(userSkills.reduce((sum, s) => sum + s.total_reviews, 0))

  const initials = $derived(
    user.username
      .split(/[\s@]+/)
      .slice(0, 2)
      .map((s) => s[0].toUpperCase())
      .join('')
  )
  const neoBrutalCard = 'neo-panel p-4'
  const neoMetricCard = 'neo-panel-muted px-3 py-2 text-center'

  const profileLanguage = $derived((user as Record<string, unknown>).language as string | undefined)
  const freelancerRating = $derived((user as Record<string, unknown>).freelancer_rating as number | null | undefined)
  const doneTasks = $derived((user as Record<string, unknown>).freelancer_completed_tasks_count as number | undefined)

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
    <section class="neo-hero-orange rounded-[10px] p-4">
      <div class="grid gap-4 lg:grid-cols-[auto_1fr_auto] lg:items-center">
        <div class="flex h-14 w-14 items-center justify-center rounded-full border-2 border-border bg-background text-lg font-extrabold text-foreground shadow-neo-sm dark:bg-card dark:text-card-foreground">
          {initials}
        </div>

        <div class="space-y-2">
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-xl font-black text-white">{user.username}</span>
            <span class="neo-pill-ink inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
              <span class="h-1.5 w-1.5 rounded-full bg-white"></span>Đã xác thực
            </span>
          </div>

          <p class="text-xs font-semibold text-white/80">
            {user.status_name ?? 'Thành viên'}
            · Hồ sơ tổng hợp toàn bộ tổ chức/dự án
          </p>

          <div class="grid gap-x-4 gap-y-1 text-xs sm:grid-cols-2 lg:grid-cols-3">
            <div><span class="font-semibold text-white/65">Phạm vi:</span> <span class="text-white">Toàn bộ tổ chức & dự án</span></div>
            <div><span class="font-semibold text-white/65">Kinh nghiệm:</span> <span class="text-white">{deliveryMetrics.years_of_experience} năm</span></div>
            <div><span class="font-semibold text-white/65">Tham gia:</span> <span class="text-white">{deliveryMetrics.joined_at_formatted}</span></div>
            <div><span class="font-semibold text-white/65">Múi giờ:</span> <span class="text-white">{user.timezone ?? 'N/A'}</span></div>
            <div><span class="font-semibold text-white/65">Ngôn ngữ:</span> <span class="text-white">{profileLanguage ?? 'Tiếng Việt'}</span></div>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
          <div class="{neoMetricCard} bg-background/92 dark:bg-card">
            <p class="text-[10px] font-bold text-muted-foreground">Trust score</p>
            <p class="text-xl font-black text-foreground">{typeof user.trust_score === 'number' ? user.trust_score.toFixed(1) : '--'}</p>
          </div>
          <div class="{neoMetricCard} bg-fuchsia-100 text-fuchsia-950 dark:bg-fuchsia-950/40 dark:text-fuchsia-100">
            <p class="text-[10px] font-bold text-current/70">Rating</p>
            <p class="text-xl font-black">{typeof freelancerRating === 'number' ? freelancerRating.toFixed(1) : '--'}</p>
          </div>
          <div class="{neoMetricCard} bg-blue-100 text-blue-950 dark:bg-blue-950/40 dark:text-blue-100">
            <p class="text-[10px] font-bold text-current/70">Tasks xong</p>
            <p class="text-xl font-black">{doneTasks ?? 0}</p>
          </div>
          <div class="{neoMetricCard} bg-foreground text-background dark:bg-background dark:text-foreground">
            <p class="text-[10px] font-bold text-current/70">Dispute</p>
            <p class="text-xl font-black">0</p>
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
      <div class="{neoMetricCard} bg-orange-100 text-orange-950 dark:bg-orange-950/40 dark:text-orange-100">
        <p class="text-[10px] font-bold uppercase tracking-wide text-current/70">Trễ deadline</p>
        <p class="text-2xl font-black">{deliveryMetrics.delivery.late_percentage.toFixed(1)}%</p>
      </div>
      <div class="{neoMetricCard} bg-blue-100 text-blue-950 dark:bg-blue-950/40 dark:text-blue-100">
        <p class="text-[10px] font-bold uppercase tracking-wide text-current/70">Estimate ok</p>
        <p class="text-2xl font-black">{deliveryMetrics.delivery.estimate_accuracy_percentage.toFixed(1)}%</p>
      </div>
      <div class="{neoMetricCard} bg-foreground text-background dark:bg-background dark:text-foreground">
        <p class="text-[10px] font-bold uppercase tracking-wide text-current/70">Tasks đúng hạn</p>
        <p class="text-2xl font-black">{deliveryMetrics.delivery.tasks_on_time} / {doneTasks ?? 0}</p>
      </div>
      <div class="{neoMetricCard} bg-fuchsia-100 text-fuchsia-950 dark:bg-fuchsia-950/40 dark:text-fuchsia-100">
        <p class="text-[10px] font-bold uppercase tracking-wide text-current/70">Điểm kỹ năng TB</p>
        <p class="text-2xl font-black">{deliveryMetrics.skill_aggregation.avg_percentage.toFixed(1)}%</p>
      </div>
    </section>

    <section class="grid gap-3 xl:grid-cols-2">
      <div class={neoBrutalCard}>
        <p class="mb-3 text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Chi tiết kỹ năng</p>

        {#if effectiveGroupedSkills.length === 0}
          <p class="text-sm font-semibold text-muted-foreground">Chưa có kỹ năng nào</p>
        {:else}
          <div class="space-y-4">
            {#each effectiveGroupedSkills as group (group.code)}
              <div class="space-y-1">
                <div class="flex items-center gap-2 border-b-2 border-border pb-1">
                  <span class="h-2 w-2 rounded-full {group.dotClass}"></span>
                  <span class="text-[11px] font-black uppercase tracking-wide {group.textClass}">{group.title}</span>
                </div>

                {#each group.items as skill (skill.id)}
                  <div class="flex items-center justify-between gap-2 border-b border-dashed border-border/60 py-1 text-xs {skill.total_reviews === 0 ? 'opacity-60' : ''}">
                    <span class="flex items-center gap-1 font-bold">
                      {skill.skill_name}
                      {#if skill.total_reviews === 0}
                        <span class="rounded border border-border px-1 text-[9px]">tự khai</span>
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
              <div class="flex items-center gap-1"><span class="h-2 w-2 rounded-full neo-dot-magenta"></span>Kỹ thuật</div>
              <div class="flex items-center gap-3 text-[10px]"><span class="neo-text-magenta">Đã review</span></div>
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
              <div class="flex items-center gap-1"><span class="h-2 w-2 rounded-full neo-dot-blue"></span>Kỹ năng mềm</div>
              <div class="flex items-center gap-3 text-[10px]"><span class="neo-text-blue">Đã review</span></div>
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
              <div class="flex items-center gap-1"><span class="h-2 w-2 rounded-full neo-dot-orange"></span>Delivery</div>
              <div class="flex items-center gap-3 text-[10px]"><span class="neo-text-orange">Đã review</span></div>
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

    <section class="neo-hero-blue rounded-[10px] p-4">
      <div class="mb-2 flex items-center justify-between gap-2">
        <p class="text-[10px] font-black uppercase tracking-[0.18em] text-white">Đánh giá nổi bật</p>
        <span class="neo-pill-ink rounded-full px-2 py-0.5 text-[10px] font-black">{totalReviews} đánh giá</span>
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
                <div>
                  <p class="text-xs font-black text-white">{item.reviewer_name}</p>
                  <p class="text-[10px] font-semibold text-white/75">{item.reviewer_role}</p>
                </div>
                <div class="ml-auto flex gap-1" aria-label={`${item.stars} stars`}>
                  {#each Array.from({ length: 5 }) as _, i}
                    <span class={i < item.stars ? 'text-orange-300' : 'text-white/30'}>★</span>
                  {/each}
                </div>
              </div>
              <p class="text-xs font-semibold text-white">{item.content}</p>
              <p class="mt-1 text-[10px] font-semibold text-white/75">{item.task_name}</p>
            </article>
          {/each}
        </div>
      {/if}
    </section>
  </div>
</AppLayout>
