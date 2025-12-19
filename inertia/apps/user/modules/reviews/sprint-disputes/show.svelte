<script lang="ts">
  import { Link, router } from '@inertiajs/svelte'
  import axios from 'axios'

  import Badge from '@/apps/user/shared/ui/badge.svelte'
  import Button from '@/apps/user/shared/ui/button.svelte'
  import Card from '@/apps/user/shared/ui/card.svelte'
  import CardContent from '@/apps/user/shared/ui/card_content.svelte'
  import CardHeader from '@/apps/user/shared/ui/card_header.svelte'
  import CardTitle from '@/apps/user/shared/ui/card_title.svelte'
  import Label from '@/apps/user/shared/ui/label.svelte'
  import Textarea from '@/apps/user/shared/ui/textarea.svelte'
  import { currentDocumentLocale } from '@/apps/user/shared/lib/date_locale'
  import AppLayout from '@/apps/user/shared/layouts/app_layout.svelte'
  import { useTranslation } from '@/apps/user/shared/stores/translation.svelte'

  interface SprintReviewDispute {
    id: string
    packageId: string
    status: string
    disputeReason: string
    requestedOutcome: string
    reportedToAdminAt: string | null
    sprint: {
      id: string
      name: string
      projectId: string
      projectName: string
      organizationId: string
      organizationName: string
    }
    reviewPackage: {
      id: string
      reviewerId: string
      status: string
    }
    comments: Array<{
      id: string
      authorId: string
      authorContext: 'reviewer' | 'org_representative' | 'system_admin'
      body: string
      createdAt: string
    }>
    authorContext: 'reviewer' | 'org_representative' | 'system_admin'
    canReportToAdmin: boolean
  }

  interface Props {
    dispute: SprintReviewDispute
  }

  const { dispute }: Props = $props()
  const { t } = useTranslation()

  let commentBody = $state('')
  let reportReason = $state('')
  let busy = $state(false)
  let errorMessage = $state('')
  let successMessage = $state('')

  const hasReviewerComment = $derived(
    dispute.comments.some((comment) => comment.authorContext === 'reviewer')
  )
  const hasCounterpartyComment = $derived(
    dispute.comments.some((comment) => comment.authorContext !== 'reviewer')
  )
  const documentLocale = $derived(currentDocumentLocale() === 'vi' ? 'vi-VN' : 'en-US')

  const contextFallbacks: Record<string, string> = {
    reviewer: 'Sprint review author',
    org_representative: 'Project/org representative',
    system_admin: 'System admin',
  }
  const statusFallbacks: Record<string, string> = {
    pending: 'Disputed',
    collecting_evidence: 'Collecting evidence',
    admin_reviewing: 'Admin reviewing',
    resolved: 'Resolved',
    rejected: 'Rejected',
  }

  async function postComment() {
    if (!commentBody.trim() || busy) return
    busy = true
    errorMessage = ''
    successMessage = ''
    try {
      await axios.post(`/api/v1/sprint-review-disputes/${dispute.id}/comments`, {
        body: commentBody.trim(),
      })
      commentBody = ''
      router.reload({
        onFinish: () => window.scrollTo({ top: 0 }),
      })
      successMessage = t('task.sprint_review_disputes.detail.comment_success', {}, 'Dispute reply sent.')
    } catch (_error) {
      errorMessage = t('task.sprint_review_disputes.detail.comment_error', {}, 'Unable to send dispute reply.')
    } finally {
      busy = false
    }
  }

  async function reportToAdmin() {
    if (!reportReason.trim() || busy) return
    busy = true
    errorMessage = ''
    successMessage = ''
    try {
      await axios.post(`/api/v1/sprint-review-disputes/${dispute.id}/report`, {
        escalationReason: reportReason.trim(),
      })
      reportReason = ''
      router.reload({
        onFinish: () => window.scrollTo({ top: 0 }),
      })
      successMessage = t('task.sprint_review_disputes.detail.report_success', {}, 'Sprint review dispute reported to admin.')
    } catch (_error) {
      errorMessage = t('task.sprint_review_disputes.detail.report_error', {}, 'Unable to report sprint review dispute.')
    } finally {
      busy = false
    }
  }

  function contextLabel(context: string): string {
    return t(`task.sprint_review_disputes.detail.context.${context}`, {}, contextFallbacks[context] ?? context)
  }

  function statusLabel(status: string): string {
    return t(`task.sprint_review_disputes.detail.status.${status}`, {}, statusFallbacks[status] ?? status)
  }

  function formatDateTime(value: string): string {
    return new Date(value).toLocaleString(documentLocale)
  }
