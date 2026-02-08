<script lang="ts">
  import { page, router } from '@inertiajs/svelte'
  import { ClipboardCheck, GripVertical, User } from 'lucide-svelte'

  import AppLayout from '@/apps/user/shared/layouts/app_layout.svelte'
  import TaskReviewWorkflowPanel from '@/apps/user/modules/tasks/components/detail/task_review_workflow_panel.svelte'
  import { useTranslation } from '@/apps/user/shared/stores/translation.svelte'
  import Dialog from '@/apps/user/shared/ui/dialog.svelte'
  import DialogContent from '@/apps/user/shared/ui/dialog_content.svelte'

  type WorkflowStatus =
    | 'awaiting_review'
    | 'in_review'
    | 'awaiting_response'
    | 'disputed'
    | 'reported'
    | 'ai_reviewing'
    | 'resolved'
    | 'done'

  interface BoardCard {
    taskId: string
    workflowId: string | null
    status: WorkflowStatus
    workflowStatus?: 'not_opened' | 'out_of_model' | WorkflowStatus
    title: string
    description: string | null
    taskStatus: string | null
    priority: string | null
    label: string | null
    difficulty: string | null
    dueDate: string | null
    estimatedTime: number | null
    revieweeId: string | null
    revieweeName: string | null
    creatorId: string | null
    creatorName: string | null
    projectId: string
    reviewCount: number
    requiredReviewCount: number | null
    lastActivityAt: string | null
    waitingOnMe?: boolean
  }

  interface BoardColumn {
    status: WorkflowStatus
    label: string
    cards: BoardCard[]
  }

  interface DetailUserMessage {
    id: string
    body: string
    created_at: string
    author_id: string
    author_name: string | null
    message_type?: string
    comment_type?: string
    visibility?: string
  }

  interface Reviewer {
    reviewer_id: string
    reviewer_name: string | null
    reviewer_role: string
    status: 'pending' | 'submitted' | 'waived'
    priority_rank: number
  }

  interface Detail {
    task: Record<string, unknown>
    workflow: Record<string, unknown> | null
    reviewers: Reviewer[]
    comments: DetailUserMessage[]
    reviewMessages: DetailUserMessage[]
  }

  interface Props {
    projectId: string | null
    selectedTaskId: string | null
    board: { projectId: string | null; columns: BoardColumn[] }
    detail: Detail | null
    projectContext?: {
      selectedProject?: ReviewBoardProjectOption | null
    } | null
  }

  interface ReviewBoardProjectOption {
    id: string
    name: string
  }

  interface ReviewBoardAuthUser {
    current_project?: ReviewBoardProjectOption | null
    projects?: ReviewBoardProjectOption[]
  }

  interface ReviewBoardPageLike {
    props: {
      flash?: { success?: string; error?: string }
      auth?: { user?: ReviewBoardAuthUser }
    }
    url: string
  }

  const { projectId, selectedTaskId, board, detail, projectContext }: Props = $props()
  const { t } = useTranslation()
  const currentPage = page as unknown as ReviewBoardPageLike
  const flash = $derived(currentPage.props.flash)
  const pageTitle = $derived(t('task.reviews.task_board.page_title', {}, 'Task review board'))
  const currentUserId = $derived(
    (currentPage.props.auth?.user as { id?: string } | undefined)?.id ?? null
  )
  const currentProject = $derived(
    projectContext?.selectedProject ?? currentPage.props.auth?.user?.current_project ?? null
  )
  const projectOptions = $derived(currentPage.props.auth?.user?.projects ?? [])
  const activeProjectId = $derived(projectId ?? currentProject?.id ?? null)
  const boardColumns = $derived(
    board.columns.length > 0
      ? board.columns
      : [
          { status: 'awaiting_review' as WorkflowStatus, label: t('task.reviews.task_board.awaiting_review', {}, 'Chờ review'), cards: [] },
          { status: 'in_review' as WorkflowStatus, label: t('task.reviews.task_board.in_review', {}, 'Đang review'), cards: [] },
          { status: 'awaiting_response' as WorkflowStatus, label: t('task.reviews.task_board.awaiting_response', {}, 'Chờ phản hồi'), cards: [] },
          { status: 'disputed' as WorkflowStatus, label: t('task.reviews.task_board.disputed', {}, 'Tranh chấp'), cards: [] },
          { status: 'reported' as WorkflowStatus, label: t('task.reviews.task_board.reported', {}, 'Đã gửi report tranh chấp'), cards: [] },
          { status: 'ai_reviewing' as WorkflowStatus, label: t('task.reviews.task_board.ai_reviewing', {}, 'AI đang xử lý'), cards: [] },
          { status: 'resolved' as WorkflowStatus, label: t('task.reviews.task_board.resolved', {}, 'Đã xử lý'), cards: [] },
          { status: 'done' as WorkflowStatus, label: t('task.reviews.task_board.done', {}, 'Done'), cards: [] },
        ]
  )
  const waitingOnMeOnly = $derived(
    new URLSearchParams(currentPage.url.split('?')[1] ?? '').get('focus') === 'waiting_on_me'
  )
  const visibleColumns = $derived(
    waitingOnMeOnly
      ? boardColumns.map((column) => ({
          ...column,
          cards: column.cards.filter((card) => card.waitingOnMe),
        }))
      : boardColumns
  )

  const allCards = $derived(board.columns.flatMap((column) => column.cards))
  const visibleCardCount = $derived(visibleColumns.flatMap((column) => column.cards).length)
  const taskReviewRedirectUrl = $derived(
    selectedTaskId
      ? `/projects/${encodeURIComponent(activeProjectId ?? '')}/reviews/tasks?task_id=${encodeURIComponent(selectedTaskId)}`
      : `/projects/${encodeURIComponent(activeProjectId ?? '')}/reviews/tasks`
  )

  const laneTone: Record<WorkflowStatus, string> = {
    awaiting_review: 'border-t-muted-foreground',
    in_review: 'border-t-primary',
    awaiting_response: 'border-t-accent-foreground',
    disputed: 'border-t-destructive',
    reported: 'border-t-muted-foreground',
    ai_reviewing: 'border-t-primary',
    resolved: 'border-t-foreground',
    done: 'border-t-primary',
  }

  const priorityTone: Record<string, string> = {
    urgent: 'border-destructive/30 bg-destructive/10 text-destructive',
    high: 'border-border bg-secondary/40 text-foreground',
    medium: 'border-primary/30 bg-primary/10 text-primary',
    low: 'border-border bg-muted text-muted-foreground',
  }

  const labelTone: Record<string, string> = {
    bug: 'border-destructive/30 bg-destructive/10 text-destructive',
    feature: 'border-primary/30 bg-primary/10 text-primary',
    enhancement: 'border-border bg-accent text-accent-foreground',
    documentation: 'border-border bg-secondary/40 text-foreground',
  }

  function reviewProgressLabel(card: BoardCard): string {
    return card.requiredReviewCount === null ? `${card.reviewCount}/—` : `${card.reviewCount}/${card.requiredReviewCount}`
  }

  function chipTone(value: string | null | undefined, tones: Record<string, string>): string {
    if (!value) return 'border-border bg-muted text-muted-foreground'
    return tones[value] ?? 'border-border bg-background text-foreground'
  }

  function handleProjectChange(event: Event) {
    const nextProjectId = (event.currentTarget as HTMLSelectElement).value
    if (!nextProjectId) return

    router.get(
      `/projects/${encodeURIComponent(nextProjectId)}/reviews/tasks`,
      {},
      { preserveScroll: true, preserveState: true }
    )
  }

  $effect(() => {
    if (!activeProjectId) {
      const selector = document.getElementById('task-review-project-selector')
      if (selector instanceof HTMLSelectElement) {
        selector.focus()
      }
    }
  })

  function openTask(taskId: string) {
    router.get(
      `/projects/${encodeURIComponent(activeProjectId ?? '')}/reviews/tasks?task_id=${encodeURIComponent(taskId)}`,
      {},
      { preserveScroll: true, preserveState: true }
    )
  }

  function setWaitingOnMeFilter(enabled: boolean) {
    const path = `/projects/${encodeURIComponent(activeProjectId ?? '')}/reviews/tasks`
    router.get(
      path,
      enabled ? { focus: 'waiting_on_me' } : {},
      { preserveScroll: true, preserveState: true }
    )
  }

  function closeTaskReview() {
    router.get(
      `/projects/${encodeURIComponent(activeProjectId ?? '')}/reviews/tasks`,
      waitingOnMeOnly ? { focus: 'waiting_on_me' } : {},
      { preserveScroll: true, preserveState: true, replace: true }
    )
  }
