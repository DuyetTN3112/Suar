<script lang="ts">
  import { Flame, Siren, TriangleAlert, Zap } from 'lucide-svelte'

  import Card from '@/apps/admin/shared/ui/card.svelte'
  import CardContent from '@/apps/admin/shared/ui/card_content.svelte'
  import CardHeader from '@/apps/admin/shared/ui/card_header.svelte'
  import CardTitle from '@/apps/admin/shared/ui/card_title.svelte'
  import type {
    AdminAuditLogConsoleFilters,
    buildAdminAuditLogConsoleModel,
  } from '@/apps/admin/modules/audit_logs/console_model'
  import { useTranslation } from '@/apps/admin/shared/stores/translation.svelte'

  interface Props {
    consoleModel: ReturnType<typeof buildAdminAuditLogConsoleModel>
    onApplyPreset: (filters: Partial<AdminAuditLogConsoleFilters>) => void
  }

  const { consoleModel, onApplyPreset }: Props = $props()
  const { t } = useTranslation()

  const hottestFailureWorkflow = $derived(
    consoleModel.filteredRows.find((row) => row.investigation.outcome === 'failure')?.investigation.workflow ?? null
  )
  const hottestWorkflow = $derived(consoleModel.filteredRows[0]?.investigation.workflow ?? null)
</script>

<Card class="border-border bg-card shadow-sm">
  <CardHeader>
    <CardTitle class="flex items-center gap-2 text-base">
      <Zap class="h-4 w-4 text-sky-600" />
      {t('task.admin_audit_logs.filter_presets', {}, 'Filter presets')}
    </CardTitle>
  </CardHeader>
  <CardContent class="space-y-3">
    <button
      type="button"
      class="w-full rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-left transition-colors hover:bg-rose-500/15"
      onclick={() => onApplyPreset({ outcome: 'failure', severity: '' })}
    >
      <div class="flex items-center gap-2 text-sm font-semibold text-rose-800 dark:text-rose-200">
        <Siren class="h-4 w-4" />
        {t('task.admin_audit_logs.only_errors', {}, 'Errors only')}
      </div>
      <div class="mt-1 text-xs leading-5 text-rose-700 dark:text-rose-300">
        {t('task.admin_audit_logs.only_errors_description', {}, 'Keep only failures.')}
      </div>
    </button>

    <button
      type="button"
      class="w-full rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-left transition-colors hover:bg-amber-500/15"
      onclick={() => onApplyPreset({ severity: 'warn', outcome: '' })}
    >
      <div class="flex items-center gap-2 text-sm font-semibold text-amber-900 dark:text-amber-200">
        <TriangleAlert class="h-4 w-4" />
        {t('task.admin_audit_logs.only_warnings', {}, 'Warnings only')}
      </div>
      <div class="mt-1 text-xs leading-5 text-amber-700 dark:text-amber-300">
        {t('task.admin_audit_logs.only_warnings_description', {}, 'Keep only warnings.')}
      </div>
    </button>

    {#if hottestFailureWorkflow}
      <button
        type="button"
        class="w-full rounded-2xl border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-left transition-colors hover:bg-sky-500/15"
        onclick={() => onApplyPreset({ workflow: hottestFailureWorkflow })}
      >
        <div class="flex items-center gap-2 text-sm font-semibold text-sky-900 dark:text-sky-200">
          <Flame class="h-4 w-4" />
          {t('task.admin_audit_logs.hot_failure_workflow', {}, 'Hot failure workflow')}
        </div>
        <div class="mt-1 text-xs leading-5 text-sky-700 dark:text-sky-300">
          {t('task.admin_audit_logs.hot_failure_workflow_description', {}, 'The hottest failure workflow.')}
        </div>
      </button>
    {:else if hottestWorkflow}
      <button
        type="button"
        class="w-full rounded-2xl border border-border bg-muted/40 px-4 py-3 text-left transition-colors hover:bg-muted"
        onclick={() => onApplyPreset({ workflow: hottestWorkflow })}
      >
        <div class="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Flame class="h-4 w-4" />
          {t('task.admin_audit_logs.hot_workflow', {}, 'Hot workflow')}
        </div>
        <div class="mt-1 text-xs leading-5 text-muted-foreground">
          {t('task.admin_audit_logs.hot_workflow_description', {}, 'Workflow with the most events.')}
        </div>
      </button>
    {/if}
  </CardContent>
</Card>
