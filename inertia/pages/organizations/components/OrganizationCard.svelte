<script lang="ts">
  import { Link, router } from '@inertiajs/svelte'
  import Card from '@/components/ui/card.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
  import CardDescription from '@/components/ui/card_description.svelte'
  import CardFooter from '@/components/ui/card_footer.svelte'
  import CardHeader from '@/components/ui/card_header.svelte'
  import CardTitle from '@/components/ui/card_title.svelte'
  import Badge from '@/components/ui/badge.svelte'
  import Button from '@/components/ui/button.svelte'
  import { Info, Users, ArrowRight } from 'lucide-svelte'

  interface Organization {
    id: string
    name: string
    description: string | null
    owner_id: string
    website: string | null
    logo: string | null
    slug: string
    created_at: string
    updated_at: string
  }

  interface Props {
    organization: Organization
    isCurrentOrganization?: boolean
    userRole?: string
    showJoinButton?: boolean
    showSwitchButton?: boolean
  }

  const {
    organization,
    isCurrentOrganization = false,
    userRole,
    showJoinButton = false,
    showSwitchButton = false
  }: Props = $props()

  function handleSwitch() {
    router.visit(`/organizations/switch/${organization.id}`)
  }

  function handleJoin() {
    router.visit(`/organizations/${organization.id}/join`)
  }

</script>

<Card class="overflow-hidden transition-all duration-200 {isCurrentOrganization ? 'ring-2 ring-primary' : ''}">
  <CardHeader class="pb-2">
    <div class="flex justify-between items-start">
      <CardTitle class="text-xl">
        {organization.name}
      </CardTitle>
      {#if isCurrentOrganization}
        <Badge variant="outline" class="bg-primary/10 text-primary">Hiện tại</Badge>
      {/if}
    </div>
    <CardDescription class="line-clamp-2">
      {organization.description || 'Chưa có mô tả'}
    </CardDescription>
  </CardHeader>
  <CardContent>
    <div class="flex items-center text-sm text-muted-foreground mb-2">
      <Info class="h-4 w-4 mr-2" />
      <span>ID: {organization.id}</span>
    </div>
    {#if userRole}
      <div class="flex items-center text-sm text-muted-foreground mb-2">
        <Users class="h-4 w-4 mr-2" />
        <span>Vai trò: {userRole}</span>
      </div>
    {/if}
    {#if organization.website}
      <div class="text-sm text-muted-foreground truncate">
        {organization.website}
      </div>
    {/if}
  </CardContent>
  <CardFooter class="flex justify-between pt-2">
    <Link href={`/organizations/${organization.id}`}>
      <Button variant="outline">Xem chi tiết</Button>
    </Link>
    {#if showSwitchButton && !isCurrentOrganization}
      <Button variant="secondary" onclick={handleSwitch}>
        Chọn <ArrowRight class="ml-2 h-4 w-4" />
      </Button>
    {/if}
    {#if showJoinButton}
      <Button variant="secondary" onclick={handleJoin}>
        Tham gia
      </Button>
    {/if}
  </CardFooter>
</Card>
