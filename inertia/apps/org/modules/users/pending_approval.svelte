<script lang="ts">
  
  import Button from '@/apps/org/shared/ui/button.svelte'
  import OrganizationLayout from '@/apps/org/shared/layouts/organization_layout.svelte'
  import { useTranslation } from '@/apps/org/shared/stores/translation.svelte'

  import PendingApprovalTable from './components/pending_approval_table.svelte'
  import { createPendingApproval } from './hooks/use_pending_approval.svelte'
  import type { PendingApprovalProps } from './types'

  const { users, pagination, filters }: PendingApprovalProps = $props()

  const { approveAllUsers } = createPendingApproval(() => users)
  const { t } = useTranslation()

  
</script>

<svelte:head>
  <title>{t('user.approve_users', {}, 'Approve Users')}</title>
</svelte:head>

<OrganizationLayout title={t('user.approve_users', {}, 'Approve Users')}>
  <div class="container py-8">
    <div class="flex items-center justify-between">
      <h1 class="text-3xl font-bold">{t('user.approve_users', {}, 'Approve Users')}</h1>
      <Button onclick={approveAllUsers} disabled={!users.length}>
        {t('user.approve_all', {}, 'Approve All')}
      </Button>
    </div>

    <div class="mt-6">
      <PendingApprovalTable
        {users}
        {pagination}
        {filters}
      />
    </div>
  </div>
</OrganizationLayout>
