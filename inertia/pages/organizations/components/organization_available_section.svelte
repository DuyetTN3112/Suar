<script lang="ts">
  import Badge from '@/components/ui/badge.svelte'
  import Button from '@/components/ui/button.svelte'
  import Card from '@/components/ui/card.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
  import CardDescription from '@/components/ui/card_description.svelte'
  import CardFooter from '@/components/ui/card_footer.svelte'
  import CardHeader from '@/components/ui/card_header.svelte'
  import CardTitle from '@/components/ui/card_title.svelte'
  import Input from '@/components/ui/input.svelte'
  import { Building, Search, Info } from 'lucide-svelte'
  import type { LucideIconComponent } from '@/components/lucide_icon_map'
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

  interface MembershipInfo {
    isMember: boolean
    status: string | null
  }

  interface ButtonConfig {
    variant: 'outline' | 'default'
    disabled: boolean
    icon?: LucideIconComponent | null
    text: string
    className?: string
    onClick?: () => void
  }

  interface Props {
    searchTerm: string
    page: number
    totalPages: number
    filteredCount: number
    organizations: Organization[]
    onPrev: () => void
    onNext: () => void
    onShowDetails: (org: Organization) => void
    checkMembershipStatus: (orgId: string) => MembershipInfo
    renderJoinButton: (org: Organization) => ButtonConfig
    onSearchInput: (value: string) => void
  }

  const {
    searchTerm,
    page,
    totalPages,
    filteredCount,
    organizations,
    onPrev,
    onNext,
    onShowDetails,
    checkMembershipStatus,
    renderJoinButton,
    onSearchInput,
  }: Props = $props()
</script>

<div>
  <div class="flex justify-between items-center mb-2">
    <h2 class="text-xl font-semibold">Tất cả tổ chức có sẵn</h2>

    <div class="flex items-center gap-3">
      <div class="relative w-64">
        <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Tìm kiếm tổ chức..."
          class="pl-10 h-8"
          value={searchTerm}
          oninput={(event: Event) => {
            onSearchInput((event.currentTarget as HTMLInputElement).value)
          }}
        />
      </div>

      <OrganizationPaginationControls
        {page}
        {totalPages}
        {onPrev}
        {onNext}
      />
    </div>
  </div>

  {#if filteredCount === 0}
    <div class="text-center py-6">
      <p class="text-muted-foreground">Không tìm thấy tổ chức nào</p>
    </div>
  {:else}
    <div class="grid gap-3 grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
      {#each organizations as org (org.id)}
        {@const membershipInfo = checkMembershipStatus(org.id)}
        {@const buttonConfig = renderJoinButton(org)}
        <Card class="overflow-hidden transition-all duration-200 hover:shadow-md">
          <CardHeader class="p-3 pb-1">
            <CardTitle class="text-sm flex items-center gap-2">
              {#if org.logo}
                <img src={org.logo} alt={org.name} class="h-4 w-4 rounded-md" />
              {:else}
                <Building class="h-3 w-3" />
              {/if}
              <div class="truncate">{org.name}</div>
              {#if membershipInfo.isMember}
                <Badge variant="outline" class="ml-auto text-xs py-0 h-4 font-normal">
                  Đã tham gia
                </Badge>
              {/if}
              {#if !membershipInfo.isMember && membershipInfo.status === 'pending'}
                <Badge variant="outline" class="ml-auto text-xs py-0 h-4 font-normal bg-amber-50">
                  Đang chờ duyệt
                </Badge>
              {/if}
            </CardTitle>
            <CardDescription class="text-xs line-clamp-1">
              {org.description || 'Không có mô tả'}
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

              <Button
                size="sm"
                variant={buttonConfig.variant}
                class={`flex-1 h-7 text-xs ${buttonConfig.className || ''}`}
                disabled={buttonConfig.disabled}
                onclick={buttonConfig.onClick}
              >
                {#if buttonConfig.icon}
                  {@const IconComponent = buttonConfig.icon}
                  <IconComponent class="h-3 w-3 mr-1" />
                {/if}
                {buttonConfig.text}
              </Button>
            </div>
          </CardFooter>
        </Card>
      {/each}
    </div>
  {/if}
</div>
