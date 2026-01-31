<script lang="ts">
  import { router } from '@inertiajs/svelte'
  import AppLayout from '@/layouts/app_layout.svelte'
  import Button from '@/components/ui/button.svelte'
  import UserSearchForm from './components/UserSearchForm.svelte'
  import PendingApprovalTable from './components/PendingApprovalTable.svelte'
  import type { PendingApprovalProps } from './types'
  import { createPendingApproval } from './hooks/use_pending_approval.svelte'

  const { users, filters }: PendingApprovalProps = $props()

  let search = $state(filters.search || '')
  const { approveAllUsers } = createPendingApproval(users)

  function handleSearch(e: Event) {
    e.preventDefault()
    const queryParams = new URLSearchParams()

    if (search) queryParams.append('search', search)

    const queryString = queryParams.toString()
    router.get(`/users/pending-approval${queryString ? `?${queryString}` : ''}`)
  }
</script>

<svelte:head>
  <title>Phê duyệt người dùng</title>
</svelte:head>

<AppLayout title="Phê duyệt người dùng">
  <div class="container py-8">
    <div class="flex items-center justify-between">
      <h1 class="text-3xl font-bold">Phê duyệt người dùng</h1>
      <Button onclick={approveAllUsers} disabled={!users.data.length}>
        Phê duyệt tất cả
      </Button>
    </div>

    <div class="mt-6">
      <UserSearchForm
        {search}
        setSearch={(value) => { search = value }}
        {handleSearch}
      />
    </div>

    <div class="mt-6">
      <PendingApprovalTable
        {users}
        {filters}
      />
    </div>
  </div>
</AppLayout>
