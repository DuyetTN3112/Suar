<script lang="ts">
  import { Link } from '@inertiajs/svelte'
  import OrganizationCard from './OrganizationCard.svelte'
  import { Building, Plus } from 'lucide-svelte'
  import Button from '@/components/ui/button.svelte'

  interface Organization {
    id: number
    name: string
    description: string | null
    owner_id: number
    website: string | null
    logo: string | null
    plan: string | null
    slug: string
    created_at: string
    updated_at: string
    role_name?: string
    role_id?: number
  }

  interface Props {
    organizations: Organization[]
    currentOrganizationId?: number | null
    showSwitchButton?: boolean
    showJoinButton?: boolean
    emptyMessage?: string
    emptyDescription?: string
  }

  const {
    organizations,
    currentOrganizationId,
    showSwitchButton = false,
    showJoinButton = false,
    emptyMessage = 'Chưa có tổ chức nào',
    emptyDescription = 'Hãy tạo tổ chức đầu tiên để bắt đầu sử dụng hệ thống.'
  }: Props = $props()
</script>

{#if organizations.length === 0}
  <div class="flex flex-col items-center justify-center py-12 text-center">
    <div class="rounded-full bg-muted p-6 mb-4">
      <Building class="h-12 w-12 text-muted-foreground" />
    </div>
    <h2 class="text-xl font-semibold">{emptyMessage}</h2>
    <p class="text-muted-foreground mt-2 max-w-md">
      {emptyDescription}
    </p>
    <Button class="mt-4">
      <Link href="/organizations/create">
        <Plus class="mr-2 h-4 w-4" /> Tạo tổ chức mới
      </Link>
    </Button>
  </div>
{:else}
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {#each organizations as org (org.id)}
      <OrganizationCard
        organization={org}
        isCurrentOrganization={currentOrganizationId === org.id}
        userRole={org.role_name}
        {showSwitchButton}
        {showJoinButton}
      />
    {/each}
  </div>
{/if}
