<script lang="ts">
  import { inertia } from '@inertiajs/svelte'
  import AdminLayout from '@/layouts/admin_layout.svelte'
  import Card from '@/components/ui/card.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
  import CardHeader from '@/components/ui/card_header.svelte'
  import CardTitle from '@/components/ui/card_title.svelte'
  import Button from '@/components/ui/button.svelte'
  import Badge from '@/components/ui/badge.svelte'
  import Input from '@/components/ui/input.svelte'
  import {
    Shield,
    User,
    Clock,
    Search,
    FileText,
    AlertCircle
  } from 'lucide-svelte'

  interface Props {
    auditLogs: {
      id: string
      user: {
        id: string
        username: string
      } | null
      action: string
      resource_type: string
      resource_id: string | null
      details: any
      ip_address: string
      user_agent: string
      created_at: string
    }[]
    pagination: {
      total: number
      perPage: number
      currentPage: number
      lastPage: number
    }
    filters: {
      search?: string
      action?: string
      resource_type?: string
    }
  }

  const { auditLogs, pagination, filters }: Props = $props()

  let searchValue = $state(filters.search || '')

  function handleSearch() {
    inertia.get('/admin/audit-logs', {
      search: searchValue,
      page: 1,
    }, {
      preserveState: true,
      preserveScroll: true,
    })
  }

  function getActionBadge(action: string) {
    if (action.includes('create')) return 'default'
    if (action.includes('update') || action.includes('edit')) return 'secondary'
    if (action.includes('delete') || action.includes('suspend')) return 'destructive'
    if (action.includes('login') || action.includes('access')) return 'outline'
    return 'secondary'
  }

  function formatDateTime(dateString: string) {
    return new Date(dateString).toLocaleString('vi-VN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  function formatAction(action: string) {
    return action.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  }
</script>

<AdminLayout>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold tracking-tight">Audit Logs</h1>
        <p class="text-muted-foreground">Dòng sự kiện quan trọng để truy vết hoạt động và hành vi hệ thống.</p>
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
              placeholder="Tìm theo username, action hoặc resource..."
              class="pl-10"
              bind:value={searchValue}
              onkeydown={(e) => {
                if (e.key === 'Enter') handleSearch()
              }}
            />
          </div>
          <Button onclick={handleSearch}>Tìm kiếm</Button>
        </div>
      </CardContent>
    </Card>

    <!-- Audit Logs Table -->
    <Card>
      <CardHeader>
        <CardTitle>Hoạt động gần đây</CardTitle>
      </CardHeader>
      <CardContent>
        <div class="space-y-4">
          {#each auditLogs as log}
            <div class="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
              <div class="flex items-start justify-between gap-4">
                <div class="flex items-start gap-3 flex-1 min-w-0">
                  <div class="flex-shrink-0 mt-1">
                    {#if log.action.includes('login') || log.action.includes('access')}
                      <Shield class="h-5 w-5 text-blue-500" />
                    {:else if log.action.includes('delete') || log.action.includes('suspend')}
                      <AlertCircle class="h-5 w-5 text-red-500" />
                    {:else}
                      <FileText class="h-5 w-5 text-green-500" />
                    {/if}
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 flex-wrap">
                      <Badge variant={getActionBadge(log.action)}>
                        {formatAction(log.action)}
                      </Badge>
                      <span class="text-sm text-muted-foreground">trên</span>
                      <Badge variant="outline">{log.resource_type}</Badge>
                      {#if log.resource_id}
                        <span class="text-xs text-muted-foreground font-mono">
                          #{log.resource_id.slice(0, 8)}
                        </span>
                      {/if}
                    </div>
                    <div class="flex items-center gap-2 mt-2 text-sm">
                      <User class="h-4 w-4 text-muted-foreground" />
                      <span class="font-medium">{log.user?.username || 'System'}</span>
                      <span class="text-muted-foreground">•</span>
                      <span class="text-muted-foreground">{log.ip_address}</span>
                    </div>
                    {#if log.details && Object.keys(log.details).length > 0}
                      <div class="mt-2 p-2 bg-muted rounded text-xs font-mono overflow-x-auto">
                        {JSON.stringify(log.details, null, 2)}
                      </div>
                    {/if}
                  </div>
                </div>
                <div class="flex items-center gap-2 text-sm text-muted-foreground flex-shrink-0">
                  <Clock class="h-4 w-4" />
                  <span>{formatDateTime(log.created_at)}</span>
                </div>
              </div>
            </div>
          {/each}
        </div>

        <!-- Empty State -->
        {#if auditLogs.length === 0}
          <div class="py-12 text-center">
            <Shield class="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 class="text-lg font-semibold mb-2">Không có audit log nào</h3>
            <p class="text-muted-foreground">
              {filters.search ? 'Thử đổi điều kiện tìm kiếm.' : 'Chưa có hoạt động nào được ghi nhận.'}
            </p>
          </div>
        {/if}
      </CardContent>
    </Card>

    <!-- Pagination -->
    {#if pagination.lastPage > 1}
      <Card>
        <CardContent class="py-4">
          <div class="flex items-center justify-between">
            <div class="text-sm text-muted-foreground">
              Hiển thị <span class="font-medium">{(pagination.currentPage - 1) * pagination.perPage + 1}</span>
              đến <span class="font-medium">{Math.min(pagination.currentPage * pagination.perPage, pagination.total)}</span>
              trên tổng <span class="font-medium">{pagination.total}</span> log
            </div>
            <div class="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.currentPage === 1}
                onclick={() => inertia.visit(`/admin/audit-logs?page=${pagination.currentPage - 1}`)}
              >
                Trước
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.currentPage === pagination.lastPage}
                onclick={() => inertia.visit(`/admin/audit-logs?page=${pagination.currentPage + 1}`)}
              >
                Sau
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    {/if}
  </div>
</AdminLayout>
