<script lang="ts">
  import Card from '@/components/ui/card.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
  import CardHeader from '@/components/ui/card_header.svelte'
  import CardTitle from '@/components/ui/card_title.svelte'
  import Separator from '@/components/ui/separator.svelte'
  import Calendar from 'lucide-svelte/icons/calendar'
  import Clock from 'lucide-svelte/icons/clock'
  import User from 'lucide-svelte/icons/user'
  import Building from 'lucide-svelte/icons/building'
  import Eye from 'lucide-svelte/icons/eye'
  import DollarSign from 'lucide-svelte/icons/dollar-sign'
  import { formatDate, formatDateTime, formatEstimatedTime } from '../../utils/task_formatter.svelte'
  import type { TaskShowProps } from '../../show_helpers'
  import { useTranslation } from '@/stores/translation.svelte'

  interface Props {
    task: TaskShowProps['task']
  }

  const { task }: Props = $props()
  const { t } = useTranslation()
</script>

<div class="space-y-6">
  <Card>
    <CardHeader>
      <CardTitle>{t('task.details', {}, 'Chi tiết')}</CardTitle>
    </CardHeader>
    <CardContent>
      <div class="space-y-4">
        <div class="flex items-start gap-3">
          <User class="size-4 mt-0.5 text-muted-foreground shrink-0" />
          <div>
            <p class="text-xs font-bold uppercase text-muted-foreground">
              {t('task.assigned_to', {}, 'Người thực hiện')}
            </p>
            <p class="font-bold">
              {task.assignee?.username || t('task.unassigned', {}, 'Chưa phân công')}
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
              {t('task.creator', {}, 'Người tạo')}
            </p>
            <p class="font-bold">
              {task.creator?.username || '—'}
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
                {t('task.organization', {}, 'Tổ chức')}
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
              {t('task.due_date', {}, 'Hạn hoàn thành')}
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
              {t('task.estimated_time', {}, 'Thời gian ước tính')}
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
              {t('task.actual_time', {}, 'Thời gian thực tế')}
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
                {t('task.visibility', {}, 'Hiển thị')}
              </p>
              <p class="font-bold">{task.task_visibility}</p>
            </div>
          </div>
        {/if}

        {#if task.estimated_budget != null}
          <Separator />
          <div class="flex items-start gap-3">
            <DollarSign class="size-4 mt-0.5 text-muted-foreground shrink-0" />
            <div>
              <p class="text-xs font-bold uppercase text-muted-foreground">
                {t('task.estimated_budget', {}, 'Ngân sách ước tính')}
              </p>
              <p class="font-bold">
                {task.estimated_budget.toLocaleString('vi-VN')} ₫
              </p>
            </div>
          </div>
        {/if}

        {#if task.application_deadline}
          <Separator />
          <div class="flex items-start gap-3">
            <Calendar class="size-4 mt-0.5 text-muted-foreground shrink-0" />
            <div>
              <p class="text-xs font-bold uppercase text-muted-foreground">
                {t('task.application_deadline', {}, 'Hạn ứng tuyển')}
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
              {t('common.created_at', {}, 'Ngày tạo')}
            </p>
            <p class="font-bold">{formatDateTime(task.created_at)}</p>
            <p class="text-xs text-muted-foreground mt-1">
              {t('common.updated_at', {}, 'Cập nhật')}: {formatDateTime(task.updated_at)}
            </p>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
</div>
