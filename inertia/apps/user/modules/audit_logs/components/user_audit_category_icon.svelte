<script lang="ts">
  import {
    Activity,
    Building2,
    CircleUserRound,
    CreditCard,
    FolderKanban,
    KeyRound,
    ListChecks,
    ScanSearch,
    ShieldCheck,
    UsersRound,
  } from 'lucide-svelte'

  import type { AuditActivityCategory } from '@/apps/user/modules/audit_logs/models/activity_item'

  interface Props {
    category: AuditActivityCategory
    class?: string
  }

  const { category, class: className = 'size-5' }: Props = $props()
</script>

{#if category === 'account'}
  <CircleUserRound class={className} aria-hidden="true" />
{:else if category === 'access'}
  <KeyRound class={className} aria-hidden="true" />
{:else if category === 'security'}
  <ShieldCheck class={className} aria-hidden="true" />
{:else if category === 'organization'}
  <Building2 class={className} aria-hidden="true" />
{:else if category === 'membership'}
  <UsersRound class={className} aria-hidden="true" />
{:else if category === 'project'}
  <FolderKanban class={className} aria-hidden="true" />
{:else if category === 'task'}
  <ListChecks class={className} aria-hidden="true" />
{:else if category === 'review'}
  <ScanSearch class={className} aria-hidden="true" />
{:else if category === 'billing'}
  <CreditCard class={className} aria-hidden="true" />
{:else}
  <Activity class={className} aria-hidden="true" />
{/if}
