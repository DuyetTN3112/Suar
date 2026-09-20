<script lang="ts">
  import { useTranslation } from '@/apps/org/shared/hooks/use_translation.svelte'

  interface Props {
    firstTaskPlan?: 'launch_immediately' | 'setup_roles_first' | 'collect_people_first'
    launchSummary: string
    staffingCoverageSummary?: string
    onLaunchPlanChange?: (plan: 'launch_immediately' | 'setup_roles_first' | 'collect_people_first') => void
  }

  let {
    firstTaskPlan = $bindable('launch_immediately'),
    launchSummary,
    staffingCoverageSummary,
    onLaunchPlanChange,
  }: Props = $props()

  const { t } = $derived(useTranslation())
</script>

<div class="space-y-5">
  <div class="grid gap-3 md:grid-cols-3">
    <button
      type="button"
      class={`rounded-2xl border p-4 text-left ${firstTaskPlan === 'setup_roles_first' ? 'border-primary bg-primary/5' : 'border-border bg-background'}`}
      onclick={() => {
        firstTaskPlan = 'setup_roles_first'
        onLaunchPlanChange?.('setup_roles_first')
      }}
    >
      <p class="text-sm font-semibold text-foreground">{t('project.create_page.launch_options.setup_roles_first', {}, 'Set up roles first')}</p>
    </button>
    <button
      type="button"
      class={`rounded-2xl border p-4 text-left ${firstTaskPlan === 'collect_people_first' ? 'border-primary bg-primary/5' : 'border-border bg-background'}`}
      onclick={() => {
        firstTaskPlan = 'collect_people_first'
        onLaunchPlanChange?.('collect_people_first')
      }}
    >
      <p class="text-sm font-semibold text-foreground">{t('project.create_page.launch_options.collect_people_first', {}, 'Add people first')}</p>
    </button>
    <button
      type="button"
      class={`rounded-2xl border p-4 text-left ${firstTaskPlan === 'launch_immediately' ? 'border-primary bg-primary/5' : 'border-border bg-background'}`}
      onclick={() => {
        firstTaskPlan = 'launch_immediately'
        onLaunchPlanChange?.('launch_immediately')
      }}
    >
      <p class="text-sm font-semibold text-foreground">{t('project.create_page.launch_options.launch_immediately', {}, 'Open first task')}</p>
    </button>
  </div>

  <div class="rounded-2xl border border-primary/20 bg-primary/5 p-4">
    <p class="text-sm font-semibold text-foreground">{t('project.create_page.launch_summary_heading', {}, 'After create')}</p>
    <p class="mt-2 text-sm text-muted-foreground">{launchSummary}</p>
    {#if staffingCoverageSummary}
      <p class="mt-2 text-xs font-medium text-muted-foreground">{staffingCoverageSummary}</p>
    {/if}
  </div>
</div>
