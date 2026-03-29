<script lang="ts">
  import Building from 'lucide-svelte/icons/building'
  import Calendar from 'lucide-svelte/icons/calendar'
  import Clock from 'lucide-svelte/icons/clock'
  import Eye from 'lucide-svelte/icons/eye'
  import User from 'lucide-svelte/icons/user'

  import Card from '@/apps/org/shared/ui/card.svelte'
  import CardContent from '@/apps/org/shared/ui/card_content.svelte'
  import CardHeader from '@/apps/org/shared/ui/card_header.svelte'
  import CardTitle from '@/apps/org/shared/ui/card_title.svelte'
  import Separator from '@/apps/org/shared/ui/separator.svelte'
  import { getTaskVisibilityLabel } from '@/apps/org/modules/tasks/lib/rules/task_visibility'
  import { useTranslation } from '@/apps/org/shared/stores/translation.svelte'

  import type { TaskShowProps } from '@/apps/org/modules/tasks/lib/helpers/show_helpers'
  import { formatDate, formatDateTime, formatEstimatedTime } from '@/apps/org/modules/tasks/utils/task_formatter.svelte'

  interface Props {
    task: TaskShowProps['task']
  }

  const { task }: Props = $props()
  const { t } = useTranslation()
</script>

<div class="space-y-6">
  <Card>
    <CardHeader>
      <CardTitle>{t('task.details', {}, 'Details')}</CardTitle>
    </CardHeader>
    <CardContent>
      <div class="space-y-4">
        <div class="flex items-start gap-3">
          <User class="size-4 mt-0.5 text-muted-foreground shrink-0" />
          <div>
            <p class="text-xs font-bold uppercase text-muted-foreground">
              {t('task.assigned_to', {}, 'Assigned to')}
            </p>
            <p class="font-bold">
              {task.assignee?.username ?? t('task.unassigned', {}, 'Unassigned')}
            </p>
            {#if task.assignee?.email}
              <p class="text-xs text-muted-foreground">{task.assignee.email}</p>
            {/if}
          </div>
        </div>

        <Separator />

        <div class="flex items-start gap-3">
          <User class="size-4 mt-0.5 text-muted-foreground shrink-0" />
          <div>
            <p class="text-xs font-bold uppercase text-muted-foreground">
              {t('task.creator', {}, 'Creator')}
            </p>
            <p class="font-bold">
              {task.creator?.username ?? '—'}
            </p>
            {#if task.creator?.email}
              <p class="text-xs text-muted-foreground">{task.creator.email}</p>
            {/if}
          </div>
        </div>

        <Separator />

        {#if task.organization}
          <div class="flex items-start gap-3">
            <Building class="size-4 mt-0.5 text-muted-foreground shrink-0" />
            <div>
              <p class="text-xs font-bold uppercase text-muted-foreground">
                {t('task.organization', {}, 'Organization')}
              </p>
              <p class="font-bold">{task.organization.name}</p>
            </div>
          </div>
          <Separator />
        {/if}

        <div class="flex items-start gap-3">
          <Calendar class="size-4 mt-0.5 text-muted-foreground shrink-0" />
          <div>
            <p class="text-xs font-bold uppercase text-muted-foreground">
              {t('task.due_date', {}, 'Due date')}
            </p>
            <p class="font-bold">
              {task.due_date ? formatDate(task.due_date) : '—'}
            </p>
          </div>
        </div>

        <Separator />

        <div class="flex items-start gap-3">
          <Clock class="size-4 mt-0.5 text-muted-foreground shrink-0" />
          <div>
            <p class="text-xs font-bold uppercase text-muted-foreground">
              {t('task.estimated_time', {}, 'Estimated time')}
            </p>
            <p class="font-bold">
              {task.estimated_time ? formatEstimatedTime(task.estimated_time) : '—'}
            </p>
          </div>
        </div>

        <Separator />

        <div class="flex items-start gap-3">
          <Clock class="size-4 mt-0.5 text-muted-foreground shrink-0" />
          <div>
            <p class="text-xs font-bold uppercase text-muted-foreground">
              {t('task.actual_time', {}, 'Actual time')}
            </p>
            <p class="font-bold">
              {task.actual_time ? formatEstimatedTime(task.actual_time) : '—'}
            </p>
          </div>
        </div>

        {#if task.task_visibility}
          <Separator />
          <div class="flex items-start gap-3">
            <Eye class="size-4 mt-0.5 text-muted-foreground shrink-0" />
            <div>
              <p class="text-xs font-bold uppercase text-muted-foreground">
                {t('task.visibility.label', {}, 'Visibility')}
              </p>
              <p class="font-bold">{getTaskVisibilityLabel(task.task_visibility)}</p>
            </div>
          </div>
        {/if}



        {#if task.application_deadline}
          <Separator />
          <div class="flex items-start gap-3">
            <Calendar class="size-4 mt-0.5 text-muted-foreground shrink-0" />
            <div>
              <p class="text-xs font-bold uppercase text-muted-foreground">
                {t('task.marketplace_card.application_deadline_label', {}, 'Application deadline')}
              </p>
              <p class="font-bold">{formatDate(task.application_deadline)}</p>
            </div>
          </div>
        {/if}

        <Separator />

        <div class="flex items-start gap-3">
          <Calendar class="size-4 mt-0.5 text-muted-foreground shrink-0" />
          <div>
            <p class="text-xs font-bold uppercase text-muted-foreground">
              {t('common.created_at', {}, 'Created at')}
            </p>
            <p class="font-bold">{formatDateTime(task.created_at)}</p>
            <p class="text-xs text-muted-foreground mt-1">
              {t('common.updated_at', {}, 'Updated')}: {formatDateTime(task.updated_at)}
            </p>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
</div>
