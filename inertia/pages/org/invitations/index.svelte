<script lang="ts">
  import { router } from '@inertiajs/svelte'
  import OrganizationLayout from '@/layouts/organization_layout.svelte'
  import Card from '@/components/ui/card.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
  import CardHeader from '@/components/ui/card_header.svelte'
  import CardTitle from '@/components/ui/card_title.svelte'
  import Button from '@/components/ui/button.svelte'
  import Input from '@/components/ui/input.svelte'
  import Label from '@/components/ui/label.svelte'
  import Select from '@/components/ui/select.svelte'
  import SelectContent from '@/components/ui/select_content.svelte'
  import SelectItem from '@/components/ui/select_item.svelte'
  import SelectTrigger from '@/components/ui/select_trigger.svelte'
  import { formatRoleLabel } from '@/lib/access_ui'
  import { UserPlus, Search } from 'lucide-svelte'
  import InvitationList from './components/invitation_list.svelte'

  type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline'

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
    roleOptions: Array<{
      value: string
      label: string
    }>
  }

  const props: Props = $props()
  const invitations = $derived(props.invitations)
  const pagination = $derived(props.pagination)
  const filters = $derived(props.filters)
  const roleOptions = $derived(props.roleOptions)

  let searchValue = $state('')
  let inviteFormOpen = $state(false)
  let isSubmitting = $state(false)
  let errorMessage = $state('')
  let inviteForm = $state({
    email: '',
    org_role: 'org_member',
  })

  $effect(() => {
    searchValue = filters.search ?? ''
  })

  function handleSearch() {
    router.get(
      '/org/invitations/invitations',
      {
        search: searchValue,
        page: 1,
      },
      {
        preserveState: true,
      }
    )
  }

  function getStatusBadge(status: string): BadgeVariant {
    const variants = {
      pending: 'default',
      accepted: 'outline',
      declined: 'destructive',
      expired: 'secondary',
    } as const
    return variants[status as keyof typeof variants]
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  function getCsrfToken(): string {
    return document.head.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
  }

  async function handleInviteMember() {
    if (!inviteForm.email.trim()) {
      errorMessage = 'Email là bắt buộc.'
      return
    }

    isSubmitting = true
    errorMessage = ''

    try {
      const response = await fetch('/org/members/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRF-TOKEN': getCsrfToken(),
        },
        body: JSON.stringify(inviteForm),
        credentials: 'same-origin',
      })

      const payload = (await response.json()) as {
        success?: boolean
        message?: string
      }

      if (!response.ok || !payload.success) {
        errorMessage = payload.message || 'Không thể gửi lời mời.'
        isSubmitting = false
        return
      }

      inviteFormOpen = false
      inviteForm = {
        email: '',
        org_role: 'org_member',
      }
      router.reload()
    } catch (error) {
      console.error('Lỗi khi gửi lời mời:', error)
      errorMessage = 'Không thể gửi lời mời.'
      isSubmitting = false
    }
  }

  function roleLabel(role: string): string {
    return roleOptions.find((option) => option.value === role)?.label ?? formatRoleLabel(role)
  }
</script>

<OrganizationLayout title="Lời mời tổ chức">
  <div class="space-y-6">
    <div class="flex items-center justify-between gap-3">
      <div>
        <p class="neo-kicker">Organization / Invitations</p>
        <h1 class="text-4xl font-bold tracking-tight">Lời mời thành viên</h1>
        <p class="mt-2 text-sm text-muted-foreground">Theo dõi các lời mời đã gửi và tạo lời mời mới cho team của tổ chức.</p>
      </div>
      <Button onclick={() => { inviteFormOpen = !inviteFormOpen }}>
        <UserPlus class="mr-2 h-4 w-4" />
        {inviteFormOpen ? 'Đóng form' : 'Mời thành viên'}
      </Button>
    </div>

    <div class="flex flex-wrap gap-2">
      <a href="/org/departments" class="neo-surface-soft px-3 py-2 text-sm font-bold">Phòng ban</a>
      <a href="/org/roles" class="neo-surface-soft px-3 py-2 text-sm font-bold">Vai trò</a>
      <a href="/org/permissions" class="neo-surface-soft px-3 py-2 text-sm font-bold">Quyền hạn</a>
    </div>

    {#if inviteFormOpen}
      <Card>
        <CardHeader>
          <CardTitle>Gửi lời mời mới</CardTitle>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="grid gap-4 md:grid-cols-2">
            <div class="space-y-2">
              <Label for="invite_email">Email</Label>
              <Input
                id="invite_email"
                type="email"
                value={inviteForm.email}
                oninput={(event: Event) => {
                  inviteForm.email = (event.currentTarget as HTMLInputElement).value
                }}
                placeholder="member@example.com"
              />
            </div>

            <div class="space-y-2">
              <Label for="invite_role">Vai trò</Label>
              <Select
                value={inviteForm.org_role}
                onValueChange={(value: string) => {
                  inviteForm.org_role = value
                }}
              >
                <SelectTrigger id="invite_role">
                  <span>{roleLabel(inviteForm.org_role)}</span>
                </SelectTrigger>
                <SelectContent>
                  {#each roleOptions as option}
                    <SelectItem value={option.value}>{option.label}</SelectItem>
                  {/each}
                </SelectContent>
              </Select>
            </div>
          </div>

          {#if errorMessage}
            <p class="text-sm neo-text-orange">{errorMessage}</p>
          {/if}

          <div class="flex justify-end gap-2">
            <Button variant="outline" onclick={() => { inviteFormOpen = false }}>
              Hủy
            </Button>
            <Button onclick={() => { void handleInviteMember() }} disabled={isSubmitting}>
              {isSubmitting ? 'Đang gửi...' : 'Gửi lời mời'}
            </Button>
          </div>
        </CardContent>
      </Card>
    {/if}

    <Card>
      <CardContent class="pt-6">
        <div class="flex gap-4">
          <div class="relative flex-1">
            <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Tìm theo email..."
              class="pl-10"
              bind:value={searchValue}
              onkeydown={(event: KeyboardEvent) => { if (event.key === 'Enter') handleSearch() }}
            />
          </div>
          <Button onclick={handleSearch}>Tìm kiếm</Button>
        </div>
      </CardContent>
    </Card>

    <InvitationList
      {invitations}
      {pagination}
      {getStatusBadge}
      {roleLabel}
      {formatDate}
      onInviteClick={() => {
        inviteFormOpen = true
      }}
    />
  </div>
</OrganizationLayout>
