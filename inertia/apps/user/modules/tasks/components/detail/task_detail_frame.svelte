<script lang="ts">
  import Badge from '@/apps/user/shared/ui/badge.svelte'
  import { useTranslation } from '@/apps/user/shared/stores/translation.svelte'
  import TaskDetailReadSurface from '@/apps/user/modules/tasks/components/detail/task_detail_read_surface.svelte'
  import type { TaskDetail, TaskMetadata } from '@/apps/user/modules/tasks/types/index.svelte'

  interface WorkSurfacePermissions {
    isCreator?: boolean; isAssignee?: boolean; canEdit?: boolean; canAssign?: boolean
    canChangeStatus?: boolean; canComment?: boolean; canOpenWorkTabs?: boolean
  }
  interface Props {
    task: TaskDetail
    metadata: Pick<TaskMetadata, 'statuses' | 'labels' | 'priorities' | 'users'>
    currentUserId: string | null
    workSurfacePermissions?: WorkSurfacePermissions | null
    actionLabel?: string
    onAction?: () => void
    lockedMessage?: string | null
    onReloadBrief?: () => void | Promise<void>
    onChangeStatus?: (task: TaskDetail, status: string) => void
    getStatusChangeDecision?: (task: TaskDetail, status: string) => { allowed: boolean; reason?: string | null }
    showDiscussion?: boolean
    showFiles?: boolean
  }
  const { task, metadata, currentUserId, workSurfacePermissions = null, actionLabel, onAction,
    lockedMessage, onReloadBrief, onChangeStatus, getStatusChangeDecision, showDiscussion, showFiles }: Props = $props()
  const { t } = useTranslation()
  const activeStatusId = $derived(task.task_status_id ?? task.status)
  const boardStatus = $derived(
    metadata.statuses.find((status) => status.value === activeStatusId)?.label ?? activeStatusId
  )
</script>

<div class="flex h-full min-h-0 flex-col bg-background" data-testid="task-detail-frame">
  <header class="shrink-0 border-b bg-muted/10 px-5 py-5 sm:px-6">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="min-w-0">
        <div class="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>{t('task.detail_panel.task_label', {}, 'Task')}</span>
          <span aria-hidden="true">/</span>
          <span>{t('task.detail_panel.board_label', {}, 'Board')}</span>
          <Badge variant="secondary" class="font-semibold text-foreground">{boardStatus}</Badge>
        </div>
        <h2 class="mt-3 text-2xl font-bold leading-tight text-balance">{task.title}</h2>
      </div>
    </div>
    {#if lockedMessage}<p class="mt-4 text-xs text-muted-foreground">{lockedMessage}</p>{/if}
  </header>
  <TaskDetailReadSurface {task} {metadata} {currentUserId} {workSurfacePermissions} {actionLabel} {onAction} {onReloadBrief} {onChangeStatus} {getStatusChangeDecision} {showDiscussion} {showFiles} />
</div>
