<script lang="ts">
  import { inertia } from '@inertiajs/svelte'
  import AdminLayout from '@/layouts/admin_layout.svelte'
  import Card from '@/components/ui/card.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
  import CardDescription from '@/components/ui/card_description.svelte'
  import CardHeader from '@/components/ui/card_header.svelte'
  import CardTitle from '@/components/ui/card_title.svelte'
  import Button from '@/components/ui/button.svelte'
  import Badge from '@/components/ui/badge.svelte'
  import Input from '@/components/ui/input.svelte'
  import {
    Building2,
    Users,
    FolderKanban,
    Crown,
    Calendar,
    Search
  } from 'lucide-svelte'

  interface Props {
    organizations: {
      id: string
      name: string
      description: string | null
      owner: {
        id: string
        username: string
        email: string
      }
      plan: 'free' | 'pro' | 'pro_max'
      created_at: string
      updated_at: string
      _count: {
        members: number
        projects: number
      }
    }[]
    pagination: {
      total: number
      perPage: number
      currentPage: number
      lastPage: number
    }
    filters: {
      search?: string
      plan?: string
    }
  }

  let { organizations, pagination, filters }: Props = $props()

  let searchValue = $state(filters.search || '')

  function handleSearch() {
    inertia.get('/admin/organizations', {
      search: searchValue,
      plan: filters.plan,
      page: 1,
    }, {
      preserveState: true,
      preserveScroll: true,
    })
  }

  function getPlanBadge(plan: string) {
    const variants = {
      free: 'secondary',
      pro: 'default',
      pro_max: 'destructive',
    }
    return variants[plan as keyof typeof variants] || 'secondary'
  }

  function getPlanLabel(plan: string) {
    const labels = {
      free: 'Free',
      pro: 'Pro',
      pro_max: 'Pro Max',
    }
    return labels[plan as keyof typeof labels] || plan
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }
</script>

<AdminLayout>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold tracking-tight">Organizations</h1>
        <p class="text-muted-foreground">Manage all organizations in the system</p>
      </div>
    </div>

    <!-- Filters -->
    <Card>
      <CardContent class="pt-6">
        <div class="flex gap-4">
          <div class="flex-1 relative">
            <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by organization name..."
              class="pl-10"
              bind:value={searchValue}
              onkeydown={(e) => {
                if (e.key === 'Enter') handleSearch()
              }}
            />
          </div>
          <Button onclick={handleSearch}>Search</Button>
        </div>
      </CardContent>
    </Card>

    <!-- Organizations Grid -->
    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {#each organizations as org}
        <Card class="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div class="flex items-start justify-between">
              <div class="flex items-center gap-3 flex-1 min-w-0">
                <div class="flex-shrink-0 h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Building2 class="h-6 w-6 text-primary" />
                </div>
                <div class="min-w-0 flex-1">
                  <CardTitle class="text-lg truncate">{org.name}</CardTitle>
                  <div class="flex items-center gap-2 mt-1">
                    <Badge variant={getPlanBadge(org.plan)}>
                      {getPlanLabel(org.plan)}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
            {#if org.description}
              <CardDescription class="line-clamp-2 mt-2">
                {org.description}
              </CardDescription>
            {/if}
          </CardHeader>
          <CardContent>
            <div class="space-y-3">
              <!-- Owner -->
              <div class="flex items-center gap-2 text-sm">
                <Crown class="h-4 w-4 text-amber-500" />
                <span class="text-muted-foreground">Owner:</span>
                <span class="font-medium">{org.owner.username}</span>
              </div>

              <!-- Stats -->
              <div class="grid grid-cols-2 gap-3 pt-2 border-t">
                <div class="flex items-center gap-2 text-sm">
                  <Users class="h-4 w-4 text-blue-500" />
                  <span class="font-medium">{org._count.members}</span>
                  <span class="text-muted-foreground">members</span>
                </div>
                <div class="flex items-center gap-2 text-sm">
                  <FolderKanban class="h-4 w-4 text-green-500" />
                  <span class="font-medium">{org._count.projects}</span>
                  <span class="text-muted-foreground">projects</span>
                </div>
              </div>

              <!-- Created Date -->
              <div class="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
                <Calendar class="h-3 w-3" />
                <span>Created {formatDate(org.created_at)}</span>
              </div>

              <!-- Actions -->
              <div class="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  class="flex-1"
                  onclick={() => inertia.visit(`/admin/organizations/${org.id}`)}
                >
                  View Details
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      {/each}
    </div>

    <!-- Empty State -->
    {#if organizations.length === 0}
      <Card>
        <CardContent class="py-12 text-center">
          <Building2 class="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 class="text-lg font-semibold mb-2">No organizations found</h3>
          <p class="text-muted-foreground">
            {filters.search ? 'Try adjusting your search criteria' : 'No organizations in the system yet'}
          </p>
        </CardContent>
      </Card>
    {/if}

    <!-- Pagination -->
    {#if pagination.lastPage > 1}
      <Card>
        <CardContent class="py-4">
          <div class="flex items-center justify-between">
            <div class="text-sm text-muted-foreground">
              Showing <span class="font-medium">{(pagination.currentPage - 1) * pagination.perPage + 1}</span>
              to <span class="font-medium">{Math.min(pagination.currentPage * pagination.perPage, pagination.total)}</span>
              of <span class="font-medium">{pagination.total}</span> organizations
            </div>
            <div class="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.currentPage === 1}
                onclick={() => inertia.visit(`/admin/organizations?page=${pagination.currentPage - 1}`)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.currentPage === pagination.lastPage}
                onclick={() => inertia.visit(`/admin/organizations?page=${pagination.currentPage + 1}`)}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    {/if}
  </div>
</AdminLayout>
