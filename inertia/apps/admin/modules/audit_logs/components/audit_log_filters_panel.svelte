<script lang="ts">
  import { Filter, RotateCcw, Search } from 'lucide-svelte'

  import Badge from '@/apps/admin/shared/ui/badge.svelte'
  import Button from '@/apps/admin/shared/ui/button.svelte'

  interface Props {
    searchValue: string
    severityValue: string
    outcomeValue: string
    actionValue: string
    resourceTypeValue: string
    moduleValue: string
    workflowValue: string
    actorTypeValue: string
    retentionClassValue: string
    traceIdValue: string
    userIdValue: string
    fromValue: string
    toValue: string
    activeFilterCount: number
    advancedFilterCount: number
    t: (key: string, params?: Record<string, unknown>, fallback?: string) => string
    onSearchChange: (value: string) => void
    onSeverityChange: (value: string) => void
    onOutcomeChange: (value: string) => void
    onActionChange: (value: string) => void
    onResourceTypeChange: (value: string) => void
    onModuleChange: (value: string) => void
    onWorkflowChange: (value: string) => void
    onActorTypeChange: (value: string) => void
    onRetentionClassChange: (value: string) => void
    onTraceIdChange: (value: string) => void
    onUserIdChange: (value: string) => void
    onFromChange: (value: string) => void
    onToChange: (value: string) => void
    onApply: () => void
    onReset: () => void
  }

  let {
    searchValue,
    severityValue,
    outcomeValue,
    actionValue,
    resourceTypeValue,
    moduleValue,
    workflowValue,
    actorTypeValue,
    retentionClassValue,
    traceIdValue,
    userIdValue,
    fromValue,
    toValue,
    activeFilterCount,
    advancedFilterCount,
    t,
    onSearchChange,
    onSeverityChange,
    onOutcomeChange,
    onActionChange,
    onResourceTypeChange,
    onModuleChange,
    onWorkflowChange,
    onActorTypeChange,
    onRetentionClassChange,
    onTraceIdChange,
    onUserIdChange,
    onFromChange,
    onToChange,
    onApply,
    onReset,
  }: Props = $props()
</script>

