<script lang="ts">
  import History from 'lucide-svelte/icons/history'
  import Badge from '@/apps/user/shared/ui/badge.svelte'
  import Card from '@/apps/user/shared/ui/card.svelte'
  import CardContent from '@/apps/user/shared/ui/card_content.svelte'
  import CardHeader from '@/apps/user/shared/ui/card_header.svelte'
  import CardTitle from '@/apps/user/shared/ui/card_title.svelte'
  import type { TaskShowProps } from '@/apps/user/modules/tasks/lib/helpers/show_helpers'
  import { useTranslation } from '@/apps/user/shared/stores/translation.svelte'
  import { formatAuditChangeValue } from '@/apps/user/modules/tasks/lib/helpers/show_helpers'
  import { formatDateTime } from '@/apps/user/modules/tasks/utils/task_formatter.svelte'

  type AuditLogEntry = TaskShowProps['auditLogs'][number]

  interface Props {
    auditLogs: AuditLogEntry[]
  }

  const { auditLogs }: Props = $props()
  const { t } = useTranslation()
</script>

<Card>
  <CardHeader>
    <CardTitle class="flex items-center gap-2">
      <History class="size-4" />
      {t('task.audit_log', {}, 'Audit log')}
    </CardTitle>
  </CardHeader>
  <CardContent>
    <div class="space-y-4">
      {#each auditLogs as log (log.id)}
        <div class="relative border-l-2 border-border pb-4 pl-6 last:pb-0">
          <div class="absolute -left-[5px] top-1 h-2 w-2 rounded-full border-2 border-border bg-primary"></div>
          <div class="flex flex-col gap-1">
            <div class="flex flex-wrap items-center gap-2">
              <span class="font-bold text-sm">
                {log.user?.name?.trim() || t('common.system', {}, 'System')}
              </span>
              <Badge variant="outline" class="text-xs">{log.action}</Badge>
              <span class="text-xs text-muted-foreground">
                {formatDateTime(log.timestamp) || '-'}
              </span>
            </div>
            {#if log.changes.length > 0}
              <div class="mt-1 space-y-1">
                {#each log.changes as change}
                  <div class="text-xs text-muted-foreground">
                    <span class="font-bold">{change.field}:</span>
                    <span class="line-through text-destructive">{formatAuditChangeValue(change.oldValue)}</span>
                    →
                    <span class="font-bold text-foreground">{formatAuditChangeValue(change.newValue)}</span>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  </CardContent>
</Card>
