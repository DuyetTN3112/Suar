<script lang="ts">
  import type { AuditLog } from '../task_detail_types'
  import { formatDate } from '../task_detail_utils'

  interface Props {
    auditLogs: AuditLog[]
  }

  const { auditLogs }: Props = $props()
</script>

<div class="space-y-4">
  <div class="max-h-[350px] overflow-y-auto space-y-2 border rounded-md p-4">
    {#if auditLogs.length === 0}
      <div class="text-center text-muted-foreground py-8">
        Chưa có lịch sử thay đổi
      </div>
    {:else}
      {#each auditLogs as log, index (index)}
        <div class="flex gap-2 text-sm border-b pb-2 last:border-0">
          <div class="text-muted-foreground min-w-[120px] text-xs">
            {formatDate(log.created_at)}
          </div>
          <div>
            <div class="font-medium">{log.user?.username ?? 'Người dùng'}</div>
            <div class="text-xs">{log.action}</div>
            {#if log.changes}
              <div class="text-xs mt-1 text-muted-foreground">
                {typeof log.changes === 'string' ? log.changes : JSON.stringify(log.changes)}
              </div>
            {/if}
          </div>
        </div>
      {/each}
    {/if}
  </div>
</div>
