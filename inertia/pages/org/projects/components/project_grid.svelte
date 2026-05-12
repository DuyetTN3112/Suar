<script lang="ts">
  import { router } from '@inertiajs/svelte'
  import { FolderKanban, Users, SquareCheckBig, ArrowUpRight, Plus } from 'lucide-svelte'

  import Badge from '@/components/ui/badge.svelte'
  import Button from '@/components/ui/button.svelte'
  import Card from '@/components/ui/card.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
  import CardDescription from '@/components/ui/card_description.svelte'
  import CardHeader from '@/components/ui/card_header.svelte'
  import CardTitle from '@/components/ui/card_title.svelte'


  type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'pending' | 'warning'

  interface ProjectItem {
    id: string
    name: string
    description: string | null
    status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
    _count: {
      members: number
      tasks: number
    }
  }

  type ProjectStatus = ProjectItem['status']

  interface Pagination {
    total: number
    currentPage: number
    lastPage: number
  }

  interface Props {
    projects: ProjectItem[]
    pagination: Pagination
    getStatusBadge: (status: ProjectStatus) => BadgeVariant
    statusLabel: (status: ProjectStatus) => string
    onCreateProject: () => void
  }

  const { projects, pagination, getStatusBadge, statusLabel, onCreateProject }: Props = $props()
</script>

<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
  {#each projects as project}
    <Card class="group overflow-hidden transition-[box-shadow,transform] hover:-translate-y-0.5 hover:shadow-suar-strong">
      <CardHeader class="pb-4">
        <div class="flex items-start justify-between gap-3">
          <div class="flex min-w-0 flex-1 items-center gap-3">
            <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-black/10 bg-primary/10">
              <FolderKanban class="h-5 w-5 text-primary" />
            </div>
            <div class="min-w-0 flex-1">
              <CardTitle class="truncate text-lg leading-tight">{project.name}</CardTitle>
              <Badge variant={getStatusBadge(project.status)} class="mt-2">
                {statusLabel(project.status)}
              </Badge>
            </div>
          </div>
        </div>
        {#if project.description}
          <CardDescription class="mt-3 line-clamp-2 leading-6">{project.description}</CardDescription>
        {:else}
          <CardDescription class="mt-3 leading-6">Chưa có mô tả project.</CardDescription>
        {/if}
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="grid grid-cols-2 gap-3 rounded-2xl border border-border bg-secondary/40 p-3">
          <div class="flex min-w-0 items-center gap-2 text-sm">
            <Users class="h-4 w-4 text-foreground" />
            <span class="font-medium">{project._count.members}</span>
            <span class="text-muted-foreground">thành viên</span>
          </div>
          <div class="flex min-w-0 items-center gap-2 text-sm">
            <SquareCheckBig class="h-4 w-4 text-primary" />
            <span class="font-medium">{project._count.tasks}</span>
            <span class="text-muted-foreground">task</span>
          </div>
        </div>

        <Button
          variant="outline"
          class="w-full justify-between"
          onclick={() => {
            router.visit(`/org/projects/${project.id}`)
          }}
        >
          <span>Mở chi tiết dự án</span>
          <ArrowUpRight class="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  {/each}
</div>

{#if projects.length === 0}
  <Card>
    <CardContent class="py-12 text-center">
      <FolderKanban class="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
      <h3 class="mb-2 text-lg font-semibold">Chưa có dự án nào</h3>
      <p class="mx-auto mb-4 max-w-md text-muted-foreground">
        Tạo dự án đầu tiên để tổ chức bắt đầu gom task, thành viên và workflow theo ngữ cảnh rõ ràng.
      </p>
      <Button onclick={onCreateProject}>
        <Plus class="mr-2 h-4 w-4" />
        Tạo dự án
      </Button>
    </CardContent>
  </Card>
{/if}

{#if pagination.lastPage > 1}
  <Card>
    <CardContent class="py-4 text-sm text-muted-foreground">
      Hiển thị trang {pagination.currentPage} / {pagination.lastPage} với tổng {pagination.total} dự án.
    </CardContent>
  </Card>
{/if}
