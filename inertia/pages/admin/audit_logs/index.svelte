<script lang="ts">
  import { router } from '@inertiajs/svelte'
  import {
    Shield,
    User,
    Clock,
    Search,
    FileText,
    CircleAlert
  } from 'lucide-svelte'

  import Badge from '@/components/ui/badge.svelte'
  import Button from '@/components/ui/button.svelte'
  import Card from '@/components/ui/card.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
  import CardHeader from '@/components/ui/card_header.svelte'
  import CardTitle from '@/components/ui/card_title.svelte'
  import Input from '@/components/ui/input.svelte'


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
      details: Record<string, unknown> | null
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
      user_id?: string | null
      from?: string | null
      to?: string | null
    }
  }

  const props: Props = $props()
  const auditLogs = $derived(props.auditLogs)
  const pagination = $derived(props.pagination)
  const filters = $derived(props.filters)

  let searchValue = $state('')
  let actionValue = $state('')
  let resourceTypeValue = $state('')
  let userIdValue = $state('')
  let fromValue = $state('')
  let toValue = $state('')

  $effect(() => {
    searchValue = filters.search ?? ''
    actionValue = filters.action ?? ''
    resourceTypeValue = filters.resource_type ?? ''
    userIdValue = filters.user_id ?? ''
    fromValue = filters.from ? filters.from.slice(0, 10) : ''
    toValue = filters.to ? filters.to.slice(0, 10) : ''
  })

  function handleSearch() {
    router.get('/admin/audit-logs', {
      search: searchValue || undefined,
      action: actionValue || undefined,
      resource_type: resourceTypeValue || undefined,
      user_id: userIdValue || undefined,
      from: fromValue || undefined,
      to: toValue || undefined,
      page: 1,
    }, {
      preserveState: true,
      preserveScroll: true,
    })
  }

  function pageHref(page: number): string {
    const params = new URLSearchParams()
    if (searchValue) params.set('search', searchValue)
    if (actionValue) params.set('action', actionValue)
    if (resourceTypeValue) params.set('resource_type', resourceTypeValue)
    if (userIdValue) params.set('user_id', userIdValue)
    if (fromValue) params.set('from', fromValue)
    if (toValue) params.set('to', toValue)
    params.set('page', String(page))
    return `/admin/audit-logs?${params.toString()}`
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

  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <p class="font-medium uppercase tracking-wider text-xs text-muted-foreground">Admin / System Audit</p>
        <h1 class="text-3xl font-bold tracking-tight">Audit Logs</h1>
        <p class="text-muted-foreground">Dòng sự kiện quan trọng để truy vết hoạt động và hành vi hệ thống.</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <a href="/admin/permissions" class="border border-border rounded-lg px-3 py-2 bg-white text-sm font-medium">Vai trò và quyền</a>
        <a href="/admin/qr-codes" class="border border-border rounded-lg px-3 py-2 bg-white text-sm font-medium">QR gói cá nhân</a>
      </div>
    </div>

    <!-- Filters -->
    <Card>
      <CardContent class="pt-6">
        <div class="grid gap-4 lg:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))]">
          <div class="relative">
            <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Tìm theo username, action hoặc resource..."
              class="pl-10"
              bind:value={searchValue}
              onkeydown={(e: KeyboardEvent) => {
                if (e.key === 'Enter') handleSearch()
              }}
            />
          </div>
          <select class="h-10 rounded-md border border-input bg-background px-3 text-sm" bind:value={actionValue}>
            <option value="">Tất cả action</option>
            <option value="create">create</option>
            <option value="update">update</option>
            <option value="delete">delete</option>
            <option value="suspend">suspend</option>
            <option value="activate">activate</option>
            <option value="login">login</option>
          </select>
          <Input bind:value={resourceTypeValue} name="resource_type" placeholder="resource_type" />
          <Input bind:value={userIdValue} name="user_id" placeholder="user_id" />
          <div class="grid gap-4 sm:grid-cols-2 lg:col-span-4">
            <Input bind:value={fromValue} type="date" />
            <Input bind:value={toValue} type="date" />
          </div>
        </div>
        <div class="mt-4 flex flex-wrap gap-3">
          <Button onclick={handleSearch}>Tìm kiếm</Button>
          <Button
            variant="outline"
            onclick={() => {
              searchValue = ''
              actionValue = ''
              resourceTypeValue = ''
              userIdValue = ''
              fromValue = ''
              toValue = ''
              handleSearch()
            }}
          >
            Xóa lọc
          </Button>
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
                      <Shield class="h-5 w-5 text-foreground" />
                    {:else if log.action.includes('delete') || log.action.includes('suspend')}
                      <CircleAlert class="h-5 w-5 text-destructive" />
                    {:else}
                      <FileText class="h-5 w-5 text-fuchsia-600" />
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
                      <span class="font-medium">{log.user?.username ?? 'System'}</span>
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
                onclick={() => { router.visit(pageHref(pagination.currentPage - 1)) }}
              >
                Trước
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.currentPage === pagination.lastPage}
                onclick={() => { router.visit(pageHref(pagination.currentPage + 1)) }}
              >
                Sau
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    {/if}
  </div>
