<script lang="ts">
  import { Dialog } from 'bits-ui'
  import { Clock3, Fingerprint, LockKeyhole, UserRound, X } from 'lucide-svelte'

  import AuditChangeList from '@/apps/org/modules/audit_logs/components/audit_change_list.svelte'
  import { organizationAuditTargetHref } from '@/apps/org/modules/audit_logs/lib/audit_log_query'
  import type {
    AuditActivityOutcome,
    OrganizationAuditActivityItem,
  } from '@/apps/org/modules/audit_logs/models/activity_item'
  import { currentDocumentLocale } from '@/apps/org/shared/lib/date_locale'
  import { useTranslation } from '@/apps/org/shared/stores/translation.svelte'
  import Badge from '@/apps/org/shared/ui/badge.svelte'

  interface Props {
    open: boolean
    auditEvent: OrganizationAuditActivityItem | null
    onOpenChange: (open: boolean) => void
  }

  const { open, auditEvent, onOpenChange }: Props = $props()
  const { t } = useTranslation()
  const documentLocale = $derived(currentDocumentLocale() === 'vi' ? 'vi-VN' : 'en-US')

  function actionLabel(item: OrganizationAuditActivityItem): string {
    return t(
      `task.audit_activity.actions.${item.actionKey}`,
      {},
      item.actionCode.replaceAll(/[._-]+/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase()),
    )
  }

  function actorTypeLabel(item: OrganizationAuditActivityItem): string {
    return t(
      `task.audit_activity.actor_types.${item.actor.type}`,
      {},
      item.actor.type.replaceAll('_', ' '),
    )
  }

  function outcomeLabel(outcome: AuditActivityOutcome): string {
    return t(`task.audit_activity.outcomes.${outcome}`, {}, outcome)
  }

  function outcomeVariant(outcome: AuditActivityOutcome) {
    if (outcome === 'failure') return 'destructive'
    if (outcome === 'warning') return 'warning'
    if (outcome === 'success') return 'secondary'
    return 'outline'
  }

  function formatOccurredAt(value: string): string {
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) {
      return t('task.audit_activity.invalid_time', {}, 'Invalid timestamp')
    }

    return new Intl.DateTimeFormat(documentLocale, {
      dateStyle: 'long',
      timeStyle: 'long',
    }).format(parsed)
  }
</script>

