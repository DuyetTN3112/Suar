<script lang="ts">
  import { router } from '@inertiajs/svelte'
  import AppLayout from '@/layouts/app_layout.svelte'
  import Button from '@/components/ui/button.svelte'
  import Card from '@/components/ui/card.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
  import CardDescription from '@/components/ui/card_description.svelte'
  import CardHeader from '@/components/ui/card_header.svelte'
  import CardTitle from '@/components/ui/card_title.svelte'
  import Input from '@/components/ui/input.svelte'
  import Label from '@/components/ui/label.svelte'
  import Avatar from '@/components/ui/avatar.svelte'
  import AvatarFallback from '@/components/ui/avatar_fallback.svelte'
  import { AlertCircle } from 'lucide-svelte'

  interface Participant {
    id: string
    username: string
    email: string
  }

  interface Metadata {
    users: Participant[]
  }

  interface Props {
    metadata: Metadata
    errors?: Record<string, string>
  }

  const { metadata, errors }: Props = $props()

  let title = $state('')
  let selectedParticipants = $state<string[]>([])
  let loading = $state(false)

  function handleSubmit(e: Event) {
    e.preventDefault()
    loading = true

    router.post('/conversations', {
      title,
      participants: selectedParticipants
    }, {
      onFinish: () => loading = false
    })
  }

  function toggleParticipant(id: string) {
    if (selectedParticipants.includes(id)) {
      selectedParticipants = selectedParticipants.filter(pid => pid !== id)
    } else {
      selectedParticipants = [...selectedParticipants, id]
    }
  }
</script>

<svelte:head>
  <title>Tạo cuộc trò chuyện mới</title>
</svelte:head>

<AppLayout title="Tạo cuộc trò chuyện mới">
  <div class="container py-8">
    <div class="max-w-2xl mx-auto">
      <h1 class="text-3xl font-bold mb-6">Tạo cuộc trò chuyện mới</h1>

      {#if errors && Object.keys(errors).length > 0}
        <div class="mb-6 p-4 border border-destructive rounded-md bg-destructive/10">
          <div class="flex items-start gap-2">
            <AlertCircle class="h-5 w-5 text-destructive" />
            <div>
              <h3 class="font-semibold text-destructive">Lỗi</h3>
              {#each Object.values(errors) as error}
                <p class="text-sm text-destructive">{error}</p>
              {/each}
            </div>
          </div>
        </div>
      {/if}

      <Card>
        <form onsubmit={handleSubmit}>
          <CardHeader>
            <CardTitle>Thông tin cuộc trò chuyện</CardTitle>
            <CardDescription>
              Tạo một cuộc trò chuyện mới và mời những người bạn muốn nói chuyện.
            </CardDescription>
          </CardHeader>
          <CardContent class="space-y-6">
            <div class="space-y-2">
              <Label for="title">Tiêu đề cuộc trò chuyện (không bắt buộc)</Label>
              <Input
                id="title"
                placeholder="Nhập tiêu đề cuộc trò chuyện"
                bind:value={title}
              />
            </div>

            <div class="space-y-2">
              <Label>Chọn người tham gia</Label>
              <div class="border rounded-md p-2 max-h-96 overflow-y-auto">
                {#if metadata.users && metadata.users.length > 0}
                  <div class="space-y-1">
                    {#each metadata.users as user (user.id)}
                      <button
                        type="button"
                        class="w-full flex items-center space-x-2 p-2 rounded cursor-pointer hover:bg-accent {selectedParticipants.includes(user.id) ? 'bg-accent' : ''}"
                        onclick={() => { toggleParticipant(user.id); }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedParticipants.includes(user.id)}
                          onchange={() => { toggleParticipant(user.id); }}
                        />
                        <Avatar class="h-8 w-8">
                          <AvatarFallback>{user.username?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div class="flex-1 text-left">
                          <div>{user.username || user.email}</div>
                          <div class="text-sm text-muted-foreground">{user.email}</div>
                        </div>
                      </button>
                    {/each}
                  </div>
                {:else}
                  <p class="text-center text-muted-foreground py-2">
                    Không tìm thấy người dùng nào để thêm vào cuộc trò chuyện.
                  </p>
                {/if}
              </div>
            </div>

            <div class="flex justify-end gap-2">
              <Button type="button" variant="outline" onclick={() => { router.visit('/conversations'); }}>
                Hủy
              </Button>
              <Button type="submit" disabled={selectedParticipants.length === 0 || loading}>
                {loading ? 'Đang tạo...' : 'Tạo cuộc trò chuyện'}
              </Button>
            </div>
          </CardContent>
        </form>
      </Card>
    </div>
  </div>
</AppLayout>
