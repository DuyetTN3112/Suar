<script lang="ts">
  import { Dialog } from 'bits-ui'
  import { Clock3, EyeOff, FileClock, ShieldCheck, UserRound, X } from 'lucide-svelte'

  import UserAuditChangeList from '@/apps/user/modules/audit_logs/components/user_audit_change_list.svelte'
  import type {
    AuditActivityOutcome,
    UserAuditActivityItem,
    UserAuditActorType,
    UserAuditPerspective,
  } from '@/apps/user/modules/audit_logs/models/activity_item'
  import { currentDocumentLocale } from '@/apps/user/shared/lib/date_locale'
  import { useTranslation } from '@/apps/user/shared/stores/translation.svelte'
  import Badge from '@/apps/user/shared/ui/badge.svelte'

  interface Props {
    open: boolean
    auditEvent: UserAuditActivityItem | null
    onOpenChange: (open: boolean) => void
  }

  const { open, auditEvent, onOpenChange }: Props = $props()
  const { t } = useTranslation()
  const documentLocale = $derived(currentDocumentLocale() === 'vi' ? 'vi-VN' : 'en-US')

  const activityFallbacks: Record<string, string> = {
    'account.created': 'Account created',
    'account.profile_updated': 'Account profile updated',
    'account.restricted': 'Account status changed',
    'access.updated': 'Access changed',
    'activity.recorded': 'Activity recorded',
    'billing.created': 'Billing activity created',
    'billing.removed': 'Billing activity removed',
    'billing.updated': 'Billing activity updated',
    'membership.invitation': 'Organization invitation updated',
    'membership.removed': 'Organization membership removed',
    'membership.role_changed': 'Organization role changed',
    'membership.updated': 'Organization membership updated',
    'organization.created': 'Organization activity created',
    'organization.removed': 'Organization activity removed',
    'organization.updated': 'Organization activity updated',
    'project.created': 'Project created',
    'project.removed': 'Project removed',
    'project.updated': 'Project updated',
    'review.created': 'Review created',
    'review.removed': 'Review removed',
    'review.updated': 'Review updated',
    'security.activity': 'Security activity recorded',
    'security.connected_account': 'Connected sign-in changed',
    'security.credential_changed': 'Credential changed',
    'security.login': 'Signed in',
    'security.logout': 'Signed out',
    'task.created': 'Task created',
    'task.removed': 'Task removed',
    'task.updated': 'Task updated',
  }

  function activityLabel(item: UserAuditActivityItem): string {
    return t(
      `user_audit.activities.${item.activityKey}`,
      {},
      activityFallbacks[item.activityKey] ?? 'Activity recorded'
    )
  }

  function actorLabel(type: UserAuditActorType): string {
    const fallbacks: Record<UserAuditActorType, string> = {
      another_authorized_user: 'An authorized administrator',
      automation: 'Trusted automation',
      integration: 'Connected integration',
      system: 'Suar system',
      unknown: 'Unknown source',
      you: 'You',
    }
    return t(`user_audit.actor_types.${type}`, {}, fallbacks[type])
  }

  function perspectiveLabel(perspective: UserAuditPerspective): string {
    const fallbacks: Record<UserAuditPerspective, string> = {
      affected_you: 'Affected your account',
      performed_by_you: 'Performed by you',
    }
    return t(`user_audit.perspectives.${perspective}`, {}, fallbacks[perspective])
  }

  function subjectLabel(item: UserAuditActivityItem): string {
    return t(
      `user_audit.subjects.${item.subject.category}`,
      {},
      item.subject.category.replaceAll('_', ' ')
    )
  }

  function outcomeLabel(outcome: AuditActivityOutcome): string {
    const fallbacks: Record<AuditActivityOutcome, string> = {
      failure: 'Failed',
      recorded: 'Recorded',
      success: 'Successful',
      warning: 'Needs attention',
    }
    return t(`user_audit.outcomes.${outcome}`, {}, fallbacks[outcome])
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
      return t('user_audit.invalid_time', {}, 'Invalid timestamp')
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
      class="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col border-l border-border bg-background shadow-2xl data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:w-[min(38rem,94vw)] motion-reduce:animate-none"
      aria-label={t('user_audit.detail.aria', {}, 'Personal audit event detail')}
    >
      {#if auditEvent}
        <header class="border-b border-border bg-muted/20 px-5 py-5 sm:px-7">
          <div class="flex items-start justify-between gap-4">
            <div class="min-w-0">
              <p
                class="flex items-center gap-2 font-mono text-[0.7rem] font-bold uppercase tracking-[0.16em] text-primary"
              >
                <FileClock class="size-4" aria-hidden="true" />
                {t('user_audit.detail.eyebrow', {}, 'Private evidence record')}
              </p>
              <Dialog.Title
                class="mt-2 text-xl font-semibold leading-tight text-foreground sm:text-2xl"
              >
                {activityLabel(auditEvent)}
              </Dialog.Title>
              <Dialog.Description class="mt-2 text-sm leading-6 text-muted-foreground">
                {t(
                  'user_audit.detail.description',
                  {},
                  'A privacy-safe explanation of activity performed by you or directly affecting you.',
                )}
              </Dialog.Description>
            </div>
            <Dialog.Close
              class="inline-flex size-11 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30"
              aria-label={t('user_audit.detail.close', {}, 'Close event detail')}
            >
              <X class="size-5" aria-hidden="true" />
            </Dialog.Close>
          </div>
        </header>

        <div class="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-7">
          <section
            class="grid gap-3 sm:grid-cols-2"
            aria-label={t('user_audit.detail.context', {}, 'Personal event context')}
          >
            <div class="rounded-xl border border-border bg-card p-4">
              <div
                class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              >
                <UserRound class="size-4" aria-hidden="true" />
                {t('user_audit.detail.source', {}, 'Source')}
              </div>
              <p class="mt-2 font-semibold text-foreground">{actorLabel(auditEvent.actor.type)}</p>
              <p class="mt-1 text-sm text-muted-foreground">
                {perspectiveLabel(auditEvent.perspective)}
              </p>
            </div>

            <div class="rounded-xl border border-border bg-card p-4">
              <div
                class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              >
                <ShieldCheck class="size-4" aria-hidden="true" />
                {t('user_audit.detail.area', {}, 'Area')}
              </div>
              <p class="mt-2 font-semibold capitalize text-foreground">
                {subjectLabel(auditEvent)}
              </p>
              <p class="mt-1 text-sm text-muted-foreground">
                {t('user_audit.detail.personal_scope', {}, 'Personal scope only')}
              </p>
            </div>

            <div class="rounded-xl border border-border bg-card p-4 sm:col-span-2">
              <div
                class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              >
                <Clock3 class="size-4" aria-hidden="true" />
                {t('user_audit.detail.time', {}, 'Time')}
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

          <section class="mt-7" aria-labelledby="user-audit-change-heading">
            <div class="mb-3 flex items-end justify-between gap-3">
              <div>
                <p
                  class="font-mono text-[0.7rem] font-bold uppercase tracking-[0.14em] text-primary"
                >
                  {t('user_audit.detail.change_eyebrow', {}, 'Safe before / after')}
                </p>
                <h2
                  id="user-audit-change-heading"
                  class="mt-1 text-lg font-semibold text-foreground"
                >
                  {t('user_audit.detail.change_history', {}, 'What changed')}
                </h2>
              </div>
              <span class="text-sm text-muted-foreground">
                {t('user_audit.change_count', { count: auditEvent.changeCount }, ':count visible')}
              </span>
            </div>
            <UserAuditChangeList
              changes={auditEvent.changes}
              hasHiddenChanges={auditEvent.hasHiddenChanges}
            />
          </section>

          <section class="mt-7 rounded-xl border border-primary/20 bg-primary/5 p-4">
            <div class="flex gap-3">
              <EyeOff class="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
              <div>
                <h2 class="text-sm font-semibold text-foreground">
                  {t('user_audit.detail.privacy_title', {}, 'Personal privacy boundary')}
                </h2>
                <p class="mt-1 text-sm leading-6 text-muted-foreground">
                  {t(
                    'user_audit.detail.privacy_description',
                    {},
                    'Other people’s identity, network data, request traces, internal target IDs and raw payloads are not exposed here.',
                  )}
                </p>
              </div>
            </div>
          </section>

          <footer class="mt-7 border-t border-border pt-4">
            <p class="text-xs text-muted-foreground">
              {t('user_audit.detail.reference', {}, 'Evidence reference')}
            </p>
            <p class="mt-1 break-all font-mono text-xs text-foreground">{auditEvent.id}</p>
          </footer>
        </div>
      {/if}
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
