<script lang="ts">
  import Card from '@/apps/admin/shared/ui/card.svelte'
  import CardContent from '@/apps/admin/shared/ui/card_content.svelte'
  import CardHeader from '@/apps/admin/shared/ui/card_header.svelte'
  import CardTitle from '@/apps/admin/shared/ui/card_title.svelte'
  import Badge from '@/apps/admin/shared/ui/badge.svelte'
  import Button from '@/apps/admin/shared/ui/button.svelte'
  import { currentDocumentLocale } from '@/apps/admin/shared/lib/date_locale'
  import { useTranslation } from '@/apps/admin/shared/stores/translation.svelte'
  import type { Dispute, CaseFile, ReadinessSignal } from '../types/dispute_resolve_types'

  type PreviewValue = string | number | boolean | null | undefined
  interface CaseFileCounts {
    taskComments: number
    taskHistory: number
    evidences: number
    skillReviews: number
    disputeMessages: number
  }
  interface TaskCommentPreview {
    comment_type?: string | null
    review_relevance?: PreviewValue
    body?: string | null
  }
  interface TaskHistoryPreview {
    field_name?: string | null
    old_value?: PreviewValue
    new_value?: PreviewValue
    label?: string | null
    title?: string | null
    status?: string | null
  }
  interface DisputeMessagePreview {
    author_context?: string | null
    body?: string | null
  }
  interface EvidencePreview {
    title?: string | null
    evidence_type?: string | null
  }

  interface Props {
    dispute: Dispute
    caseFiles: CaseFile[]
    buildingCaseFile: boolean
    readinessSignals: ReadinessSignal[]
    normalResolveBlocked: boolean
    missingRequiredData: string[]
    missingRecommendedData: string[]
    missingDataPreview: string[]
    latestCaseFileCounts: CaseFileCounts
    taskCommentPreview: TaskCommentPreview[]
    taskHistoryPreview: TaskHistoryPreview[]
    disputeMessagePreview: DisputeMessagePreview[]
    evidencePreview: EvidencePreview[]
    onBuildCaseFile: () => void
  }

  const {
    dispute,
    caseFiles,
    buildingCaseFile,
    readinessSignals,
    missingRequiredData,
    missingRecommendedData,
    missingDataPreview,
    latestCaseFileCounts,
    taskCommentPreview,
    taskHistoryPreview,
    disputeMessagePreview,
    evidencePreview,
    onBuildCaseFile,
  }: Props = $props()

  const { t } = useTranslation()
  const documentLocale = $derived(currentDocumentLocale() === 'vi' ? 'vi-VN' : 'en-US')
  const dateFormatter = $derived(
    new Intl.DateTimeFormat(documentLocale, {
      dateStyle: 'medium',
    })
  )
  const latestCaseFile = $derived(caseFiles[0] ?? null)

  function formatDate(value: string): string {
    return dateFormatter.format(new Date(value))
  }

  function taskHistoryLabel(history: TaskHistoryPreview): string {
    return history.field_name ?? history.label ?? 'Task update'
  }

  function taskHistoryChange(history: TaskHistoryPreview): string {
    if (history.field_name) {
      return `${history.old_value ?? 'null'} → ${history.new_value ?? 'null'}`
    }

    return [history.title, history.status].filter(Boolean).join(' · ')
  }
</script>

