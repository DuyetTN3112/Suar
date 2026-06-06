<script lang="ts">
  import History from 'lucide-svelte/icons/history'
  import Badge from '@/apps/org/shared/ui/badge.svelte'
  import Card from '@/apps/org/shared/ui/card.svelte'
  import CardContent from '@/apps/org/shared/ui/card_content.svelte'
  import CardHeader from '@/apps/org/shared/ui/card_header.svelte'
  import CardTitle from '@/apps/org/shared/ui/card_title.svelte'
  import type { TaskShowProps } from '@/apps/org/modules/tasks/lib/helpers/show_helpers'
  import { useTranslation } from '@/apps/org/shared/stores/translation.svelte'
  import { formatAuditChangeValue } from '@/apps/org/modules/tasks/lib/helpers/show_helpers'
  import { formatDateTime } from '@/apps/org/modules/tasks/utils/task_formatter.svelte'

  type AuditLogEntry = TaskShowProps['auditLogs'][number]
  type AuditLogChange = AuditLogEntry['changes'][string]

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
                {log.user?.username ?? t('common.system', {}, 'System')}
              </span>
              <Badge variant="outline" class="text-xs">{log.action}</Badge>
              <span class="text-xs text-muted-foreground">
                {formatDateTime(log.created_at)}
              </span>
            </div>
            {#if Object.keys(log.changes).length > 0}
              <div class="mt-1 space-y-1">
                {#each Object.entries(log.changes) as [field, change]}
                  <div class="text-xs text-muted-foreground">
                    <span class="font-bold">{field}:</span>
                    <span class="line-through text-destructive">{formatAuditChangeValue((change as AuditLogChange).old)}</span>
                    →
                    <span class="font-bold text-foreground">{formatAuditChangeValue((change as AuditLogChange).new)}</span>
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
