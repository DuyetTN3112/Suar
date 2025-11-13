<script lang="ts">
  import { Boxes, Waypoints } from 'lucide-svelte'

  import Card from '@/apps/admin/shared/ui/card.svelte'
  import CardContent from '@/apps/admin/shared/ui/card_content.svelte'
  import CardHeader from '@/apps/admin/shared/ui/card_header.svelte'
  import CardTitle from '@/apps/admin/shared/ui/card_title.svelte'
  import type {
    AdminAuditLogConsoleFilters,
    buildAdminAuditLogConsoleModel,
  } from '@/apps/admin/modules/audit_logs/console_model'
  import { severityTone } from '@/apps/admin/modules/audit_logs/console_view'
  import { useTranslation } from '@/apps/admin/shared/stores/translation.svelte'

  interface Props {
    consoleModel: ReturnType<typeof buildAdminAuditLogConsoleModel>
    clientFilters: AdminAuditLogConsoleFilters
    onFilter: <K extends keyof AdminAuditLogConsoleFilters>(
      key: K,
      value: AdminAuditLogConsoleFilters[K]
    ) => void
  }

  const { consoleModel, clientFilters, onFilter }: Props = $props()
  const { t } = useTranslation()
</script>

<Card class="border-border bg-card shadow-sm">
  <CardHeader>
    <CardTitle class="flex items-center gap-2 text-base">
      <Boxes class="h-4 w-4 text-indigo-600" />
      {t('task.admin_audit_logs.quick_filters', {}, 'Quick filters')}
    </CardTitle>
  </CardHeader>
  <CardContent class="space-y-4">
    <div class="space-y-2">
      <div class="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {t('task.admin_audit_logs.outcome', {}, 'Outcome')}
      </div>
      <div class="flex flex-wrap gap-2">
        {#each consoleModel.outcomes as outcome}
          <button
            type="button"
            class={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              clientFilters.outcome === outcome
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                : 'border-border bg-muted/40 text-muted-foreground hover:bg-muted'
            }`}
            onclick={() => onFilter('outcome', outcome)}
          >
            {outcome}
          </button>
        {/each}
      </div>
    </div>

    <div class="space-y-2">
      <div class="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {t('task.admin_audit_logs.severity', {}, 'Severity')}
      </div>
      <div class="flex flex-wrap gap-2">
        {#each consoleModel.severities as severity}
          <button
            type="button"
            class={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              clientFilters.severity === severity
                ? severityTone(severity)
                : 'border-border bg-muted/40 text-muted-foreground hover:bg-muted'
            }`}
            onclick={() => onFilter('severity', severity)}
          >
            {severity}
          </button>
        {/each}
      </div>
    </div>

    <div class="space-y-2">
      <div class="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Module</div>
      <div class="flex flex-wrap gap-2">
        {#each consoleModel.modules as module}
          <button
            type="button"
            class={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              clientFilters.module === module
                ? 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300 dark:text-sky-300'
                : 'border-border bg-muted/40 text-muted-foreground hover:bg-muted'
            }`}
            onclick={() => onFilter('module', module)}
          >
            {module}
          </button>
        {/each}
      </div>
    </div>

    <div class="space-y-2">
      <div class="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {t('task.admin_audit_logs.workflow', {}, 'Workflow')}
      </div>
      <div class="space-y-2">
        {#each consoleModel.workflows as workflow}
          <button
            type="button"
            class={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-xs transition-colors ${
              clientFilters.workflow === workflow
                ? 'border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300'
                : 'border-border bg-muted/40 text-muted-foreground hover:bg-muted'
            }`}
            onclick={() => onFilter('workflow', workflow)}
          >
            <span class="truncate">{workflow}</span>
            <Waypoints class="h-3.5 w-3.5 flex-none" />
          </button>
        {/each}
      </div>
    </div>
  </CardContent>
</Card>
