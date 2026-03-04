<script lang="ts">
  import { ArrowRight, Minus, Plus } from 'lucide-svelte'

  import type { OrganizationAuditChangeItem } from '@/apps/org/modules/audit_logs/models/activity_item'
  import { useTranslation } from '@/apps/org/shared/stores/translation.svelte'

  interface Props {
    changes: readonly OrganizationAuditChangeItem[]
    compact?: boolean
  }

  const { changes, compact = false }: Props = $props()
  const { t } = useTranslation()

  function fieldLabel(field: string): string {
    if (field.startsWith('custom_role.')) {
      const roleName = field.slice('custom_role.'.length).replaceAll('_', ' ')
      return `${t('task.audit_activity.fields.custom_role', {}, 'Custom role')} · ${roleName}`
    }

    return t(
      `task.audit_activity.fields.${field}`,
      {},
      field.replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase()),
    )
  }

  function valueLabel(value: OrganizationAuditChangeItem['before']): string {
    if (value === null || value === '') {
      return t('task.audit_activity.change.empty', {}, 'Empty')
    }
    if (typeof value === 'boolean') {
      return value
        ? t('common.yes', {}, 'Yes')
        : t('common.no', {}, 'No')
    }
    return String(value)
  }
</script>

{#if changes.length === 0}
  <p class="text-sm text-muted-foreground">
    {t('task.audit_activity.change.no_changes', {}, 'No safe field-level changes are available.')}
  </p>
{:else}
  <dl class={compact ? 'space-y-1.5' : 'space-y-3'}>
    {#each changes as change (`${change.field}:${change.operation}`)}
      <div
        class={compact
          ? 'min-w-0 text-sm'
          : 'rounded-lg border border-border bg-muted/20 p-3'}
      >
        <dt class={compact ? 'sr-only' : 'mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground'}>
          {fieldLabel(change.field)}
        </dt>
        <dd class="min-w-0">
          {#if change.redacted}
            <span class="text-sm italic text-muted-foreground">
              {t('task.audit_activity.change.redacted', {}, 'Hidden because this field is sensitive')}
            </span>
          {:else if change.operation === 'added'}
            <span class="inline-flex min-w-0 items-center gap-1.5 text-sm">
              <Plus class="size-3.5 shrink-0 text-emerald-600" aria-hidden="true" />
              {#if compact}<span class="font-medium">{fieldLabel(change.field)}:</span>{/if}
              <span class="truncate font-medium text-foreground">{valueLabel(change.after)}</span>
            </span>
          {:else if change.operation === 'removed'}
            <span class="inline-flex min-w-0 items-center gap-1.5 text-sm">
              <Minus class="size-3.5 shrink-0 text-destructive" aria-hidden="true" />
              {#if compact}<span class="font-medium">{fieldLabel(change.field)}:</span>{/if}
              <span class="truncate text-muted-foreground line-through">{valueLabel(change.before)}</span>
            </span>
          {:else}
            <span class="flex min-w-0 flex-wrap items-center gap-1.5 text-sm">
              {#if compact}<span class="font-medium">{fieldLabel(change.field)}:</span>{/if}
              <span class="max-w-full truncate text-muted-foreground line-through">
                {valueLabel(change.before)}
              </span>
              <ArrowRight class="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span class="max-w-full truncate font-medium text-foreground">
                {valueLabel(change.after)}
              </span>
            </span>
          {/if}
        </dd>
      </div>
    {/each}
  </dl>
{/if}
