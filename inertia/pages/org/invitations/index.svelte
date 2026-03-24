<script lang="ts">
  import { inertia } from '@inertiajs/svelte'
  import OrganizationLayout from '@/layouts/organization_layout.svelte'
  import Card from '@/components/ui/card.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
  import CardHeader from '@/components/ui/card_header.svelte'
  import CardTitle from '@/components/ui/card_title.svelte'
  import Button from '@/components/ui/button.svelte'
  import Badge from '@/components/ui/badge.svelte'
  import Input from '@/components/ui/input.svelte'
  import { Mail, Clock, UserPlus, Search, CheckCircle, XCircle } from 'lucide-svelte'

  interface Props {
    invitations: {
      id: string
      email: string
      org_role: string
      invited_by: {
        id: string
        username: string
      }
      status: 'pending' | 'accepted' | 'declined' | 'expired'
      invited_at: string
      expires_at: string
    }[]
    pagination: {
      total: number
      perPage: number
      currentPage: number
      lastPage: number
    }
    filters: {
      search?: string
      status?: string
    }
  }

  let { invitations, pagination, filters }: Props = $props()
  let searchValue = $state(filters.search || '')
  let showInviteModal = $state(false)

  function handleSearch() {
    inertia.get('/org/invitations', {
      search: searchValue,
      page: 1,
    }, {
      preserveState: true,
    })
  }

  function getStatusBadge(status: string) {
    const variants = {
      pending: 'default',
      accepted: 'outline',
      declined: 'destructive',
      expired: 'secondary',
    }
    return variants[status as keyof typeof variants] || 'secondary'
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }
</script>

<OrganizationLayout>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold tracking-tight">Invitations</h1>
        <p class="text-muted-foreground">Manage member invitations</p>
      </div>
      <Button onclick={() => showInviteModal = true}>
        <UserPlus class="mr-2 h-4 w-4" />
        Invite Member
      </Button>
    </div>

    <!-- Filters -->
    <Card>
      <CardContent class="pt-6">
        <div class="flex gap-4">
          <div class="flex-1 relative">
            <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by email..."
              class="pl-10"
              bind:value={searchValue}
              onkeydown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <Button onclick={handleSearch}>Search</Button>
        </div>
      </CardContent>
    </Card>

    <!-- Invitations List -->
    <div class="grid gap-4">
      {#each invitations as invitation}
        <Card>
          <CardContent class="pt-6">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-4">
                <div class="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Mail class="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div class="flex items-center gap-2">
                    <span class="font-medium">{invitation.email}</span>
                    <Badge variant={getStatusBadge(invitation.status)}>
                      {invitation.status}
                    </Badge>
                    <Badge variant="outline">{invitation.org_role}</Badge>
                  </div>
                  <div class="text-sm text-muted-foreground mt-1">
                    Invited by {invitation.invited_by.username} • {formatDate(invitation.invited_at)}
                  </div>
                  {#if invitation.status === 'pending'}
                    <div class="text-xs text-muted-foreground mt-1">
                      <Clock class="inline h-3 w-3 mr-1" />
                      Expires {formatDate(invitation.expires_at)}
                    </div>
                  {/if}
                </div>
              </div>
              {#if invitation.status === 'pending'}
                <div class="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onclick={() => inertia.post(`/org/invitations/${invitation.id}/resend`)}
                  >
                    Resend
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onclick={() => inertia.delete(`/org/invitations/${invitation.id}`)}
                  >
                    Cancel
                  </Button>
                </div>
              {/if}
            </div>
          </CardContent>
        </Card>
      {/each}
    </div>

    {#if invitations.length === 0}
      <Card>
        <CardContent class="py-12 text-center">
          <Mail class="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 class="text-lg font-semibold mb-2">No invitations</h3>
          <p class="text-muted-foreground mb-4">
            No pending invitations. Invite team members to get started.
          </p>
          <Button onclick={() => showInviteModal = true}>
            <UserPlus class="mr-2 h-4 w-4" />
            Invite Member
          </Button>
        </CardContent>
      </Card>
    {/if}
  </div>
</OrganizationLayout>
