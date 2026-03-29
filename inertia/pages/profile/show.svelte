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
  const currentOrgRole = $derived(
    (($page as { props?: { auth?: { user?: { current_organization_role?: string | null } } } }).props
      ?.auth?.user?.current_organization_role ?? null)
  )
  let currentSnapshotState = $state<ProfileSnapshotSummary | null>(null)
  let snapshotHistory = $state<ProfileSnapshotSummary[]>([])
  let snapshotName = $state('')
  let publishAsPublic = $state(false)
  let snapshotBusy = $state(false)
  let snapshotHistoryLoading = $state(false)
  let snapshotFeedback = $state('')

  // Group skills by category (simple transform - NO business logic)
  const userSkills = $derived(
    (user.skills ?? []).map((skillRelation) => ({
      id: skillRelation.id,
      skill_id: skillRelation.skill_id,
      skill_name: skillRelation.skill?.skill_name ?? '',
      category_code: skillRelation.skill?.category_code ?? 'other',
      level_code: skillRelation.level_code,
      avg_percentage: skillRelation.avg_percentage ?? null,
      total_reviews: skillRelation.total_reviews,
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

  function normalizeLevelCode(levelCode?: unknown): string {
    if (typeof levelCode !== 'string') {
      return ''
    }
    return levelCode.trim().toLowerCase()
  }

  function levelLabel(levelCode?: string | null): string {
    const code = normalizeLevelCode(levelCode)
    if (!code) return 'Unrated'
    if (code.includes('begin')) return 'Beginner'
    if (code.includes('jun')) return 'Junior'
    if (code.includes('mid')) return 'Middle'
    if (code.includes('sen')) return 'Senior'
    if (code.includes('lead')) return 'Lead'
    if (code.includes('prin')) return 'Principal'
    if (code.includes('mas')) return 'Master'
    return levelCode || 'Unrated'
  }

  function levelClass(levelCode?: string | null): string {
    const code = normalizeLevelCode(levelCode)
    if (code.includes('begin')) return 'bg-zinc-200 text-zinc-700'
    if (code.includes('jun')) return 'bg-[#00C853] text-white'
    if (code.includes('mid')) return 'bg-[#0096FF] text-white'
    if (code.includes('sen')) return 'bg-[#9B5DE5] text-white'
    if (code.includes('lead')) return 'bg-[#FF6B00] text-white'
    if (code.includes('prin')) return 'bg-[#FF2D55] text-white'
    if (code.includes('mas')) return 'bg-black text-[#FFE500]'
    return 'bg-zinc-200 text-zinc-700'
  }

  function formatOrganizationRole(role?: string | null): string {
    switch (role) {
      case 'org_owner':
        return 'Owner'
      case 'org_admin':
        return 'Admin'
      case 'org_member':
        return 'Member'
      default:
        return 'Member'
    }
  }

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
              · {user.current_organization.name}
            {/if}
            {#if currentSnapshotState}
              · Snapshot v{currentSnapshotState.version}
            {/if}
          </p>

          <div class="flex flex-wrap gap-x-4 gap-y-1 text-xs">
            <div><span class="text-[9px] font-extrabold uppercase tracking-wider text-black opacity-50">Tổ chức</span> <span class="text-xs font-bold text-black">{user.current_organization?.name ?? 'Chưa tham gia'} {#if user.current_organization?.name}<span class="inline-block rounded border-2 border-black bg-[#00e5a0] px-1 text-[9px] font-extrabold uppercase text-black">{formatOrganizationRole(currentOrgRole)}</span>{/if}</span></div>
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
            <p class="text-xl font-black text-white">{typeof user.freelancer_rating === 'number' ? user.freelancer_rating.toFixed(1) : '--'} <span class="text-[11px] font-semibold opacity-80">({deliveryMetrics.skill_aggregation.reviewed_skills})</span></p>
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

    <section class={neoBrutalCard}>
      <div class="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div class="space-y-4">
          <div>
            <p class="text-[10px] font-black uppercase tracking-[0.18em] text-slate-600">Profile Snapshot</p>
            <h2 class="mt-2 text-lg font-black text-black">Đóng gói hồ sơ hiện tại thành một snapshot chia sẻ được</h2>
            <p class="mt-1 text-sm text-slate-600">
              Snapshot dùng để cố định trust score, review highlights và kỹ năng đã xác minh ở một thời điểm cụ thể.
            </p>
          </div>

          <div class="grid gap-3 md:grid-cols-[1fr_auto]">
            <div class="space-y-2">
              <Label for="snapshot_name">Tên snapshot</Label>
              <Input
                id="snapshot_name"
                bind:value={snapshotName}
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
            <p class="text-sm text-slate-700">{snapshotFeedback}</p>
          {/if}
        </div>

        <div class="rounded-lg border-2 border-black bg-[#f7f3e8] p-4 shadow-[4px_4px_0_#111]">
          <p class="text-xs font-black uppercase tracking-wide text-slate-600">Snapshot hiện tại</p>

          {#if currentSnapshotState}
            <div class="mt-3 space-y-3 text-sm">
              <div class="flex items-center justify-between gap-2">
                <span class="font-semibold">{currentSnapshotState.snapshot_name || `Snapshot v${currentSnapshotState.version}`}</span>
                <span class="rounded border-2 border-black px-2 py-0.5 text-[10px] font-black uppercase">
                  {currentSnapshotState.is_public ? 'Public' : 'Private'}
                </span>
              </div>

              <div class="grid gap-2 text-xs text-slate-600">
                <p>Version: <span class="font-bold text-black">{currentSnapshotState.version}</span></p>
                <p>Scoring version: <span class="font-bold text-black">{currentSnapshotState.scoring_version}</span></p>
                <p>Cập nhật: <span class="font-bold text-black">{new Date(currentSnapshotState.updated_at).toLocaleString('vi-VN')}</span></p>
              </div>

              <div class="flex items-center justify-between gap-3 rounded-lg border border-black/20 bg-white px-3 py-2">
                <div>
                  <p class="text-xs font-bold uppercase text-slate-500">Share access</p>
                  <p class="text-sm font-semibold text-black">{currentSnapshotState.is_public ? 'Đang bật' : 'Đang tắt'}</p>
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
                <div class="rounded-lg border border-dashed border-black/30 bg-white p-3">
                  <p class="text-[11px] font-bold uppercase tracking-wide text-slate-500">Share link</p>
                  <p class="mt-1 break-all text-xs text-slate-700">{currentSnapshotLink}</p>
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
            <p class="mt-3 text-sm text-slate-600">Chưa có snapshot hiện tại. Hãy publish snapshot đầu tiên.</p>
          {/if}
        </div>
      </div>

      <div class="mt-4 border-t-2 border-black pt-4">
        <div class="mb-3 flex items-center justify-between gap-2">
          <p class="text-[10px] font-black uppercase tracking-[0.18em] text-slate-600">Lịch sử snapshot</p>
          <span class="text-xs text-slate-500">{snapshotHistory.length} bản gần nhất</span>
        </div>

        {#if snapshotHistory.length === 0}
          <p class="text-sm text-slate-500">Chưa có snapshot nào trong lịch sử.</p>
        {:else}
          <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {#each snapshotHistory as snapshot (snapshot.id)}
              <article class="rounded-lg border-2 border-black bg-white p-3 shadow-[3px_3px_0_#111]">
                <div class="flex items-start justify-between gap-2">
                  <div>
                    <p class="text-sm font-black text-black">{snapshot.snapshot_name || `Snapshot v${snapshot.version}`}</p>
                    <p class="text-[11px] text-slate-500">{new Date(snapshot.created_at).toLocaleString('vi-VN')}</p>
                  </div>
                  <span class="rounded border border-black px-2 py-0.5 text-[10px] font-bold uppercase">
                    {snapshot.is_public ? 'Public' : 'Private'}
                  </span>
                </div>
                <div class="mt-3 text-xs text-slate-600">
                  <p>Version: <span class="font-bold text-black">{snapshot.version}</span></p>
                  <p>Scoring: <span class="font-bold text-black">{snapshot.scoring_version}</span></p>
                </div>
              </article>
            {/each}
          </div>
        {/if}
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
              <div class="flex items-center gap-3 text-[10px] font-bold"><span class="text-[#9B5DE5]">Đã review</span></div>
            </div>
            <div class="min-h-[220px]">
              <SpiderChart
                softSkills={spiderChartData.technical}
                softSkillsLabel="Đã review"
                size={300}
              />
            </div>
          </div>

          <div class="border-t-2 border-black pt-4">
            <div class="flex flex-wrap items-center justify-between gap-2 text-[11px] font-bold text-slate-600">
              <div class="flex items-center gap-1"><span class="inline-block h-2 w-2 rounded-full bg-[#00C853]"></span>Kỹ năng mềm</div>
              <div class="flex items-center gap-3 text-[10px] font-bold"><span class="text-[#00C853]">Đã review</span></div>
            </div>
            <div class="min-h-[220px]">
              <SpiderChart
                softSkills={spiderChartData.soft_skills}
                softSkillsLabel="Đã review"
                size={300}
              />
            </div>
          </div>

          <div class="border-t-2 border-black pt-4">
            <div class="flex flex-wrap items-center justify-between gap-2 text-[11px] font-bold text-slate-600">
              <div class="flex items-center gap-1"><span class="inline-block h-2 w-2 rounded-full bg-[#FF6B00]"></span>Delivery</div>
              <div class="flex items-center gap-3 text-[10px] font-bold"><span class="text-[#FF6B00]">Đã review</span></div>
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
