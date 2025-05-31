<script lang="ts">
  import { router } from '@inertiajs/svelte'
  import AppLayout from '@/layouts/app_layout.svelte'
  import ConversationHeader from './components/conversation_header.svelte'
  import MessageInputForm from './components/message_input_form.svelte'
  import { groupMessagesByDate } from './utils/conversation_utils'
  import type { ConversationProps } from './types'

  const { conversation, messages, pagination, currentUser }: ConversationProps = $props()

  let messagesEndRef: HTMLDivElement
  const loggedInUserId = $derived(currentUser?.id || '')
  const messageGroups = $derived(groupMessagesByDate(messages?.data || []))

  const conversationName = $derived(
    conversation.title ||
    conversation.conversation_participants
      .map(cp => cp.user.username || cp.user.email)
      .filter(name => name)
      .join(', ')
  )

  const otherParticipant = $derived(
    conversation.conversation_participants
      .find(cp => cp.user.id !== loggedInUserId)?.user || null
  )

  $effect(() => {
    messagesEndRef?.scrollIntoView({ behavior: 'smooth' })
  })

  function loadMoreMessages() {
    if (pagination.hasMore) {
      router.get(`/conversations/${conversation.id}`, {
        page: pagination.page + 1,
        limit: pagination.limit
      }, {
        preserveState: true,
        preserveScroll: true,
        only: ['messages', 'pagination']
      })
    }
  }
</script>

<svelte:head>
  <title>Tin nhắn - {conversationName}</title>
</svelte:head>

<AppLayout title="Tin nhắn - {conversationName}">
  <div class="h-[calc(100vh-6rem)] flex flex-col">
    <ConversationHeader
      {conversation}
      {loggedInUserId}
      {otherParticipant}
    />

    <div class="flex-1 overflow-y-auto p-4 space-y-6">
      {#each messageGroups as group (group.date)}
        <div class="space-y-4">
          <div class="flex items-center justify-center my-4">
            <div class="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md">
              {group.date}
            </div>
          </div>

          {#each group.messages as message (message.id)}
            {@const isOutgoing = message.is_current_user === true || message.sender_id === loggedInUserId}
            {@const showSenderInfo = !isOutgoing && conversation.conversation_participants.length > 2}

            <div class="flex {isOutgoing ? 'justify-end' : 'justify-start'} mb-4">
              <div class="px-3 py-2 rounded-2xl {isOutgoing ? 'bg-primary text-primary-foreground' : 'bg-muted'}">
                {#if !isOutgoing && showSenderInfo}
                  <span class="text-xs font-medium mb-1 block">
                    {message.sender?.username || message.sender?.email}
                  </span>
                {/if}
                <p class="break-words">{message.message}</p>
              </div>
            </div>
          {/each}
        </div>
      {/each}

      <div bind:this={messagesEndRef}></div>
    </div>

    <MessageInputForm
      message=""
      setMessage={() => {}}
      onSendMessage={() => {}}
      isLoading={false}
    />
  </div>
</AppLayout>