</script>

<svelte:head>
  <title>{pageTitle}</title>
</svelte:head>

<AppLayout title={pageTitle} workspaceMode="project">
  <div class="task-control-page space-y-4">
    <section class="task-board-surface min-h-[calc(100vh-60px)] rounded-3xl border border-border bg-card p-4 shadow-xs md:p-5" aria-label={pageTitle}>
      <header class="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4">
        <div>
          <p class="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">{t('task.reviews.task_board.eyebrow', {}, 'Review board')}</p>
          <h1 class="mt-1 text-2xl font-black tracking-tight text-foreground">{pageTitle}</h1>
          <p class="mt-1 text-sm font-medium text-muted-foreground">
            {currentProject?.name ?? t('task.reviews.task_board.no_project_name', {}, 'Choose a project')}
          </p>
        </div>
        <div class="flex min-w-[280px] flex-col gap-2">
          <label class="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground" for="task-review-project-selector">
            {t('task.reviews.task_board.project_selector', {}, 'Project selector')}
          </label>
          <select
            id="task-review-project-selector"
            class="h-10 rounded-xl border border-border bg-background px-3 text-sm font-semibold text-foreground shadow-xs"
            onchange={handleProjectChange}
            value={activeProjectId ?? ''}
            aria-label={t('task.reviews.task_board.project_selector', {}, 'Project selector')}
          >
            {#if !activeProjectId}
              <option value="">{t('task.reviews.task_board.choose_project', {}, 'Choose project')}</option>
            {/if}
            {#each projectOptions as project (project.id)}
              <option value={project.id}>{project.name}</option>
            {/each}
          </select>
          <div class="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm font-semibold text-muted-foreground">
            <ClipboardCheck class="h-4 w-4" />
            {t('task.reviews.task_board.done_count', { count: allCards.length }, ':count completed tasks in project')}
          </div>
        </div>
      </header>

      {#if flash?.success}
        <div class="mb-3 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-600">{flash.success}</div>
      {/if}
      {#if flash?.error}
        <div class="mb-3 rounded-md border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-600">{flash.error}</div>
      {/if}

      <div class="space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="inline-flex rounded-xl border border-border bg-muted/40 p-1">
            <button
              type="button"
              class={`rounded-lg px-3 py-1.5 text-xs font-extrabold transition ${waitingOnMeOnly ? 'text-muted-foreground hover:text-foreground' : 'bg-background text-foreground shadow-sm'}`}
              onclick={() => setWaitingOnMeFilter(false)}
            >
              {t('task.reviews.task_board.all_project_tasks', {}, 'All project reviews')}
            </button>
            <button
              type="button"
              class={`rounded-lg px-3 py-1.5 text-xs font-extrabold transition ${waitingOnMeOnly ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              onclick={() => setWaitingOnMeFilter(true)}
            >
              {t('task.reviews.task_board.waiting_on_me', {}, 'Waiting on me')}
            </button>
          </div>
          <span class="text-xs font-bold text-muted-foreground">
            {visibleCardCount} {t('task.reviews.task_board.visible_cards', {}, 'visible cards')}
          </span>
        </div>

        <section
          class="min-w-0 overflow-hidden rounded-2xl border border-border bg-background"
          aria-label={t('ui_misc.reviews.task_review_lanes_aria', {}, 'Task review lanes')}
        >
          <div class="flex gap-3 overflow-x-auto p-3 pb-4">
            {#each visibleColumns as column (column.status)}
              <div
                class={`flex min-h-[420px] w-[320px] shrink-0 flex-col overflow-hidden rounded-2xl border border-t-4 border-border bg-muted/30 shadow-sm ${laneTone[column.status]}`}
              >
                <div class="flex items-center justify-between gap-2 border-b border-border px-3.5 py-3">
                  <div class="inline-flex min-w-0 items-center gap-2">
                    <p class="truncate text-sm font-extrabold tracking-[0.03em] text-foreground">{column.label}</p>
                    <span class="inline-flex items-center justify-center rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] font-bold text-foreground">
                      {column.cards.length}
                    </span>
                  </div>
                </div>

                <div class="flex min-h-[120px] flex-1 flex-col gap-2.5 overflow-y-auto p-3">
                  {#each column.cards as card (card.taskId)}
                    <button
                      type="button"
                      class={`relative rounded-xl border bg-background px-3 py-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${selectedTaskId === card.taskId ? 'border-primary ring-2 ring-primary/20' : 'border-border'}`}
                      onclick={() => openTask(card.taskId)}
                    >
                      <div class="flex items-start gap-2">
                        <GripVertical class="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                        <p class="line-clamp-2 flex-1 text-sm font-extrabold leading-5 text-foreground">{card.title}</p>
                      </div>

                        <div class="mt-2.5 flex flex-wrap gap-1.5">
                          <span class="inline-flex min-h-6 items-center rounded-full border border-emerald-400 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-extrabold text-emerald-600">
                            {card.taskStatus ?? 'done'}
                          </span>
                          {#if card.workflowStatus === 'not_opened'}
                            <span class="inline-flex min-h-6 items-center rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] font-extrabold text-muted-foreground">
                              {t('task.reviews.task_board.not_opened', {}, 'Review not opened')}
                            </span>
                          {:else if card.workflowStatus === 'out_of_model'}
                            <span class="inline-flex min-h-6 items-center rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] font-extrabold text-muted-foreground">
                              {t('task.reviews.task_board.out_of_model', {}, 'Out of model')}
                            </span>
                          {/if}
                          {#if card.waitingOnMe}
                            <span class="inline-flex min-h-6 items-center rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-extrabold text-primary">
                              {t('task.reviews.task_board.waiting_on_me', {}, 'Waiting on me')}
                            </span>
                          {/if}
                          {#if card.priority}
                            <span class={`inline-flex min-h-6 items-center rounded-full border px-2 py-0.5 text-[11px] font-extrabold ${chipTone(card.priority, priorityTone)}`}>
                              {card.priority}
                          </span>
                        {/if}
                        {#if card.label}
                          <span class={`inline-flex min-h-6 items-center rounded-full border px-2 py-0.5 text-[11px] font-extrabold ${chipTone(card.label, labelTone)}`}>
                            {card.label}
                          </span>
                        {/if}
                      </div>

                      <div class="mt-3 flex items-center justify-between gap-2 text-xs font-semibold text-muted-foreground">
                        <div class="flex min-w-0 items-center gap-1.5" title={card.revieweeName ?? t('task.reviews.task_board.unassigned', {}, 'Unassigned')}>
                          <User class="h-3 w-3 shrink-0" />
                          <span class="max-w-24 truncate">{card.revieweeName ?? t('task.reviews.task_board.unassigned', {}, 'Unassigned')}</span>
                        </div>
                        <div class="flex shrink-0 items-center gap-1.5 text-foreground">
                          <ClipboardCheck class="h-3 w-3" />
                          <span>{reviewProgressLabel(card)}</span>
                        </div>
                      </div>
                    </button>
                  {:else}
                    <div class="grid min-h-24 place-items-center rounded-xl border border-dashed border-border text-center text-sm font-semibold text-muted-foreground">
                      {t('task.reviews.task_board.empty_lane', {}, 'Empty')}
                    </div>
                  {/each}
                </div>
              </div>
            {/each}
          </div>
        </section>

        <Dialog
          open={!!detail && !!selectedTaskId}
          onOpenChange={(open) => {
            if (!open) closeTaskReview()
          }}
        >
          <DialogContent
            class="max-h-[92vh] w-[96vw] max-w-6xl overflow-y-auto p-3 sm:p-5"
            role="dialog"
            aria-modal="true"
            aria-label={t('task.reviews.task_board.card_room', {}, 'Task review card room')}
          >
            {#if detail && selectedTaskId}
              <TaskReviewWorkflowPanel
                taskId={selectedTaskId}
                {projectId}
                {currentUserId}
                taskDetailUrl={taskReviewRedirectUrl}
                {detail}
              />
            {/if}
          </DialogContent>
        </Dialog>
      </div>
    </section>
  </div>
</AppLayout>
