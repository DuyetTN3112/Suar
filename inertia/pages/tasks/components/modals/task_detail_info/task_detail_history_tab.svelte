<script lang="ts">
  import type { Task } from '../../../types.svelte'
  import { formatDate } from '../../../utils/task_formatter.svelte'

  interface Props {
    auditLogs: {
      id: string
      action: string
      user?: {
        id: string
        name: string
      }
      created_at: string
      old_values?: Record<string, string | number | boolean | null | undefined>
      new_values?: Record<string, string | number | boolean | null | undefined>
    }[]
    task: Task | null
  }

  const { auditLogs }: Props = $props()

  function getActionDescription(
    action: string,
    oldValues?: Record<string, string | number | boolean | null | undefined>,
    newValues?: Record<string, string | number | boolean | null | undefined>
  ): string {
    switch (action) {
      case 'created':
        return 'Đã tạo nhiệm vụ'
      case 'updated':
        return 'Đã cập nhật nhiệm vụ'
      case 'deleted':
        return 'Đã xóa nhiệm vụ'
      case 'status_changed':
        return `Đã thay đổi trạng thái từ "${oldValues?.status_name ?? 'N/A'}" thành "${newValues?.status_name ?? 'N/A'}"`
      case 'assigned':
        return `Đã giao nhiệm vụ cho ${newValues?.assigned_to_name ?? 'N/A'}`
      default:
        return 'Đã thực hiện thay đổi'
    }
  }
</script>

{#if auditLogs.length === 0}
  <div class="p-4 text-center text-gray-500">
    Không có lịch sử thay đổi
  </div>
{:else}
  <div class="space-y-4 p-4">
    <h3 class="text-sm font-medium mb-2">Lịch sử thay đổi</h3>

    <div class="space-y-3">
      {#each auditLogs as log (log.id)}
        <div class="border rounded-md p-3 text-sm">
          <div class="flex justify-between mb-1">
            <span class="font-medium">
              {log.user ? log.user.name : 'Hệ thống'}
            </span>
            <span class="text-gray-500">
              {formatDate(log.created_at)}
            </span>
          </div>

          <div class="text-gray-600">
            {getActionDescription(log.action, log.old_values, log.new_values)}
          </div>
        </div>
      {/each}
    </div>
  </div>
{/if}
