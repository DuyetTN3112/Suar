<script lang="ts">
  import { Dialog } from 'bits-ui'
  import {
    Braces,
    Clock3,
    FileClock,
    Fingerprint,
    Link2,
    LockKeyhole,
    Network,
    ShieldAlert,
    ShieldCheck,
    UserRound,
    X,
  } from 'lucide-svelte'

  import type {
    AdminAuditLogConsoleRow,
    AdminAuditLogTraceTimelineEntry,
  } from '@/apps/admin/modules/audit_logs/console_model'
  import {
    formatAuditLogDateTime,
    formatAuditLogJson,
    outcomeTone,
    severityTone,
  } from '@/apps/admin/modules/audit_logs/console_view'
  import { useTranslation } from '@/apps/admin/shared/stores/translation.svelte'
  import Badge from '@/apps/admin/shared/ui/badge.svelte'

  interface Props {
    open: boolean
    auditEvent: AdminAuditLogConsoleRow | null
    traceTimeline: AdminAuditLogTraceTimelineEntry[]
    onOpenChange: (open: boolean) => void
    onSelectTraceEvent: (eventId: string) => void
  }

  const {
    open,
    auditEvent,
    traceTimeline,
    onOpenChange,
    onSelectTraceEvent,
  }: Props = $props()
  const { t } = useTranslation()

  const changeRows = $derived(auditEvent ? buildChangeRows(auditEvent) : [])

  function formatValue(value: unknown): string {
    if (value === null || value === undefined || value === '') return '—'
    if (typeof value === 'string') return value
    if (typeof value === 'number' || typeof value === 'boolean') return String(value)
    return formatAuditLogJson(value)
  }

  function buildChangeRows(log: AdminAuditLogConsoleRow) {
    const keys = Array.from(
      new Set([
        ...Object.keys(log.details.oldValues ?? {}),
        ...Object.keys(log.details.newValues ?? {}),
      ])
    ).sort()

    return keys.map((key) => ({
      key,
      oldValue: formatValue(log.details.oldValues?.[key]),
      newValue: formatValue(log.details.newValues?.[key]),
    }))
  }

  function integrityTone(status: AdminAuditLogConsoleRow['investigation']['integrity']['status']) {
    if (status === 'verified') {
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
    }
    if (status === 'mismatch') {
      return 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300'
    }
    return 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300'
  }

  function yesNo(value: boolean): string {
    return value
      ? t('admin_ui.audit_logs.yes', {}, 'Yes')
      : t('admin_ui.audit_logs.no', {}, 'No')
  }
</script>

