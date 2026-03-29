<script lang="ts">
  import { Filter, RotateCcw, Search } from 'lucide-svelte'

  import type {
    AuditActivityOutcome,
    UserAuditFilters,
  } from '@/apps/user/modules/audit_logs/models/activity_item'
  import { useTranslation } from '@/apps/user/shared/stores/translation.svelte'
  import Button from '@/apps/user/shared/ui/button.svelte'
  import Input from '@/apps/user/shared/ui/input.svelte'

  type FilterPatch = Pick<
    UserAuditFilters,
    'search' | 'resourceType' | 'outcome' | 'from' | 'to'
  >

  interface Props {
    filters: UserAuditFilters
    onApply: (filters: FilterPatch) => void
    onClear: () => void
  }

  const { filters, onApply, onClear }: Props = $props()
  const { t } = useTranslation()

  let search = $state('')
  let resourceType = $state('')
  let outcome = $state<AuditActivityOutcome | ''>('')
  let from = $state('')
  let to = $state('')
  let advancedOpen = $state(false)

  $effect(() => {
    search = filters.search
    resourceType = filters.resourceType ?? ''
    outcome = filters.outcome ?? ''
    from = filters.from?.slice(0, 16) ?? ''
    to = filters.to?.slice(0, 16) ?? ''
    advancedOpen = Boolean(filters.resourceType || filters.outcome || filters.from || filters.to)
  })

  const activeCount = $derived(
    [filters.search, filters.resourceType, filters.outcome, filters.from, filters.to].filter(Boolean)
      .length
  )
  const invalidDateRange = $derived(
    Boolean(from && to && new Date(from).getTime() > new Date(to).getTime())
  )

  function submitFilters(event: SubmitEvent) {
    event.preventDefault()
    if (invalidDateRange) return

    onApply({
      search: search.trim(),
      resourceType: resourceType || null,
      outcome: outcome || null,
      from: from ? new Date(from).toISOString() : null,
      to: to ? new Date(to).toISOString() : null,
    })
  }

  function clearFilters() {
    search = ''
    resourceType = ''
    outcome = ''
    from = ''
    to = ''
    advancedOpen = false
    onClear()
  }
</script>

<form
  class="rounded-2xl border border-border bg-card p-4 shadow-sm"
  aria-label={t('user_audit.filters.aria', {}, 'Personal audit filters')}
  onsubmit={submitFilters}
>
  <div class="flex flex-col gap-3 lg:flex-row lg:items-end">
    <div class="min-w-0 flex-1">
      <label class="mb-1.5 block text-sm font-medium text-foreground" for="user-audit-search">
        {t('user_audit.filters.search_label', {}, 'Search your activity')}
      </label>
      <div class="relative">
        <Search
          class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          id="user-audit-search"
          type="search"
          class="min-h-11 pl-9 font-sans"
          bind:value={search}
          placeholder={t(
            'user_audit.filters.search_placeholder',
            {},
            'Search by event or area — never by person, IP or internal ID',
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
        aria-controls="user-audit-advanced-filters"
        onclick={() => {
          advancedOpen = !advancedOpen
        }}
      >
        <Filter class="size-4" aria-hidden="true" />
        {t('user_audit.filters.more', {}, 'More filters')}
        {#if activeCount > 0}
          <span
            class="rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground"
          >
            {activeCount}
          </span>
        {/if}
      </Button>
      <Button type="submit" class="min-h-11" disabled={invalidDateRange}>
        {t('user_audit.filters.apply', {}, 'Apply')}
      </Button>
      {#if activeCount > 0}
        <Button type="button" variant="ghost" class="min-h-11 gap-2" onclick={clearFilters}>
          <RotateCcw class="size-4" aria-hidden="true" />
          {t('user_audit.filters.clear', {}, 'Clear')}
        </Button>
      {/if}
    </div>
  </div>

  {#if advancedOpen}
    <div
      id="user-audit-advanced-filters"
      class="mt-4 grid gap-4 border-t border-border pt-4 sm:grid-cols-2 xl:grid-cols-4"
    >
      <div>
        <label
          class="mb-1.5 block text-sm font-medium text-foreground"
          for="user-audit-area"
        >
          {t('user_audit.filters.area', {}, 'Activity area')}
        </label>
        <select
          id="user-audit-area"
          class="flex h-11 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25"
          bind:value={resourceType}
        >
          <option value="">{t('user_audit.filters.all', {}, 'All areas')}</option>
          <option value="user">{t('user_audit.areas.account', {}, 'Account')}</option>
          <option value="organization">{t('user_audit.areas.organization', {}, 'Organization')}</option>
          <option value="organization_member">
            {t('user_audit.areas.membership', {}, 'Membership')}
          </option>
          <option value="project">{t('user_audit.areas.project', {}, 'Project')}</option>
          <option value="task">{t('user_audit.areas.task', {}, 'Task')}</option>
          <option value="review">{t('user_audit.areas.review', {}, 'Review')}</option>
        </select>
      </div>

      <div>
        <label
          class="mb-1.5 block text-sm font-medium text-foreground"
          for="user-audit-outcome"
        >
          {t('user_audit.filters.outcome', {}, 'Outcome')}
        </label>
        <select
          id="user-audit-outcome"
          class="flex h-11 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25"
          bind:value={outcome}
        >
          <option value="">{t('user_audit.filters.all_outcomes', {}, 'All outcomes')}</option>
          <option value="success">{t('user_audit.outcomes.success', {}, 'Successful')}</option>
          <option value="warning">{t('user_audit.outcomes.warning', {}, 'Needs attention')}</option>
          <option value="failure">{t('user_audit.outcomes.failure', {}, 'Failed')}</option>
          <option value="recorded">{t('user_audit.outcomes.recorded', {}, 'Recorded')}</option>
        </select>
      </div>

      <div>
        <label class="mb-1.5 block text-sm font-medium text-foreground" for="user-audit-from">
          {t('user_audit.filters.from', {}, 'From')}
        </label>
        <Input id="user-audit-from" type="datetime-local" class="font-sans" bind:value={from} />
      </div>

      <div>
        <label class="mb-1.5 block text-sm font-medium text-foreground" for="user-audit-to">
          {t('user_audit.filters.to', {}, 'To')}
        </label>
        <Input id="user-audit-to" type="datetime-local" class="font-sans" bind:value={to} />
      </div>

      {#if invalidDateRange}
        <p class="text-sm font-medium text-destructive sm:col-span-2 xl:col-span-4" role="alert">
          {t(
            'user_audit.filters.date_order_error',
            {},
            'The start time must be earlier than the end time.',
          )}
        </p>
      {/if}
    </div>
  {/if}
</form>
