<script lang="ts">
  import axios from 'axios'

  import Button from '@/apps/user/shared/ui/button.svelte'
  import Card from '@/apps/user/shared/ui/card.svelte'
  import CardContent from '@/apps/user/shared/ui/card_content.svelte'
  import CardHeader from '@/apps/user/shared/ui/card_header.svelte'
  import CardTitle from '@/apps/user/shared/ui/card_title.svelte'
  import UnifiedOffsetPagination from '@/apps/user/shared/ui/unified_offset_pagination.svelte'
  import { currentDocumentLocale } from '@/apps/user/shared/lib/date_locale'
  import type { OffsetPagePagination } from '@/apps/user/shared/lib/pagination'
  import { notificationStore } from '@/apps/user/shared/stores/notification_store.svelte'
  import { useTranslation } from '@/apps/user/shared/stores/translation.svelte'

  type SprintStatus = 'draft' | 'active' | 'review_open' | 'review_closed' | 'archived'

  interface ProjectSprint {
    id: string
    name: string
    goal: string | null
    status: SprintStatus
    startsAt: string
    endsAt: string
    reviewOpenedAt: string | null
    reviewClosedAt: string | null
    reverseReviewPendingCount?: number | string
    reverseReviewAssignerPendingCount?: number | string
    reverseReviewEnvironmentPendingCount?: number | string
  }

  interface SprintBoardTask {
    id: string
    title: string
    status: string
    priority: string
    assignedTo: string | null
    projectSprintId: string | null
    sortOrder: number
    updatedAt: string
  }

  interface SprintBoard {
    projectId: string
    sprint: {
      id: string
      name: string
      goal: string | null
      status: SprintStatus
      startsAt: string
      endsAt: string
    } | null
    backlogTasks: SprintBoardTask[]
    sprintTasks: SprintBoardTask[]
    counts: {
      backlogTasks: number
      sprintTasks: number
    }
  }

  const { projectId, canManage = false }: { projectId: string; canManage?: boolean } = $props()

  let sprints = $state<ProjectSprint[]>([])
  let board = $state<SprintBoard | null>(null)
  let loading = $state(false)
  let boardLoading = $state(false)
  let saving = $state(false)
  let openingSprintId = $state<string | null>(null)
  let closingSprintId = $state<string | null>(null)
  let expiringSprintId = $state<string | null>(null)
  let selectedSprintId = $state<string | null>(null)
  let movingTaskId = $state<string | null>(null)
  let pagination = $state<OffsetPagePagination | null>(null)
  let hydratedProjectId = $state<string | null>(null)
  let form = $state({
    name: '',
    goal: '',
    startsAt: '',
    endsAt: '',
  })
  const { t } = useTranslation()
  const documentLocale = $derived(currentDocumentLocale() === 'vi' ? 'vi-VN' : 'en-US')
  const statusFallbacks: Record<SprintStatus, string> = {
    draft: 'Draft',
    active: 'Active',
    review_open: 'In review',
    review_closed: 'Review closed',
    archived: 'Archived',
  }

  $effect(() => {
    if (projectId && hydratedProjectId !== projectId) {
      hydratedProjectId = projectId
      void loadSprints()
    }
  })

  async function loadSprints(page = pagination?.page ?? 1) {
    loading = true
    try {
      const response = await axios.get<{ data: ProjectSprint[]; pagination?: OffsetPagePagination }>(
        `/api/v1/projects/${projectId}/sprints`,
        { params: { page, perPage: pagination?.perPage ?? 10 } }
      )
      sprints = response.data.data
      pagination = response.data.pagination ?? null
      const activeSprintId = sprints.find((sprint) => sprint.status === 'active')?.id ?? null
      selectedSprintId = selectedSprintId ?? activeSprintId
      await loadSprintBoard(selectedSprintId)
    } catch {
      notificationStore.error(t('project.sprint_panel.load_error', {}, 'Unable to load sprints'))
    } finally {
      loading = false
    }
  }

  async function loadSprintBoard(sprintId: string | null = selectedSprintId) {
    boardLoading = true
    try {
      const params = sprintId ? { projectSprintId: sprintId } : undefined
      const response = await axios.get<{ data: SprintBoard }>(
        `/api/v1/projects/${projectId}/sprint-board`,
        params ? { params } : undefined
      )
      board = response.data.data
      selectedSprintId = response.data.data.sprint?.id ?? sprintId
    } catch {
      notificationStore.error(t('project.sprint_panel.board_load_error', {}, 'Unable to load sprint backlog'))
    } finally {
      boardLoading = false
    }
  }

  async function moveTaskToSprint(taskId: string, sprintId: string | null) {
    movingTaskId = taskId
    try {
      await axios.patch(`/api/v1/projects/${projectId}/tasks/${taskId}/sprint`, {
        projectSprintId: sprintId,
      })
      await loadSprintBoard(selectedSprintId)
      notificationStore.success(
        sprintId
          ? t('project.sprint_panel.move_to_sprint_success', {}, 'Task moved into sprint')
          : t('project.sprint_panel.move_to_backlog_success', {}, 'Task moved back to backlog')
      )
    } catch {
      notificationStore.error(t('project.sprint_panel.move_task_error', {}, 'Unable to update task sprint'))
    } finally {
      movingTaskId = null
    }
  }

  async function createSprint() {
    if (!form.name.trim() || !form.startsAt || !form.endsAt) {
      notificationStore.error(t('project.sprint_panel.create_validation_error', {}, 'Sprint name, start date, and end date are required'))
      return
    }

    saving = true
    try {
      await axios.post<{ data: ProjectSprint }>(
        `/api/v1/projects/${projectId}/sprints`,
        {
          name: form.name.trim(),
          goal: form.goal.trim() || null,
          startsAt: new Date(form.startsAt).toISOString(),
          endsAt: new Date(form.endsAt).toISOString(),
          status: 'active',
        }
      )
      await loadSprints(1)
      form = { name: '', goal: '', startsAt: '', endsAt: '' }
      notificationStore.success(t('project.sprint_panel.create_success', {}, 'Sprint created'))
    } catch {
      notificationStore.error(t('project.sprint_panel.create_error', {}, 'Unable to create sprint'))
    } finally {
      saving = false
    }
  }

  async function closeSprint(sprintId: string) {
    openingSprintId = sprintId
    try {
      await axios.post(`/api/v1/projects/${projectId}/sprints/${sprintId}/open-review`, {})
      await loadSprints()
      notificationStore.success(t('project.sprint_panel.close_sprint_success', {}, 'Sprint ended and post-sprint review opened'))
    } catch (error) {
      notificationStore.error(requestErrorMessage(error, t('project.sprint_panel.close_sprint_error', {}, 'Unable to end sprint')))
    } finally {
      openingSprintId = null
    }
  }

  async function expirePendingPackages(sprintId: string) {
    expiringSprintId = sprintId
    try {
      await axios.post(`/api/v1/project-sprints/${sprintId}/expire-pending-review-packages`, {
        reason: 'manager closed review window from project sprint panel',
      })
      await loadSprints()
      notificationStore.success(t('project.sprint_panel.expire_success', {}, 'Pending packages expired'))
    } catch {
      notificationStore.error(t('project.sprint_panel.expire_error', {}, 'Unable to expire pending packages'))
    } finally {
      expiringSprintId = null
    }
  }

  async function closeReviewPeriod(sprintId: string) {
    closingSprintId = sprintId
    try {
      await axios.post(`/api/v1/project-sprints/${sprintId}/close-review-period`, {})
      await loadSprints()
      notificationStore.success(t('project.sprint_panel.close_review_success', {}, 'Sprint review period closed'))
    } catch (error) {
      notificationStore.error(
        requestErrorMessage(error, t('project.sprint_panel.close_review_error', {}, 'Unable to close review period. Some reviews may still be unfinished.'))
      )
    } finally {
      closingSprintId = null
    }
  }

  function statusLabel(status: SprintStatus): string {
    return t(`project.sprint_panel.status.${status}`, {}, statusFallbacks[status])
  }

  function canEditSelectedSprint(): boolean {
    return Boolean(canManage && board?.sprint && ['draft', 'active'].includes(board.sprint.status))
  }

  function reviewDebtCount(sprint: ProjectSprint): number {
    return Number(sprint.reverseReviewPendingCount ?? 0)
  }

  function reviewDebtSummary(sprint: ProjectSprint): string {
    const assigner = Number(sprint.reverseReviewAssignerPendingCount ?? 0)
    const environment = Number(sprint.reverseReviewEnvironmentPendingCount ?? 0)
    const parts: string[] = []

    if (assigner > 0) {
      parts.push(t('project.sprint_panel.review_debt_assigner', { count: assigner }, `${assigner} manager reviews`))
    }
    if (environment > 0) {
      parts.push(t('project.sprint_panel.review_debt_environment', { count: environment }, `${environment} environment reviews`))
    }

    return parts.length > 0 ? parts.join(', ') : t('project.sprint_panel.review_debt_none', {}, '0 reviews')
  }

  function formatDate(value: string): string {
    return new Intl.DateTimeFormat(documentLocale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(value))
  }

  function taskCountLabel(count: number): string {
    return t('project.sprint_panel.task_count', { count }, `${count} tasks`)
  }

  function reviewDebtOpenLabel(count: number, summary: string): string {
    return t(
      'project.sprint_panel.review_debt_open',
      { count, summary },
      `${count} post-sprint reviews still pending: ${summary}.`
    )
  }

  function previousSprintDebtLabel(sprintName: string, count: number, summary: string): string {
    return t(
      'project.sprint_panel.previous_debt_blocker',
      { sprint: sprintName, count, summary },
      `Cannot end this sprint yet: ${sprintName} still has ${count} post-sprint reviews pending (${summary}).`
    )
  }

  function previousSprintFor(sprint: ProjectSprint): ProjectSprint | null {
    const sprintStart = Date.parse(sprint.startsAt)
    const previous = sprints
      .filter((candidate) => candidate.id !== sprint.id && Date.parse(candidate.endsAt) <= sprintStart)
      .sort((left, right) => Date.parse(right.endsAt) - Date.parse(left.endsAt))

    return previous[0] ?? null
  }

  function requestErrorMessage(error: unknown, fallback: string): string {
    if (axios.isAxiosError(error)) {
      const body = error.response?.data as { message?: string; error?: string } | undefined
      return body?.message ?? body?.error ?? fallback
    }

    return fallback
  }
