<script lang="ts">
  import { ArrowRight, EyeOff } from 'lucide-svelte'

  import type { UserAuditChangeItem } from '@/apps/user/modules/audit_logs/models/activity_item'
  import { useTranslation } from '@/apps/user/shared/stores/translation.svelte'

  interface Props {
    changes: readonly UserAuditChangeItem[]
    hasHiddenChanges?: boolean
  }

  const { changes, hasHiddenChanges = false }: Props = $props()
  const { t } = useTranslation()

  const fieldFallbacks: Record<string, string> = {
    avatar_url: 'Profile image',
    bio: 'Biography',
    email: 'Email address',
    is_external_contributor: 'External contributor',
    language: 'Language',
    org_role: 'Organization role',
    outcome: 'Review outcome',
    phone: 'Phone number',
    priority: 'Priority',
    role: 'Role',
    status: 'Status',
    task_visibility: 'Task visibility',
    timezone: 'Time zone',
    username: 'Username',
    visibility: 'Visibility',
  }

  function fieldLabel(field: string): string {
    const fallback = fieldFallbacks[field] ?? field.replaceAll('_', ' ')
    return t(`user_audit.fields.${field}`, {}, fallback)
  }

  function operationLabel(operation: UserAuditChangeItem['operation']): string {
    const fallbacks = {
      added: 'Added',
      removed: 'Removed',
      changed: 'Changed',
    }
    return t(`user_audit.operations.${operation}`, {}, fallbacks[operation])
  }

  function valueLabel(value: UserAuditChangeItem['before']): string {
    if (value === null) return t('user_audit.values.not_set', {}, 'Not set')
    if (typeof value === 'boolean') {
      return value
        ? t('user_audit.values.enabled', {}, 'Enabled')
        : t('user_audit.values.disabled', {}, 'Disabled')
    }
    return String(value)
  }
</script>

{#if changes.length === 0}
  <div class="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-5">
    <div class="flex gap-3">
      <EyeOff class="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <div>
        <p class="text-sm font-medium text-foreground">
          {t('user_audit.changes.no_safe_detail', {}, 'No additional personal detail is shown')}
        </p>
        <p class="mt-1 text-sm leading-6 text-muted-foreground">
          {t(
            'user_audit.changes.no_safe_detail_description',
            {},
            'The event is recorded, while sensitive values and organization-only context remain protected.',
          )}
        </p>
      </div>
    </div>
  </div>
{:else}
  <ul class="space-y-3">
    {#each changes as change}
      <li class="rounded-xl border border-border bg-card p-4">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <p class="text-sm font-semibold text-foreground">{fieldLabel(change.field)}</p>
          <span class="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {operationLabel(change.operation)}
          </span>
        </div>

        {#if change.redacted}
          <div class="mt-3 flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
            <EyeOff class="size-4 shrink-0" aria-hidden="true" />
            {t('user_audit.values.protected', {}, 'Value protected')}
          </div>
        {:else}
          <div class="mt-3 grid items-center gap-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
            <p class="min-w-0 break-words rounded-lg bg-muted/45 px-3 py-2 text-sm text-foreground">
              {valueLabel(change.before)}
            </p>
            <ArrowRight
              class="mx-auto size-4 rotate-90 text-muted-foreground sm:rotate-0"
              aria-hidden="true"
            />
            <p class="min-w-0 break-words rounded-lg bg-primary/8 px-3 py-2 text-sm font-medium text-foreground">
              {valueLabel(change.after)}
            </p>
          </div>
        {/if}
      </li>
    {/each}
  </ul>
{/if}

{#if hasHiddenChanges}
  <p class="mt-3 flex items-start gap-2 text-xs leading-5 text-muted-foreground">
    <EyeOff class="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
    {t(
      'user_audit.changes.hidden_notice',
      {},
      'Some sensitive or organization-only fields are intentionally omitted.',
    )}
  </p>
{/if}
