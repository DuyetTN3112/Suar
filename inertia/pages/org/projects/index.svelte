<script lang="ts">
  import { inertia } from '@inertiajs/svelte'
  import OrganizationLayout from '@/layouts/organization_layout.svelte'
  import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
  import { Button } from '@/components/ui/button'
  import { Badge } from '@/components/ui/badge'
  import { Input } from '@/components/ui/input'
  import { FolderKanban, Users, CheckSquare, Plus, Search } from 'lucide-svelte'

  interface Props {
    projects: {
      id: string
      name: string
      description: string | null
      status: 'active' | 'archived' | 'on_hold'
      created_at: string
      _count: {
        members: number
        tasks: number
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
      status?: string
    }
  }

  let { projects, pagination, filters }: Props = $props()
  let searchValue = $state(filters.search || '')

  function handleSearch() {
    inertia.get('/org/projects', {
      search: searchValue,
      page: 1,
    }, {
      preserveState: true,
    })
  }

  function getStatusBadge(status: string) {
    const variants = {
      active: 'default',
      archived: 'secondary',
      on_hold: 'outline',
    }
    return variants[status as keyof typeof variants] || 'secondary'
  }
</script>

<OrganizationLayout>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold tracking-tight">Projects</h1>
        <p class="text-muted-foreground">Manage organization projects</p>
      </div>
      <Button onclick={() => inertia.visit('/org/projects/create')}>
        <Plus class="mr-2 h-4 w-4" />
        New Project
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
              placeholder="Search projects..."
              class="pl-10"
              bind:value={searchValue}
              onkeydown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <Button onclick={handleSearch}>Search</Button>
        </div>
      </CardContent>
    </Card>

    <!-- Projects Grid -->
    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {#each projects as project}
        <Card class="hover:shadow-lg transition-shadow cursor-pointer" onclick={() => inertia.visit(`/org/projects/${project.id}`)}>
          <CardHeader>
            <div class="flex items-start justify-between">
              <div class="flex items-center gap-3 flex-1 min-w-0">
                <div class="flex-shrink-0 h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FolderKanban class="h-5 w-5 text-primary" />
                </div>
                <div class="min-w-0 flex-1">
                  <CardTitle class="text-lg truncate">{project.name}</CardTitle>
                  <Badge variant={getStatusBadge(project.status)} class="mt-1">
                    {project.status}
                  </Badge>
                </div>
              </div>
            </div>
            {#if project.description}
              <CardDescription class="line-clamp-2 mt-2">
                {project.description}
              </CardDescription>
            {/if}
          </CardHeader>
          <CardContent>
            <div class="grid grid-cols-2 gap-3">
              <div class="flex items-center gap-2 text-sm">
                <Users class="h-4 w-4 text-blue-500" />
                <span class="font-medium">{project._count.members}</span>
                <span class="text-muted-foreground">members</span>
              </div>
              <div class="flex items-center gap-2 text-sm">
                <CheckSquare class="h-4 w-4 text-green-500" />
                <span class="font-medium">{project._count.tasks}</span>
                <span class="text-muted-foreground">tasks</span>
              </div>
            </div>
          </CardContent>
        </Card>
      {/each}
    </div>

    {#if projects.length === 0}
      <Card>
        <CardContent class="py-12 text-center">
          <FolderKanban class="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 class="text-lg font-semibold mb-2">No projects yet</h3>
          <p class="text-muted-foreground mb-4">
            Create your first project to organize your team's work
          </p>
          <Button onclick={() => inertia.visit('/org/projects/create')}>
            <Plus class="mr-2 h-4 w-4" />
            Create Project
          </Button>
        </CardContent>
      </Card>
    {/if}
  </div>
</OrganizationLayout>
