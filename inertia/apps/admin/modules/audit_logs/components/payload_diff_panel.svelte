<script lang="ts">
  import { Binary, FileJson2 } from 'lucide-svelte'

  import Card from '@/apps/admin/shared/ui/card.svelte'
  import CardContent from '@/apps/admin/shared/ui/card_content.svelte'
  import CardHeader from '@/apps/admin/shared/ui/card_header.svelte'
  import CardTitle from '@/apps/admin/shared/ui/card_title.svelte'
  import type { AdminAuditLogConsoleRow } from '@/apps/admin/modules/audit_logs/console_model'
  import { formatAuditLogJson } from '@/apps/admin/modules/audit_logs/console_view'
  import { useTranslation } from '@/apps/admin/shared/stores/translation.svelte'

  interface Props {
    selectedLog: AdminAuditLogConsoleRow | null
  }

  const { selectedLog }: Props = $props()
  const { t } = useTranslation()
</script>

<Card class="sticky top-6 border-border bg-card shadow-sm">
  <CardHeader class="border-b border-border">
    <CardTitle class="flex items-center gap-2 text-lg">
      <Binary class="h-4 w-4 text-foreground" />
      {t('admin_ui.audit_logs.payload', {}, 'Payload')}
    </CardTitle>
  </CardHeader>
  <CardContent class="space-y-5 pt-5">
    {#if selectedLog}
      <div class="rounded-2xl border border-border bg-muted/40 px-4 py-3">
        <div class="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{t('admin_ui.audit_logs.event', {}, 'Event')}</div>
        <div class="mt-2 text-base font-semibold text-foreground">{selectedLog.investigation.summary}</div>
        <div class="mt-1 text-sm text-muted-foreground">{selectedLog.actorLabel} · {selectedLog.targetLabel}</div>
      </div>

      <section class="space-y-3">
        <div class="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          <FileJson2 class="h-3.5 w-3.5" />
          {t('task.admin_audit_logs.before', {}, 'Before')}
        </div>
        <pre class="max-h-64 overflow-auto rounded-2xl border border-border bg-muted/40 p-3 text-[11px] leading-5 text-foreground">{formatAuditLogJson(selectedLog.details.oldValues)}</pre>
      </section>

      <section class="space-y-3">
        <div class="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          <FileJson2 class="h-3.5 w-3.5" />
          {t('task.admin_audit_logs.after', {}, 'After')}
        </div>
        <pre class="max-h-[30rem] overflow-auto rounded-2xl border border-border bg-muted/40 p-3 text-[11px] leading-5 text-foreground">{formatAuditLogJson(selectedLog.details.newValues)}</pre>
      </section>
    {:else}
      <div class="rounded-2xl border border-dashed border-border bg-muted/40 px-4 py-8 text-center text-sm text-muted-foreground">
        {t('task.admin_audit_logs.select_event_sentence', {}, 'Select an event.')}
      </div>
    {/if}
  </CardContent>
</Card>