</script>

<Card class="overflow-hidden border-border bg-card">
  <CardHeader>
    <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p class="font-mono text-xs font-black uppercase tracking-[0.16em] text-amber-700">
          {t('project.sprint_panel.eyebrow', {}, 'Agile Scrum')}
        </p>
        <CardTitle>{t('project.sprint_panel.title', {}, 'Sprint Management')}</CardTitle>
      </div>
      <Button variant="outline" onclick={() => { void loadSprints() }} disabled={loading}>
        {loading
          ? t('project.sprint_panel.loading', {}, 'Loading...')
          : t('project.sprint_panel.refresh', {}, 'Refresh')}
      </Button>
    </div>
  </CardHeader>
  <CardContent class="space-y-4">
    {#if canManage}
      <div class="grid gap-3 rounded-3xl border border-border bg-background p-4 lg:grid-cols-[1.1fr_1.5fr_1fr_1fr_auto]">
        <input
          class="rounded-2xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-amber-500"
          bind:value={form.name}
          placeholder={t('project.sprint_panel.name_placeholder', {}, 'Sprint name')}
        />
        <textarea
          class="min-h-10 rounded-2xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-amber-500"
          bind:value={form.goal}
          placeholder={t('project.sprint_panel.goal_placeholder', {}, 'Sprint goal')}
          rows="1"
        ></textarea>
        <label class="grid gap-1 text-xs font-bold text-muted-foreground">
          <span>{t('project.sprint_panel.start_label', {}, 'Sprint start')}</span>
          <input
            class="rounded-2xl border border-border bg-background px-3 py-2 text-sm font-normal text-foreground outline-none focus:border-amber-500"
            bind:value={form.startsAt}
            type="datetime-local"
          />
        </label>
        <label class="grid gap-1 text-xs font-bold text-muted-foreground">
          <span>{t('project.sprint_panel.end_label', {}, 'Sprint end')}</span>
          <input
            class="rounded-2xl border border-border bg-background px-3 py-2 text-sm font-normal text-foreground outline-none focus:border-amber-500"
            bind:value={form.endsAt}
            type="datetime-local"
          />
        </label>
        <Button onclick={() => { void createSprint() }} disabled={saving}>
          {saving
            ? t('project.sprint_panel.creating_button', {}, 'Creating...')
            : t('project.sprint_panel.create_button', {}, 'Create sprint')}
        </Button>
      </div>
    {/if}

    {#if sprints.length === 0}
      <div class="rounded-3xl border border-dashed border-border bg-background px-4 py-8 text-center text-sm text-muted-foreground">
        {t('project.sprint_panel.no_sprints', {}, 'No sprints yet. Create an active sprint to gather backlog and open review when it ends.')}
      </div>
    {:else}
      <div class="grid gap-3">
        {#each sprints as sprint (sprint.id)}
          {@const previousSprint = previousSprintFor(sprint)}
          {@const previousDebt = previousSprint ? reviewDebtCount(previousSprint) : 0}
          {@const currentDebt = reviewDebtCount(sprint)}
          <article class="rounded-3xl border border-border bg-background/90 p-4 shadow-suar-xs">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div class="flex flex-wrap items-center gap-2">
                  <h3 class="text-base font-black">{sprint.name}</h3>
                  <span class="rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-700 dark:text-amber-300">
                    {statusLabel(sprint.status)}
                  </span>
                </div>
                <p class="mt-1 text-xs text-muted-foreground">
                  {formatDate(sprint.startsAt)} → {formatDate(sprint.endsAt)}
                </p>
                {#if sprint.goal}
                  <p class="mt-2 text-sm text-foreground">
                    <span class="font-bold">{t('project.sprint_panel.sprint_goal', {}, 'Sprint Goal')}:</span> <span>{sprint.goal}</span>
                  </p>
                {/if}
                {#if sprint.status === 'review_open'}
                  <p class={`mt-2 text-xs font-semibold ${currentDebt > 0 ? 'text-amber-700 dark:text-amber-200' : 'text-emerald-700 dark:text-emerald-200'}`}>
                    {currentDebt > 0
                      ? reviewDebtOpenLabel(currentDebt, reviewDebtSummary(sprint))
                      : t('project.sprint_panel.review_debt_done', {}, 'All post-sprint reviews are done.')}
                  </p>
                {/if}
                {#if sprint.status === 'active' && previousSprint && previousDebt > 0}
                  <p class="mt-2 max-w-2xl rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-700 dark:text-amber-300">
                    {previousSprintDebtLabel(previousSprint.name, previousDebt, reviewDebtSummary(previousSprint))}
                  </p>
                {/if}
              </div>

              <div class="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  onclick={() => {
                    selectedSprintId = sprint.id
                    void loadSprintBoard(sprint.id)
                  }}
                  disabled={boardLoading && selectedSprintId === sprint.id}
                >
                  {boardLoading && selectedSprintId === sprint.id
                    ? t('project.sprint_panel.loading', {}, 'Loading...')
                    : t('project.sprint_panel.view_board', {}, 'View board')}
                </Button>
                {#if canManage && sprint.status === 'active'}
                  <Button
                    onclick={() => { void closeSprint(sprint.id) }}
                    disabled={openingSprintId === sprint.id || previousDebt > 0}
                  >
                    {openingSprintId === sprint.id
                      ? t('project.sprint_panel.ending_button', {}, 'Ending...')
                      : t('project.sprint_panel.end_sprint', {}, 'End sprint')}
                  </Button>
                {/if}
                {#if sprint.status === 'review_open'}
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="text-xs font-semibold text-emerald-700 dark:text-emerald-200">
                      {t('project.sprint_panel.review_open_hint', {}, 'Review is open for participants')}
                    </span>
                    {#if canManage}
                      <Button
                        variant="outline"
                        onclick={() => { void expirePendingPackages(sprint.id) }}
                        disabled={expiringSprintId === sprint.id || closingSprintId === sprint.id}
                      >
                        {expiringSprintId === sprint.id
                          ? t('project.sprint_panel.expiring_button', {}, 'Expiring...')
                          : t('project.sprint_panel.expire_pending', {}, 'Expire pending')}
                      </Button>
                      <Button
                        onclick={() => { void closeReviewPeriod(sprint.id) }}
                        disabled={closingSprintId === sprint.id || expiringSprintId === sprint.id || currentDebt > 0}
                      >
                        {closingSprintId === sprint.id
                          ? t('project.sprint_panel.closing_review_button', {}, 'Closing...')
                          : t('project.sprint_panel.close_review_period', {}, 'Close review period')}
                      </Button>
                    {/if}
                  </div>
                {/if}
              </div>
            </div>
          </article>
        {/each}
      </div>
      {#if pagination}
        <UnifiedOffsetPagination
          {pagination}
          onPageChange={(pageNumber: number) => {
            void loadSprints(pageNumber)
          }}
        />
      {/if}
    {/if}

    <section class="rounded-3xl border border-border bg-background/80 p-4">
      <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p class="font-mono text-xs font-black uppercase tracking-[0.16em] text-amber-700">
            {t('project.sprint_panel.backlog_eyebrow', {}, 'Sprint backlog')}
          </p>
          <h3 class="text-lg font-black text-foreground">{t('project.sprint_panel.board_title', {}, 'Sprint Backlog')}</h3>
          <p class="mt-1 text-xs text-muted-foreground">
            {board?.sprint ? board.sprint.name : t('project.sprint_panel.no_active_sprint_selected', {}, 'No active sprint selected')}
          </p>
          {#if board?.sprint?.goal}
            <p class="mt-2 max-w-2xl text-sm font-semibold text-foreground">
              {board.sprint.goal}
            </p>
          {/if}
        </div>
        <Button
          variant="outline"
          onclick={() => {
            void loadSprintBoard(selectedSprintId)
          }}
          disabled={boardLoading}
        >
          {boardLoading
            ? t('project.sprint_panel.board_loading', {}, 'Loading board...')
            : t('project.sprint_panel.refresh_board', {}, 'Refresh board')}
        </Button>
      </div>

      <div class="mt-4 grid gap-4 lg:grid-cols-2">
        <div class="rounded-2xl border border-dashed border-amber-500/40 bg-amber-500/10 p-3">
          <div class="flex items-center justify-between gap-2">
            <h4 class="text-sm font-black uppercase text-foreground">{t('project.sprint_panel.backlog_title', {}, 'Product Backlog')}</h4>
            <span class="text-xs font-bold text-muted-foreground">
              {taskCountLabel(board?.counts.backlogTasks ?? 0)}
            </span>
          </div>
          <div class="mt-3 grid gap-2">
            {#if board?.backlogTasks.length}
              {#each board.backlogTasks as task (task.id)}
                <div class="rounded-2xl border border-border bg-background p-3">
                  <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div class="text-sm font-black text-foreground">{task.title}</div>
                      <div class="mt-1 text-xs text-muted-foreground">
                        {task.status} · {task.priority}
                      </div>
                    </div>
                    {#if canEditSelectedSprint()}
                      <Button
                        variant="outline"
                        onclick={() => {
                          void moveTaskToSprint(task.id, board?.sprint?.id ?? null)
                        }}
                        disabled={movingTaskId === task.id}
                      >
                        {movingTaskId === task.id
                          ? t('project.sprint_panel.moving_button', {}, 'Moving...')
                          : t('project.sprint_panel.move_to_sprint', {}, 'Move to sprint')}
                      </Button>
                    {/if}
                  </div>
                </div>
              {/each}
            {:else}
              <p class="rounded-2xl border border-dashed border-border bg-background/70 p-4 text-sm text-muted-foreground">
                {t('project.sprint_panel.backlog_empty', {}, 'Backlog is empty for this project.')}
              </p>
            {/if}
          </div>
        </div>

        <div class="rounded-2xl border border-emerald-200 bg-emerald-50/35 p-3 dark:border-emerald-900/60 dark:bg-emerald-950/20">
          <div class="flex items-center justify-between gap-2">
            <h4 class="text-sm font-black uppercase text-foreground">{t('project.sprint_panel.sprint_tasks_title', {}, 'Sprint Tasks')}</h4>
            <span class="text-xs font-bold text-muted-foreground">
              {taskCountLabel(board?.counts.sprintTasks ?? 0)}
            </span>
          </div>
          <div class="mt-3 grid gap-2">
            {#if board?.sprintTasks.length}
              {#each board.sprintTasks as task (task.id)}
                <div class="rounded-2xl border border-border bg-background p-3">
                  <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div class="text-sm font-black text-foreground">{task.title}</div>
                      <div class="mt-1 text-xs text-muted-foreground">
                        {task.status} · {task.priority}
                      </div>
                    </div>
                    {#if canEditSelectedSprint()}
                      <Button
                        variant="outline"
                        onclick={() => {
                          void moveTaskToSprint(task.id, null)
                        }}
                        disabled={movingTaskId === task.id}
                      >
                        {movingTaskId === task.id
                          ? t('project.sprint_panel.moving_button', {}, 'Moving...')
                          : t('project.sprint_panel.move_to_backlog', {}, 'Move to backlog')}
                      </Button>
                    {/if}
                  </div>
                </div>
              {/each}
            {:else}
              <p class="rounded-2xl border border-dashed border-border bg-background/70 p-4 text-sm text-muted-foreground">
                {t('project.sprint_panel.sprint_tasks_empty', {}, 'No tasks in the selected sprint yet.')}
              </p>
            {/if}
          </div>
        </div>
      </div>
    </section>
  </CardContent>
</Card>
