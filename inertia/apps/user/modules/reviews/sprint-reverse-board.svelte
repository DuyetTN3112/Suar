<script lang="ts">
  import { router } from '@inertiajs/svelte'

  import AppLayout from '@/apps/user/shared/layouts/app_layout.svelte'
  import Dialog from '@/apps/user/shared/ui/dialog.svelte'
  import DialogContent from '@/apps/user/shared/ui/dialog_content.svelte'
  import DialogDescription from '@/apps/user/shared/ui/dialog_description.svelte'
  import DialogHeader from '@/apps/user/shared/ui/dialog_header.svelte'
  import DialogTitle from '@/apps/user/shared/ui/dialog_title.svelte'
  import { useTranslation } from '@/apps/user/shared/stores/translation.svelte'

  type Status =
    | 'awaiting_review'
    | 'in_review'
    | 'awaiting_response'
    | 'disputed'
    | 'reported'
    | 'ai_reviewing'
    | 'admin_reviewing'
    | 'resolved'
    | 'done'
  type UserVisibleStatus = Exclude<Status, 'ai_reviewing' | 'resolved'>
  type TargetType = 'assigner' | 'environment'

  interface Card {
    id: string
    sprint_id: string
    project_id: string
    organization_id: string
    reviewer_id: string
    target_type: TargetType
    target_user_id: string | null
    target_entity_id: string | null
    responder_id: string | null
    status: Status
    rating: number | null
    comment: string | null
    related_task_count: number
    related_tasks: Array<{
      id: string
      title: string
      status: string
      assigned_to: string | null
    }>
    reviewer: {
      id: string
      username: string | null
      email: string | null
    } | null
    target_user: {
      id: string
      username: string | null
      email: string | null
    } | null
    responder: {
      id: string
      username: string | null
      email: string | null
    } | null
    updated_at: string
  }

  interface Column {
    status: Status
    title: string
    cards: Card[]
  }

  interface BoardSection {
    columns: Record<Status, Column>
  }

  interface ReviewWindow {
    sprintId: string
    sprintName: string
    projectId?: string
    projectName?: string
    activeSprintId: string | null
    activeSprintName: string | null
    reviewOpenedAt: string | null
  }

  interface Props {
    actorUserId: string | null
    sprintId: string | null
    selectedWorkflowId: string | null
    reviewWindow: ReviewWindow | null
    reviewType: 'manager' | 'environment'
    targetType: TargetType
    workspaceMode?: 'personal' | 'project'
    board: {
      assigner: BoardSection
      environment: BoardSection
    }
    projectContext?: {
      selectedProject?: {
        id: string
        name: string
      } | null
    } | null
  }

  const {
    actorUserId,
    selectedWorkflowId,
    reviewWindow,
    reviewType,
    targetType,
    board,
    projectContext,
    workspaceMode = 'project',
  }: Props = $props()
  const { t } = useTranslation()
  const statuses: UserVisibleStatus[] = [
    'awaiting_review',
    'in_review',
    'awaiting_response',
    'disputed',
    'reported',
    'admin_reviewing',
    'done',
  ]
  let hydratedWorkflowId = $state<string | null>(null)
  let selectedId = $state<string | null>(null)
  let detailDialogOpen = $state(false)
  let rating = $state(4)
  let comment = $state('')
  let responseBody = $state('')
  let reportBody = $state('')

  const pageTitle = $derived(
    reviewType === 'environment'
      ? t('task.sprint_reverse_board.title.environment', {}, 'Work environment review')
      : t('task.sprint_reverse_board.title.assigner', {}, 'Assigner review')
  )
  const projectId = $derived(reviewWindow?.projectId ?? projectContext?.selectedProject?.id ?? null)
  const boardRoute = $derived(
    workspaceMode === 'project' && projectId
      ? `/projects/${encodeURIComponent(projectId)}/reviews/${reviewType === 'environment' ? 'environment' : 'assigners'}`
      : reviewType === 'environment'
        ? '/reviews/environment'
        : '/reviews/assigners'
  )
  const section = $derived(targetType === 'environment' ? board.environment : board.assigner)
  const cards = $derived(statuses.flatMap((status) => section.columns[status]?.cards ?? []))
  const selectedCard = $derived(cards.find((card) => card.id === selectedId) ?? null)
  const actorIsReviewer = $derived(!!actorUserId && selectedCard?.reviewer_id === actorUserId)
  const actorIsResponder = $derived(!!actorUserId && selectedCard?.responder_id === actorUserId)
  const canSubmitSelectedReview = $derived(selectedCard?.status === 'awaiting_review' && actorIsReviewer)
  const canRespondSelectedReview = $derived(selectedCard?.status === 'awaiting_response' && actorIsResponder)
  const canReportSelectedReview = $derived(
    selectedCard?.status === 'disputed' && (actorIsReviewer || actorIsResponder)
  )
  const selectedCardTitle = $derived(
    selectedCard?.target_type === 'assigner'
      ? targetName(selectedCard)
      : t('task.sprint_reverse_board.environment_context', {}, 'Work environment: project / organization / teammates')
  )
  const statusTone: Record<Status, string> = {
    awaiting_review: 'border-border bg-muted/40 text-foreground',
    in_review: 'border-primary/30 bg-primary/10 text-primary',
    awaiting_response: 'border-border bg-accent text-accent-foreground',
    disputed: 'border-destructive/30 bg-destructive/10 text-destructive',
    reported: 'border-border bg-muted text-muted-foreground',
    ai_reviewing: 'border-primary/30 bg-primary/10 text-primary',
    admin_reviewing: 'border-border bg-background text-foreground',
    resolved: 'border-border bg-card text-foreground',
    done: 'border-primary/30 bg-primary/10 text-primary',
  }
  const laneTone: Record<UserVisibleStatus, string> = {
    awaiting_review: 'border-t-muted-foreground',
    in_review: 'border-t-primary',
    awaiting_response: 'border-t-accent-foreground',
    disputed: 'border-t-destructive',
    reported: 'border-t-muted-foreground',
    admin_reviewing: 'border-t-foreground',
    done: 'border-t-primary',
  }

  $effect(() => {
    if (selectedWorkflowId && hydratedWorkflowId !== selectedWorkflowId) {
      selectedId = selectedWorkflowId
      detailDialogOpen = true
      hydratedWorkflowId = selectedWorkflowId
    }
  })

  function selectCard(card: Card) {
    selectedId = card.id
    detailDialogOpen = true
    rating = card.rating ?? 4
    comment = card.comment ?? ''
    responseBody = ''
    reportBody = ''

    if (projectId) {
      const boardName = reviewType === 'environment' ? 'environment' : 'assigners'
      router.get(
        workspaceMode === 'project'
          ? `/projects/${encodeURIComponent(projectId)}/reviews/${boardName}`
          : boardRoute,
        {
          ...(reviewWindow?.sprintId ? { sprint_id: reviewWindow.sprintId } : {}),
          workflow_id: card.id,
        },
        { preserveScroll: true, preserveState: true, replace: true }
      )
    }
  }

  function closeDetailDialog() {
    detailDialogOpen = false
    responseBody = ''
    reportBody = ''

    if (projectId) {
      const boardName = reviewType === 'environment' ? 'environment' : 'assigners'
      router.get(
        workspaceMode === 'project'
          ? `/projects/${encodeURIComponent(projectId)}/reviews/${boardName}`
          : boardRoute,
        reviewWindow?.sprintId ? { sprint_id: reviewWindow.sprintId } : {},
        { preserveScroll: true, preserveState: true, replace: true }
      )
    }
  }

  function post(path: string, data: Record<string, string | number>) {
    router.post(path, data, {
      preserveScroll: true,
    })
  }

  function submitReview() {
    if (!selectedCard) return
    post(`/sprint-reverse-reviews/${selectedCard.id}/submit`, { rating, comment })
  }

  function acceptReview() {
    if (!selectedCard) return
    post(`/sprint-reverse-reviews/${selectedCard.id}/accept`, {})
  }

  function respondReview() {
    if (!selectedCard) return
    post(`/sprint-reverse-reviews/${selectedCard.id}/respond`, { body: responseBody })
  }

  function reportReview() {
    if (!selectedCard) return
    post(`/sprint-reverse-reviews/${selectedCard.id}/report`, { body: reportBody })
  }

  function statusLabel(status: Status): string {
    const fallback: Record<Status, string> = {
      awaiting_review: 'Awaiting review',
      in_review: 'In review',
      awaiting_response: 'Awaiting response',
      disputed: 'Disputed',
      reported: 'Reported',
      ai_reviewing: 'AI reviewing',
      resolved: 'Resolved',
      done: 'Done',
    }

    return t(`task.sprint_reverse_board.status.${status}`, {}, fallback[status])
  }

  function targetName(card: Card): string {
    if (card.target_type === 'environment') {
      return t('task.sprint_reverse_board.target_environment', {}, 'Work environment')
    }

    const targetId = card.target_user_id?.slice(0, 8)
    return card.target_user?.username
      ?? card.target_user?.email
      ?? (targetId
        ? t('task.sprint_reverse_board.assigner_fallback', { id: targetId }, 'Assigner :id')
        : t('task.sprint_reverse_board.unassigned', {}, 'Unassigned'))
  }

  function targetDescription(card: Card): string {
    if (card.target_type === 'environment') {
      return t('task.sprint_reverse_board.environment_description', {}, 'Project + organization + teammates')
    }

    return t('task.sprint_reverse_board.related_task_count', { count: card.related_task_count }, ':count related tasks')
  }
