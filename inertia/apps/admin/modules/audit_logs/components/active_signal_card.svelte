<script lang="ts">
  import { Siren, Waypoints } from 'lucide-svelte'

  import Card from '@/apps/admin/shared/ui/card.svelte'
  import CardContent from '@/apps/admin/shared/ui/card_content.svelte'
  import CardHeader from '@/apps/admin/shared/ui/card_header.svelte'
  import CardTitle from '@/apps/admin/shared/ui/card_title.svelte'
  import type { buildAdminAuditLogConsoleModel } from '@/apps/admin/modules/audit_logs/console_model'
  import { useTranslation } from '@/apps/admin/shared/stores/translation.svelte'

  interface Props {
    consoleModel: ReturnType<typeof buildAdminAuditLogConsoleModel>
  }

  const { consoleModel }: Props = $props()
  const { t } = useTranslation()

  const hottestWorkflow = $derived(
    Array.from(
      consoleModel.localPivotRows.reduce((acc, row) => {
        const key = row.workflowLabel
        acc.set(key, (acc.get(key) ?? 0) + 1)
        return acc
      }, new Map<string, number>())
    )
      .sort((left, right) => right[1] - left[1])[0] ?? null
  )
</script>

<Card class="border-border bg-card shadow-sm">
  <CardHeader>
    <CardTitle class="flex items-center gap-2 text-base">
      <Siren class="h-4 w-4 text-rose-600" />
      {t('task.admin_audit_logs.primary_signals', {}, 'Primary signals')}
    </CardTitle>
  </CardHeader>
  <CardContent class="space-y-3">
    <div class={`rounded-2xl border px-4 py-3 ${
      consoleModel.summary.failedCount > 0
        ? 'border-rose-500/30 bg-rose-500/10'
        : 'border-border bg-muted/40'
    }`}>
      <div class="text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-600 dark:text-rose-300">
        {t('task.admin_audit_logs.warning', {}, 'Warning')}
      </div>
      <div class={`mt-1 text-sm font-semibold ${
        consoleModel.summary.failedCount > 0 ? 'text-rose-800 dark:text-rose-200' : 'text-foreground'
      }`}>
        {#if consoleModel.summary.failedCount > 0}
          {t('task.admin_audit_logs.failure_count_window', { count: consoleModel.summary.failedCount }, ':count failures in this window.')}
        {:else}
          {t('task.admin_audit_logs.no_failures', {}, 'No failures.')}
        {/if}
      </div>
    </div>

    <div class={`rounded-2xl border px-4 py-3 ${
      consoleModel.summary.failedCount > 0
        ? 'border-rose-500/30 bg-card'
        : 'border-border bg-muted/40'
    }`}>
      <div class="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        <Waypoints class="h-3.5 w-3.5" />
        {t('task.admin_audit_logs.hot_workflow', {}, 'Hot workflow')}
      </div>
      <div class="mt-2 text-sm font-semibold text-foreground">
        {hottestWorkflow?.[0] ?? t('task.admin_audit_logs.no_hot_workflow', {}, 'No hot workflow yet')}
      </div>
      <div class="mt-1 text-xs text-muted-foreground">
        {hottestWorkflow
          ? t('task.admin_audit_logs.event_count_window', { count: hottestWorkflow[1] }, ':count events in current window')
          : t('task.admin_audit_logs.needs_more_data', {}, 'Need more data to identify')}
      </div>
    </div>
  </CardContent>
</Card>