<div class="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
  <Card class="rounded-[28px] border-border/90">
    <CardHeader class="flex flex-row items-center justify-between space-y-0">
      <div>
        <div class="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          {t('task.disputes.admin_detail.resolve.evidence_snapshot', {}, 'Evidence snapshot')}
        </div>
        <CardTitle class="mt-2 text-2xl">
          {t('task.disputes.admin_detail.resolve.case_file_count', { count: caseFiles.length }, `Case file (${caseFiles.length})`)}
        </CardTitle>
      </div>
      {#if dispute.status !== 'resolved' && dispute.status !== 'rejected'}
        <Button size="sm" onclick={onBuildCaseFile} disabled={buildingCaseFile}>
          {buildingCaseFile
            ? t('task.disputes.admin_detail.resolve.building_snapshot', {}, 'Building...')
            : t('task.disputes.admin_detail.resolve.build_snapshot', {}, 'Build snapshot')}
        </Button>
      {/if}
    </CardHeader>
    <CardContent>
      {#if caseFiles.length === 0}
        <p class="text-sm text-muted-foreground">
          {t('task.disputes.admin_detail.resolve.no_snapshots', {}, 'No snapshots yet.')}
        </p>
      {:else}
        <div class="space-y-2 font-mono text-xs">
          {#each caseFiles as cf (cf.id)}
            <div class="flex items-center justify-between rounded-2xl border border-line bg-paper p-3 text-xs">
              <div>
                <span class="font-bold">v{cf.case_version}</span> -
                <span class="font-semibold {cf.completeness_score >= 80 ? 'text-emerald-600' : 'text-amber-600'}">
                  {cf.completeness_score}%
                </span>
              </div>
              <span class="text-muted-foreground">{formatDate(cf.created_at)}</span>
            </div>
          {/each}
        </div>

        {#if latestCaseFile}
          <div class="mt-4 space-y-4 rounded-[24px] border border-border bg-card p-4 font-sans">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {t('task.disputes.admin_detail.resolve.escalation_dossier', {}, 'Escalation dossier')}
                </p>
                <p class="mt-1 text-lg font-black text-foreground">
                  {t('task.disputes.admin_detail.resolve.case_file_version', { version: latestCaseFile.case_version }, `Case file v${latestCaseFile.case_version}`)}
                </p>
              </div>
              <Badge variant="outline" class="font-mono">
                {t('task.disputes.admin_detail.resolve.completeness', { score: latestCaseFile.completeness_score }, `${latestCaseFile.completeness_score}% complete`)}
              </Badge>
            </div>

            <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <div class="rounded-2xl border border-border/70 bg-background/70 p-3">
                <div class="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  {t('task.disputes.admin_detail.resolve.task_comments', {}, 'Task comments')}
                </div>
                <div class="mt-2 text-2xl font-black text-foreground">{latestCaseFileCounts.taskComments}</div>
              </div>
              <div class="rounded-2xl border border-border/70 bg-background/70 p-3">
                <div class="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  {t('task.disputes.admin_detail.resolve.task_history', {}, 'Task history')}
                </div>
                <div class="mt-2 text-2xl font-black text-foreground">{latestCaseFileCounts.taskHistory}</div>
              </div>
              <div class="rounded-2xl border border-border/70 bg-background/70 p-3">
                <div class="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  {t('task.disputes.admin_detail.resolve.evidence', {}, 'Evidence')}
                </div>
                <div class="mt-2 text-2xl font-black text-foreground">{latestCaseFileCounts.evidences}</div>
              </div>
              <div class="rounded-2xl border border-border/70 bg-background/70 p-3">
                <div class="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  {t('task.disputes.admin_detail.resolve.skill_reviews', {}, 'Skill reviews')}
                </div>
                <div class="mt-2 text-2xl font-black text-foreground">{latestCaseFileCounts.skillReviews}</div>
              </div>
              <div class="rounded-2xl border border-border/70 bg-background/70 p-3">
                <div class="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  {t('task.disputes.admin_detail.resolve.dispute_messages', {}, 'Dispute messages')}
                </div>
                <div class="mt-2 text-2xl font-black text-foreground">{latestCaseFileCounts.disputeMessages}</div>
              </div>
            </div>

            <div class="grid gap-4 lg:grid-cols-2">
              <div class="rounded-2xl border border-border/70 bg-muted/40 p-4">
                <p class="text-sm font-semibold text-foreground">
                  {t('task.disputes.admin_detail.resolve.escalation_goal', {}, 'Escalation goal')}
                </p>
                <p class="mt-2 text-sm text-muted-foreground">
                  {latestCaseFile.dispute_claim_snapshot?.requested_outcome ?? t('task.disputes.admin_detail.resolve.no_requested_outcome', {}, 'No requested outcome.')}
                </p>
                <p class="mt-3 text-xs leading-6 text-muted-foreground">
                  {latestCaseFile.dispute_claim_snapshot?.dispute_reason ?? t('task.disputes.admin_detail.resolve.no_dispute_reason', {}, 'No dispute reason snapshot.')}
                </p>
              </div>

              <div class="rounded-2xl border border-border/70 bg-muted/40 p-4">
                <p class="text-sm font-semibold text-foreground">
                  {t('task.disputes.admin_detail.resolve.missing_data', {}, 'Missing data')}
                </p>
                {#if missingDataPreview.length === 0}
                  <p class="mt-2 text-sm text-muted-foreground">
                    {t('task.disputes.admin_detail.resolve.no_missing_fields', {}, 'This case file reports no missing fields.')}
                  </p>
                {:else}
                  <div class="mt-3 space-y-3">
                    {#if missingRequiredData.length > 0}
                      <div>
                        <p class="text-xs font-black uppercase tracking-[0.16em] text-destructive">
                          {t('task.disputes.admin_detail.resolve.required_missing', {}, 'Required missing data')}
                        </p>
                        <div class="mt-2 flex flex-wrap gap-2">
                          {#each missingRequiredData as item}
                            <Badge variant="outline" class="border-destructive/30 bg-card text-[10px] font-mono text-destructive">
                              {item}
                            </Badge>
                          {/each}
                        </div>
                      </div>
                    {/if}

                    {#if missingRecommendedData.length > 0}
                      <div>
                        <p class="text-xs font-black uppercase tracking-[0.16em] text-foreground">
                          {t('task.disputes.admin_detail.resolve.recommended_missing', {}, 'Recommended missing data')}
                        </p>
                        <div class="mt-2 flex flex-wrap gap-2">
                          {#each missingRecommendedData as item}
                            <Badge variant="outline" class="border-border/70 bg-card text-[10px] font-mono text-foreground">
                              {item}
                            </Badge>
                          {/each}
                        </div>
                      </div>
                    {/if}
                  </div>
                {/if}
                {#if missingRequiredData.length > 0}
                  <p class="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-destructive">
                    {t('task.disputes.admin_detail.resolve.normal_resolve_blocked', {}, 'Normal resolve is blocked. Add dossier data or use override with a reason.')}
                  </p>
                {/if}
              </div>
            </div>

            <div class="grid gap-4 lg:grid-cols-2">
              <div class="rounded-2xl border border-border/70 bg-background/75 p-4">
                <p class="text-sm font-semibold text-foreground">
                  {t('task.disputes.admin_detail.resolve.task_comments_in_case_file', {}, 'Task comments in case file')}
                </p>
                {#if taskCommentPreview.length === 0}
                  <p class="mt-2 text-sm text-muted-foreground">
                    {t('task.disputes.admin_detail.resolve.no_task_comments_snapshot', {}, 'No task comments in this snapshot.')}
                  </p>
                {:else}
                  <div class="mt-3 space-y-3">
                    {#each taskCommentPreview as comment, index}
                      <div class="rounded-2xl border border-border/60 bg-card p-3 text-sm">
                        <div class="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                          <span>
                            {t(
                              'task.disputes.admin_detail.resolve.comment_number',
                              { number: index + 1 },
                              'Comment #:number'
                            )}
                          </span>
                          {#if comment.comment_type}
                            <span>{comment.comment_type}</span>
                          {/if}
                          {#if comment.review_relevance}
                            <Badge variant="outline" class="text-[9px]">
                              {t('task.disputes.admin_detail.resolve.review_evidence', {}, 'review evidence')}
                            </Badge>
                          {/if}
                        </div>
                        <p class="mt-2 whitespace-pre-wrap text-foreground">
                          {comment.body ?? t('task.disputes.admin_detail.resolve.no_content', {}, 'No content')}
                        </p>
                      </div>
                    {/each}
                  </div>
                {/if}
              </div>

              <div class="rounded-2xl border border-border/70 bg-background/75 p-4">
                <p class="text-sm font-semibold text-foreground">
                  {t('task.disputes.admin_detail.resolve.recent_task_history', {}, 'Recent task history')}
                </p>
                {#if taskHistoryPreview.length === 0}
                  <p class="mt-2 text-sm text-muted-foreground">
                    {t('task.disputes.admin_detail.resolve.no_task_history_snapshot', {}, 'No task history in this snapshot.')}
                  </p>
                {:else}
                  <div class="mt-3 space-y-3">
                    {#each taskHistoryPreview as history, index}
                      <div class="rounded-2xl border border-border/60 bg-card p-3 text-sm">
                        <div class="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                          {t(
                            'task.disputes.admin_detail.resolve.change_number',
                            { number: index + 1 },
                            'Change #:number'
                          )}
                        </div>
                        <p class="mt-2 font-semibold text-foreground">
                          {taskHistoryLabel(history)}
                        </p>
                        <p class="mt-1 text-muted-foreground">
                          {taskHistoryChange(history)}
                        </p>
                      </div>
                    {/each}
                  </div>
                {/if}
              </div>
            </div>

            <div class="grid gap-4 lg:grid-cols-2">
              <div class="rounded-2xl border border-border/70 bg-background/75 p-4">
                <p class="text-sm font-semibold text-foreground">
                  {t('task.disputes.admin_detail.resolve.dispute_messages_in_case_file', {}, 'Dispute messages in case file')}
                </p>
                {#if disputeMessagePreview.length === 0}
                  <p class="mt-2 text-sm text-muted-foreground">
                    {t('task.disputes.admin_detail.resolve.no_dispute_messages_snapshot', {}, 'No dispute messages in this snapshot.')}
                  </p>
                {:else}
                  <div class="mt-3 space-y-3">
                    {#each disputeMessagePreview as message, index}
                      <div class="rounded-2xl border border-border/60 bg-card p-3 text-sm">
                        <div class="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                          <span>
                            {t(
                              'task.disputes.admin_detail.resolve.message_number',
                              { number: index + 1 },
                              'Message #:number'
                            )}
                          </span>
                          {#if message.author_context}
                            <Badge variant="outline" class="text-[9px]">{message.author_context}</Badge>
                          {/if}
                        </div>
                        <p class="mt-2 whitespace-pre-wrap text-foreground">
                          {message.body ?? t('task.disputes.admin_detail.resolve.no_content', {}, 'No content')}
                        </p>
                      </div>
                    {/each}
                  </div>
                {/if}
              </div>

              <div class="rounded-2xl border border-border/70 bg-background/75 p-4">
                <p class="text-sm font-semibold text-foreground">
                  {t('task.disputes.admin_detail.resolve.evidence_in_dossier', {}, 'Evidence attached to dossier')}
                </p>
                {#if evidencePreview.length === 0}
                  <p class="mt-2 text-sm text-muted-foreground">
                    {t('task.disputes.admin_detail.resolve.no_evidence_snapshot', {}, 'No evidence in this snapshot.')}
                  </p>
                {:else}
                  <div class="mt-3 space-y-3">
                    {#each evidencePreview as evidence, index}
                      <div class="rounded-2xl border border-border/60 bg-card p-3 text-sm">
                        <div class="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                          {t(
                            'task.disputes.admin_detail.resolve.evidence_number',
                            { number: index + 1 },
                            'Evidence #:number'
                          )}
                        </div>
                        <p class="mt-2 font-semibold text-foreground">
                          {evidence.title ?? t('task.disputes.admin_detail.resolve.untitled_evidence', {}, 'Untitled evidence')}
                        </p>
                        <p class="mt-1 text-muted-foreground">
                          {evidence.evidence_type ?? 'unknown_type'}
                        </p>
                      </div>
                    {/each}
                  </div>
                {/if}
              </div>
            </div>
          </div>
        {/if}
      {/if}
    </CardContent>
  </Card>

  <Card class="rounded-[28px] border-border/90">
    <CardHeader>
      <div class="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        {t('task.disputes.admin_detail.resolve.decision_readiness', {}, 'Decision readiness')}
      </div>
      <CardTitle class="mt-2 text-2xl">
        {t('task.disputes.admin_detail.resolve.pre_decision_checklist', {}, 'Pre-decision checklist')}
      </CardTitle>
    </CardHeader>
    <CardContent class="space-y-3">
      {#each readinessSignals as signal}
        <div class={`rounded-2xl border p-4 ${signal.ready ? 'border-border/70 bg-muted/40' : 'border-border/70 bg-muted/40'}`}>
          <div class="flex items-center justify-between gap-3">
            <p class="font-semibold text-foreground">{signal.label}</p>
            <Badge variant={signal.ready ? 'default' : 'secondary'} class="rounded-full px-2.5 py-1 text-[10px] font-mono">
              {signal.ready
                ? t('task.disputes.admin_detail.resolve.ready', {}, 'READY')
                : t('task.disputes.admin_detail.resolve.waiting', {}, 'WAITING')}
            </Badge>
          </div>
          <p class="mt-2 text-sm leading-6 text-muted-foreground">{signal.note}</p>
        </div>
      {/each}
    </CardContent>
  </Card>
</div>
