<script lang="ts">
  import { Building, Info } from 'lucide-svelte'

  import Button from '@/components/ui/button.svelte'
  import Card from '@/components/ui/card.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
  import CardDescription from '@/components/ui/card_description.svelte'
  import CardFooter from '@/components/ui/card_footer.svelte'
  import CardHeader from '@/components/ui/card_header.svelte'
  import CardTitle from '@/components/ui/card_title.svelte'

  import OrganizationPaginationControls from './organization_pagination_controls.svelte'

  interface Organization {
    id: string
    name: string
    description: string | null
    logo: string | null
    website: string | null
    founded_date: string | null
    owner: string | null
    employee_count: number | null
    project_count: number | null
    industry: string | null
    location: string | null
    membership_status?: 'pending' | 'approved' | 'rejected' | null
  }

  interface Props {
    page: number
    totalPages: number
    organizations: Organization[]
    currentOrganizationId: string | null
    onPrev: () => void
    onNext: () => void
    onShowDetails: (org: Organization) => void
    onSwitchOrganization: (id: string) => Promise<void>
  }

  const {
    page,
    totalPages,
    organizations,
    currentOrganizationId,
    onPrev,
    onNext,
    onShowDetails,
    onSwitchOrganization,
  }: Props = $props()
</script>

<div>
  <div class="flex justify-between items-center mb-2">
    <h2 class="text-xl font-semibold">Tổ chức của bạn</h2>

    <OrganizationPaginationControls
      {page}
      {totalPages}
      {onPrev}
      {onNext}
    />
  </div>

  <div class="grid gap-3 grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
    {#each organizations as org (org.id)}
      <Card
        class={`overflow-hidden transition-all duration-200 hover:shadow-md ${org.id === currentOrganizationId ? 'ring-2 ring-primary' : ''}`}
      >
        <CardHeader class="p-3 pb-1">
          <CardTitle class="text-sm flex items-center gap-2">
            {#if org.logo}
              <img src={org.logo} alt={org.name} class="h-4 w-4 rounded-md" />
            {:else}
              <Building class="h-3 w-3" />
            {/if}
            <div class="truncate">{org.name}</div>
          </CardTitle>
          <CardDescription class="text-xs line-clamp-1">
            {org.description ?? 'Không có mô tả'}
          </CardDescription>
        </CardHeader>
        <CardContent class="p-3 pt-0 pb-1"></CardContent>
        <CardFooter class="p-3 pt-1 gap-1">
          <div class="flex gap-1 w-full">
            <Button
              size="sm"
              variant="outline"
              class="flex-1 h-7 text-xs"
              onclick={() => { onShowDetails(org) }}
            >
              <Info class="h-3 w-3 mr-1" />
              Chi tiết
            </Button>
            {#if org.id === currentOrganizationId}
              <Button variant="outline" size="sm" class="flex-1 h-7 text-xs" disabled>
                Hiện tại
              </Button>
            {:else}
              <Button size="sm" class="flex-1 h-7 text-xs" onclick={() => { void onSwitchOrganization(org.id) }}>
                Chuyển đổi
              </Button>
            {/if}
          </div>
        </CardFooter>
      </Card>
    {/each}
  </div>
</div>