<Dialog.Root {open} {onOpenChange}>
  <Dialog.Portal>
    <Dialog.Overlay
      class="fixed inset-0 z-50 bg-slate-950/55 backdrop-blur-[2px] data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 motion-reduce:animate-none"
    />
    <Dialog.Content
      class="fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l border-border bg-background shadow-2xl data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:w-[min(48rem,94vw)] motion-reduce:animate-none"
      aria-label={t('admin_ui.audit_logs.system_detail_aria', {}, 'System audit evidence detail')}
      data-testid="audit-log-detail-panel"
    >
      {#if auditEvent}
        <header class="border-b border-border bg-muted/25 px-5 py-5 sm:px-7">
          <div class="flex items-start justify-between gap-4">
            <div class="min-w-0">
              <p
                class="flex items-center gap-2 font-mono text-[0.7rem] font-bold uppercase tracking-[0.16em] text-primary"
              >
                <FileClock class="size-4" aria-hidden="true" />
                {t('admin_ui.audit_logs.system_evidence_record', {}, 'Platform evidence record')}
              </p>
              <Dialog.Title
                class="mt-2 text-xl font-semibold leading-tight text-foreground sm:text-2xl"
              >
                {auditEvent.investigation.summary}
              </Dialog.Title>
              <Dialog.Description class="mt-2 text-sm leading-6 text-muted-foreground">
                {t(
                  'admin_ui.audit_logs.system_detail_description',
                  {},
                  'System-only forensic evidence with actor, target, trace, network, retention and integrity context.',
                )}
              </Dialog.Description>
              <div class="mt-3 flex flex-wrap gap-2">
                <Badge class={outcomeTone(auditEvent.investigation.outcome)}>
                  {auditEvent.outcomeLabel}
                </Badge>
                <Badge class={severityTone(auditEvent.investigation.severity)}>
                  {auditEvent.severityLabel}
                </Badge>
                <Badge class={integrityTone(auditEvent.investigation.integrity.status)}>
                  {auditEvent.integrityLabel}
                </Badge>
              </div>
            </div>
            <Dialog.Close
              class="inline-flex size-11 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30"
              aria-label={t('admin_ui.audit_logs.close', {}, 'Close')}
            >
              <X class="size-5" aria-hidden="true" />
            </Dialog.Close>
          </div>
        </header>

        <div class="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-7">
          <section
            class="grid gap-3 sm:grid-cols-2"
            aria-label={t('admin_ui.audit_logs.accountability_context', {}, 'Accountability context')}
          >
            <article class="rounded-xl border border-border bg-card p-4">
              <div
                class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              >
                <UserRound class="size-4" aria-hidden="true" />
                {t('admin_ui.audit_logs.actor', {}, 'Actor')}
              </div>
              <p class="mt-2 font-semibold text-foreground">{auditEvent.actorLabel}</p>
              <p class="mt-1 text-sm text-muted-foreground">
                {auditEvent.investigation.initiatorType ?? '—'}
                {#if auditEvent.investigation.actorRoleSurface}
                  · {auditEvent.investigation.actorRoleSurface}
                {/if}
              </p>
              <p class="mt-2 break-all font-mono text-xs text-muted-foreground">
                {auditEvent.investigation.actorUserId ?? auditEvent.user?.id ?? '—'}
              </p>
              {#if auditEvent.investigation.actorOrganizationId}
                <p class="mt-1 break-all font-mono text-xs text-muted-foreground">
                  org:{auditEvent.investigation.actorOrganizationId}
                </p>
              {/if}
            </article>

            <article class="rounded-xl border border-border bg-card p-4">
              <div
                class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              >
                <Fingerprint class="size-4" aria-hidden="true" />
                {t('admin_ui.audit_logs.target', {}, 'Target')}
              </div>
              <p class="mt-2 font-semibold text-foreground">{auditEvent.targetLabel}</p>
              <p class="mt-1 text-sm text-muted-foreground">
                {auditEvent.investigation.targetType ?? auditEvent.resourceType}
              </p>
              <p class="mt-2 break-all font-mono text-xs text-muted-foreground">
                {auditEvent.investigation.targetId ?? auditEvent.resourceId ?? '—'}
              </p>
              {#if auditEvent.investigation.targetOrganizationId}
                <p class="mt-1 break-all font-mono text-xs text-muted-foreground">
                  org:{auditEvent.investigation.targetOrganizationId}
                </p>
              {/if}
            </article>

            <article class="rounded-xl border border-border bg-card p-4">
              <div
                class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              >
                <Clock3 class="size-4" aria-hidden="true" />
                {t('admin_ui.audit_logs.execution', {}, 'Execution')}
              </div>
              <time class="mt-2 block font-medium text-foreground" datetime={auditEvent.createdAt}>
                {formatAuditLogDateTime(auditEvent.createdAt)}
              </time>
              <p class="mt-1 text-sm text-muted-foreground">
                {auditEvent.moduleLabel} · {auditEvent.workflowLabel}
              </p>
              <p class="mt-1 text-sm text-muted-foreground">
                {t('admin_ui.audit_logs.stage', {}, 'Stage')}:
                {auditEvent.investigation.stage ?? '—'}
                {#if auditEvent.investigation.durationMs !== null}
                  · {auditEvent.investigation.durationMs} ms
                {/if}
              </p>
            </article>

            <article class="rounded-xl border border-border bg-card p-4">
              <div
                class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              >
                <Link2 class="size-4" aria-hidden="true" />
                {t('admin_ui.audit_logs.identifiers', {}, 'Identifiers')}
              </div>
              <p class="mt-2 break-all font-mono text-xs text-foreground">{auditEvent.id}</p>
              <p class="mt-2 break-all font-mono text-xs text-muted-foreground">
                {auditEvent.action}
              </p>
            </article>
          </section>

          <section class="mt-7" aria-labelledby="system-audit-change-heading">
            <div class="mb-3 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p class="font-mono text-[0.7rem] font-bold uppercase tracking-[0.14em] text-primary">
                  {t('admin_ui.audit_logs.before_after', {}, 'Before / after')}
                </p>
                <h2 id="system-audit-change-heading" class="mt-1 text-lg font-semibold text-foreground">
                  {t('admin_ui.audit_logs.change_evidence', {}, 'Change evidence')}
                </h2>
              </div>
              <span class="text-sm text-muted-foreground">
                {t('admin_ui.audit_logs.field_count', { count: changeRows.length }, ':count fields')}
              </span>
            </div>

            {#if changeRows.length === 0}
              <div class="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">
                {t('admin_ui.audit_logs.no_field_changes', {}, 'No field changes.')}
              </div>
            {:else}
              <div class="divide-y divide-border overflow-hidden rounded-xl border border-border">
                {#each changeRows as change}
                  <article class="grid gap-3 bg-card p-4 sm:grid-cols-[9rem_minmax(0,1fr)]">
                    <h3 class="break-all font-mono text-xs font-semibold text-foreground">
                      {change.key}
                    </h3>
                    <div class="grid min-w-0 gap-2 sm:grid-cols-2">
                      <div class="min-w-0 rounded-lg border border-border bg-muted/20 p-3">
                        <p class="text-[0.68rem] font-bold uppercase tracking-wide text-muted-foreground">
                          {t('admin_ui.audit_logs.before', {}, 'Before')}
                        </p>
                        <pre class="mt-1 whitespace-pre-wrap break-all font-mono text-xs text-foreground">{change.oldValue}</pre>
                      </div>
                      <div class="min-w-0 rounded-lg border border-border bg-muted/20 p-3">
                        <p class="text-[0.68rem] font-bold uppercase tracking-wide text-muted-foreground">
                          {t('admin_ui.audit_logs.after', {}, 'After')}
                        </p>
                        <pre class="mt-1 whitespace-pre-wrap break-all font-mono text-xs text-foreground">{change.newValue}</pre>
                      </div>
                    </div>
                  </article>
                {/each}
              </div>
            {/if}
          </section>

          <section class="mt-7" aria-labelledby="system-audit-trace-heading">
            <div class="mb-3">
              <p class="font-mono text-[0.7rem] font-bold uppercase tracking-[0.14em] text-primary">
                {t('admin_ui.audit_logs.trace_network', {}, 'Trace & network')}
              </p>
              <h2 id="system-audit-trace-heading" class="mt-1 text-lg font-semibold text-foreground">
                {t('admin_ui.audit_logs.request_chain', {}, 'Request chain')}
              </h2>
            </div>

            <div class="grid gap-3 sm:grid-cols-2">
              <article class="rounded-xl border border-border bg-card p-4">
                <div class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <Network class="size-4" aria-hidden="true" />
                  {t('admin_ui.audit_logs.network_identity', {}, 'Network identity')}
                </div>
                <dl class="mt-3 space-y-3 text-sm">
                  <div>
                    <dt class="text-xs text-muted-foreground">{t('admin_ui.audit_logs.ip', {}, 'IP')}</dt>
                    <dd class="mt-1 break-all font-mono text-xs text-foreground">{auditEvent.ipAddress || '—'}</dd>
                  </div>
                  <div>
                    <dt class="text-xs text-muted-foreground">{t('admin_ui.audit_logs.user_agent', {}, 'User agent')}</dt>
                    <dd class="mt-1 break-all font-mono text-xs text-foreground">{auditEvent.userAgent || '—'}</dd>
                  </div>
                </dl>
              </article>

              <article class="rounded-xl border border-border bg-card p-4">
                <div class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <Link2 class="size-4" aria-hidden="true" />
                  {t('admin_ui.audit_logs.correlation', {}, 'Correlation')}
                </div>
                <dl class="mt-3 space-y-3 text-sm">
                  {#each [
                    [t('admin_ui.audit_logs.request_id', {}, 'Request ID'), auditEvent.investigation.requestId],
                    [t('admin_ui.audit_logs.trace_id', {}, 'Trace ID'), auditEvent.investigation.traceId],
                    [t('admin_ui.audit_logs.correlation_key', {}, 'Correlation key'), auditEvent.investigation.correlationKey],
                    [t('admin_ui.audit_logs.submission', {}, 'Submission'), auditEvent.investigation.frontendSubmissionId],
                  ] as pair}
                    <div>
                      <dt class="text-xs text-muted-foreground">{pair[0]}</dt>
                      <dd class="mt-1 break-all font-mono text-xs text-foreground">{pair[1] ?? '—'}</dd>
                    </div>
                  {/each}
                </dl>
              </article>
            </div>

            {#if traceTimeline.length > 0}
              <div class="mt-3 overflow-hidden rounded-xl border border-border">
                <div class="border-b border-border bg-muted/25 px-4 py-3">
                  <h3 class="text-sm font-semibold text-foreground">
                    {t('admin_ui.audit_logs.trace_window', {}, 'Trace events in current window')}
                  </h3>
                </div>
                <ol class="divide-y divide-border">
                  {#each traceTimeline as traceEvent, index}
                    <li>
                      <button
                        type="button"
                        class="flex min-h-11 w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-ring/30"
                        aria-current={traceEvent.id === auditEvent.id ? 'true' : undefined}
                        onclick={() => onSelectTraceEvent(traceEvent.id)}
                      >
                        <span
                          class={`mt-1 flex size-6 shrink-0 items-center justify-center rounded-full border font-mono text-[0.65rem] font-bold ${
                            traceEvent.id === auditEvent.id
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-border bg-background text-muted-foreground'
                          }`}
                        >
                          {index + 1}
                        </span>
                        <span class="min-w-0 flex-1">
                          <span class="block font-medium text-foreground">{traceEvent.summary}</span>
                          <span class="mt-1 block text-xs text-muted-foreground">
                            {traceEvent.stage ?? '—'} · {formatAuditLogDateTime(traceEvent.createdAt)}
                          </span>
                        </span>
                      </button>
                    </li>
                  {/each}
                </ol>
              </div>
            {/if}
          </section>

          <section class="mt-7" aria-labelledby="system-audit-integrity-heading">
            <div class="mb-3">
              <p class="font-mono text-[0.7rem] font-bold uppercase tracking-[0.14em] text-primary">
                {t('admin_ui.audit_logs.chain_of_custody', {}, 'Chain of custody')}
              </p>
              <h2 id="system-audit-integrity-heading" class="mt-1 text-lg font-semibold text-foreground">
                {t('admin_ui.audit_logs.payload_integrity', {}, 'Payload & integrity')}
              </h2>
            </div>

            <article
              class={`rounded-xl border p-4 ${
                auditEvent.investigation.integrity.status === 'mismatch'
                  ? 'border-rose-500/35 bg-rose-500/5'
                  : auditEvent.investigation.integrity.status === 'verified'
                    ? 'border-emerald-500/30 bg-emerald-500/5'
                    : 'border-amber-500/30 bg-amber-500/5'
              }`}
            >
              <div class="flex items-start gap-3">
                {#if auditEvent.investigation.integrity.status === 'verified'}
                  <ShieldCheck class="mt-0.5 size-5 shrink-0 text-emerald-600" aria-hidden="true" />
                {:else}
                  <ShieldAlert class="mt-0.5 size-5 shrink-0 text-amber-600" aria-hidden="true" />
                {/if}
                <div class="min-w-0 flex-1">
                  <h3 class="font-semibold text-foreground">{auditEvent.integrityLabel}</h3>
                  <p class="mt-1 text-sm leading-6 text-muted-foreground">
                    {#if auditEvent.investigation.integrity.status === 'verified'}
                      {t(
                        'admin_ui.audit_logs.integrity_verified_description',
                        {},
                        'The persisted evidence matches its cryptographic seal.',
                      )}
                    {:else if auditEvent.investigation.integrity.status === 'mismatch'}
                      {t(
                        'admin_ui.audit_logs.integrity_mismatch_description',
                        {},
                        'The persisted evidence no longer matches its cryptographic seal. Investigate immediately.',
                      )}
                    {:else}
                      {t(
                        'admin_ui.audit_logs.integrity_legacy_description',
                        {},
                        'This legacy event predates cryptographic sealing.',
                      )}
                    {/if}
                  </p>
                </div>
              </div>

              <dl class="mt-4 grid gap-3 sm:grid-cols-2">
                <div>
                  <dt class="text-xs text-muted-foreground">{t('admin_ui.audit_logs.schema_version', {}, 'Schema version')}</dt>
                  <dd class="mt-1 font-mono text-xs text-foreground">v{auditEvent.investigation.integrity.schemaVersion}</dd>
                </div>
                <div>
                  <dt class="text-xs text-muted-foreground">{t('admin_ui.audit_logs.retention', {}, 'Retention')}</dt>
                  <dd class="mt-1 font-mono text-xs text-foreground">{auditEvent.investigation.retentionClass ?? '—'}</dd>
                </div>
                <div>
                  <dt class="text-xs text-muted-foreground">{t('admin_ui.audit_logs.write_redaction', {}, 'Write-time redaction')}</dt>
                  <dd class="mt-1 font-mono text-xs text-foreground">{yesNo(auditEvent.investigation.integrity.redactionApplied)}</dd>
                </div>
                <div>
                  <dt class="text-xs text-muted-foreground">{t('admin_ui.audit_logs.defensive_redaction', {}, 'Read-time defensive redaction')}</dt>
                  <dd class="mt-1 font-mono text-xs text-foreground">{yesNo(auditEvent.investigation.integrity.defensiveRedactionApplied)}</dd>
                </div>
                <div class="sm:col-span-2">
                  <dt class="text-xs text-muted-foreground">{t('admin_ui.audit_logs.event_hash', {}, 'Event hash')}</dt>
                  <dd class="mt-1 break-all font-mono text-xs text-foreground">{auditEvent.investigation.integrity.eventHash ?? '—'}</dd>
                </div>
                <div class="sm:col-span-2">
                  <dt class="text-xs text-muted-foreground">{t('admin_ui.audit_logs.previous_hash', {}, 'Previous hash')}</dt>
                  <dd class="mt-1 break-all font-mono text-xs text-foreground">{auditEvent.investigation.integrity.previousHash ?? '—'}</dd>
                </div>
              </dl>
            </article>

            <article class="mt-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
              <div class="flex gap-3">
                <LockKeyhole class="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                <div>
                  <h3 class="text-sm font-semibold text-foreground">
                    {t('admin_ui.audit_logs.system_payload_boundary', {}, 'System-only payload boundary')}
                  </h3>
                  <p class="mt-1 text-sm leading-6 text-muted-foreground">
                    {t(
                      'admin_ui.audit_logs.system_payload_boundary_description',
                      {},
                      'This surface can expose operational forensics to authorized system administrators. Passwords, tokens, secrets, cookies and session credentials remain redacted.',
                    )}
                  </p>
                </div>
              </div>
            </article>

            <details class="mt-3 overflow-hidden rounded-xl border border-border bg-card">
              <summary
                class="flex min-h-11 cursor-pointer items-center gap-2 px-4 py-3 text-sm font-semibold text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-ring/30"
              >
                <Braces class="size-4" aria-hidden="true" />
                {t('admin_ui.audit_logs.redacted_payload', {}, 'Redacted evidence payload')}
              </summary>
              <pre class="max-h-[30rem] overflow-auto border-t border-border bg-slate-950 p-4 font-mono text-xs leading-5 text-slate-100">{formatAuditLogJson({
                oldValues: auditEvent.details.oldValues,
                newValues: auditEvent.details.newValues,
                investigation: auditEvent.investigation,
              })}</pre>
            </details>

            {#if auditEvent.investigation.errorClass || auditEvent.investigation.errorMessage}
              <article class="mt-3 rounded-xl border border-rose-500/25 bg-rose-500/5 p-4">
                <div class="flex items-start gap-3">
                  <ShieldAlert class="mt-0.5 size-4 shrink-0 text-rose-600" aria-hidden="true" />
                  <div>
                    <h3 class="font-semibold text-foreground">
                      {auditEvent.investigation.errorClass ??
                        t('admin_ui.audit_logs.error', {}, 'Error')}
                    </h3>
                    <p class="mt-1 break-words text-sm text-muted-foreground">
                      {auditEvent.investigation.errorMessage ??
                        t('admin_ui.audit_logs.no_error_message', {}, 'No error message')}
                    </p>
                  </div>
                </div>
              </article>
            {/if}
          </section>
        </div>
      {/if}
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