</script>

<svelte:head>
  <title>{t('task.sprint_review_disputes.detail.title', {}, 'Sprint review dispute')}</title>
</svelte:head>

<AppLayout title={t('task.sprint_review_disputes.detail.title', {}, 'Sprint review dispute')}>
  <div class="mx-auto max-w-5xl space-y-6 p-4 sm:p-6 lg:p-8">
    <section class="rounded-xl border border-border bg-secondary/40 p-6 shadow-suar-xs">
      <div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div class="space-y-2">
          <div class="inline-flex w-fit rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-primary">
            Sprint dispute room
          </div>
          <h1 class="text-3xl font-black tracking-tight text-foreground">{t('task.sprint_review_disputes.detail.title', {}, 'Sprint review dispute')}</h1>
          <p class="max-w-3xl text-sm leading-relaxed text-muted-foreground">
            {t('task.sprint_review_disputes.detail.subtitle', {}, 'Official discussion room between the sprint review author and project/org representative before admin escalation.')}
          </p>
        </div>
        <Link href="/reviews/sprint-reverse-board">
          <Button variant="outline">{t('task.sprint_review_disputes.detail.back_to_board', {}, 'Back to post-sprint review board')}</Button>
        </Link>
      </div>
    </section>

    {#if errorMessage}
      <div class="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
        {errorMessage}
      </div>
    {/if}
    {#if successMessage}
      <div class="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-600">
        {successMessage}
      </div>
    {/if}

    <div class="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div class="space-y-6">
        <Card class="rounded-xl border border-border bg-card shadow-suar-sm">
          <CardHeader class="border-b border-border">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle class="text-xl font-black">{t('task.sprint_review_disputes.detail.content_title', {}, 'Dispute content')}</CardTitle>
                <p class="mt-1 text-sm text-muted-foreground">{dispute.sprint.name}</p>
              </div>
              <Badge variant="secondary" class="rounded-full px-3 py-1 text-[10px] font-bold uppercase">
                {statusLabel(dispute.status)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent class="space-y-4 p-5">
            <div class="rounded-xl border border-primary/20 bg-primary/10 p-4">
              <div class="text-[10px] font-black uppercase tracking-wider text-primary">{t('task.sprint_review_disputes.detail.reason', {}, 'Reason')}</div>
              <p class="mt-2 whitespace-pre-wrap text-sm text-foreground">{dispute.disputeReason}</p>
              <p class="mt-2 text-xs text-muted-foreground">
                {t('task.sprint_review_disputes.detail.requested_outcome', { outcome: dispute.requestedOutcome }, 'Requested outcome: :outcome')}
              </p>
            </div>

            <div class="space-y-3">
              <div class="flex items-center justify-between gap-3">
                <h2 class="text-xs font-black uppercase tracking-wider text-muted-foreground">{t('task.sprint_review_disputes.detail.discussion', {}, 'Discussion')}</h2>
                <span class="text-xs text-muted-foreground">{t('task.sprint_review_disputes.detail.comment_count', { count: dispute.comments.length }, ':count replies')}</span>
              </div>
              {#if dispute.comments.length === 0}
                <div class="rounded-xl border border-dashed border-border bg-background/70 p-4 text-sm text-muted-foreground">
                  {t('task.sprint_review_disputes.detail.empty_discussion', {}, 'No replies yet. Both sides must respond before admin escalation.')}
                </div>
              {:else}
                <div class="space-y-3">
                  {#each dispute.comments as comment (comment.id)}
                    <article class="rounded-xl border border-border bg-background p-4">
                      <div class="flex flex-wrap items-center justify-between gap-2">
                        <span class="text-xs font-black uppercase tracking-wider text-foreground">
                          {contextLabel(comment.authorContext)}
                        </span>
                        <span class="text-[11px] text-muted-foreground">
                          {formatDateTime(comment.createdAt)}
                        </span>
                      </div>
                      <p class="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground">{comment.body}</p>
                    </article>
                  {/each}
                </div>
              {/if}
            </div>

            {#if dispute.status !== 'resolved' && dispute.status !== 'rejected'}
              <div class="grid gap-2 rounded-xl border border-border bg-background p-4">
                <Label class="text-[10px] uppercase tracking-wider">{t('task.sprint_review_disputes.detail.reply_as', { role: contextLabel(dispute.authorContext) }, 'Reply as :role')}</Label>
                <Textarea bind:value={commentBody} placeholder={t('task.sprint_review_disputes.detail.reply_placeholder', {}, 'Write an official reply...')} />
                <Button class="w-fit" size="sm" disabled={busy || !commentBody.trim()} onclick={postComment}>
                  {t('task.sprint_review_disputes.detail.send_reply', {}, 'Send reply')}
                </Button>
              </div>
            {/if}
          </CardContent>
        </Card>
      </div>

      <aside class="space-y-4">
        <Card class="rounded-xl border border-border bg-card shadow-suar-sm">
          <CardHeader class="border-b border-border">
            <CardTitle class="text-sm font-black">{t('task.sprint_review_disputes.detail.context_title', {}, 'Context')}</CardTitle>
          </CardHeader>
          <CardContent class="space-y-3 p-4 text-sm">
            <div>
              <div class="text-[10px] font-black uppercase tracking-wider text-muted-foreground">{t('task.sprint_review_disputes.detail.project', {}, 'Project')}</div>
              <div class="mt-1 font-semibold text-foreground">{dispute.sprint.projectName}</div>
            </div>
            <div>
              <div class="text-[10px] font-black uppercase tracking-wider text-muted-foreground">{t('task.sprint_review_disputes.detail.organization', {}, 'Organization')}</div>
              <div class="mt-1 font-semibold text-foreground">{dispute.sprint.organizationName}</div>
            </div>
            <div>
              <div class="text-[10px] font-black uppercase tracking-wider text-muted-foreground">{t('task.sprint_review_disputes.detail.package', {}, 'Package')}</div>
              <div class="mt-1 font-mono text-xs text-foreground">{dispute.packageId.slice(0, 8)}</div>
            </div>
          </CardContent>
        </Card>

        <Card class="rounded-xl border border-border bg-card shadow-suar-sm">
          <CardHeader class="border-b border-border">
            <CardTitle class="text-sm font-black">{t('task.sprint_review_disputes.detail.escalation_title', {}, 'Escalation')}</CardTitle>
          </CardHeader>
          <CardContent class="space-y-3 p-4">
            {#if dispute.reportedToAdminAt}
              <div class="rounded-xl border border-primary/20 bg-primary/10 p-3 text-sm font-medium text-primary">
                {t('task.sprint_review_disputes.detail.already_reported', {}, 'Already reported to admin.')}
              </div>
            {:else if dispute.canReportToAdmin}
              <div class="grid gap-2">
                <Label class="text-[10px] uppercase tracking-wider">{t('task.sprint_review_disputes.detail.report_reason', {}, 'Admin report reason')}</Label>
                <Textarea bind:value={reportReason} placeholder={t('task.sprint_review_disputes.detail.report_reason_placeholder', {}, 'Why can both sides not resolve this directly?')} />
                <Button size="sm" disabled={busy || !reportReason.trim()} onclick={reportToAdmin}>
                  {t('task.sprint_review_disputes.detail.report_to_admin', {}, 'Report to admin')}
                </Button>
              </div>
            {:else}
              <div class="rounded-xl border border-dashed border-border bg-background p-3 text-sm text-muted-foreground">
                {t('task.sprint_review_disputes.detail.escalation_not_ready', {}, 'Both the review author and project/org representative must reply before admin escalation.')}
              </div>
            {/if}
            <div class="grid grid-cols-2 gap-2 text-xs">
              <div class="rounded-lg border border-border bg-background p-2">
                <div class="font-bold text-foreground">{hasReviewerComment ? t('task.sprint_review_disputes.detail.yes', {}, 'Yes') : t('task.sprint_review_disputes.detail.no', {}, 'No')}</div>
                <div class="text-muted-foreground">{t('task.sprint_review_disputes.detail.reviewer_short', {}, 'Reviewer')}</div>
              </div>
              <div class="rounded-lg border border-border bg-background p-2">
                <div class="font-bold text-foreground">{hasCounterpartyComment ? t('task.sprint_review_disputes.detail.yes', {}, 'Yes') : t('task.sprint_review_disputes.detail.no', {}, 'No')}</div>
                <div class="text-muted-foreground">{t('task.sprint_review_disputes.detail.counterparty_short', {}, 'Project/org')}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </aside>
    </div>
  </div>
</AppLayout>