<Dialog.Root {open} {onOpenChange}>
  <Dialog.Portal>
    <Dialog.Overlay
      class="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-[2px] data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 motion-reduce:animate-none"
    />
    <Dialog.Content
      class="fixed inset-y-0 right-0 z-50 flex w-full max-w-2xl flex-col border-l border-border bg-background shadow-2xl data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:w-[min(44rem,92vw)] motion-reduce:animate-none"
      aria-label={t('task.audit_activity.detail.aria', {}, 'Organization audit event detail')}
    >
      {#if auditEvent}
        {@const targetHref = organizationAuditTargetHref(auditEvent.target)}
        <header class="border-b border-border bg-muted/20 px-5 py-5 sm:px-7">
          <div class="flex items-start justify-between gap-4">
            <div class="min-w-0">
              <p class="font-mono text-[0.7rem] font-bold uppercase tracking-[0.16em] text-primary">
                {t('task.audit_activity.detail.eyebrow', {}, 'Evidence record')}
              </p>
              <Dialog.Title class="mt-2 text-xl font-semibold leading-tight text-foreground sm:text-2xl">
                {actionLabel(auditEvent)}
              </Dialog.Title>
              <Dialog.Description class="mt-2 text-sm leading-6 text-muted-foreground">
                {t(
                  'task.audit_activity.detail.description',
                  {},
                  'Business-safe details for this organization event.',
                )}
              </Dialog.Description>
            </div>
            <Dialog.Close
              class="inline-flex size-11 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30"
              aria-label={t('task.audit_activity.detail.close', {}, 'Close event detail')}
            >
              <X class="size-5" aria-hidden="true" />
            </Dialog.Close>
          </div>
        </header>

        <div class="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-7">
          <section class="grid gap-3 sm:grid-cols-2" aria-label={t('task.audit_activity.detail.context', {}, 'Event context')}>
            <div class="rounded-xl border border-border bg-card p-4">
              <div class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <UserRound class="size-4" aria-hidden="true" />
                {t('task.audit_activity.actor', {}, 'Actor')}
              </div>
              <p class="mt-2 font-semibold text-foreground">{auditEvent.actor.label}</p>
              <p class="mt-1 text-sm text-muted-foreground">
                {actorTypeLabel(auditEvent)}
                {#if auditEvent.actor.roleLabel}
                  · {auditEvent.actor.roleLabel}
                {/if}
              </p>
            </div>

            <div class="rounded-xl border border-border bg-card p-4">
              <div class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Fingerprint class="size-4" aria-hidden="true" />
                {t('task.audit_activity.target', {}, 'Target')}
              </div>
              {#if targetHref}
                <a
                  href={targetHref}
                  class="mt-2 inline-block font-semibold text-foreground underline-offset-4 hover:text-primary hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30"
                >
                  {auditEvent.target.label}
                </a>
              {:else}
                <p class="mt-2 font-semibold text-foreground">{auditEvent.target.label}</p>
              {/if}
              <p class="mt-1 font-mono text-xs text-muted-foreground">
                {auditEvent.target.type}
                {#if auditEvent.target.id}
                  · {auditEvent.target.id}
                {/if}
              </p>
            </div>

            <div class="rounded-xl border border-border bg-card p-4 sm:col-span-2">
              <div class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Clock3 class="size-4" aria-hidden="true" />
                {t('task.audit_activity.time', {}, 'Time')}
              </div>
              <div class="mt-2 flex flex-wrap items-center justify-between gap-3">
                <time class="font-medium text-foreground" datetime={auditEvent.occurredAt}>
                  {formatOccurredAt(auditEvent.occurredAt)}
                </time>
                <Badge variant={outcomeVariant(auditEvent.outcome)}>
                  {outcomeLabel(auditEvent.outcome)}
                </Badge>
              </div>
            </div>
          </section>

          <section class="mt-7" aria-labelledby="audit-change-heading">
            <div class="mb-3 flex items-end justify-between gap-3">
              <div>
                <p class="font-mono text-[0.7rem] font-bold uppercase tracking-[0.14em] text-primary">
                  {t('task.audit_activity.detail.change_eyebrow', {}, 'Before / after')}
                </p>
                <h2 id="audit-change-heading" class="mt-1 text-lg font-semibold text-foreground">
                  {t('task.audit_activity.detail.change_history', {}, 'Change history')}
                </h2>
              </div>
              <span class="text-sm text-muted-foreground">
                {t('task.audit_activity.change_count', { count: auditEvent.changeCount }, ':count changes')}
              </span>
            </div>
            <AuditChangeList changes={auditEvent.changes} />
          </section>

          <section class="mt-7 rounded-xl border border-primary/20 bg-primary/5 p-4">
            <div class="flex gap-3">
              <LockKeyhole class="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
              <div>
                <h2 class="text-sm font-semibold text-foreground">
                  {t('task.audit_activity.detail.safe_projection_title', {}, 'Organization-safe projection')}
                </h2>
                <p class="mt-1 text-sm leading-6 text-muted-foreground">
                  {t(
                    'task.audit_activity.detail.safe_projection_description',
                    {},
                    'System diagnostics, network identity and raw payloads are intentionally excluded.',
                  )}
                </p>
              </div>
            </div>
          </section>

          <footer class="mt-7 border-t border-border pt-4">
            <p class="text-xs text-muted-foreground">
              {t('task.audit_activity.detail.event_id', {}, 'Event ID')}
            </p>
            <p class="mt-1 break-all font-mono text-xs text-foreground">{auditEvent.id}</p>
            <p class="mt-3 text-xs text-muted-foreground">
              {t('task.audit_activity.detail.action_code', {}, 'Action code')}
            </p>
            <p class="mt-1 break-all font-mono text-xs text-foreground">{auditEvent.actionCode}</p>
          </footer>
        </div>
      {/if}
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
