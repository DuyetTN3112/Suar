<script lang="ts">
  import { Mail, Clock, UserPlus } from 'lucide-svelte'

  import Badge from '@/components/ui/badge.svelte'
  import Button from '@/components/ui/button.svelte'
  import Card from '@/components/ui/card.svelte'
  import CardContent from '@/components/ui/card_content.svelte'


  type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline'

  interface Invitation {
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
  }

  interface Pagination {
    total: number
    currentPage: number
    lastPage: number
  }

  interface Props {
    invitations: Invitation[]
    pagination: Pagination
    getStatusBadge: (status: string) => BadgeVariant
    roleLabel: (role: string) => string
    formatDate: (value: string) => string
    onInviteClick: () => void
  }

  const {
    invitations,
    pagination,
    getStatusBadge,
    roleLabel,
    formatDate,
    onInviteClick,
  }: Props = $props()
</script>

<div class="grid gap-4">
  {#each invitations as invitation}
    <Card>
      <CardContent class="pt-6">
        <div class="flex items-center justify-between gap-4">
          <div class="flex items-center gap-4">
            <div class="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Mail class="h-5 w-5 text-primary" />
            </div>
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <span class="font-medium">{invitation.email}</span>
                <Badge variant={getStatusBadge(invitation.status)}>
                  {invitation.status}
                </Badge>
                <Badge variant="outline">{roleLabel(invitation.org_role)}</Badge>
              </div>
              <div class="mt-1 text-sm text-muted-foreground">
                Gửi bởi {invitation.invited_by.username} • {formatDate(invitation.invited_at)}
              </div>
              {#if invitation.status === 'pending'}
                <div class="mt-1 text-xs text-muted-foreground">
                  <Clock class="mr-1 inline h-3 w-3" />
                  Hết hạn vào {formatDate(invitation.expires_at)}
                </div>
              {/if}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  {/each}
</div>

{#if invitations.length === 0}
  <Card>
    <CardContent class="py-12 text-center">
      <Mail class="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
      <h3 class="mb-2 text-lg font-semibold">Chưa có lời mời nào</h3>
      <p class="mb-4 text-muted-foreground">
        Hãy gửi lời mời đầu tiên để mở rộng team của tổ chức.
      </p>
      <Button onclick={onInviteClick}>
        <UserPlus class="mr-2 h-4 w-4" />
        Mời thành viên
      </Button>
    </CardContent>
  </Card>
{/if}

{#if pagination.lastPage > 1}
  <Card>
    <CardContent class="py-4 text-sm text-muted-foreground">
      Hiển thị trang {pagination.currentPage} / {pagination.lastPage} với tổng {pagination.total} lời mời.
    </CardContent>
  </Card>
{/if}