<section class="rounded-xl border border-border bg-card" aria-labelledby="system-audit-filter-heading">
  <form
    onsubmit={(event) => {
      event.preventDefault()
      onApply()
    }}
  >
    <div class="border-b border-border p-4 sm:p-5">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="system-audit-filter-heading" class="font-semibold text-foreground">
            {t('admin_ui.audit_logs.investigation_filters', {}, 'Investigation filters')}
          </h2>
          <p class="mt-1 text-xs text-muted-foreground">
            {t(
              'admin_ui.audit_logs.server_filter_description',
              {},
              'Server-side filters apply to the entire audit store, not only this window.',
            )}
          </p>
        </div>
        {#if activeFilterCount > 0}
          <Badge variant="outline">
            {t(
              'admin_ui.audit_logs.active_filter_count',
              { count: activeFilterCount },
              ':count active',
            )}
          </Badge>
        {/if}
      </div>

      <div class="mt-4 grid gap-3 lg:grid-cols-[minmax(18rem,1fr)_12rem_12rem_auto]">
        <label class="space-y-1 text-sm font-medium text-foreground">
          <span>{t('admin_ui.audit_logs.search', {}, 'Search evidence')}</span>
          <span class="relative block">
            <Search
              class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              class="h-11 w-full rounded-lg border border-input bg-background pl-10 pr-3 text-sm outline-none transition-colors focus:border-ring focus:ring-[3px] focus:ring-ring/15"
              value={searchValue}
              oninput={(e) => onSearchChange(e.currentTarget.value)}
              placeholder={t(
                'admin_ui.audit_logs.search_placeholder',
                {},
                'Actor, event, target, request, trace, IP or user agent',
              )}
            />
          </span>
        </label>

        <label class="space-y-1 text-sm font-medium text-foreground">
          <span>{t('admin_ui.audit_logs.severity', {}, 'Severity')}</span>
          <select
            class="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors focus:border-ring focus:ring-[3px] focus:ring-ring/15"
            value={severityValue}
            onchange={(e) => onSeverityChange(e.currentTarget.value)}
          >
            <option value="">{t('admin_ui.audit_logs.all_severities', {}, 'All severities')}</option>
            <option value="error">Error</option>
            <option value="warn">Warn</option>
            <option value="info">Info</option>
            <option value="debug">Debug</option>
            <option value="trace">Trace</option>
          </select>
        </label>

        <label class="space-y-1 text-sm font-medium text-foreground">
          <span>{t('admin_ui.audit_logs.outcome', {}, 'Outcome')}</span>
          <select
            class="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors focus:border-ring focus:ring-[3px] focus:ring-ring/15"
            value={outcomeValue}
            onchange={(e) => onOutcomeChange(e.currentTarget.value)}
          >
            <option value="">{t('admin_ui.audit_logs.all_outcomes', {}, 'All outcomes')}</option>
            <option value="failure">Failure</option>
            <option value="warning">Warning</option>
            <option value="success">Success</option>
            <option value="skipped">Skipped</option>
            <option value="recorded">Recorded</option>
          </select>
        </label>

        <div class="flex items-end gap-2">
          <Button class="h-11" type="submit">
            <Filter class="mr-2 size-4" aria-hidden="true" />
            {t('admin_ui.audit_logs.apply_filters', {}, 'Apply')}
          </Button>
          <Button
            class="h-11"
            type="button"
            variant="outline"
            aria-label={t('admin_ui.audit_logs.reset_filters', {}, 'Reset filters')}
            onclick={onReset}
          >
            <RotateCcw class="size-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>

    <details class="group" open={advancedFilterCount > 0}>
      <summary
        class="flex min-h-11 cursor-pointer items-center justify-between gap-3 px-4 py-3 text-sm font-medium text-foreground marker:content-none focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-ring/20 sm:px-5"
      >
        <span>
          {t('admin_ui.audit_logs.advanced_filters', {}, 'Advanced forensic filters')}
          {#if advancedFilterCount > 0}
            <span class="ml-2 text-xs text-muted-foreground">({advancedFilterCount})</span>
          {/if}
        </span>
        <span class="text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true">
          ▾
        </span>
      </summary>

      <div class="grid gap-3 border-t border-border bg-muted/10 p-4 sm:grid-cols-2 lg:grid-cols-4 sm:p-5">
        <label class="space-y-1 text-sm font-medium text-foreground">
          <span>{t('admin_ui.audit_logs.action', {}, 'Action')}</span>
          <input
            class="h-11 w-full rounded-lg border border-input bg-background px-3 font-mono text-sm outline-none transition-colors focus:border-ring focus:ring-[3px] focus:ring-ring/15"
            value={actionValue}
            placeholder="task.assigned"
            oninput={(e) => onActionChange(e.currentTarget.value)}
          />
        </label>

        <label class="space-y-1 text-sm font-medium text-foreground">
          <span>{t('admin_ui.audit_logs.type', {}, 'Target type')}</span>
          <input
            class="h-11 w-full rounded-lg border border-input bg-background px-3 font-mono text-sm outline-none transition-colors focus:border-ring focus:ring-[3px] focus:ring-ring/15"
            value={resourceTypeValue}
            placeholder="task"
            oninput={(e) => onResourceTypeChange(e.currentTarget.value)}
          />
        </label>

        <label class="space-y-1 text-sm font-medium text-foreground">
          <span>{t('admin_ui.audit_logs.module', {}, 'Module')}</span>
          <input
            class="h-11 w-full rounded-lg border border-input bg-background px-3 font-mono text-sm outline-none transition-colors focus:border-ring focus:ring-[3px] focus:ring-ring/15"
            value={moduleValue}
            placeholder="tasks"
            oninput={(e) => onModuleChange(e.currentTarget.value)}
          />
        </label>

        <label class="space-y-1 text-sm font-medium text-foreground">
          <span>{t('admin_ui.audit_logs.workflow', {}, 'Workflow')}</span>
          <input
            class="h-11 w-full rounded-lg border border-input bg-background px-3 font-mono text-sm outline-none transition-colors focus:border-ring focus:ring-[3px] focus:ring-ring/15"
            value={workflowValue}
            placeholder="task_assignment"
            oninput={(e) => onWorkflowChange(e.currentTarget.value)}
          />
        </label>

        <label class="space-y-1 text-sm font-medium text-foreground">
          <span>{t('admin_ui.audit_logs.actor_type', {}, 'Actor type')}</span>
          <select
            class="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors focus:border-ring focus:ring-[3px] focus:ring-ring/15"
            value={actorTypeValue}
            onchange={(e) => onActorTypeChange(e.currentTarget.value)}
          >
            <option value="">{t('admin_ui.audit_logs.all_actor_types', {}, 'All actor types')}</option>
            {#each ['user', 'system', 'frontend', 'automation', 'job', 'listener', 'cli', 'integration', 'unknown'] as aType}
              <option value={aType}>{aType}</option>
            {/each}
          </select>
        </label>

        <label class="space-y-1 text-sm font-medium text-foreground">
          <span>{t('admin_ui.audit_logs.retention', {}, 'Retention')}</span>
          <input
            class="h-11 w-full rounded-lg border border-input bg-background px-3 font-mono text-sm outline-none transition-colors focus:border-ring focus:ring-[3px] focus:ring-ring/15"
            value={retentionClassValue}
            placeholder="security_audit"
            oninput={(e) => onRetentionClassChange(e.currentTarget.value)}
          />
        </label>

        <label class="space-y-1 text-sm font-medium text-foreground">
          <span>{t('admin_ui.audit_logs.trace_id', {}, 'Trace ID')}</span>
          <input
            class="h-11 w-full rounded-lg border border-input bg-background px-3 font-mono text-sm outline-none transition-colors focus:border-ring focus:ring-[3px] focus:ring-ring/15"
            value={traceIdValue}
            placeholder="trace-…"
            oninput={(e) => onTraceIdChange(e.currentTarget.value)}
          />
        </label>

        <label class="space-y-1 text-sm font-medium text-foreground">
          <span>{t('admin_ui.audit_logs.user_id', {}, 'Actor user ID')}</span>
          <input
            class="h-11 w-full rounded-lg border border-input bg-background px-3 font-mono text-sm outline-none transition-colors focus:border-ring focus:ring-[3px] focus:ring-ring/15"
            value={userIdValue}
            placeholder="uuid"
            oninput={(e) => onUserIdChange(e.currentTarget.value)}
          />
        </label>

        <label class="space-y-1 text-sm font-medium text-foreground">
          <span>{t('admin_ui.audit_logs.from', {}, 'From')}</span>
          <input
            type="date"
            class="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors focus:border-ring focus:ring-[3px] focus:ring-ring/15"
            value={fromValue}
            onchange={(e) => onFromChange(e.currentTarget.value)}
          />
        </label>

        <label class="space-y-1 text-sm font-medium text-foreground">
          <span>{t('admin_ui.audit_logs.to', {}, 'To')}</span>
          <input
            type="date"
            class="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors focus:border-ring focus:ring-[3px] focus:ring-ring/15"
            value={toValue}
            onchange={(e) => onToChange(e.currentTarget.value)}
          />
        </label>
      </div>
    </details>
  </form>
</section>
