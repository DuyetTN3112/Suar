<script lang="ts">
  import Button from '@/apps/org/shared/ui/button.svelte'
  import { useTranslation } from '@/apps/org/shared/stores/translation.svelte'
  import type { SprintBoard } from '@/apps/shared/projects/project_sprint_types'

  interface Props {
    board: SprintBoard | null
    selectedSprintId: string | null
    boardLoading: boolean
    movingTaskId: string | null
    canEditSelectedSprint: boolean
    taskCountLabel: (count: number) => string
    onRefreshBoard: () => void
    onMoveTaskToSprint: (taskId: string, destinationSprintId: string | null) => void
    onShowTaskHistory: (taskId: string) => void
  }

  const {
    board,
    selectedSprintId: _selectedSprintId,
    boardLoading,
    movingTaskId,
    canEditSelectedSprint,
    taskCountLabel,
    onRefreshBoard,
    onMoveTaskToSprint,
    onShowTaskHistory,
  }: Props = $props()

  const { t } = useTranslation()
</script>

<section class="rounded-lg border border-border bg-background p-4">
  <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h3 class="text-lg font-black text-foreground">{t('project.sprint_panel.backlog_title_compact', {}, 'Backlog')}</h3>
      <p class="mt-1 text-xs font-semibold text-muted-foreground">
        {board?.sprint ? board.sprint.name : t('project.sprint_panel.no_sprint_selected', {}, 'No sprint selected')}
      </p>
      {#if board?.sprint?.goal}
        <p class="mt-2 max-w-2xl text-sm font-semibold text-foreground">
          {board.sprint.goal}
        </p>
      {/if}
    </div>
    <Button
      variant="outline"
      onclick={onRefreshBoard}
      disabled={boardLoading}
    >
      {boardLoading
        ? t('project.sprint_panel.board_loading', {}, 'Loading board...')
        : t('project.sprint_panel.refresh_board', {}, 'Refresh board')}
    </Button>
  </div>

  <div class="mt-4 grid gap-4 lg:grid-cols-2">
    <div class="rounded-lg border border-dashed border-amber-500/40 bg-amber-500/10 p-3">
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
                    {#if task.addedAfterStart}
                      <span class="ml-2 font-bold text-amber-700 dark:text-amber-300">{t('project.sprint_panel.scope_change', {}, 'Added after start')}</span>
                    {/if}
                  </div>
                </div>
                {#if canEditSelectedSprint}
                  <Button
                    variant="outline"
                    onclick={() => {
                      onMoveTaskToSprint(task.id, board?.sprint?.id ?? null)
                    }}
                    disabled={movingTaskId === task.id}
                  >
                    {movingTaskId === task.id
                      ? t('project.sprint_panel.moving_button', {}, 'Moving...')
                      : t('project.sprint_panel.move_to_sprint', {}, 'Move to sprint')}
                  </Button>
                {/if}
                <Button variant="ghost" onclick={() => { onShowTaskHistory(task.id) }}>
                  {t('project.sprint_panel.history', {}, 'History')}
                </Button>
              </div>
            </div>
          {/each}
        {:else}
          <p class="rounded-lg border border-dashed border-border bg-secondary/30 p-4 text-sm text-muted-foreground">
            {t('project.sprint_panel.empty_short', {}, 'Empty.')}
          </p>
        {/if}
      </div>
    </div>

    <div class="rounded-lg border border-border bg-background p-3">
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
                {#if canEditSelectedSprint}
                  <Button
                    variant="outline"
                    onclick={() => {
                      onMoveTaskToSprint(task.id, null)
                    }}
                    disabled={movingTaskId === task.id}
                  >
                    {movingTaskId === task.id
                      ? t('project.sprint_panel.moving_button', {}, 'Moving...')
                      : t('project.sprint_panel.move_to_backlog', {}, 'Move to backlog')}
                  </Button>
                {/if}
                <Button variant="ghost" onclick={() => { onShowTaskHistory(task.id) }}>
                  {t('project.sprint_panel.history', {}, 'History')}
                </Button>
              </div>
            </div>
          {/each}
        {:else}
          <p class="rounded-lg border border-dashed border-border bg-secondary/30 p-4 text-sm text-muted-foreground">
            {t('project.sprint_panel.sprint_tasks_empty_compact', {}, 'No tasks yet.')}
          </p>
        {/if}
      </div>
    </div>
  </div>
</section>