</script>

<svelte:head>
  <title>{pageTitle}</title>
</svelte:head>

<AppLayout title={pageTitle} {workspaceMode}>
  <div class="task-control-page space-y-4">
    <section class="task-board-surface min-h-[calc(100vh-60px)] rounded-3xl border border-border bg-card p-4 shadow-xs md:p-5" aria-label={pageTitle}>
      <header class="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <p class="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">{t('task.sprint_reverse_board.eyebrow', {}, 'Review board')}</p>
          <h1 class="mt-1 text-2xl font-black tracking-tight text-foreground">{pageTitle}</h1>
        </div>
        {#if reviewWindow}
          <div class="rounded-xl border border-border bg-background px-3 py-2 text-sm font-semibold text-muted-foreground">
            {t('task.sprint_reverse_board.sprint_label', {}, 'Sprint')}: {reviewWindow.sprintName}
          </div>
        {/if}
      </header>

      <div class="space-y-4">
        <section class="min-w-0 overflow-hidden rounded-2xl border border-border bg-background" aria-label={t('task.sprint_reverse_board.kanban_aria', {}, 'Status kanban')}>
          <div class="flex gap-3 overflow-x-auto p-3 pb-4">
            {#each statuses as status}
              <section
                class={`flex min-h-[420px] w-[320px] shrink-0 flex-col overflow-hidden rounded-2xl border border-t-4 border-border bg-muted/30 shadow-sm ${laneTone[status]}`}
              >
                <div class="border-b border-border px-3.5 py-3">
                  <div class="flex items-center justify-between gap-2">
                    <h2 class="truncate text-sm font-extrabold tracking-[0.03em] text-foreground">{statusLabel(status)}</h2>
                    <span class="inline-flex items-center justify-center rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] font-bold text-foreground">
                      {section.columns[status]?.cards.length ?? 0}
                    </span>
                  </div>
                </div>
                <div class="flex min-h-[120px] flex-1 flex-col gap-2.5 overflow-y-auto p-3">
                  {#each section.columns[status]?.cards ?? [] as card}
                    <button
                      class={`relative rounded-xl border bg-background px-3 py-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${detailDialogOpen && selectedCard?.id === card.id ? 'border-primary ring-2 ring-primary/20' : 'border-border'}`}
                      type="button"
                      onclick={() => selectCard(card)}
                    >
                      <div class="flex items-start justify-between gap-2">
                        <div class="min-w-0">
                          <p class="line-clamp-2 break-all text-sm font-extrabold leading-5 text-foreground">{targetName(card)}</p>
                          <p class="mt-1 truncate text-xs text-muted-foreground">
                            {targetDescription(card)}
                          </p>
                        </div>
                        {#if card.rating}
                          <span class="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-bold text-emerald-600">{card.rating}/5</span>
                        {/if}
                      </div>
                      <div class="mt-3">
                        <span class={`inline-flex min-h-6 items-center rounded-full border px-2 py-0.5 text-[11px] font-extrabold ${statusTone[card.status]}`}>
                          {statusLabel(card.status)}
                        </span>
                      </div>
                    </button>
                  {:else}
                    <div class="grid min-h-24 place-items-center rounded-xl border border-dashed border-border text-center text-sm font-semibold text-muted-foreground">
                      {t('task.sprint_reverse_board.empty_lane', {}, 'Empty')}
                    </div>
                  {/each}
                </div>
              </section>
            {/each}
          </div>
        </section>

        <Dialog
          open={detailDialogOpen && !!selectedCard}
          onOpenChange={(open) => {
            if (!open) closeDetailDialog()
            else detailDialogOpen = true
          }}
        >
          <DialogContent
            class="max-h-[90vh] w-[96vw] overflow-y-auto sm:max-w-3xl"
            role="dialog"
            aria-modal="true"
            aria-label={selectedCardTitle}
          >
            {#if selectedCard}
              <DialogHeader class="border-b border-border pb-4">
                <p class="text-xs font-black uppercase tracking-[0.16em] text-muted-foreground">
                  {pageTitle}
                </p>
                <DialogTitle class="break-words text-xl font-black text-foreground">
                  {selectedCardTitle}
                </DialogTitle>
                <DialogDescription>
                  {t('task.sprint_reverse_board.status_label', {}, 'Status')}: <span class="font-bold text-foreground">{statusLabel(selectedCard.status)}</span>
                </DialogDescription>
              </DialogHeader>

              <div class="space-y-4">
                {#if selectedCard.comment && !canRespondSelectedReview && !canReportSelectedReview}
                  <div class="rounded-md border border-border bg-background p-3 text-sm text-foreground">{selectedCard.comment}</div>
                {/if}

                {#if canSubmitSelectedReview}
                  <div class="relative z-20 space-y-3 rounded-md border border-border bg-card p-4">
                    <label class="block text-xs font-bold text-muted-foreground" for="reverse-rating">{t('task.sprint_reverse_board.rating_label', {}, 'Rating')}</label>
                    <input id="reverse-rating" bind:value={rating} class="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" max="5" min="1" type="number" />
                    <label class="block text-xs font-bold text-muted-foreground" for="reverse-comment">{t('task.sprint_reverse_board.review_label', {}, 'Review')}</label>
                    <textarea id="reverse-comment" bind:value={comment} class="min-h-28 w-full rounded-md border border-input bg-background p-3 text-sm" placeholder={t('task.sprint_reverse_board.review_placeholder', {}, 'Enter review')}></textarea>
                    <button class="relative z-30 w-full rounded-md bg-primary px-3 py-2 text-sm font-bold text-primary-foreground" type="button" onclick={submitReview}>
                      {t('task.sprint_reverse_board.submit_review', {}, 'Submit review')}
                    </button>
                  </div>
                {/if}

                {#if canRespondSelectedReview || canReportSelectedReview}
                  <div class="relative z-20 space-y-3 rounded-md border border-border bg-card p-4">
                    {#if selectedCard.comment}
                      <div class="rounded-md border border-border bg-background p-3 text-sm text-foreground">{selectedCard.comment}</div>
                    {/if}
                    {#if canRespondSelectedReview}
                      <button class="relative z-30 w-full rounded-md bg-primary px-3 py-2 text-sm font-bold text-primary-foreground" type="button" onclick={acceptReview}>
                        {t('task.sprint_reverse_board.accept', {}, 'Accept')}
                      </button>
                      <textarea bind:value={responseBody} class="min-h-24 w-full rounded-md border border-input bg-background p-3 text-sm" placeholder={t('task.sprint_reverse_board.response_placeholder', {}, 'Reply for dispute context')}></textarea>
                      <button class="relative z-30 w-full rounded-md border border-border bg-card px-3 py-2 text-sm font-bold text-foreground" type="button" onclick={respondReview}>
                        {t('task.sprint_reverse_board.respond', {}, 'Reply / dispute')}
                      </button>
                    {/if}
                    {#if canReportSelectedReview}
                      <textarea bind:value={reportBody} class="min-h-20 w-full rounded-md border border-input bg-background p-3 text-sm" placeholder={t('task.sprint_reverse_board.report_placeholder', {}, 'Reason for admin report')}></textarea>
                      <button class="relative z-30 w-full rounded-md bg-destructive px-3 py-2 text-sm font-bold text-destructive-foreground" type="button" onclick={reportReview}>
                        {t('task.sprint_reverse_board.submit_report', {}, 'Submit report')}
                      </button>
                    {/if}
                  </div>
                {/if}

                {#if selectedCard.target_type === 'assigner'}
                  <div class="rounded-md border border-border bg-background p-3 text-sm">
                    <div class="font-bold text-foreground">{t('task.sprint_reverse_board.related_tasks_count', { count: selectedCard.related_task_count }, ':count tasks in sprint')}</div>
                    <div class="mt-1 text-muted-foreground">{t('task.sprint_reverse_board.read_only_hint', {}, 'Sprint tasks are closed: details are read-only.')}</div>
                    {#if selectedCard.related_tasks.length > 0}
                      <div class="mt-3 space-y-2">
                        {#each selectedCard.related_tasks as task}
                          <a
                            class="block rounded-md border border-border bg-card px-3 py-2 hover:border-primary/50"
                            href={workspaceMode === 'project'
                              ? `/projects/${encodeURIComponent(projectId ?? '')}/tasks?task_id=${encodeURIComponent(task.id)}`
                              : `/tasks?task_id=${encodeURIComponent(task.id)}`}
                          >
                            <span class="block truncate font-bold text-foreground">{task.title}</span>
                            <span class="mt-0.5 block text-xs text-muted-foreground">{task.status} · {t('task.sprint_reverse_board.read_only_status', {}, 'read-only')}</span>
                          </a>
                        {/each}
                      </div>
                    {/if}
                  </div>
                {:else}
                  <div class="rounded-md border border-border bg-background p-3 text-sm">
                    <div class="font-bold text-foreground">{t('task.sprint_reverse_board.responder_required', {}, 'Required responder')}</div>
                    <div class="mt-1 break-words text-muted-foreground">
                      {selectedCard.responder?.username ?? selectedCard.responder?.email ?? selectedCard.responder_id ?? t('task.sprint_reverse_board.unassigned', {}, 'Unassigned')}
                    </div>
                  </div>
                {/if}

                {#if selectedCard.status === 'reported' || selectedCard.status === 'done'}
                  <div class="rounded-md border border-border bg-background p-4 text-sm text-muted-foreground">
                    {selectedCard.status === 'done'
                      ? t('task.sprint_reverse_board.workflow_done', {}, 'Workflow is complete.')
                      : t('task.sprint_reverse_board.workflow_reported', {}, 'Workflow was reported to admin.')}
                  </div>
                {/if}
              </div>
            {/if}
          </DialogContent>
        </Dialog>
      </div>
    </section>
  </div>
</AppLayout>
