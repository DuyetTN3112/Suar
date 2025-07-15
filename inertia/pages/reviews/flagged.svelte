<script lang="ts">
  /**
   * Flagged Reviews Page — GET /admin/flagged-reviews
   * Admin panel to review and resolve anomaly-flagged reviews.
   */
  import { router, page } from '@inertiajs/svelte'
  import { ShieldAlert, TriangleAlert, CircleCheck } from 'lucide-svelte'

  import Card from '@/components/ui/card.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
  import AppLayout from '@/layouts/app_layout.svelte'
  import { useTranslation } from '@/stores/translation.svelte'

  import SimplePagination from './components/simple_pagination.svelte'
  import type {
    FlaggedReviewsProps,
    FlaggedReviewStatus,
  } from './types.svelte'
  import {
    FLAGGED_STATUS_CONFIG,
    ANOMALY_TYPE_CONFIG,
    SEVERITY_CONFIG,
  } from './types.svelte'

  interface Props {
    flaggedReviews: FlaggedReviewsProps['flaggedReviews']
    meta: FlaggedReviewsProps['meta']
    statuses: FlaggedReviewsProps['statuses']
    currentStatus: FlaggedReviewsProps['currentStatus']
  }

  const { flaggedReviews, meta, statuses, currentStatus }: Props = $props()
  const { t } = useTranslation()
  void page

  const pageTitle = $derived(t('admin.flaggedReviews', {}, 'Đánh giá bị gắn cờ'))

  // Flash messages
  const flash = $derived(
    ($page as { props: { flash?: { success?: string; error?: string } } }).props.flash
  )

  // Resolve form state
  let resolvingId = $state<string | null>(null)
  let resolveAction = $state<'dismissed' | 'confirmed'>('dismissed')
  let resolveNotes = $state('')
  let submitting = $state(false)

  function filterByStatus(status: FlaggedReviewStatus | null) {
    const params: Record<string, string> = {}
    if (status) params.status = status
    router.get('/admin/flagged-reviews', params, { preserveState: true })
  }

  function openResolve(flagId: string) {
    resolvingId = flagId
    resolveAction = 'dismissed'
    resolveNotes = ''
  }

  function cancelResolve() {
    resolvingId = null
  }

  function submitResolve(flagId: string) {
    submitting = true
    router.post(
      `/admin/flagged-reviews/${flagId}/resolve`,
      {
        action: resolveAction,
        notes: resolveNotes || null,
      },
      {
        preserveState: true,
        preserveScroll: true,
        onFinish: () => {
          submitting = false
          resolvingId = null
        },
      }
    )
  }
</script>

<svelte:head>
  <title>{pageTitle}</title>
</svelte:head>

