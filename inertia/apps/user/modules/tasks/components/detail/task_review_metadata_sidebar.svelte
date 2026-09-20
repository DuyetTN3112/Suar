<script lang="ts">
  import {
    CalendarDays,
    CheckCircle2,
    CircleAlert,
    Clock3,
    Eye,
    History,
    Tag,
    UserRound,
  } from 'lucide-svelte'
  import { useTranslation } from '@/apps/user/shared/hooks/use_translation.svelte'

  interface Props {
    taskStatus: string
    taskPriority: string
    taskLabel: string
    taskDifficulty: string
    taskAssignee: string
    taskDueDate: string
    deliveryTiming: { label: string; isLate: boolean }
    assignmentCompletedAt: string
    taskEstimatedTime: string
    taskActualTime: string
    taskVisibility: string
    taskCreatedAt: string
    taskUpdatedAt: string
    taskCreator: string
  }

  const {
    taskStatus,
    taskPriority,
    taskLabel,
    taskDifficulty,
    taskAssignee,
    taskDueDate,
    deliveryTiming,
    assignmentCompletedAt,
    taskEstimatedTime,
    taskActualTime,
    taskVisibility,
    taskCreatedAt,
    taskUpdatedAt,
    taskCreator,
  }: Props = $props()

  const { t } = useTranslation()
</script>

<aside class="border-t border-border bg-muted/10 p-4 md:overflow-y-auto md:border-l md:border-t-0" data-testid="review-task-metadata-sidebar">
  <div class="space-y-5">
    <section>
      <h3 class="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {t('task.status', {}, 'Status')}
      </h3>
      <span class="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
        <CheckCircle2 class="h-3.5 w-3.5" />
        {taskStatus}
      </span>
    </section>

    <div class="border-t border-border"></div>

    <div class="space-y-4 text-sm">
      <div class="flex items-center justify-between gap-3">
        <span class="text-muted-foreground">{t('task.priority', {}, 'Priority')}</span>
        <span class="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-xs font-bold">
          <CircleAlert class="h-3.5 w-3.5" />
          {taskPriority}
        </span>
      </div>

      <div class="flex items-center justify-between gap-3">
        <span class="text-muted-foreground">{t('task.label', {}, 'Label')}</span>
        <span class="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-xs font-bold">
          <Tag class="h-3.5 w-3.5" />
          {taskLabel}
        </span>
      </div>

      <div class="flex items-center justify-between gap-3">
        <span class="text-muted-foreground">{t('task.difficulty', {}, 'Difficulty')}</span>
        <span class="text-xs font-bold text-foreground">{taskDifficulty}</span>
      </div>

      <div class="flex items-center justify-between gap-3">
        <span class="text-muted-foreground">{t('task.assignee', {}, 'Assignee')}</span>
        <span class="inline-flex max-w-40 items-center gap-1.5 rounded-md bg-muted px-2 py-1 text-right text-xs font-medium">
          <UserRound class="h-3.5 w-3.5 shrink-0" />
          <span class="truncate">{taskAssignee}</span>
        </span>
      </div>

      <div class="flex items-start justify-between gap-3">
        <span class="text-muted-foreground">{t('task.due_date', {}, 'Due date')}</span>
        <div class="text-right">
          <span class={`inline-flex items-center gap-1.5 text-xs font-medium ${deliveryTiming.isLate ? 'text-destructive' : 'text-foreground'}`}>
            <CalendarDays class="h-3.5 w-3.5" />
            {taskDueDate}
          </span>
          {#if deliveryTiming.label}
            <p class={`mt-1 text-[11px] font-semibold ${deliveryTiming.isLate ? 'text-destructive' : 'text-muted-foreground'}`}>
              {deliveryTiming.label}
            </p>
          {/if}
        </div>
      </div>

      <div class="flex items-start justify-between gap-3">
        <span class="text-muted-foreground">{t('task.review_workflow.completed_at', {}, 'Completed at')}</span>
        <span class="inline-flex items-center gap-1.5 text-right text-xs">
          <History class="h-3.5 w-3.5 shrink-0" />
          {assignmentCompletedAt}
        </span>
      </div>

      <div class="flex items-center justify-between gap-3">
        <span class="text-muted-foreground">{t('task.estimated_time', {}, 'Estimated time')}</span>
        <span class="inline-flex items-center gap-1 text-xs"><Clock3 class="h-3.5 w-3.5" />{taskEstimatedTime}</span>
      </div>

      <div class="flex items-center justify-between gap-3">
        <span class="text-muted-foreground">{t('task.actual_time', {}, 'Actual time')}</span>
        <span class="inline-flex items-center gap-1 text-xs"><Clock3 class="h-3.5 w-3.5" />{taskActualTime}</span>
      </div>

      <div class="flex items-center justify-between gap-3">
        <span class="text-muted-foreground">{t('task.visibility.label', {}, 'Visibility')}</span>
        <span class="inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-1 text-right text-xs font-bold">
          <Eye class="h-3.5 w-3.5" />
          {taskVisibility}
        </span>
      </div>

      <div class="flex items-start justify-between gap-3">
        <span class="text-muted-foreground">{t('task.created_at', {}, 'Created at')}</span>
        <span class="text-right text-xs">{taskCreatedAt}</span>
      </div>

      <div class="flex items-start justify-between gap-3">
        <span class="text-muted-foreground">{t('task.updated_at', {}, 'Updated at')}</span>
        <span class="text-right text-xs">{taskUpdatedAt}</span>
      </div>

      <div class="flex items-start justify-between gap-3">
        <span class="text-muted-foreground">{t('task.review_workflow.task_created_by', {}, 'Created by')}</span>
        <span class="text-right text-xs font-medium">{taskCreator}</span>
      </div>
    </div>
  </div>
</aside>
