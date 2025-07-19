<script lang="ts">
  import {
    Calendar,
    Clock,
    Tag,
    CircleAlert,
    User,
    Building2,
  } from 'lucide-svelte'

  import Badge from '@/components/ui/badge.svelte'
  import Separator from '@/components/ui/separator.svelte'
  import { useTranslation } from '@/stores/translation.svelte'

  import type { Task } from '../../types.svelte'

  interface Props {
    task: Task
    metadata: {
      statuses: { value: string; label: string; color?: string }[]
    }
    activeStatusId: string
    priorityLabel: string
    labelLabel: string
    priorityClass?: { color: string; bgColor: string }
    isOverdue: boolean
    formatDate: (dateStr: string | null | undefined) => string
    formatRelativeDate: (dateStr: string | null) => string
    onStatusChange: (status: string) => void
    statusConfig: Partial<Record<string, { icon: typeof Calendar; color: string; bgColor: string }>>
  }

  const {
    task,
    metadata,
    activeStatusId,
    priorityLabel,
    labelLabel,
    priorityClass,
    isOverdue,
    formatDate,
    formatRelativeDate,
    onStatusChange,
    statusConfig,
  }: Props = $props()

  const { t } = useTranslation()
</script>

<aside class="overflow-y-auto border-l bg-muted/10 p-4">
  <div class="space-y-5">
    <div>
      <h3 class="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {t('task.status', {}, 'Trạng thái')}
      </h3>
      <div class="flex flex-wrap gap-1.5">
        {#each metadata.statuses as statusOption}
          {@const config = statusConfig[statusOption.value]}
          {@const StatusIcon = config?.icon}
          <button
            class="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all border {activeStatusId === statusOption.value
              ? `${config?.bgColor ?? 'bg-muted'} ${config?.color ?? 'text-foreground'} border-current/20 ring-1 ring-current/10`
              : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted hover:text-foreground'}"
            onclick={() => {
              onStatusChange(statusOption.value)
            }}
          >
            {#if StatusIcon}
              <StatusIcon class="h-3 w-3" />
            {/if}
            {statusOption.label}
          </button>
        {/each}
      </div>
    </div>

    <Separator />

    <div class="space-y-3 text-sm">
      <div class="flex items-center justify-between gap-3">
        <span class="text-muted-foreground">{t('task.priority', {}, 'Ưu tiên')}</span>
        <Badge variant="outline" class="border-0 {priorityClass?.bgColor ?? ''} {priorityClass?.color ?? ''}">
          <CircleAlert class="mr-1 h-3 w-3" />
          {priorityLabel}
        </Badge>
      </div>

      <div class="flex items-center justify-between gap-3">
        <span class="text-muted-foreground">{t('task.label', {}, 'Nhãn')}</span>
        <Badge variant="outline">
          <Tag class="mr-1 h-3 w-3" />
          {labelLabel}
        </Badge>
      </div>

      <div class="flex items-center justify-between gap-3">
        <span class="text-muted-foreground">{t('task.assignee', {}, 'Người thực hiện')}</span>
        {#if task.assignee}
          <span class="inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-1 text-xs">
            <User class="h-3.5 w-3.5" />
            {task.assignee.username}
          </span>
        {:else}
          <span class="text-xs text-muted-foreground">—</span>
        {/if}
      </div>

      <div class="flex items-start justify-between gap-3">
        <span class="text-muted-foreground">{t('task.due_date', {}, 'Hạn chót')}</span>
        {#if task.due_date}
          <div class="text-right">
            <div class="inline-flex items-center gap-1.5 text-xs {isOverdue ? 'text-red-500' : ''}">
              <Calendar class="h-3.5 w-3.5" />
              {formatDate(task.due_date)}
            </div>
            <p class="mt-0.5 text-[11px] {isOverdue ? 'text-red-400' : 'text-muted-foreground'}">
              {formatRelativeDate(task.due_date)}
            </p>
          </div>
        {:else}
          <span class="text-xs text-muted-foreground">—</span>
        {/if}
      </div>

      <div class="flex items-center justify-between gap-3">
        <span class="text-muted-foreground">{t('task.estimated_time', {}, 'Ước tính')}</span>
        <span class="inline-flex items-center gap-1 text-xs">
          <Clock class="h-3.5 w-3.5" />
          {task.estimated_time ? `${task.estimated_time}h` : '—'}
        </span>
      </div>

      <div class="flex items-center justify-between gap-3">
        <span class="text-muted-foreground">{t('task.created_at', {}, 'Ngày tạo')}</span>
        <span class="text-xs">{formatDate(task.created_at)}</span>
      </div>

      <div class="flex items-center justify-between gap-3">
        <span class="text-muted-foreground">{t('task.updated_at', {}, 'Cập nhật')}</span>
        <span class="text-xs">{formatDate(task.updated_at)}</span>
      </div>

      {#if task.creator}
        <div class="flex items-center justify-between gap-3">
          <span class="text-muted-foreground">{t('task.creator', {}, 'Người tạo')}</span>
          <span class="text-xs">{task.creator.username || task.creator.email}</span>
        </div>
      {/if}

      {#if task.organization}
        <div class="flex items-center justify-between gap-3">
          <span class="text-muted-foreground">{t('task.organization', {}, 'Tổ chức')}</span>
          <span class="inline-flex items-center gap-1 text-xs">
            <Building2 class="h-3.5 w-3.5" />
            {task.organization.name}
          </span>
        </div>
      {/if}
    </div>
  </div>
</aside>
