<script lang="ts">
  import { format, parseISO } from 'date-fns'
  import { vi } from 'date-fns/locale'
  import Card from '@/components/ui/card.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
  import { History } from 'lucide-svelte'
  import type { Task } from '../../types.svelte'

  interface AuditLogEntry {
    id: string
    user_type: string
    user_id: string
    event: string
    auditable_type: string
    auditable_id: string
    old_values?: Record<string, string | number | boolean | null | undefined>
    new_values?: Record<string, string | number | boolean | null | undefined>
    ip_address?: string
    user_agent?: string
    tags?: string[]
    created_at: string
    updated_at: string
    user?: {
      id: string
      username: string
      email: string
    }
  }

  interface Props {
    auditLogs: AuditLogEntry[]
    task: Task | null
  }

  const { auditLogs, task }: Props = $props()

  function formatDate(dateString: string): string {
    try {
      return format(parseISO(dateString), 'dd/MM/yyyy HH:mm', { locale: vi })
    } catch {
      return dateString
    }
  }

  function getFieldNameInVietnamese(fieldName: string): string {
    const fieldNameMap: Record<string, string> = {
      title: 'Tiêu đề',
      description: 'Mô tả',
      status: 'Trạng thái',
      priority: 'Độ ưu tiên',
      label: 'Nhãn',
      assigned_to: 'Người được giao',
      due_date: 'Ngày đến hạn',
      completed_at: 'Ngày hoàn thành',
      deleted_at: 'Ngày xóa',
      parent_task_id: 'Nhiệm vụ cha',
    }

    return fieldNameMap[fieldName] || fieldName
  }

  function getValueText(
    fieldName: string,
    value: string | number | boolean | null | undefined
  ): string {
    if (value === null || value === undefined) return 'Không có'

    switch (fieldName) {
      case 'status':
      case 'priority':
      case 'label':
        return typeof value === 'string' ? value : String(value)
      case 'assigned_to':
        if (typeof value !== 'string') return String(value)
        if (task?.assignee?.id === value) {
          return task.assignee.username || task.assignee.email
        }
        return value
      case 'due_date':
        return typeof value === 'string' ? formatDate(value) : String(value)
      default:
        return typeof value === 'string' ? value : String(value)
    }
  }
</script>

<div class="space-y-4 py-4">
  <h3 class="text-sm font-medium">Lịch sử thay đổi</h3>

  {#if auditLogs.length === 0}
    <div class="text-center text-muted-foreground py-4">
      Không có lịch sử thay đổi
    </div>
  {:else}
    {#each auditLogs as log (log.id)}
      <Card class="mb-2">
        <CardContent class="p-4">
          <div class="flex items-start gap-2">
            <History class="h-4 w-4 text-muted-foreground mt-1" />
            <div class="flex-1">
              <div class="flex items-center justify-between">
                <span class="font-medium text-sm">
                  {log.user?.username || log.user?.email || 'Người dùng không xác định'}
                </span>
                <span class="text-xs text-muted-foreground">
                  {formatDate(log.created_at)}
                </span>
              </div>

              <p class="text-sm mt-1">
                {#if log.event === 'created'}
                  đã tạo nhiệm vụ này
                {:else if log.event === 'updated'}
                  đã cập nhật nhiệm vụ này
                {:else if log.event === 'deleted'}
                  đã xóa nhiệm vụ này
                {/if}
              </p>

              {#if log.event === 'updated' && log.old_values && log.new_values}
                <div class="mt-2 space-y-2">
                  {#each Object.keys(log.new_values) as key}
                    <div class="text-xs">
                      <span class="font-medium">{getFieldNameInVietnamese(key)}: </span>
                      <span class="text-muted-foreground line-through mr-1">
                        {getValueText(key, log.old_values?.[key])}
                      </span>
                      <span class="text-primary">
                        → {getValueText(key, log.new_values?.[key])}
                      </span>
                    </div>
                  {/each}
                </div>
              {/if}
            </div>
          </div>
        </CardContent>
      </Card>
    {/each}
  {/if}
</div>
