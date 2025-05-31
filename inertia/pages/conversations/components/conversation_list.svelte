<script lang="ts">
  import { router } from '@inertiajs/svelte'
  import Input from '@/components/ui/input.svelte'
  import Avatar from '@/components/ui/avatar.svelte'
  import AvatarFallback from '@/components/ui/avatar_fallback.svelte'
  import AvatarImage from '@/components/ui/avatar_image.svelte'
  import Badge from '@/components/ui/badge.svelte'
  import { Search } from 'lucide-svelte'
  import type { Conversation } from '../types'
  import { getAvatarInitials, formatDate } from '../utils/conversation_utils'

  interface Props {
    conversations: Conversation[]
    selectedId: string | null
    onSelectConversation: (conversation: Conversation) => void
    loggedInUserId: string
  }

  const { conversations, selectedId, onSelectConversation, loggedInUserId }: Props = $props()

  let searchQuery = $state('')

  function handleSearch(e: Event) {
    e.preventDefault()
    router.get('/conversations', { search: searchQuery }, { preserveState: true })
  }
</script>

<div class="space-y-4 flex flex-col h-[calc(100vh-15rem)]">
  <div class="relative shrink-0">
    <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
    <form onsubmit={handleSearch}>
      <Input
        type="search"
        placeholder="Tìm kiếm cuộc trò chuyện..."
        class="pl-9"
        bind:value={searchQuery}
      />
    </form>
  </div>

  <div class="flex-1 overflow-y-auto pr-1 custom-scrollbar">
    {#if conversations.length === 0}
      <div class="p-4 text-center text-muted-foreground">
        Chưa có cuộc trò chuyện nào
      </div>
    {:else}
      <div>
        {#each conversations as conversation (conversation.id)}
          {@const participants = conversation.participants || []}
          {@const isDirectMessage = participants.length === 2}
          {@const otherParticipant = isDirectMessage ? participants.find(p => p.id !== loggedInUserId) : null}
          {@const displayName = isDirectMessage && !conversation.title
            ? (otherParticipant?.username || otherParticipant?.email || 'Người dùng không xác định')
            : conversation.title || (() => {
                const otherParticipants = participants.filter(p => p.id !== loggedInUserId)
                const names = otherParticipants.slice(0, 2).map(p => p.username || p.email).filter(Boolean).join(", ")
                const remainingCount = otherParticipants.length - 2
                return remainingCount > 0 ? `${names} và ${remainingCount} người khác` : names || 'Trò chuyện nhóm'
              })()}

          <div
            role="button"
            tabindex="0"
            onclick={() => { onSelectConversation(conversation); }}
            onkeydown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onSelectConversation(conversation)
              }
            }}
            class="p-4 hover:bg-muted/50 transition-colors flex items-center gap-3 cursor-pointer {selectedId === conversation.id ? 'bg-muted/50' : ''}"
          >
            <Avatar class="h-10 w-10">
              <AvatarImage src="" alt={displayName} />
              <AvatarFallback>
                {getAvatarInitials(displayName)}
              </AvatarFallback>
            </Avatar>

            <div class="flex-1 overflow-hidden">
              <div class="flex items-center justify-between">
                <h3 class="font-medium truncate">{displayName}</h3>
                <span class="text-xs text-muted-foreground">
                  {conversation.updated_at && formatDate(conversation.updated_at, 'vi')}
                </span>
              </div>

              <div class="flex items-center justify-between mt-1">
                <p class="text-sm text-muted-foreground truncate">
                  {#if !isDirectMessage && participants.length > 2}
                    {participants.length} người tham gia
                  {/if}
                </p>
                {#if conversation.$extras?.unreadCount > 0}
                  <Badge variant="destructive" class="rounded-full">
                    {conversation.$extras.unreadCount}
                  </Badge>
                {/if}
              </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>
