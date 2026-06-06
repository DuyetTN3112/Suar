<script lang="ts">
  import { page, router } from '@inertiajs/svelte'
  import {
    ClipboardCheck,
    GripVertical,
    User,
  } from 'lucide-svelte'

  import OrganizationLayout from '@/apps/org/shared/layouts/organization_layout.svelte'
  import TaskReviewWorkflowPanel from '@/apps/org/modules/tasks/components/detail/task_review_workflow_panel.svelte'
  import { useTranslation } from '@/apps/org/shared/stores/translation.svelte'

  type WorkflowStatus =
    | 'awaiting_review'
    | 'in_review'
    | 'awaiting_response'
    | 'disputed'
    | 'reported'
    | 'done'

  interface BoardCard {
    taskId: string
    workflowId: string | null
    status: WorkflowStatus
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
    requiredReviewCount: number
    lastActivityAt: string | null
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
  }

  const { projectId, selectedTaskId, board, detail }: Props = $props()
  const { t } = useTranslation()
  const flash = $derived((page.props as { flash?: { success?: string; error?: string } }).flash)
  const pageTitle = $derived(t('task.reviews.task_board.page_title', {}, 'Task review board'))
  const currentUserId = $derived(
    (page as { props: { auth?: { user?: { id?: string } } } }).props.auth?.user?.id ?? null
  )

  const allCards = $derived(board.columns.flatMap((column) => column.cards))
  const taskReviewRedirectUrl = $derived(
    selectedTaskId
      ? `/org/reviews/task-board?project_id=${projectId ?? ''}&task_id=${selectedTaskId}`
      : '/org/reviews/task-board'
  )

  const laneColor: Record<WorkflowStatus, string> = {
    awaiting_review: '#94a3b8',
    in_review: '#3b82f6',
    awaiting_response: '#f59e0b',
    disputed: '#e11d48',
    reported: '#71717a',
    done: '#10b981',
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

  function chipTone(value: string | null | undefined, tones: Record<string, string>): string {
    if (!value) return 'border-border bg-muted text-muted-foreground'
    return tones[value] ?? 'border-border bg-background text-foreground'
  }

  function openTask(taskId: string) {
    router.get(`/org/tasks/${taskId}`)
  }
</script>

<svelte:head>
  <title>{pageTitle}</title>
</svelte:head>

<OrganizationLayout title={pageTitle}>
  <div class="task-control-page space-y-4">
    <section class="task-board-surface min-h-[calc(100vh-60px)] rounded-3xl border border-border bg-card p-4 shadow-xs md:p-5" aria-label={pageTitle}>
      <header class="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <p class="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">{t('task.reviews.task_board.eyebrow', {}, 'Review board')}</p>
          <h1 class="mt-1 text-2xl font-black tracking-tight text-foreground">{pageTitle}</h1>
        </div>
        <div class="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm font-semibold text-muted-foreground">
          <ClipboardCheck class="h-4 w-4" />
          {t('task.reviews.task_board.done_count', { count: allCards.length }, ':count completed tasks in project')}
        </div>
      </header>

      {#if flash?.success}
        <div class="mb-3 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-600">{flash.success}</div>
      {/if}
      {#if flash?.error}
        <div class="mb-3 rounded-md border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-600">{flash.error}</div>
      {/if}

      {#if !projectId}
        <section class="flex min-h-[420px] items-center justify-center rounded-2xl border border-dashed border-border text-muted-foreground">
          {t('task.reviews.task_board.no_project', {}, 'No current project is available for the review board.')}
        </section>
      {:else}
        <div class="space-y-4">
          <section class="min-w-0 overflow-hidden rounded-2xl border border-border bg-background" aria-label="Task review lanes">
            <div class="flex gap-3 overflow-x-auto p-3 pb-4">
              {#each board.columns as column (column.status)}
                <div
                  class="flex min-h-[420px] w-[320px] shrink-0 flex-col overflow-hidden rounded-2xl border border-border bg-muted/30 shadow-sm"
                  style={`border-top: 4px solid ${laneColor[column.status]}`}
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
                            <span>{card.reviewCount}/{card.requiredReviewCount}</span>
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

          {#if detail && selectedTaskId}
            <TaskReviewWorkflowPanel
              taskId={selectedTaskId}
              {projectId}
              {currentUserId}
              taskDetailUrl={taskReviewRedirectUrl}
              {detail}
            />
          {/if}
      </div>
    {/if}
    </section>
  </div>
</OrganizationLayout>
