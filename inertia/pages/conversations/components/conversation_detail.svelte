<script lang="ts">
  import { onMount, tick } from 'svelte'
  import Button from '@/components/ui/button.svelte'
  import Avatar from '@/components/ui/avatar.svelte'
  import AvatarFallback from '@/components/ui/avatar_fallback.svelte'
  import { Loader2, Phone, Video, MoreVertical, MoreHorizontal, Copy, Share, Trash } from 'lucide-svelte'
  import DropdownMenu from '@/components/ui/dropdown_menu.svelte'
  import DropdownMenuContent from '@/components/ui/dropdown_menu_content.svelte'
  import DropdownMenuItem from '@/components/ui/dropdown_menu_item.svelte'
  import DropdownMenuTrigger from '@/components/ui/dropdown_menu_trigger.svelte'
  import type { Conversation, Message } from '../types'
  import { getAvatarInitials, formatMessageDate, groupMessagesByDate, getConversationInfo, calculateMessageSize } from '../utils/conversation_utils'

  interface Props {
    conversation: Conversation
    messages: Message[]
    loggedInUserId: string
    isLoading: boolean
    hasMore: boolean
    onLoadMore: () => void
    onRecallMessage: (message: Message) => void
  }

  const {
    conversation,
    messages,
    loggedInUserId,
    isLoading,
    hasMore,
    onLoadMore,
    onRecallMessage
  }: Props = $props()

  let messagesEndRef: HTMLDivElement
  let messagesContainerRef: HTMLDivElement

  const messageGroups = $derived(groupMessagesByDate(messages))
  const conversationInfo = $derived(getConversationInfo(conversation, loggedInUserId))

  $effect(() => {
    if (messages.length > 0) {
      tick().then(() => {
        messagesEndRef?.scrollIntoView({ behavior: 'smooth' })
      })
    }
  })
</script>

<div class="flex-1 flex flex-col h-[calc(100vh-15rem)] max-h-[calc(100vh-15rem)] w-full min-w-0 overflow-hidden">
  <!-- Chat header -->
  <div class="p-4 border-b flex items-center justify-between bg-card shrink-0">
    <div class="flex items-center gap-3">
      <Avatar class="h-10 w-10">
        <AvatarFallback>
          {getAvatarInitials(conversationInfo.title)}
        </AvatarFallback>
      </Avatar>
      <div>
        <h2 class="font-semibold">
          {conversationInfo.title}
        </h2>
        <p class="text-sm text-muted-foreground">
          {conversationInfo.participantCount} người tham gia
        </p>
      </div>
    </div>
    <div class="flex items-center gap-2">
      <Button size="icon" variant="ghost" title="Gọi điện">
        <Phone class="h-5 w-5" />
      </Button>
      <Button size="icon" variant="ghost" title="Gọi video">
        <Video class="h-5 w-5" />
      </Button>
      <Button size="icon" variant="ghost" title="Thêm">
        <MoreVertical class="h-5 w-5" />
      </Button>
    </div>
  </div>

  <!-- Chat messages -->
  <div
    bind:this={messagesContainerRef}
    class="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar"
    style="flex: 1 1 auto; width: 100%; min-width: 0; max-width: 100%; overflow-x: hidden"
  >
    {#if isLoading && messages.length === 0}
      <div class="flex justify-center items-center h-full">
        <Loader2 class="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    {:else}
      {#if hasMore}
        <div class="flex justify-center mb-4">
          <Button
            variant="outline"
            onclick={onLoadMore}
            disabled={isLoading}
            size="sm"
          >
            {#if isLoading}
              <Loader2 class="h-4 w-4 mr-2 animate-spin" />
            {/if}
            Tải thêm tin nhắn
          </Button>
        </div>
      {/if}

      {#each messageGroups as group (group.date)}
        <div class="space-y-4">
          <div class="flex items-center justify-center my-4">
            <div class="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md">
              {group.date}
            </div>
          </div>

          {#each group.messages as message (message.id)}
            {@const isOutgoing = message.is_current_user === true || message.sender_id === loggedInUserId}
            {@const participants = conversation.conversation_participants || []}
            {@const showSenderInfo = !isOutgoing && (participants.length > 2)}

            <div class="flex {isOutgoing ? 'justify-end' : 'justify-start'} mb-4">
              {#if !isOutgoing}
                <div class="flex-shrink-0 mr-2">
                  <Avatar class="h-8 w-8">
                    <AvatarFallback>{message.sender?.username?.[0]?.toUpperCase() || message.sender?.email?.[0]?.toUpperCase() || 'UN'}</AvatarFallback>
                  </Avatar>
                </div>
              {/if}

              <div class="flex flex-col max-w-[70%] min-w-0">
                {#if !isOutgoing && showSenderInfo}
                  <span class="text-xs font-medium text-slate-600 mb-1 ml-1">
                    {message.sender?.username || message.sender?.email || 'Người dùng'}
                  </span>
                {/if}

                <div class="group relative px-3 py-2 rounded-2xl {isOutgoing ? 'bg-primary text-primary-foreground rounded-br-none' : 'bg-muted text-foreground rounded-bl-none'}">
                  {#if message.is_recalled}
                    <p class="break-words italic text-muted-foreground">
                      {message.recall_scope === 'all'
                        ? 'Tin nhắn này đã bị thu hồi'
                        : 'Bạn đã thu hồi tin nhắn này'}
                    </p>
                  {:else}
                    <p class="break-words whitespace-pre-wrap" style="word-break: break-all; overflow-wrap: break-word; word-wrap: break-word; max-width: 100%; width: 100%;">
                      {message.message}
                    </p>
                  {/if}

                  <div class="flex items-center justify-end text-xs mt-1 {isOutgoing ? 'text-primary-foreground/70' : 'text-muted-foreground'}">
                    <span class="flex-grow text-right">
                      {formatMessageDate(message.created_at || message.timestamp || '')}
                      {#if isOutgoing}
                        • Bạn
                      {/if}
                      <span class="ml-1">• {calculateMessageSize(message.message)}</span>
                    </span>

                    {#if !message.is_recalled && isOutgoing}
                      <div class="absolute {isOutgoing ? 'right-[calc(100%+2px)]' : 'left-[calc(100%+2px)]'} top-1/2 -translate-y-1/2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              class="h-5 w-5 p-0 rounded-full bg-background shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <MoreHorizontal class="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align={isOutgoing ? "start" : "end"}>
                            {#if isOutgoing}
                              <DropdownMenuItem
                                onclick={() => { onRecallMessage(message); }}
                                class="text-destructive"
                              >
                                <Trash class="mr-2 h-4 w-4" />
                                Thu hồi tin nhắn
                              </DropdownMenuItem>
                            {/if}
                            <DropdownMenuItem onclick={() => navigator.clipboard.writeText(message.message)}>
                              <Copy class="mr-2 h-4 w-4" />
                              Sao chép
                            </DropdownMenuItem>
                            <DropdownMenuItem onclick={() => {}}>
                              <Share class="mr-2 h-4 w-4" />
                              Chia sẻ
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    {/if}
                  </div>
                </div>
              </div>

              {#if isOutgoing}
                <div class="flex-shrink-0 ml-2">
                  <Avatar class="h-8 w-8">
                    <AvatarFallback>U</AvatarFallback>
                  </Avatar>
                </div>
              {/if}
            </div>
          {/each}
        </div>
      {/each}

      <div bind:this={messagesEndRef}></div>
    {/if}
  </div>
</div>
