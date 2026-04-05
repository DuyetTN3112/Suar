<script lang="ts">
  import { Filter, RotateCcw, Search } from 'lucide-svelte'

  import type {
    AuditActivityOutcome,
    OrganizationAuditFilters,
  } from '@/apps/org/modules/audit_logs/models/activity_item'
  import { useTranslation } from '@/apps/org/shared/stores/translation.svelte'
  import Button from '@/apps/org/shared/ui/button.svelte'
  import Input from '@/apps/org/shared/ui/input.svelte'

  type FilterPatch = Pick<
    OrganizationAuditFilters,
    'search' | 'action' | 'resourceType' | 'outcome' | 'from' | 'to'
  >

  interface Props {
    filters: OrganizationAuditFilters
    onApply: (filters: FilterPatch) => void
    onClear: () => void
  }

  const { filters, onApply, onClear }: Props = $props()
  const { t } = useTranslation()

  let search = $state('')
  let action = $state('')
  let resourceType = $state('')
  let outcome = $state<AuditActivityOutcome | ''>('')
  let from = $state('')
  let to = $state('')
  let advancedOpen = $state(false)

  $effect(() => {
    search = filters.search
    action = filters.action ?? ''
    resourceType = filters.resourceType ?? ''
    outcome = filters.outcome ?? ''
    from = filters.from?.slice(0, 16) ?? ''
    to = filters.to?.slice(0, 16) ?? ''
    advancedOpen = Boolean(
      filters.action || filters.resourceType || filters.outcome || filters.from || filters.to
    )
  })

  const activeCount = $derived(
    [filters.search, filters.action, filters.resourceType, filters.outcome, filters.from, filters.to]
      .filter(Boolean)
      .length
  )

  function submitFilters(event: SubmitEvent) {
    event.preventDefault()
    onApply({
      search: search.trim(),
      action: action.trim() || null,
      resourceType: resourceType || null,
      outcome: outcome || null,
      from: from ? new Date(from).toISOString() : null,
      to: to ? new Date(to).toISOString() : null,
    })
  }

  function clearFilters() {
    search = ''
    action = ''
    resourceType = ''
    outcome = ''
    from = ''
    to = ''
    advancedOpen = false
    onClear()
  }
</script>

<form
  class="rounded-xl border border-border bg-card p-4 shadow-sm"
  aria-label={t('task.audit_activity.filters.aria', {}, 'Audit log filters')}
  onsubmit={submitFilters}
>
  <div class="flex flex-col gap-3 lg:flex-row lg:items-end">
    <div class="min-w-0 flex-1">
      <label class="mb-1.5 block text-sm font-medium text-foreground" for="audit-search">
        {t('task.audit_activity.filters.search_label', {}, 'Search audit records')}
      </label>
      <div class="relative">
        <Search
          class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          id="audit-search"
          type="search"
          class="pl-9 font-sans"
          bind:value={search}
          placeholder={t(
            'task.audit_activity.filters.search_placeholder',
            {},
            'Actor, action, target name or ID',
          )}
        />
      </div>
    </div>

    <div class="flex flex-wrap gap-2">
      <Button
        type="button"
        variant="outline"
        class="min-h-11 gap-2"
        aria-expanded={advancedOpen}
        aria-controls="audit-advanced-filters"
        onclick={() => {
          advancedOpen = !advancedOpen
        }}
      >
        <Filter class="size-4" aria-hidden="true" />
        {t('task.audit_activity.filters.more', {}, 'More filters')}
        {#if activeCount > 0}
          <span class="rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
            {activeCount}
          </span>
        {/if}
      </Button>
      <Button type="submit" class="min-h-11">
        {t('task.audit_activity.filters.apply', {}, 'Apply filters')}
      </Button>
      {#if activeCount > 0}
        <Button type="button" variant="ghost" class="min-h-11 gap-2" onclick={clearFilters}>
          <RotateCcw class="size-4" aria-hidden="true" />
          {t('task.audit_activity.filters.clear', {}, 'Clear')}
        </Button>
      {/if}
    </div>
  </div>

  {#if advancedOpen}
    <div
      id="audit-advanced-filters"
      class="mt-4 grid gap-4 border-t border-border pt-4 sm:grid-cols-2 xl:grid-cols-5"
    >
      <div>
        <label class="mb-1.5 block text-sm font-medium text-foreground" for="audit-action">
          {t('task.audit_activity.filters.action', {}, 'Action code')}
        </label>
        <Input
          id="audit-action"
          class="font-mono"
          bind:value={action}
          placeholder={t('task.audit_activity.filters.action_placeholder', {}, 'e.g. update_status')}
        />
      </div>

      <div>
        <label class="mb-1.5 block text-sm font-medium text-foreground" for="audit-target-type">
          {t('task.audit_activity.filters.target_type', {}, 'Target type')}
        </label>
        <select
          id="audit-target-type"
          class="flex h-11 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25"
          bind:value={resourceType}
        >
          <option value="">{t('task.audit_activity.filters.all', {}, 'All')}</option>
          <option value="organization">{t('task.audit_activity.categories.organization', {}, 'Organization')}</option>
          <option value="organization_member">{t('task.audit_activity.categories.membership', {}, 'Membership')}</option>
          <option value="project">{t('task.audit_activity.categories.project', {}, 'Project')}</option>
          <option value="task">{t('task.audit_activity.categories.task', {}, 'Task')}</option>
          <option value="review">{t('task.audit_activity.categories.review', {}, 'Review')}</option>
        </select>
      </div>

      <div>
        <label class="mb-1.5 block text-sm font-medium text-foreground" for="audit-outcome">
          {t('task.audit_activity.filters.outcome', {}, 'Outcome')}
        </label>
        <select
          id="audit-outcome"
          class="flex h-11 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25"
          bind:value={outcome}
        >
          <option value="">{t('task.audit_activity.filters.all', {}, 'All')}</option>
          <option value="success">{t('task.audit_activity.outcomes.success', {}, 'Success')}</option>
          <option value="warning">{t('task.audit_activity.outcomes.warning', {}, 'Needs attention')}</option>
          <option value="failure">{t('task.audit_activity.outcomes.failure', {}, 'Failed')}</option>
          <option value="recorded">{t('task.audit_activity.outcomes.recorded', {}, 'Recorded')}</option>
        </select>
      </div>

      <div>
        <label class="mb-1.5 block text-sm font-medium text-foreground" for="audit-from">
          {t('task.audit_activity.filters.from', {}, 'From')}
        </label>
        <Input id="audit-from" type="datetime-local" class="font-sans" bind:value={from} />
      </div>

      <div>
        <label class="mb-1.5 block text-sm font-medium text-foreground" for="audit-to">
          {t('task.audit_activity.filters.to', {}, 'To')}
        </label>
        <Input id="audit-to" type="datetime-local" class="font-sans" bind:value={to} />
      </div>
    </div>
  {/if}
</form>
