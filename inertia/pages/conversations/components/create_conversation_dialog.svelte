<script lang="ts">
  import { router } from '@inertiajs/svelte'
  import Button from '@/components/ui/button.svelte'
  import Dialog from '@/components/ui/dialog.svelte'
  import DialogContent from '@/components/ui/dialog_content.svelte'
  import DialogDescription from '@/components/ui/dialog_description.svelte'
  import DialogFooter from '@/components/ui/dialog_footer.svelte'
  import DialogHeader from '@/components/ui/dialog_header.svelte'
  import DialogTitle from '@/components/ui/dialog_title.svelte'
  import Input from '@/components/ui/input.svelte'
  import Label from '@/components/ui/label.svelte'
  import Avatar from '@/components/ui/avatar.svelte'
  import AvatarFallback from '@/components/ui/avatar_fallback.svelte'
  import { AlertCircle } from 'lucide-svelte'
  import { notificationStore } from '@/stores/notification_store.svelte'
  import axios from 'axios'

  interface Participant {
    id: string
    username: string
    email: string
  }

  interface Props {
    open: boolean
    children?: any
  }

  let { open = $bindable(false), children }: Props = $props()

  let title = $state('')
  let selectedParticipants = $state<string[]>([])
  let loading = $state(false)
  let users = $state<Participant[]>([])
  let searchTerm = $state('')

  $effect(() => {
    if (open) {
      fetchUsers()
    }
  })

  async function fetchUsers() {
    try {
      const response = await axios.get('/api/users-in-organization')
      if (response.data.success && response.data.users) {
        users = response.data.users
      }
    } catch (error) {
      console.error('Không thể tải danh sách người dùng:', error)
      notificationStore.error('Không thể tải danh sách người dùng')
    }
  }

  function toggleParticipant(userId: string) {
    if (selectedParticipants.includes(userId)) {
      selectedParticipants = selectedParticipants.filter(id => id !== userId)
    } else {
      selectedParticipants = [...selectedParticipants, userId]
    }
  }

  async function handleCreate() {
    if (selectedParticipants.length === 0) {
      notificationStore.error('Vui lòng chọn ít nhất một người tham gia')
      return
    }

    loading = true
    try {
      router.post('/conversations', {
        title: title || undefined,
        participants: selectedParticipants
      }, {
        onSuccess: () => {
          notificationStore.success('Tạo cuộc trò chuyện thành công')
          open = false
          title = ''
          selectedParticipants = []
        },
        onError: () => {
          notificationStore.error('Không thể tạo cuộc trò chuyện')
        }
      })
    } catch (error) {
      console.error('Lỗi khi tạo cuộc trò chuyện:', error)
      notificationStore.error('Đã xảy ra lỗi')
    } finally {
      loading = false
    }
  }

  const filteredUsers = $derived(
    users.filter(user =>
      user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  )
</script>

{#if children}
  {@render children.trigger?.()}
{/if}

<Dialog bind:open>
  <DialogContent class="sm:max-w-[500px]">
    <DialogHeader>
      <DialogTitle>Tạo cuộc trò chuyện mới</DialogTitle>
      <DialogDescription>
        Chọn người tham gia vào cuộc trò chuyện
      </DialogDescription>
    </DialogHeader>

    <div class="space-y-4">
      <div class="space-y-2">
        <Label for="title">Tiêu đề (tùy chọn)</Label>
        <Input
          id="title"
          bind:value={title}
          placeholder="Nhập tiêu đề cuộc trò chuyện..."
        />
      </div>

      <div class="space-y-2">
        <Label>Tìm kiếm người tham gia</Label>
        <Input
          bind:value={searchTerm}
          placeholder="Tìm theo tên hoặc email..."
        />
      </div>

      <div class="space-y-2">
        <Label>Chọn người tham gia ({selectedParticipants.length})</Label>
        <div class="border rounded-md max-h-[300px] overflow-y-auto">
          {#if filteredUsers.length === 0}
            <div class="p-4 text-center text-muted-foreground">
              <AlertCircle class="h-8 w-8 mx-auto mb-2" />
              <p>Không tìm thấy người dùng</p>
            </div>
          {:else}
            {#each filteredUsers as user (user.id)}
              <button
                type="button"
                class="w-full flex items-center gap-3 p-3 hover:bg-muted transition-colors {selectedParticipants.includes(user.id) ? 'bg-muted' : ''}"
                onclick={() => { toggleParticipant(user.id); }}
              >
                <input
                  type="checkbox"
                  checked={selectedParticipants.includes(user.id)}
                  onchange={() => { toggleParticipant(user.id); }}
                  class="h-4 w-4"
                />
                <Avatar class="h-8 w-8">
                  <AvatarFallback>
                    {user.username?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div class="flex-1 text-left">
                  <p class="text-sm font-medium">{user.username || user.email}</p>
                  <p class="text-xs text-muted-foreground">{user.email}</p>
                </div>
              </button>
            {/each}
          {/if}
        </div>
      </div>
    </div>

    <DialogFooter>
      <Button variant="outline" onclick={() => open = false}>
        Hủy
      </Button>
      <Button
        onclick={handleCreate}
        disabled={loading || selectedParticipants.length === 0}
      >
        {loading ? 'Đang tạo...' : 'Tạo cuộc trò chuyện'}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
