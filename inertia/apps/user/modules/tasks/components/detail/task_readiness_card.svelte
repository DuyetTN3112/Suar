<script lang="ts">
  import { useTranslation } from '@/apps/user/shared/stores/translation.svelte'

  interface Props {
    contractChecks: Array<{ key: string; label: string; done: boolean }>
    completedContractChecks: number
    contractReadyForAssignment: boolean
  }

  const { contractChecks, completedContractChecks, contractReadyForAssignment }: Props = $props()
  const { t } = useTranslation()
</script>

<div class="rounded-2xl border border-border bg-background p-4">
  <div class="flex items-start justify-between gap-3">
    <div>
      <p class="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
        {t('task.readiness.title', {}, 'Readiness')}
      </p>
      <h3 class="mt-2 text-lg font-semibold text-foreground">
        {t('task.readiness.completed_count', { completed: completedContractChecks, total: contractChecks.length }, ':completed/:total items clear')}
      </h3>
    </div>
    <span class={`rounded-full px-3 py-1 text-xs font-semibold ${contractReadyForAssignment ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'bg-amber-500/10 text-amber-700 dark:text-amber-300'}`}>
      {contractReadyForAssignment ? t('task.readiness.ready', {}, 'Ready to assign') : t('task.readiness.needs_work', {}, 'Needs more detail')}
    </span>
  </div>
  <div class="mt-4 space-y-2">
    {#each contractChecks as check}
      <div class="rounded-xl border border-border px-3 py-2">
        <div class="flex items-center justify-between gap-3">
          <p class="text-sm font-medium text-foreground">{check.label}</p>
          <span class={`text-xs font-semibold ${check.done ? 'text-foreground' : 'text-amber-700 dark:text-amber-300'}`}>
            {check.done ? t('task.readiness.complete', {}, 'Complete') : t('task.readiness.missing', {}, 'Missing')}
          </span>
        </div>
      </div>
    {/each}
  </div>
</div>
