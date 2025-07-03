<script lang="ts">
  import Button from '@/components/ui/button.svelte'
  import Badge from '@/components/ui/badge.svelte'
  import { Plus, UserCheck, Mail } from 'lucide-svelte'

  interface Props {
    isSuperAdmin: boolean
    pendingRequestsCount: number
    onOpenPendingRequests: () => void
    onOpenInvite: () => void
    onOpenAddMember: () => void
  }

  const {
    isSuperAdmin,
    pendingRequestsCount,
    onOpenPendingRequests,
    onOpenInvite,
    onOpenAddMember,
  }: Props = $props()
</script>

<div class="flex items-center gap-2">
  {#if isSuperAdmin && pendingRequestsCount > 0}
    <Button variant="destructive" onclick={onOpenPendingRequests} class="font-medium">
      <UserCheck class="h-5 w-5 mr-2" />
      Phê duyệt thành viên
      <Badge class="ml-2 bg-white text-red-600 hover:bg-white">{pendingRequestsCount}</Badge>
    </Button>
  {/if}

  <Button onclick={onOpenInvite}>
    <Mail class="h-4 w-4 mr-2" />
    Mời người dùng
  </Button>

  <Button onclick={onOpenAddMember}>
    <Plus class="h-4 w-4 mr-2" />
    Thêm thành viên
  </Button>
</div>
