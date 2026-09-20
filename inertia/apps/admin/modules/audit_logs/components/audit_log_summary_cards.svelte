<script lang="ts">
  import {
    AlertTriangle,
    Archive,
    CheckCircle2,
    Fingerprint,
  } from 'lucide-svelte'

  export interface AuditLogSummaryStats {
    total: number
    failedCount: number
    warningCount: number
    structuredCount: number
    uniqueTraceCount: number
    integrityMismatchCount: number
    legacyUnsealedCount: number
    verifiedCount: number
  }

  interface Props {
    summary: AuditLogSummaryStats
    t: (key: string, params?: Record<string, unknown>, fallback?: string) => string
  }

  const { summary, t }: Props = $props()
</script>

<section
  class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
  aria-label={t('admin_ui.audit_logs.current_window_health', {}, 'Current audit window health')}
>
  <article class="rounded-xl border border-border bg-card p-4">
    <div class="flex items-center justify-between gap-3">
      <span class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {t('admin_ui.audit_logs.current_window', {}, 'Current window')}
      </span>
      <Fingerprint class="size-4 text-sky-600" aria-hidden="true" />
    </div>
    <p class="mt-3 font-mono text-2xl font-semibold text-foreground">
      {summary.total}
    </p>
    <p class="mt-1 text-xs text-muted-foreground">
      {t('admin_ui.audit_logs.loaded_evidence', {}, 'Loaded evidence records')}
    </p>
  </article>

  <article class="rounded-xl border border-border bg-card p-4">
    <div class="flex items-center justify-between gap-3">
      <span class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {t('admin_ui.audit_logs.failures_warnings', {}, 'Failures & warnings')}
      </span>
      <AlertTriangle class="size-4 text-amber-600" aria-hidden="true" />
    </div>
    <p class="mt-3 font-mono text-2xl font-semibold text-foreground">
      {summary.failedCount + summary.warningCount}
    </p>
    <p class="mt-1 text-xs text-muted-foreground">
      {t(
        'admin_ui.audit_logs.failure_warning_breakdown',
        {
          failures: summary.failedCount,
          warnings: summary.warningCount,
        },
        ':failures failures · :warnings warnings',
      )}
    </p>
  </article>

  <article
    class={`rounded-xl border p-4 ${
      summary.integrityMismatchCount > 0
        ? 'border-rose-500/40 bg-rose-500/5'
        : 'border-border bg-card'
    }`}
  >
    <div class="flex items-center justify-between gap-3">
      <span class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {t('admin_ui.audit_logs.integrity_alerts', {}, 'Integrity alerts')}
      </span>
      <CheckCircle2
        class={`size-4 ${
          summary.integrityMismatchCount > 0
            ? 'text-rose-600'
            : 'text-emerald-600'
        }`}
        aria-hidden="true"
      />
    </div>
    <p class="mt-3 font-mono text-2xl font-semibold text-foreground">
      {summary.integrityMismatchCount}
    </p>
    <p class="mt-1 text-xs text-muted-foreground">
      {t('admin_ui.audit_logs.hash_mismatches', {}, 'Cryptographic hash mismatches')}
    </p>
  </article>

  <article class="rounded-xl border border-border bg-card p-4">
    <div class="flex items-center justify-between gap-3">
      <span class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {t('admin_ui.audit_logs.legacy_evidence', {}, 'Legacy evidence')}
      </span>
      <Archive class="size-4 text-amber-600" aria-hidden="true" />
    </div>
    <p class="mt-3 font-mono text-2xl font-semibold text-foreground">
      {summary.legacyUnsealedCount}
    </p>
    <p class="mt-1 text-xs text-muted-foreground">
      {t('admin_ui.audit_logs.unsealed_records', {}, 'Records created before sealing')}
    </p>
  </article>
</section>
