<script lang="ts">
  import axios from 'axios'
  import { onMount } from 'svelte'
  import AppLayout from '@/layouts/app_layout.svelte'
  import { page } from '@inertiajs/svelte'
  import Button from '@/components/ui/button.svelte'
  import Input from '@/components/ui/input.svelte'
  import Label from '@/components/ui/label.svelte'
  import Switch from '@/components/ui/switch.svelte'
  import { useTranslation } from '@/stores/translation.svelte'
  import SpiderChart from '../reviews/components/spider_chart.svelte'
  import {
    getProfileGroupStyle,
    getProfileLevelClass,
    getProfileLevelLabel,
  } from './profile_theme'
  import type {
    ProfileSnapshotSummary,
    SerializedUserProfile,
    SpiderChartPoint,
  } from './types.svelte'

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
    user: SerializedUserProfile & Record<string, unknown>
    completeness: number
    spiderChartData: SpiderChartData
    deliveryMetrics: DeliveryMetrics
    featuredReviews: FeaturedReview[]
    currentSnapshot?: ProfileSnapshotSummary | null
  }

  const {
    user,
    completeness: _completeness,
    spiderChartData,
    deliveryMetrics,
    featuredReviews,
    currentSnapshot = null,
  }: Props = $props()
  const { t } = useTranslation()

  const pageTitle = $derived(t('profile.show', {}, 'Hồ sơ cá nhân'))
  const flash = $derived(($page as { props: { flash?: { success?: string; error?: string } } }).props.flash)
  let currentSnapshotState = $state<ProfileSnapshotSummary | null>(null)
  let snapshotHistory = $state<ProfileSnapshotSummary[]>([])
  let snapshotName = $state('')
  let publishAsPublic = $state(false)
  let snapshotBusy = $state(false)
  let snapshotHistoryLoading = $state(false)
  let snapshotFeedback = $state('')

  // Group skills by category (simple transform - NO business logic)
  const userSkills = $derived(
    (user.skills ?? []).map((skillRelation) => {
      const relation = skillRelation as unknown as Record<string, unknown>
      const skill = (skillRelation.skill ?? {}) as Record<string, unknown>

      return {
        id: skillRelation.id,
        skill_id: skillRelation.skill_id,
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
          (skillRelation as { level_code?: string | null }).level_code ??
          (relation.level_code as string | undefined) ??
          (relation.levelCode as string | undefined) ??
          null,
        avg_percentage:
          skillRelation.avg_percentage ?? (relation.avgPercentage as number | null | undefined) ?? null,
        total_reviews:
          (skillRelation as { total_reviews?: number }).total_reviews ??
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
          bgClass: style.badgeClass,
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
          bgClass: style.badgeClass,
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
          bgClass: style.badgeClass,
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
          bgClass: style.badgeClass,
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

  const initials = $derived(
    user.username
      .split(/[\s@]+/)
      .slice(0, 2)
      .map((s: string) => s[0].toUpperCase())
      .join('')
  )

  const neoBrutalCard = 'neo-panel p-4'
  const neoMutedCard = 'neo-panel-muted p-4'
  const neoMetricCard = 'neo-panel-muted px-3 py-2 text-center'
  const neoCompactCard = 'neo-panel-muted p-3'

  const currentSnapshotLink = $derived.by(() => {
    if (!currentSnapshotState?.shareable_slug || typeof window === 'undefined') {
      return null
    }

    const url = new URL(`/profiles/${currentSnapshotState.shareable_slug}`, window.location.origin)
    if (currentSnapshotState.shareable_token) {
      url.searchParams.set('token', currentSnapshotState.shareable_token)
    }
    return url.toString()
  })

  async function loadCurrentSnapshot() {
    const response = await axios.get<{ success: boolean; data: ProfileSnapshotSummary | null }>(
      '/profile/snapshots/current'
    )
    currentSnapshotState = response.data.data ?? null
  }

  async function loadSnapshotHistory() {
    snapshotHistoryLoading = true
    try {
      const response = await axios.get<{ success: boolean; data: ProfileSnapshotSummary[] }>(
        '/profile/snapshots/history',
        { params: { limit: 8 } }
      )
      snapshotHistory = response.data.data
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { message?: string } } }).response?.data?.message
      snapshotFeedback = message || 'Không thể tải lịch sử snapshot.'
    } finally {
      snapshotHistoryLoading = false
    }
  }

  async function publishSnapshot() {
    snapshotBusy = true
    snapshotFeedback = ''
    try {
      await axios.post('/profile/snapshots/publish', {
        snapshot_name: snapshotName || undefined,
        is_public: publishAsPublic,
      })
      await Promise.all([loadCurrentSnapshot(), loadSnapshotHistory()])
      snapshotName = ''
      snapshotFeedback = 'Đã publish snapshot hồ sơ mới.'
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { message?: string } } }).response?.data?.message
      snapshotFeedback = message || 'Không thể publish snapshot.'
    } finally {
      snapshotBusy = false
    }
  }

  async function updateSnapshotAccess(isPublic: boolean) {
    if (!currentSnapshotState) return

    snapshotBusy = true
    snapshotFeedback = ''
    try {
      await axios.patch(`/profile/snapshots/${currentSnapshotState.id}/access`, {
        is_public: isPublic,
      })
      await Promise.all([loadCurrentSnapshot(), loadSnapshotHistory()])
      snapshotFeedback = isPublic
        ? 'Snapshot hiện tại đã chuyển sang public.'
        : 'Snapshot hiện tại đã chuyển sang private.'
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { message?: string } } }).response?.data?.message
      snapshotFeedback = message || 'Không thể cập nhật quyền truy cập snapshot.'
    } finally {
      snapshotBusy = false
    }
  }

  async function rotateSnapshotLink() {
    if (!currentSnapshotState) return

    snapshotBusy = true
    snapshotFeedback = ''
    try {
      await axios.post(`/profile/snapshots/${currentSnapshotState.id}/rotate-link`)
      await Promise.all([loadCurrentSnapshot(), loadSnapshotHistory()])
      snapshotFeedback = 'Đã tạo share link mới cho snapshot hiện tại.'
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { message?: string } } }).response?.data?.message
      snapshotFeedback = message || 'Không thể rotate share link.'
    } finally {
      snapshotBusy = false
    }
  }

  async function copySnapshotLink() {
    if (!currentSnapshotLink || typeof navigator === 'undefined') return

    await navigator.clipboard.writeText(currentSnapshotLink)
    snapshotFeedback = 'Đã copy share link snapshot.'
  }

  onMount(() => {
    currentSnapshotState = currentSnapshot
    void loadSnapshotHistory()
  })
