<script lang="ts">
  import Badge from '@/apps/admin/shared/ui/badge.svelte'
  import Card from '@/apps/admin/shared/ui/card.svelte'
  import CardContent from '@/apps/admin/shared/ui/card_content.svelte'
  import CardHeader from '@/apps/admin/shared/ui/card_header.svelte'
  import CardTitle from '@/apps/admin/shared/ui/card_title.svelte'
  import type { AdminAuditLogConsoleRow } from '@/apps/admin/modules/audit_logs/console_model'
  import { outcomeTone, severityTone } from '@/apps/admin/modules/audit_logs/console_view'
  import { useTranslation } from '@/apps/admin/shared/stores/translation.svelte'

  interface Props {
    selectedLog: AdminAuditLogConsoleRow | null
    onOpenEvidence?: () => void
  }

  const { selectedLog, onOpenEvidence }: Props = $props()
  const { t } = useTranslation()
</script>

<Card class="border-border bg-card shadow-sm">
  <CardHeader>
    <CardTitle class="text-base">{t('task.admin_audit_logs.selected_event', {}, 'Selected event')}</CardTitle>
  </CardHeader>
  <CardContent class="space-y-4">
    {#if selectedLog}
      <div class="space-y-2">
        <div class="flex flex-wrap gap-2">
          <Badge class={severityTone(selectedLog.investigation.severity)}>{selectedLog.severityLabel}</Badge>
          <Badge class={outcomeTone(selectedLog.investigation.outcome)}>{selectedLog.outcomeLabel}</Badge>
          <Badge variant="outline">{selectedLog.moduleLabel}</Badge>
        </div>
        <div class="text-base font-semibold text-foreground">{selectedLog.investigation.summary}</div>
        <div class="text-sm text-muted-foreground">{selectedLog.actorLabel} · {selectedLog.workflowLabel}</div>
      </div>

      <div class="grid gap-2">
        {#each selectedLog.detailPairs.slice(0, 5) as pair}
          <div class="rounded-xl border border-border bg-muted/40 px-3 py-2">
            <div class="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{pair.label}</div>
            <div class="mt-1 break-all font-['JetBrains_Mono'] text-[11px] text-foreground">{pair.value}</div>
          </div>
        {/each}
      </div>

      {#if onOpenEvidence}
        <button
          type="button"
          class="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          onclick={onOpenEvidence}
        >
          {t('task.admin_audit_logs.open_trace', {}, 'Open trace')}
        </button>
      {/if}
    {:else}
      <div class="rounded-xl border border-dashed border-border bg-muted/40 px-3 py-6 text-sm text-muted-foreground">
        {t('task.admin_audit_logs.select_event_sentence', {}, 'Select an event.')}
      </div>
    {/if}
  </CardContent>
</Card>
