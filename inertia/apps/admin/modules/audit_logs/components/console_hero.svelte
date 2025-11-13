<script lang="ts">
  import { useTranslation } from '@/apps/admin/shared/stores/translation.svelte'

  interface Props {
    summary: {
      total: number
      failedCount: number
      structuredCount: number
      uniqueTraceCount: number
    }
  }

  const { summary }: Props = $props()
  const { t } = useTranslation()
</script>

<section class="relative overflow-hidden rounded-[28px] border border-border bg-card p-6 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.35)]">
  <div class="absolute inset-y-0 right-0 w-1/3 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.16),transparent_58%)]"></div>
  <div class="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
    <div class="max-w-3xl space-y-3">
      <h1 class="font-['JetBrains_Mono'] text-3xl font-semibold tracking-[-0.04em] text-foreground md:text-4xl">
        {t('task.admin_audit_logs.title', {}, 'System audit log')}
      </h1>
    </div>

    <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <div class="rounded-2xl border border-border/60 bg-card/80 px-4 py-3 shadow-sm">
        <div class="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          {t('task.admin_audit_logs.events', {}, 'Events')}
        </div>
        <div class="mt-2 font-['JetBrains_Mono'] text-2xl font-semibold text-foreground">{summary.total}</div>
      </div>
      <div class="rounded-2xl border border-border/60 bg-card/80 px-4 py-3 shadow-sm">
        <div class="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          {t('task.admin_audit_logs.errors', {}, 'Errors')}
        </div>
        <div class="mt-2 font-['JetBrains_Mono'] text-2xl font-semibold text-rose-700 dark:text-rose-300">{summary.failedCount}</div>
      </div>
      <div class="rounded-2xl border border-border/60 bg-card/80 px-4 py-3 shadow-sm">
        <div class="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          {t('task.admin_audit_logs.structured', {}, 'Structured')}
        </div>
        <div class="mt-2 font-['JetBrains_Mono'] text-2xl font-semibold text-sky-700 dark:text-sky-300">{summary.structuredCount}</div>
      </div>
      <div class="rounded-2xl border border-border/60 bg-card/80 px-4 py-3 shadow-sm">
        <div class="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          {t('task.admin_audit_logs.trace', {}, 'Trace')}
        </div>
        <div class="mt-2 font-['JetBrains_Mono'] text-2xl font-semibold text-emerald-700 dark:text-emerald-300">{summary.uniqueTraceCount}</div>
      </div>
    </div>
  </div>
</section>