</script>

<svelte:head>
  <title>{pageTitle}</title>
</svelte:head>

<AppLayout title={pageTitle}>
  <div class="w-full space-y-3 px-4 py-4 sm:px-6 lg:px-8">
    {#if flash?.success}
      <div class="rounded-xl border border-blue-300 bg-blue-100 px-3 py-2 text-sm font-medium text-blue-950 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-100">
        {flash.success}
      </div>
    {/if}
    {#if flash?.error}
      <div class="rounded-xl border border-rose-300 bg-rose-100 px-3 py-2 text-sm font-medium text-rose-950 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-100">
        {flash.error}
      </div>
    {/if}

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

          <p class="text-xs font-bold text-white/80">
            {user.status_name ?? 'Thành viên'}
            · Hồ sơ tổng hợp toàn bộ tổ chức/dự án
            {#if currentSnapshotState}
              · Snapshot v{currentSnapshotState.version}
            {/if}
          </p>

          <div class="flex flex-wrap gap-x-4 gap-y-1 text-xs">
            <div><span class="text-[9px] font-extrabold uppercase tracking-wider text-white/60">Phạm vi</span> <span class="text-xs font-bold text-white">Toàn bộ tổ chức & dự án</span></div>
            <div><span class="text-[9px] font-extrabold uppercase tracking-wider text-white/60">Kinh nghiệm</span> <span class="text-xs font-bold text-white">{deliveryMetrics.years_of_experience} năm</span></div>
            <div><span class="text-[9px] font-extrabold uppercase tracking-wider text-white/60">Tham gia</span> <span class="text-xs font-bold text-white">{deliveryMetrics.joined_at_formatted}</span></div>
            <div><span class="text-[9px] font-extrabold uppercase tracking-wider text-white/60">Múi giờ</span> <span class="text-xs font-bold text-white">{user.timezone ?? 'GMT+7'}</span></div>
            <div><span class="text-[9px] font-extrabold uppercase tracking-wider text-white/60">Ngôn ngữ</span> <span class="text-xs font-bold text-white">Tiếng Việt, English</span></div>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-2 lg:grid-cols-2 xl:grid-cols-4">
          <div class="{neoMetricCard} bg-background/92 dark:bg-card">
            <p class="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Trust</p>
            <p class="text-xl font-black text-foreground">{typeof user.trust_score === 'number' ? user.trust_score.toFixed(1) : '84.2'}</p>
          </div>
          <div class="{neoMetricCard} bg-fuchsia-100 text-fuchsia-950 dark:bg-fuchsia-950/40 dark:text-fuchsia-100">
            <p class="text-[10px] font-bold uppercase tracking-wide text-current/70">Rating</p>
            <p class="text-xl font-black">{typeof user.freelancer_rating === 'number' ? user.freelancer_rating.toFixed(1) : '--'} <span class="text-[11px] font-semibold opacity-80">({deliveryMetrics.skill_aggregation.reviewed_skills})</span></p>
          </div>
          <div class="{neoMetricCard} bg-blue-100 text-blue-950 dark:bg-blue-950/40 dark:text-blue-100">
            <p class="text-[10px] font-bold uppercase tracking-wide text-current/70">Tasks</p>
            <p class="text-xl font-black">{deliveryMetrics.delivery.total_tasks_completed}</p>
          </div>
          <div class="{neoMetricCard} bg-foreground text-background dark:bg-background dark:text-foreground">
            <p class="text-[10px] font-bold uppercase tracking-wide text-current/70">Dispute</p>
            <p class="text-xl font-black">0</p>
          </div>
        </div>
      </div>
    </section>

    <section class={neoBrutalCard}>
      <div class="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div class="space-y-4">
          <div>
            <p class="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Profile Snapshot</p>
            <h2 class="mt-2 text-lg font-black text-foreground">Đóng gói hồ sơ hiện tại thành một snapshot chia sẻ được</h2>
            <p class="mt-1 text-sm text-muted-foreground">
              Snapshot dùng để cố định trust score, review highlights và kỹ năng đã xác minh ở một thời điểm cụ thể.
            </p>
          </div>

          <div class="grid gap-3 md:grid-cols-[1fr_auto]">
            <div class="space-y-2">
              <Label for="snapshot_name">Tên snapshot</Label>
              <Input
                id="snapshot_name"
                value={snapshotName}
                oninput={(event: Event) => {
                  snapshotName = (event.currentTarget as HTMLInputElement).value
                }}
                placeholder="Ví dụ: Q1 2026 Profile Snapshot"
              />
            </div>

            <div class="space-y-2">
              <Label for="publish_public">Public snapshot</Label>
              <div class="flex h-10 items-center gap-3 rounded-md border px-3">
                <Switch
                  id="publish_public"
                  checked={publishAsPublic}
                  onCheckedChange={(checked: boolean) => {
                    publishAsPublic = checked
                  }}
                />
                <span class="text-sm">{publishAsPublic ? 'Public' : 'Private'}</span>
              </div>
            </div>
          </div>

          <div class="flex flex-wrap gap-2">
            <Button onclick={() => { void publishSnapshot() }} disabled={snapshotBusy}>
              {snapshotBusy ? 'Đang publish...' : 'Publish snapshot mới'}
            </Button>
            <Button variant="outline" onclick={() => { void loadSnapshotHistory() }} disabled={snapshotHistoryLoading}>
              {snapshotHistoryLoading ? 'Đang tải...' : 'Tải lịch sử'}
            </Button>
          </div>

          {#if snapshotFeedback}
            <p class="text-sm text-muted-foreground">{snapshotFeedback}</p>
          {/if}
        </div>

        <div class={neoMutedCard}>
          <p class="text-xs font-black uppercase tracking-wide text-muted-foreground">Snapshot hiện tại</p>

          {#if currentSnapshotState}
            <div class="mt-3 space-y-3 text-sm">
              <div class="flex items-center justify-between gap-2">
                <span class="font-semibold">{currentSnapshotState.snapshot_name || `Snapshot v${currentSnapshotState.version}`}</span>
                <span class="rounded px-2 py-0.5 text-[10px] font-black uppercase {currentSnapshotState.is_public ? 'neo-pill-blue' : 'neo-pill-ink'}">
                  {currentSnapshotState.is_public ? 'Public' : 'Private'}
                </span>
              </div>

              <div class="grid gap-2 text-xs text-muted-foreground">
                <p>Version: <span class="font-bold text-foreground">{currentSnapshotState.version}</span></p>
                <p>Scoring version: <span class="font-bold text-foreground">{currentSnapshotState.scoring_version}</span></p>
                <p>Cập nhật: <span class="font-bold text-foreground">{new Date(currentSnapshotState.updated_at).toLocaleString('vi-VN')}</span></p>
              </div>

              <div class="flex items-center justify-between gap-3 rounded-lg border border-border/20 bg-background/80 px-3 py-2 dark:bg-card">
                <div>
                  <p class="text-xs font-bold uppercase text-muted-foreground">Share access</p>
                  <p class="text-sm font-semibold text-foreground">{currentSnapshotState.is_public ? 'Đang bật' : 'Đang tắt'}</p>
                </div>
                <Switch
                  checked={currentSnapshotState.is_public}
                  disabled={snapshotBusy}
                  onCheckedChange={(checked: boolean) => {
                    void updateSnapshotAccess(checked)
                  }}
                />
              </div>

              {#if currentSnapshotLink}
                <div class="rounded-lg border border-dashed border-border/30 bg-background/80 p-3 dark:bg-card">
                  <p class="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Share link</p>
                  <p class="mt-1 break-all text-xs text-foreground/80">{currentSnapshotLink}</p>
                </div>
              {/if}

              <div class="flex flex-wrap gap-2">
                <Button variant="outline" onclick={() => { void copySnapshotLink() }} disabled={!currentSnapshotLink}>
                  Copy link
                </Button>
                <Button variant="outline" onclick={() => { void rotateSnapshotLink() }} disabled={snapshotBusy || !currentSnapshotState.is_public}>
                  Rotate link
                </Button>
              </div>
            </div>
          {:else}
            <p class="mt-3 text-sm text-muted-foreground">Chưa có snapshot hiện tại. Hãy publish snapshot đầu tiên.</p>
          {/if}
        </div>
      </div>

      <div class="mt-4 border-t-2 border-border pt-4">
        <div class="mb-3 flex items-center justify-between gap-2">
          <p class="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Lịch sử snapshot</p>
          <span class="text-xs text-muted-foreground">{snapshotHistory.length} bản gần nhất</span>
        </div>

        {#if snapshotHistory.length === 0}
          <p class="text-sm text-muted-foreground">Chưa có snapshot nào trong lịch sử.</p>
        {:else}
          <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {#each snapshotHistory as snapshot (snapshot.id)}
              <article class={neoCompactCard}>
                <div class="flex items-start justify-between gap-2">
                  <div>
                    <p class="text-sm font-black text-foreground">{snapshot.snapshot_name || `Snapshot v${snapshot.version}`}</p>
                    <p class="text-[11px] text-muted-foreground">{new Date(snapshot.created_at).toLocaleString('vi-VN')}</p>
                  </div>
                  <span class="rounded px-2 py-0.5 text-[10px] font-bold uppercase {snapshot.is_public ? 'neo-pill-blue' : 'neo-pill-ink'}">
                    {snapshot.is_public ? 'Public' : 'Private'}
                  </span>
                </div>
                <div class="mt-3 text-xs text-muted-foreground">
                  <p>Version: <span class="font-bold text-foreground">{snapshot.version}</span></p>
                  <p>Scoring: <span class="font-bold text-foreground">{snapshot.scoring_version}</span></p>
                </div>
              </article>
            {/each}
          </div>
        {/if}
      </div>
    </section>

    <section class="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
      <div class="{neoMetricCard} bg-orange-100 text-orange-950 dark:bg-orange-950/40 dark:text-orange-100">
        <p class="text-[10px] font-bold uppercase tracking-wide text-current/70">Trễ deadline</p>
        <p class="text-2xl font-black">{deliveryMetrics.delivery.late_percentage}%</p>
      </div>
      <div class="{neoMetricCard} bg-blue-100 text-blue-950 dark:bg-blue-950/40 dark:text-blue-100">
        <p class="text-[10px] font-bold uppercase tracking-wide text-current/70">Estimate ok</p>
        <p class="text-2xl font-black">{deliveryMetrics.delivery.estimate_accuracy_percentage}%</p>
      </div>
      <div class="{neoMetricCard} bg-foreground text-background dark:bg-background dark:text-foreground">
        <p class="text-[10px] font-bold uppercase tracking-wide text-current/70">Đúng hạn</p>
        <p class="text-2xl font-black">{deliveryMetrics.delivery.tasks_on_time}/{deliveryMetrics.delivery.total_tasks_completed}</p>
      </div>
      <div class="{neoMetricCard} bg-fuchsia-100 text-fuchsia-950 dark:bg-fuchsia-950/40 dark:text-fuchsia-100">
        <p class="text-[10px] font-bold uppercase tracking-wide text-current/70">Vượt giờ TB</p>
        <p class="text-2xl font-black">+{deliveryMetrics.delivery.avg_hours_over_estimate.toFixed(1)}h</p>
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

    <section class="neo-hero-blue rounded-[10px] p-4">
      <div class="mb-2 flex items-center justify-between gap-2">
        <p class="text-[10px] font-black uppercase tracking-[0.18em] text-white">Đánh giá nổi bật</p>
        <span class="neo-pill-ink rounded-full px-2 py-0.5 text-[10px] font-black">{deliveryMetrics.skill_aggregation.reviewed_skills} đánh giá</span>
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
  </div>
</AppLayout>
