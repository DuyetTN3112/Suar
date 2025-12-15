<script lang="ts">
  /**
   * Flagged Reviews Page — GET /admin/flagged-reviews
   * Admin panel to review and resolve anomaly-flagged reviews.
  */
  import { router, page } from '@inertiajs/svelte'
  import { format } from 'date-fns'
  import { ShieldAlert, TriangleAlert, CircleCheck } from 'lucide-svelte'

  import Card from '@/apps/user/shared/ui/card.svelte'
  import CardContent from '@/apps/user/shared/ui/card_content.svelte'
  import { getFrontendCanonicalProficiencyLevelLabel } from '@/apps/user/modules/profile/lib/proficiency_level_catalog'
  import AppLayout from '@/apps/user/shared/layouts/app_layout.svelte'
  import { dateFnsLocale, shortDatePattern } from '@/apps/user/shared/lib/date_locale'
  import { useTranslation } from '@/apps/user/shared/stores/translation.svelte'

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
    shellMode?: 'app' | 'organization'
    auth?: { user?: { current_organization_role?: string | null } }
    flaggedReviews: FlaggedReviewsProps['flaggedReviews']
    pagination: FlaggedReviewsProps['pagination']
    statuses: FlaggedReviewsProps['statuses']
    currentStatus: FlaggedReviewsProps['currentStatus']
  }

  const { flaggedReviews, pagination, statuses, currentStatus }: Props = $props()
  
  const { t } = useTranslation()
  void page

  const pageTitle = $derived(t('task.reviews.flagged.title', {}, 'Flagged reviews'))

  // Flash messages
  const flash = $derived(
    (page as { props: { flash?: { success?: string; error?: string } } }).props.flash
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

  function localizedConfigLabel(keyPrefix: string, value: string, config: { label: string }): string {
    return t(`${keyPrefix}.${value}`, {}, config.label)
  }

  function formatFlagDate(value: string | null): string {
    if (!value) return ''

    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ''

    return format(date, shortDatePattern(), { locale: dateFnsLocale() })
  }
</script>

<svelte:head>
  <title>{pageTitle}</title>
</svelte:head>

<AppLayout title={pageTitle}>
  <div class="p-4 sm:p-6 space-y-6 max-w-6xl mx-auto">
    {#if flash?.success}
      <div class="rounded-lg border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-foreground">
        {flash.success}
      </div>
    {/if}
    {#if flash?.error}
      <div class="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        {flash.error}
      </div>
    {/if}

    <div class="flex items-end justify-between gap-3 border-b border-border pb-4">
      <div>
        <h1 class="text-xl font-semibold flex items-center gap-2">
          <ShieldAlert class="h-5 w-5 text-primary" />
          {pageTitle}
        </h1>
      </div>
      <div class="text-sm text-muted-foreground">
        {t('task.reviews.flagged.session_count', { count: pagination.total }, ':count sessions')}
      </div>
    </div>

    <div class="flex flex-wrap gap-2">
      <button
        type="button"
        class="rounded-full px-3 py-1 text-sm transition-colors
          {!currentStatus ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}"
        onclick={() => { filterByStatus(null); }}
      >
        {t('task.reviews.flagged.all', {}, 'All')}
      </button>
      {#each statuses as status}
        <button
          type="button"
          class="rounded-full px-3 py-1 text-sm transition-colors
            {currentStatus === status ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}"
          onclick={() => { filterByStatus(status); }}
        >
          {localizedConfigLabel('task.reviews.flagged_status', status, FLAGGED_STATUS_CONFIG[status])}
        </button>
      {/each}
    </div>

    {#if flaggedReviews.length === 0}
      <div class="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
        <CircleCheck class="h-12 w-12 mb-4 opacity-50 text-foreground" />
        <p class="text-lg font-medium">{t('task.reviews.flagged.empty', {}, 'No flagged reviews')}</p>
      </div>
    {:else}
      <div class="space-y-4">
        {#each flaggedReviews as flag (flag.id)}
          <Card>
            <CardContent class="p-4">
              <div class="flex items-start justify-between gap-4">
                <div class="flex-1 space-y-2">
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="inline-flex items-center gap-1 rounded-md border border-primary/20 bg-primary/5 px-2 py-0.5 text-xs font-medium text-foreground">
                      <TriangleAlert class="h-3 w-3 text-primary" />
                      {localizedConfigLabel('task.reviews.anomaly_type', flag.flag_type, ANOMALY_TYPE_CONFIG[flag.flag_type])}
                    </span>

                    <span class="inline-flex rounded-md px-2 py-0.5 text-xs font-medium {SEVERITY_CONFIG[flag.severity].color} bg-muted">
                      {localizedConfigLabel('task.reviews.severity', flag.severity, SEVERITY_CONFIG[flag.severity])}
                    </span>

                    <span class="inline-flex rounded-md border px-2 py-0.5 text-xs font-medium
                      {flag.status === 'pending' ? 'border-amber-500/30 bg-amber-500/10 text-amber-700 shadow-suar-xs dark:text-amber-300' :
                       flag.status === 'confirmed' ? 'bg-destructive/10 text-destructive border-destructive/20 shadow-suar-xs' :
                       flag.status === 'dismissed' ? 'bg-secondary text-muted-foreground border-border shadow-suar-xs' :
                       'bg-secondary text-foreground border-border/50 shadow-suar-xs'}">
                      {localizedConfigLabel('task.reviews.flagged_status', flag.status, FLAGGED_STATUS_CONFIG[flag.status])}
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
                    {#if flag.skill_review?.assigned_public_proficiency_code}
                      <span>Level: {getFrontendCanonicalProficiencyLevelLabel(flag.skill_review.assigned_public_proficiency_code, flag.skill_review.assigned_public_proficiency_code)}</span>
                    {/if}
                    <span>
                      {t('task.reviews.flagged.detected_at', {}, 'Detected')}: {formatFlagDate(flag.detected_at)}
                    </span>
                    {#if flag.reviewed_by && flag.reviewer}
                      <span>
                        {t('task.reviews.flagged.reviewed_by', {}, 'Reviewed by')}: {flag.reviewer.username}
                        ({formatFlagDate(flag.reviewed_at)})
                      </span>
                    {/if}
                  </div>
                </div>

                <div class="flex-shrink-0">
                  {#if flag.status === 'pending'}
                    {#if resolvingId === flag.id}
                      <div class="space-y-3 min-w-[250px]">
                        <div class="flex gap-2">
                          <button
                            type="button"
                            class="flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors
                              {resolveAction === 'dismissed'
                                ? 'bg-foreground text-background'
                                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}"
                            onclick={() => (resolveAction = 'dismissed')}
                          >
                            {t('task.reviews.flagged.dismiss', {}, 'Dismiss')}
                          </button>
                          <button
                            type="button"
                            class="flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors
                              {resolveAction === 'confirmed'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}"
                            onclick={() => (resolveAction = 'confirmed')}
                          >
                            {t('task.reviews.flagged.confirm', {}, 'Confirm')}
                          </button>
                        </div>

                        <textarea
                          bind:value={resolveNotes}
                          rows="2"
                          class="w-full rounded-md border border-input bg-background px-2 py-1 text-xs
                            placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          placeholder={t('task.reviews.flagged.notes_placeholder', {}, 'Notes (optional)...')}
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
                            {submitting
                              ? t('task.reviews.flagged.processing', {}, 'Processing...')
                              : t('task.reviews.flagged.submit', {}, 'Submit')}
                          </button>
                          <button
                            type="button"
                            onclick={cancelResolve}
                            class="rounded-md bg-secondary px-3 py-1.5 text-xs font-medium
                              text-secondary-foreground hover:bg-secondary/80"
                          >
                            {t('common.cancel', {}, 'Cancel')}
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
                        {t('task.reviews.flagged.resolve', {}, 'Resolve')}
                      </button>
                    {/if}
                  {/if}
                </div>
              </div>
            </CardContent>
          </Card>
        {/each}
      </div>

      <SimplePagination
        {pagination}
        baseUrl="/admin/flagged-reviews"
        extraParams={{ status: currentStatus ?? undefined }}
      />
    {/if}
  </div>
</AppLayout>