<AppLayout title={pageTitle}>
  <div class="p-4 sm:p-6 space-y-6 max-w-6xl mx-auto">
    <!-- Flash messages -->
    {#if flash?.success}
      <div class="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
        {flash.success}
      </div>
    {/if}
    {#if flash?.error}
      <div class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
        {flash.error}
      </div>
    {/if}

    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-semibold flex items-center gap-2">
          <ShieldAlert class="h-5 w-5 text-orange-500" />
          {pageTitle}
        </h1>
        <p class="text-sm text-muted-foreground mt-1">
          Xem xét và xử lý các đánh giá được phát hiện bất thường
        </p>
      </div>
      <div class="text-sm text-muted-foreground">{meta.total} flagged reviews</div>
    </div>

    <!-- Status Filter -->
    <div class="flex flex-wrap gap-2">
      <button
        type="button"
        class="rounded-full px-3 py-1 text-sm transition-colors
          {!currentStatus ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}"
        onclick={() => { filterByStatus(null); }}
      >
        Tất cả
      </button>
      {#each statuses as status}
        <button
          type="button"
          class="rounded-full px-3 py-1 text-sm transition-colors
            {currentStatus === status ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}"
          onclick={() => { filterByStatus(status); }}
        >
          {FLAGGED_STATUS_CONFIG[status].labelVi}
        </button>
      {/each}
    </div>

    <!-- Content -->
    {#if flaggedReviews.length === 0}
      <div class="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
        <CircleCheck class="h-12 w-12 mb-4 opacity-50 text-green-500" />
        <p class="text-lg font-medium">Không có flagged reviews</p>
        <p class="text-sm mt-1">Hệ thống chưa phát hiện bất thường nào</p>
      </div>
    {:else}
      <div class="space-y-4">
        {#each flaggedReviews as flag (flag.id)}
          <Card>
            <CardContent class="p-4">
              <div class="flex items-start justify-between gap-4">
                <!-- Left: Info -->
                <div class="flex-1 space-y-2">
                  <div class="flex flex-wrap items-center gap-2">
                    <!-- Anomaly type badge -->
                    <span class="inline-flex items-center gap-1 rounded-md bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                      <TriangleAlert class="h-3 w-3" />
                      {ANOMALY_TYPE_CONFIG[flag.flag_type].labelVi}
                    </span>

                    <!-- Severity badge -->
                    <span class="inline-flex rounded-md px-2 py-0.5 text-xs font-medium {SEVERITY_CONFIG[flag.severity].color} bg-muted">
                      {SEVERITY_CONFIG[flag.severity].labelVi}
                    </span>

                    <!-- Status badge -->
                    <span class="inline-flex rounded-md px-2 py-0.5 text-xs font-medium
                      {flag.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                       flag.status === 'confirmed' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                       flag.status === 'dismissed' ? 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200' :
                       'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'}">
                      {FLAGGED_STATUS_CONFIG[flag.status].labelVi}
                    </span>
                  </div>

                  <!-- Details -->
                  {#if flag.notes}
                    <p class="text-sm text-muted-foreground">{flag.notes}</p>
                  {/if}

                  <div class="flex flex-wrap gap-4 text-xs text-muted-foreground">
                    {#if flag.skill_review?.reviewer}
                      <span>Reviewer: <strong>{flag.skill_review.reviewer.username}</strong></span>
                    {/if}
                    {#if flag.skill_review?.skill}
                      <span>Skill: {flag.skill_review.skill.skill_name}</span>
                    {/if}
                    {#if flag.skill_review?.assigned_level_code}
                      <span>Level: {flag.skill_review.assigned_level_code}</span>
                    {/if}
                    <span>
                      Phát hiện: {new Date(flag.detected_at).toLocaleDateString('vi-VN')}
                    </span>
                    {#if flag.reviewed_by && flag.reviewer}
                      <span>
                        Xử lý bởi: {flag.reviewer.username}
                        ({flag.reviewed_at ? new Date(flag.reviewed_at).toLocaleDateString('vi-VN') : ''})
                      </span>
                    {/if}
                  </div>
                </div>

                <!-- Right: Actions -->
                <div class="flex-shrink-0">
                  {#if flag.status === 'pending'}
                    {#if resolvingId === flag.id}
                      <!-- Resolve form -->
                      <div class="space-y-3 min-w-[250px]">
                        <div class="flex gap-2">
                          <button
                            type="button"
                            class="flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors
                              {resolveAction === 'dismissed'
                                ? 'bg-gray-600 text-white'
                                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}"
                            onclick={() => (resolveAction = 'dismissed')}
                          >
                            Bỏ qua
                          </button>
                          <button
                            type="button"
                            class="flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors
                              {resolveAction === 'confirmed'
                                ? 'bg-red-600 text-white'
                                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}"
                            onclick={() => (resolveAction = 'confirmed')}
                          >
                            Xác nhận
                          </button>
                        </div>

                        <textarea
                          bind:value={resolveNotes}
                          rows="2"
                          class="w-full rounded-md border border-input bg-background px-2 py-1 text-xs
                            placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          placeholder="Ghi chú (tùy chọn)..."
                        ></textarea>

                        <div class="flex gap-2">
                          <button
                            type="button"
                            onclick={() => { submitResolve(flag.id); }}
                            disabled={submitting}
                            class="flex-1 inline-flex items-center justify-center rounded-md bg-primary px-3 py-1.5
                              text-xs font-medium text-primary-foreground hover:bg-primary/90
                              disabled:pointer-events-none disabled:opacity-50"
                          >
                            {submitting ? 'Đang xử lý...' : 'Xác nhận'}
                          </button>
                          <button
                            type="button"
                            onclick={cancelResolve}
                            class="rounded-md bg-secondary px-3 py-1.5 text-xs font-medium
                              text-secondary-foreground hover:bg-secondary/80"
                          >
                            Hủy
                          </button>
                        </div>
                      </div>
                    {:else}
                      <button
                        type="button"
                        onclick={() => { openResolve(flag.id); }}
                        class="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5
                          text-xs font-medium text-primary-foreground hover:bg-primary/90"
                      >
                        Xử lý
                      </button>
                    {/if}
                  {/if}
                </div>
              </div>
            </CardContent>
          </Card>
        {/each}
      </div>

      <SimplePagination {meta} baseUrl="/admin/flagged-reviews" />
    {/if}
  </div>
</AppLayout>
